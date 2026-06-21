"""
Integration tests for all API route endpoints.

Uses FastAPI TestClient (synchronous HTTPX). All GCP services are mocked
via environment variables (USE_*=false) set in conftest.py.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.services.gemini_service import GeminiUnavailableError


class TestCalculateEndpoint:
    """Tests for POST /api/calculate."""

    def test_calculate_returns_200(self, client: TestClient, sample_carbon_input: dict):
        response = client.post("/api/calculate", json=sample_carbon_input)
        assert response.status_code == 200

    def test_calculate_returns_correct_structure(
        self, client: TestClient, sample_carbon_input: dict
    ):
        response = client.post("/api/calculate", json=sample_carbon_input)
        data = response.json()
        assert "total_kg" in data
        assert "breakdown" in data
        assert "ranked_categories" in data
        assert "vs_global_average_pct" in data
        assert "vs_paris_target_pct" in data
        assert "device_id" in data

    def test_calculate_breakdown_has_four_categories(
        self, client: TestClient, sample_carbon_input: dict
    ):
        response = client.post("/api/calculate", json=sample_carbon_input)
        breakdown = response.json()["breakdown"]
        assert set(breakdown.keys()) == {"transport", "home", "diet", "consumption"}

    def test_calculate_validates_negative_km(self, client: TestClient):
        """Negative km values should be rejected with 422 Unprocessable Entity."""
        response = client.post(
            "/api/calculate",
            json={
                "transport_km_car_petrol": -1,
                "device_id": "test-device-001",
            },
        )
        assert response.status_code == 422

    def test_calculate_validates_invalid_diet_type(self, client: TestClient):
        """An unlisted diet_type should be rejected with 422."""
        response = client.post(
            "/api/calculate",
            json={
                "diet_type": "omnivore",
                "device_id": "test-device-001",
            },
        )
        assert response.status_code == 422

    def test_calculate_validates_missing_device_id(self, client: TestClient):
        """Missing device_id should be rejected with 422."""
        response = client.post(
            "/api/calculate",
            json={"transport_km_car_petrol": 1000},
        )
        assert response.status_code == 422

    def test_calculate_total_kg_is_positive(self, client: TestClient, sample_carbon_input: dict):
        response = client.post("/api/calculate", json=sample_carbon_input)
        assert response.json()["total_kg"] > 0

    def test_calculate_ranked_categories_sorted_desc(
        self, client: TestClient, sample_carbon_input: dict
    ):
        response = client.post("/api/calculate", json=sample_carbon_input)
        ranked = response.json()["ranked_categories"]
        for i in range(len(ranked) - 1):
            assert ranked[i]["kg"] >= ranked[i + 1]["kg"]


class TestInsightsEndpoint:
    """Tests for POST /api/insights."""

    def test_insights_uses_gemini_when_available(
        self,
        client: TestClient,
        sample_carbon_result: dict,
        mock_gemini,
    ):
        """When Gemini succeeds, source should be 'gemini'."""
        with patch("app.routes.insights.get_settings") as mock_settings:
            mock_settings.return_value.USE_GEMINI = True
            mock_settings.return_value.USE_BIGQUERY = False
            mock_settings.return_value.USE_PUBSUB = False

            response = client.post(
                "/api/insights",
                json={
                    "carbon_result": sample_carbon_result,
                    "device_id": "test-device-001",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "gemini"
        assert len(data["insights"]) == 3

    def test_insights_falls_back_to_rules_on_gemini_error(
        self,
        client: TestClient,
        sample_carbon_result: dict,
    ):
        """When Gemini raises GeminiUnavailableError, source should be 'rules'."""
        with (
            patch(
                "app.routes.insights.generate_insights_gemini",
                new_callable=AsyncMock,
                side_effect=GeminiUnavailableError("network timeout"),
            ),
            patch("app.routes.insights.get_settings") as mock_settings,
        ):
            mock_settings.return_value.USE_GEMINI = True
            mock_settings.return_value.USE_BIGQUERY = False
            mock_settings.return_value.USE_PUBSUB = False

            response = client.post(
                "/api/insights",
                json={
                    "carbon_result": sample_carbon_result,
                    "device_id": "test-device-001",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "rules"
        assert len(data["insights"]) == 3

    def test_insights_returns_total_potential_saving(
        self, client: TestClient, sample_carbon_result: dict
    ):
        response = client.post(
            "/api/insights",
            json={
                "carbon_result": sample_carbon_result,
                "device_id": "test-device-001",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_potential_saving_kg"] > 0


class TestEntriesEndpoint:
    """Tests for POST/GET /api/entries."""

    def test_entries_get_invalid_device_id_special_chars(self, client: TestClient):
        """device_id with spaces/special chars should return 422."""
        response = client.get("/api/entries/bad device id!")
        assert response.status_code in (404, 422)

    def test_entries_get_too_short_device_id(self, client: TestClient):
        """device_id shorter than 8 chars should return 422."""
        response = client.get("/api/entries/short")
        assert response.status_code == 422

    def test_entries_get_returns_list(self, client: TestClient):
        """GET /api/entries/{device_id} with valid id should return a list."""
        response = client.get("/api/entries/valid-device-001")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestHealthEndpoint:
    """Tests for GET /api/health."""

    def test_health_returns_200(self, client: TestClient):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_returns_healthy_status(self, client: TestClient):
        data = client.get("/api/health").json()
        assert data["status"] == "healthy"

    def test_health_returns_services_map(self, client: TestClient):
        data = client.get("/api/health").json()
        assert "services" in data
        services = data["services"]
        assert all(k in services for k in ["gemini", "firestore", "bigquery", "pubsub"])

    def test_health_returns_version(self, client: TestClient):
        data = client.get("/api/health").json()
        assert data["version"] == "1.0.0"
