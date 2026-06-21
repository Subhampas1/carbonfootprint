"""
Google Cloud Pub/Sub event publishing service.

Publishes lightweight events when carbon insights are generated, enabling
downstream consumers (Cloud Functions, Dataflow, etc.) to react in real-time.

All publishes are fire-and-forget: failures are logged as warnings
and never propagate to the caller.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime

import google.cloud.pubsub_v1 as pubsub_v1

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _publish_message(
    project_id: str,
    topic_id: str,
    payload: dict,
) -> None:
    """Synchronous Pub/Sub publish (runs in thread-pool executor)."""
    publisher = pubsub_v1.PublisherClient()
    topic_path = publisher.topic_path(project_id, topic_id)

    data = json.dumps(payload).encode("utf-8")
    future = publisher.publish(topic_path, data)
    message_id = future.result(timeout=10)
    logger.debug("Pub/Sub message published: %s to %s", message_id, topic_path)


async def publish_insight_request(
    footprint_total: float,
    top_category: str,
) -> None:
    """
    Asynchronously publish a carbon insight event to Pub/Sub.

    Payload (no PII):
        footprint_total: Total annual kg CO2e
        top_category: Highest-emission category name
        timestamp: UTC ISO 8601 string

    This function NEVER raises — all exceptions are caught and logged.

    Args:
        footprint_total: User's total annual footprint in kg CO2e.
        top_category: Name of the user's highest-emission category.
    """
    settings = get_settings()

    payload = {
        "footprint_total": footprint_total,
        "top_category": top_category,
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }

    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            _publish_message,
            settings.PROJECT_ID,
            settings.PUBSUB_TOPIC,
            payload,
        )
    except Exception as exc:
        logger.warning(
            "Pub/Sub publish failed (non-critical): %s — %s",
            type(exc).__name__,
            exc,
        )
