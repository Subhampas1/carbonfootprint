"""
Google BigQuery analytics logging service.

Logs anonymised carbon events for aggregate analytics.
Privacy by design: device_id is NEVER logged — only aggregate stats.

All writes are fire-and-forget: failures are logged as warnings
and never propagate to the caller.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from google.cloud import bigquery

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# BigQuery schema for carbon_analytics.carbon_events:
# timestamp      TIMESTAMP   — UTC event time
# total_kg       FLOAT64     — user's total annual footprint
# diet_type      STRING      — dietary pattern (meat_heavy/meat_medium/vegetarian/vegan)
# insight_source STRING      — "gemini" or "rules"
# top_category   STRING      — highest-emission category (transport/home/diet/consumption)


def _write_to_bigquery(
    total_kg: float,
    diet_type: str,
    insight_source: str,
    top_category: str,
    dataset: str,
    table: str,
    project_id: str,
) -> None:
    """Synchronous BigQuery insert (runs in thread-pool executor)."""
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.{dataset}.{table}"

    rows = [
        {
            "timestamp": datetime.now(tz=UTC).isoformat(),
            "total_kg": total_kg,
            "diet_type": diet_type,
            "insight_source": insight_source,
            "top_category": top_category,
        }
    ]

    errors = client.insert_rows_json(table_id, rows)
    if errors:
        logger.warning("BigQuery insert errors: %s", errors)
    else:
        logger.debug(
            "BigQuery event logged: total_kg=%.1f diet=%s source=%s top=%s",
            total_kg,
            diet_type,
            insight_source,
            top_category,
        )


async def log_event_async(
    total_kg: float,
    diet_type: str,
    insight_source: str,
    top_category: str,
) -> None:
    """
    Asynchronously log a carbon calculation event to BigQuery.

    Runs the synchronous BigQuery client in the default thread-pool executor
    so it never blocks the asyncio event loop.

    This function NEVER raises — all exceptions are caught and logged.

    Args:
        total_kg: User's total annual footprint in kg CO2e.
        diet_type: User's dietary pattern string.
        insight_source: "gemini" or "rules".
        top_category: Highest-emission category name.
    """
    settings = get_settings()

    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            _write_to_bigquery,
            total_kg,
            diet_type,
            insight_source,
            top_category,
            settings.BIGQUERY_DATASET,
            settings.BIGQUERY_TABLE,
            settings.PROJECT_ID,
        )
    except Exception as exc:
        logger.warning(
            "BigQuery logging failed (non-critical): %s — %s",
            type(exc).__name__,
            exc,
        )
