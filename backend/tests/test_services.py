"""
Tests for GCP service fallbacks, integrations, and in-memory implementations.

Covers the in-memory Firestore paths (USE_FIRESTORE=false), mock tests for
the real GCP SDK operations, and endpoint conditional routing paths.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import Settings
from app.models.carbon import CarbonResult
from app.models.insights import InsightItem
from app.services import bigquery_service, firestore_service, gemini_service, pubsub_service
from app.services.gemini_service import GeminiUnavailableError

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


def _make_result(**kwargs) -> CarbonResult:
    defaults = dict(
        total_kg=5000.0,
        breakdown={"transport": 2500.0, "home": 1000.0, "diet": 1000.0, "consumption": 500.0},
        vs_global_average_pct=125.0,
        vs_paris_target_pct=250.0,
        ranked_categories=[
            {"category": "transport", "kg": 2500.0, "percentage": 50.0},
            {"category": "home", "kg": 1000.0, "percentage": 20.0},
            {"category": "diet", "kg": 1000.0, "percentage": 20.0},
            {"category": "consumption", "kg": 500.0, "percentage": 10.0},
        ],
        device_id="test-device-001",
    )
    defaults.update(kwargs)
    return CarbonResult(**defaults)


def _make_insight(category: str = "transport", priority: int = 1) -> InsightItem:
    return InsightItem(
        category=category,
        action="Take public transport.",
        estimated_saving_kg=800.0,
        timeframe="Achievable within 30 days",
        priority=priority,
    )


# ---------------------------------------------------------------------------
# In-memory Firestore service tests
# ---------------------------------------------------------------------------


class TestInMemoryFirestoreService:
    """Tests for save_entry_memory and get_history_memory."""

    def setup_method(self):
        """Clear the in-memory store before each test."""
        firestore_service._memory_store.clear()

    @pytest.mark.asyncio
    async def test_save_entry_memory_returns_doc_id(self):
        """save_entry_memory must return a non-empty string ID."""
        result = _make_result()
        insights = [_make_insight()]
        doc_id = await firestore_service.save_entry_memory(
            device_id="dev-test-001", result=result, insights=insights
        )
        assert isinstance(doc_id, str)
        assert len(doc_id) > 0

    @pytest.mark.asyncio
    async def test_save_entry_memory_stores_entry(self):
        """Saved entry is retrievable via get_history_memory."""
        result = _make_result(device_id="dev-test-002")
        insights = [_make_insight()]
        doc_id = await firestore_service.save_entry_memory(
            device_id="dev-test-002", result=result, insights=insights
        )
        history = await firestore_service.get_history_memory("dev-test-002")
        assert len(history) == 1
        assert history[0]["id"] == doc_id
        assert history[0]["total_kg"] == 5000.0

    @pytest.mark.asyncio
    async def test_get_history_memory_returns_empty_for_unknown_device(self):
        """Unknown device returns empty list."""
        history = await firestore_service.get_history_memory("unknown-device-999")
        assert history == []

    @pytest.mark.asyncio
    async def test_save_multiple_entries_returned_newest_first(self):
        """Multiple entries are stored newest-first."""
        result1 = _make_result(total_kg=4000.0)
        result2 = _make_result(total_kg=5000.0)
        await firestore_service.save_entry_memory(
            device_id="dev-order-test", result=result1, insights=[]
        )
        await firestore_service.save_entry_memory(
            device_id="dev-order-test", result=result2, insights=[]
        )
        history = await firestore_service.get_history_memory("dev-order-test")
        assert len(history) == 2
        # Most recent entry (result2 = 5000 kg) should be first
        assert history[0]["total_kg"] == 5000.0

    @pytest.mark.asyncio
    async def test_get_history_memory_respects_limit(self):
        """Limit parameter correctly caps returned entries."""
        result = _make_result()
        for _ in range(5):
            await firestore_service.save_entry_memory(
                device_id="dev-limit-test", result=result, insights=[]
            )
        history = await firestore_service.get_history_memory("dev-limit-test", limit=3)
        assert len(history) == 3

    @pytest.mark.asyncio
    async def test_save_entry_memory_includes_insights(self):
        """Saved entry includes serialised insights."""
        result = _make_result()
        insights = [
            _make_insight("transport", 1),
            _make_insight("diet", 2),
            _make_insight("home", 3),
        ]
        await firestore_service.save_entry_memory(
            device_id="dev-insights-test", result=result, insights=insights
        )
        history = await firestore_service.get_history_memory("dev-insights-test")
        assert len(history[0]["insights"]) == 3
        assert history[0]["insights"][0]["category"] == "transport"


# ---------------------------------------------------------------------------
# Real Firestore SDK Integration Tests
# ---------------------------------------------------------------------------


class TestFirestoreServiceIntegration:
    """Mock testing target Firestore API calls."""

    @pytest.mark.asyncio
    async def test_firestore_save_entry_success(self):
        mock_client = MagicMock()
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "mock-doc-123"
        mock_client.collection.return_value.document.return_value = mock_doc_ref

        with patch("app.services.firestore_service._get_client", return_value=mock_client):
            doc_id = await firestore_service.save_entry(
                device_id="dev-test-123", result=_make_result(), insights=[_make_insight()]
            )
            assert doc_id == "mock-doc-123"
            mock_client.collection.assert_called_with("carbon_entries")

    @pytest.mark.asyncio
    async def test_firestore_get_history_success(self):
        mock_client = MagicMock()
        mock_doc1 = MagicMock()
        mock_doc1.id = "doc-1"

        class MockTimestamp:
            def isoformat(self):
                return "2025-06-01T12:00:00Z"

        mock_doc1.to_dict.return_value = {
            "device_id": "dev-test-123",
            "timestamp": MockTimestamp(),
            "total_kg": 3000.0,
            "breakdown": {},
            "ranked_categories": [],
            "insights": [],
        }

        mock_query = MagicMock()
        mock_query.stream.return_value = [mock_doc1]
        collection_mock = mock_client.collection.return_value
        collection_mock.where.return_value.order_by.return_value.limit.return_value = mock_query

        with patch("app.services.firestore_service._get_client", return_value=mock_client):
            history = await firestore_service.get_history(device_id="dev-test-123", limit=5)
            assert len(history) == 1
            assert history[0]["id"] == "doc-1"
            assert history[0]["total_kg"] == 3000.0


# ---------------------------------------------------------------------------
# BigQuery logging tests
# ---------------------------------------------------------------------------


class TestBigQueryLogging:
    """Tests for the BigQuery log helper."""

    @pytest.mark.asyncio
    async def test_log_event_async_catches_exceptions(self):
        """log_event_async must never raise — it catches all exceptions internally."""
        with patch("google.cloud.bigquery.Client", side_effect=Exception("BQ failure")):
            result = await bigquery_service.log_event_async(
                total_kg=5000.0,
                diet_type="meat_medium",
                insight_source="rules",
                top_category="transport",
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_bigquery_log_event_success(self):
        mock_client = MagicMock()
        mock_client.insert_rows_json.return_value = []

        with patch("google.cloud.bigquery.Client", return_value=mock_client):
            await bigquery_service.log_event_async(
                total_kg=5000.0, diet_type="vegan", insight_source="rules", top_category="home"
            )
            mock_client.insert_rows_json.assert_called_once()


# ---------------------------------------------------------------------------
# Pub/Sub service tests
# ---------------------------------------------------------------------------


class TestPubSubService:
    """Tests for the Pub/Sub publish helper."""

    @pytest.mark.asyncio
    async def test_publish_insight_request_catches_exceptions(self):
        """publish_insight_request must never raise — it catches all exceptions internally."""
        with patch("google.cloud.pubsub_v1.PublisherClient", side_effect=Exception("PubSub down")):
            result = await pubsub_service.publish_insight_request(
                footprint_total=5000.0,
                top_category="transport",
            )
            assert result is None

    @pytest.mark.asyncio
    async def test_pubsub_publish_success(self):
        mock_publisher = MagicMock()
        mock_future = MagicMock()
        mock_future.result.return_value = "msg-999"
        mock_publisher.publish.return_value = mock_future

        with patch("google.cloud.pubsub_v1.PublisherClient", return_value=mock_publisher):
            await pubsub_service.publish_insight_request(
                footprint_total=5000.0, top_category="home"
            )
            mock_publisher.publish.assert_called_once()


# ---------------------------------------------------------------------------
# Gemini Service tests
# ---------------------------------------------------------------------------


class TestGeminiService:
    """Tests for the Gemini AI generation logic and edge case handlers."""

    @pytest.mark.asyncio
    async def test_gemini_generate_insights_success(self):
        mock_response = MagicMock()
        mock_response.text = json.dumps(
            [
                {
                    "category": "diet",
                    "action": "Swap beef.",
                    "estimated_saving_kg": 400.0,
                    "timeframe": "30 days",
                    "priority": 1,
                },
                {
                    "category": "transport",
                    "action": "Carpool.",
                    "estimated_saving_kg": 300.0,
                    "timeframe": "30 days",
                    "priority": 2,
                },
                {
                    "category": "home",
                    "action": "LEDs.",
                    "estimated_saving_kg": 200.0,
                    "timeframe": "30 days",
                    "priority": 3,
                },
            ]
        )

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response

        with (
            patch("app.services.gemini_service.vertexai.init"),
            patch("app.services.gemini_service.GenerativeModel", return_value=mock_model),
        ):
            res = await gemini_service.generate_insights_gemini(
                ranked_categories=[], breakdown={}, total_kg=4000.0
            )
            assert len(res) == 3
            assert res[0].category == "diet"

    @pytest.mark.asyncio
    async def test_gemini_generate_insights_with_code_fences(self):
        mock_response = MagicMock()
        mock_response.text = (
            "```json\n"
            + json.dumps(
                [
                    {
                        "category": "diet",
                        "action": "Swap beef.",
                        "estimated_saving_kg": 400.0,
                        "timeframe": "30 days",
                        "priority": 1,
                    },
                    {
                        "category": "transport",
                        "action": "Carpool.",
                        "estimated_saving_kg": 300.0,
                        "timeframe": "30 days",
                        "priority": 2,
                    },
                    {
                        "category": "home",
                        "action": "LEDs.",
                        "estimated_saving_kg": 200.0,
                        "timeframe": "30 days",
                        "priority": 3,
                    },
                ]
            )
            + "\n```"
        )

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response

        with (
            patch("app.services.gemini_service.vertexai.init"),
            patch("app.services.gemini_service.GenerativeModel", return_value=mock_model),
        ):
            res = await gemini_service.generate_insights_gemini(
                ranked_categories=[], breakdown={}, total_kg=4000.0
            )
            assert len(res) == 3
            assert res[0].category == "diet"

    @pytest.mark.asyncio
    async def test_gemini_generate_insights_generic_error_wraps(self):
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("API limit")

        with (
            patch("app.services.gemini_service.vertexai.init"),
            patch("app.services.gemini_service.GenerativeModel", return_value=mock_model),
        ):
            with pytest.raises(GeminiUnavailableError):
                await gemini_service.generate_insights_gemini(
                    ranked_categories=[], breakdown={}, total_kg=4000.0
                )


# ---------------------------------------------------------------------------
# Endpoint conditional branching tests
# ---------------------------------------------------------------------------


class TestRoutingConditionalBranches:
    """Tests that execute the alternate GCP-enabled paths in FastAPIs routes."""

    @pytest.mark.asyncio
    async def test_routes_save_entry_firestore_branch(self, client):
        mock_settings = Settings(
            USE_FIRESTORE=True, USE_GEMINI=False, USE_BIGQUERY=False, USE_PUBSUB=False
        )

        payload = {
            "carbon_result": {
                "total_kg": 5000.0,
                "breakdown": {
                    "transport": 2500.0,
                    "home": 1000.0,
                    "diet": 1000.0,
                    "consumption": 500.0,
                },
                "vs_global_average_pct": 125.0,
                "vs_paris_target_pct": 250.0,
                "ranked_categories": [{"category": "transport", "kg": 2500.0, "percentage": 50.0}],
                "device_id": "test-device-001",
            },
            "insights": [],
        }

        with (
            patch("app.routes.entries.get_settings", return_value=mock_settings),
            patch(
                "app.routes.entries.firestore_service.save_entry",
                new_callable=AsyncMock,
                return_value="doc-firestore-123",
            ),
        ):
            response = client.post("/api/entries", json=payload)
            assert response.status_code == 200
            assert response.json()["id"] == "doc-firestore-123"

    @pytest.mark.asyncio
    async def test_routes_get_entries_firestore_branch(self, client):
        mock_settings = Settings(
            USE_FIRESTORE=True, USE_GEMINI=False, USE_BIGQUERY=False, USE_PUBSUB=False
        )

        with (
            patch("app.routes.entries.get_settings", return_value=mock_settings),
            patch(
                "app.routes.entries.firestore_service.get_history",
                new_callable=AsyncMock,
                return_value=[{"id": "doc-firestore-123"}],
            ),
        ):
            response = client.get("/api/entries/test-device-001")
            assert response.status_code == 200
            assert response.json()[0]["id"] == "doc-firestore-123"

    @pytest.mark.asyncio
    async def test_routes_insights_analytics_branches(self, client):
        mock_settings = Settings(
            USE_GEMINI=False, USE_FIRESTORE=False, USE_BIGQUERY=True, USE_PUBSUB=True
        )

        payload = {
            "carbon_result": {
                "total_kg": 5000.0,
                "breakdown": {
                    "transport": 2500.0,
                    "home": 1000.0,
                    "diet": 1000.0,
                    "consumption": 500.0,
                },
                "vs_global_average_pct": 125.0,
                "vs_paris_target_pct": 250.0,
                "ranked_categories": [{"category": "transport", "kg": 2500.0, "percentage": 50.0}],
                "device_id": "test-device-001",
            },
            "device_id": "test-device-001",
        }

        with (
            patch("app.routes.insights.get_settings", return_value=mock_settings),
            patch("app.routes.insights.bigquery_service.log_event_async") as mock_bq,
            patch("app.routes.insights.pubsub_service.publish_insight_request") as mock_ps,
        ):
            response = client.post("/api/insights", json=payload)
            assert response.status_code == 200
            mock_bq.assert_called_once()
            mock_ps.assert_called_once()
