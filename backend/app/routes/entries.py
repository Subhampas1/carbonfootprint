"""
/api/entries — Save and retrieve carbon footprint history.

POST /api/entries       — Persist a carbon entry + insights to Firestore.
GET  /api/entries/{id} — Retrieve history for a specific device.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import get_type_hints

from fastapi import APIRouter, HTTPException, Path, Request
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.rate_limit import ENTRIES_LIMIT, limiter
from app.core.security import validate_device_id
from app.models.carbon import CarbonResult, HistoryEntryResponse
from app.models.insights import InsightItem
from app.services import firestore_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Entries"])


class SaveEntryRequest(BaseModel):
    """Body for POST /api/entries."""

    carbon_result: CarbonResult
    insights: list[InsightItem]


class SaveEntryResponse(BaseModel):
    """Response for POST /api/entries."""

    id: str
    saved_at: datetime


@limiter.limit(ENTRIES_LIMIT)
async def save_entry(request: Request, body: SaveEntryRequest) -> SaveEntryResponse:
    """Save carbon entry to Firestore (or in-memory fallback)."""
    settings = get_settings()
    device_id = body.carbon_result.device_id

    if settings.USE_FIRESTORE:
        doc_id = await firestore_service.save_entry(
            device_id=device_id,
            result=body.carbon_result,
            insights=body.insights,
        )
    else:
        doc_id = await firestore_service.save_entry_memory(
            device_id=device_id,
            result=body.carbon_result,
            insights=body.insights,
        )

    return SaveEntryResponse(
        id=doc_id,
        saved_at=datetime.now(tz=UTC),
    )


@limiter.limit(ENTRIES_LIMIT)
async def get_entries(
    request: Request,
    device_id: str = Path(
        min_length=8,
        max_length=64,
        description="Anonymous device identifier",
    ),
) -> list[HistoryEntryResponse]:
    """Retrieve entry history for a device."""
    if not validate_device_id(device_id):
        raise HTTPException(
            status_code=422,
            detail="device_id must be 8–64 alphanumeric characters, hyphens, or underscores",
        )

    settings = get_settings()
    limit = settings.MAX_HISTORY_ENTRIES

    if settings.USE_FIRESTORE:
        entries = await firestore_service.get_history(device_id=device_id, limit=limit)
    else:
        entries = await firestore_service.get_history_memory(device_id=device_id, limit=limit)

    return [HistoryEntryResponse(**entry) for entry in entries]


# Rebuild local Pydantic models
SaveEntryRequest.model_rebuild()
SaveEntryResponse.model_rebuild()

# Resolve annotations on route handlers
save_entry.__annotations__ = get_type_hints(save_entry)
if hasattr(save_entry, "__wrapped__"):
    save_entry.__wrapped__.__annotations__ = get_type_hints(save_entry.__wrapped__)

get_entries.__annotations__ = get_type_hints(get_entries)
if hasattr(get_entries, "__wrapped__"):
    get_entries.__wrapped__.__annotations__ = get_type_hints(get_entries.__wrapped__)

# Add routes manually to the router
router.add_api_route(
    "/entries",
    endpoint=save_entry,
    methods=["POST"],
    response_model=SaveEntryResponse,
    summary="Save a carbon footprint entry",
    description=(
        "Persist a carbon result and its associated insights "
        "to Firestore for history tracking."
    ),
)

router.add_api_route(
    "/entries/{device_id}",
    endpoint=get_entries,
    methods=["GET"],
    response_model=list[HistoryEntryResponse],
    summary="Get carbon history for a device",
    description="Retrieve the last 20 carbon footprint entries for a device, newest first.",
)
