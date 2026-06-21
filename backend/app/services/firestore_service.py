"""
Firestore persistence service for carbon footprint entries.

Provides async wrappers around the synchronous google-cloud-firestore SDK,
plus an in-memory fallback store used when USE_FIRESTORE=false (local dev).
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from google.cloud import firestore
from google.cloud.firestore_v1 import FieldFilter

from app.models.carbon import CarbonResult
from app.models.insights import InsightItem

if TYPE_CHECKING:
    from google.cloud.firestore import Client as FirestoreClient

logger = logging.getLogger(__name__)

COLLECTION = "carbon_entries"

# ---------------------------------------------------------------------------
# In-memory fallback store (keyed by device_id, list of entries)
# ---------------------------------------------------------------------------
_memory_store: dict[str, list[dict[str, Any]]] = {}


# ---------------------------------------------------------------------------
# Firestore helpers
# ---------------------------------------------------------------------------


def _get_client() -> FirestoreClient:
    """Return a Firestore client instance (lazy, not cached — Cloud Run handles pooling)."""
    return firestore.Client()


def _build_document(
    device_id: str,
    result: CarbonResult,
    insights: list[InsightItem],
) -> dict[str, Any]:
    """Build the Firestore document payload."""
    return {
        "device_id": device_id,
        "timestamp": datetime.now(tz=UTC),
        "total_kg": result.total_kg,
        "breakdown": result.breakdown,
        "ranked_categories": result.ranked_categories,
        "vs_global_average_pct": result.vs_global_average_pct,
        "vs_paris_target_pct": result.vs_paris_target_pct,
        "insights": [insight.model_dump() for insight in insights],
    }


# ---------------------------------------------------------------------------
# Firestore implementations
# ---------------------------------------------------------------------------


async def save_entry(
    device_id: str,
    result: CarbonResult,
    insights: list[InsightItem],
) -> str:
    """Persist a carbon entry to Firestore.

    Args:
        device_id: Anonymous device identifier.
        result: Calculated carbon result.
        insights: Generated insights.

    Returns:
        Firestore document ID.
    """
    doc_data = _build_document(device_id, result, insights)

    def _write() -> str:
        client = _get_client()
        doc_ref = client.collection(COLLECTION).document()
        doc_ref.set(doc_data)
        return doc_ref.id

    doc_id = await asyncio.get_event_loop().run_in_executor(None, _write)
    logger.info("Saved Firestore entry %s for device %s", doc_id, device_id[:8])
    return doc_id


async def get_history(device_id: str, limit: int = 20) -> list[dict[str, Any]]:
    """Retrieve carbon history entries for a device from Firestore.

    Args:
        device_id: Anonymous device identifier.
        limit: Maximum number of entries to return.

    Returns:
        List of entry dicts ordered newest first.
    """

    def _query() -> list[dict[str, Any]]:
        client = _get_client()
        query = (
            client.collection(COLLECTION)
            .where(filter=FieldFilter("device_id", "==", device_id))
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
        )
        entries = []
        for doc in query.stream():
            data = doc.to_dict()
            if data:
                data["id"] = doc.id
                # Convert Firestore Timestamp to ISO string for JSON serialisation
                if hasattr(data.get("timestamp"), "isoformat"):
                    data["timestamp"] = data["timestamp"].isoformat()
                entries.append(data)
        return entries

    return await asyncio.get_event_loop().run_in_executor(None, _query)


# ---------------------------------------------------------------------------
# In-memory fallback implementations (USE_FIRESTORE=false)
# ---------------------------------------------------------------------------


async def save_entry_memory(
    device_id: str,
    result: CarbonResult,
    insights: list[InsightItem],
) -> str:
    """Save a carbon footprint entry to the local in-memory store.

    Args:
        device_id: Anonymous device identifier.
        result: Calculated carbon footprint result.
        insights: Generated reduction insights.

    Returns:
        Generated memory document ID string.
    """
    doc_id = str(uuid.uuid4())
    entry: dict[str, Any] = {
        "id": doc_id,
        "device_id": device_id,
        "timestamp": datetime.now(tz=UTC).isoformat(),
        "total_kg": result.total_kg,
        "breakdown": result.breakdown,
        "ranked_categories": result.ranked_categories,
        "vs_global_average_pct": result.vs_global_average_pct,
        "vs_paris_target_pct": result.vs_paris_target_pct,
        "insights": [insight.model_dump() for insight in insights],
    }
    if device_id not in _memory_store:
        _memory_store[device_id] = []
    _memory_store[device_id].insert(0, entry)  # newest first
    logger.debug("Saved in-memory entry %s for device %s", doc_id, device_id[:8])
    return doc_id


async def get_history_memory(device_id: str, limit: int = 20) -> list[dict[str, Any]]:
    """Retrieve carbon calculation history for a device from memory.

    Args:
        device_id: Anonymous device identifier.
        limit: Maximum number of entries to return.

    Returns:
        List of historical entry dicts.
    """
    entries = _memory_store.get(device_id, [])
    return entries[:limit]
