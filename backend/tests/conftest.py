"""
Pytest fixtures and shared test configuration.

All Google Cloud services are mocked so tests run without GCP credentials.
Feature flags are all set to False via environment variables in CI.
"""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# Force all GCP services OFF before importing the app
os.environ.setdefault("USE_GEMINI", "false")
os.environ.setdefault("USE_FIRESTORE", "false")
os.environ.setdefault("USE_BIGQUERY", "false")
os.environ.setdefault("USE_PUBSUB", "false")
os.environ.setdefault("PROJECT_ID", "test-project")

from app.main import app  # noqa: E402
from app.models.insights import InsightItem  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    """FastAPI test client — reused across all tests in a session."""
    return TestClient(app)


@pytest.fixture
def mock_gemini():
    """Mock the Gemini service to return predictable insight dicts."""
    mock_insights = [
        {
            "category": "transport",
            "action": "Switch to public transport for your commute.",
            "estimated_saving_kg": 1200.0,
            "timeframe": "Achievable within 30 days",
            "priority": 1,
        },
        {
            "category": "home",
            "action": "Install a smart thermostat.",
            "estimated_saving_kg": 400.0,
            "timeframe": "Achievable within 30 days",
            "priority": 2,
        },
        {
            "category": "diet",
            "action": "Try 2 plant-based days per week.",
            "estimated_saving_kg": 350.0,
            "timeframe": "Achievable within 30 days",
            "priority": 3,
        },
    ]
    with patch(
        "app.routes.insights.generate_insights_gemini",
        new_callable=AsyncMock,
    ) as mock:
        mock.return_value = [InsightItem(**d) for d in mock_insights]
        yield mock


@pytest.fixture
def mock_firestore():
    """Mock both save and get_history Firestore calls."""
    with (
        patch(
            "app.routes.entries.firestore_service.save_entry",
            new_callable=AsyncMock,
            return_value="test-doc-id-abc123",
        ) as mock_save,
        patch(
            "app.routes.entries.firestore_service.get_history",
            new_callable=AsyncMock,
            return_value=[],
        ) as mock_get,
    ):
        yield mock_save, mock_get


@pytest.fixture
def sample_carbon_input() -> dict:
    """Realistic carbon input payload for use across multiple tests."""
    return {
        "transport_km_car_petrol": 10000,
        "transport_km_car_diesel": 0,
        "transport_km_car_electric": 0,
        "transport_km_bus": 2000,
        "transport_km_train": 1000,
        "flights_short_haul": 2,
        "flights_long_haul": 1,
        "home_electricity_kwh": 3500,
        "home_gas_kwh": 8000,
        "household_size": 2,
        "diet_type": "meat_medium",
        "consumption_level": "medium",
        "device_id": "test-device-001",
    }


@pytest.fixture
def sample_carbon_result(client: TestClient, sample_carbon_input: dict) -> dict:
    """Calculate and return a real carbon result for use in downstream tests."""
    response = client.post("/api/calculate", json=sample_carbon_input)
    assert response.status_code == 200
    return response.json()
