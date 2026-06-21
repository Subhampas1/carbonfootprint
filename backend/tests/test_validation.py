"""
Tests for Pydantic v2 model validation constraints.

Verifies that invalid inputs are rejected with ValidationError
before reaching any business logic.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.carbon import CarbonInput
from app.models.insights import InsightItem


class TestCarbonInputValidation:
    """Tests for CarbonInput Pydantic model validation."""

    def _valid_base(self) -> dict:
        """Minimal valid CarbonInput payload."""
        return {"device_id": "valid-device-001"}

    def test_all_defaults_valid_with_only_device_id(self):
        """Only device_id is required; all other fields have valid defaults."""
        model = CarbonInput(**self._valid_base())
        assert model.device_id == "valid-device-001"
        assert model.transport_km_car_petrol == 0.0
        assert model.diet_type == "meat_medium"
        assert model.consumption_level == "medium"

    def test_device_id_too_short_raises_validation_error(self):
        """device_id shorter than 8 chars must raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CarbonInput(device_id="short")
        errors = exc_info.value.errors()
        assert any("device_id" in str(e["loc"]) for e in errors)

    def test_device_id_with_spaces_raises_validation_error(self):
        """device_id containing spaces (not alphanumeric/-/_) must raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CarbonInput(device_id="device with spaces!")
        errors = exc_info.value.errors()
        assert any("device_id" in str(e["loc"]) for e in errors)

    def test_device_id_with_special_chars_raises_validation_error(self):
        """device_id with special characters must raise ValidationError."""
        with pytest.raises(ValidationError):
            CarbonInput(device_id="dev!@#$%^&*()")

    def test_household_size_zero_raises_validation_error(self):
        """household_size=0 violates ge=1 constraint."""
        with pytest.raises(ValidationError) as exc_info:
            CarbonInput(device_id="valid-device-001", household_size=0)
        errors = exc_info.value.errors()
        assert any("household_size" in str(e["loc"]) for e in errors)

    def test_flights_short_haul_exceeds_max_raises_validation_error(self):
        """flights_short_haul=51 violates le=50 constraint."""
        with pytest.raises(ValidationError) as exc_info:
            CarbonInput(device_id="valid-device-001", flights_short_haul=51)
        errors = exc_info.value.errors()
        assert any("flights_short_haul" in str(e["loc"]) for e in errors)

    def test_flights_long_haul_exceeds_max_raises_validation_error(self):
        """flights_long_haul=21 violates le=20 constraint."""
        with pytest.raises(ValidationError):
            CarbonInput(device_id="valid-device-001", flights_long_haul=21)

    def test_invalid_diet_type_literal_raises_validation_error(self):
        """An unrecognised diet_type should raise ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            CarbonInput(device_id="valid-device-001", diet_type="paleo")  # type: ignore[arg-type]
        errors = exc_info.value.errors()
        assert any("diet_type" in str(e["loc"]) for e in errors)

    def test_invalid_consumption_level_raises_validation_error(self):
        """An unrecognised consumption_level should raise ValidationError."""
        with pytest.raises(ValidationError):
            CarbonInput(device_id="valid-device-001", consumption_level="extreme")  # type: ignore[arg-type]

    def test_negative_km_raises_validation_error(self):
        """Negative km values violate ge=0 constraints."""
        with pytest.raises(ValidationError):
            CarbonInput(device_id="valid-device-001", transport_km_car_petrol=-100)

    def test_electricity_kwh_exceeds_max_raises_validation_error(self):
        """home_electricity_kwh > 50000 violates le=50000 constraint."""
        with pytest.raises(ValidationError):
            CarbonInput(device_id="valid-device-001", home_electricity_kwh=50_001)

    def test_device_id_at_max_length_is_valid(self):
        """device_id at exactly 64 chars should be accepted."""
        long_id = "a" * 64
        model = CarbonInput(device_id=long_id)
        assert len(model.device_id) == 64

    def test_device_id_too_long_raises_validation_error(self):
        """device_id longer than 64 chars should raise ValidationError."""
        with pytest.raises(ValidationError):
            CarbonInput(device_id="a" * 65)


class TestInsightItemValidation:
    """Tests for InsightItem Pydantic model validation."""

    def test_valid_insight_item_accepted(self):
        item = InsightItem(
            category="transport",
            action="Switch to public transport.",
            estimated_saving_kg=800.0,
            timeframe="30 days",
            priority=1,
        )
        assert item.priority == 1

    def test_priority_zero_raises_validation_error(self):
        """priority must be >= 1."""
        with pytest.raises(ValidationError):
            InsightItem(
                category="transport",
                action="action",
                estimated_saving_kg=100.0,
                timeframe="30 days",
                priority=0,
            )

    def test_priority_four_raises_validation_error(self):
        """priority must be <= 3."""
        with pytest.raises(ValidationError):
            InsightItem(
                category="transport",
                action="action",
                estimated_saving_kg=100.0,
                timeframe="30 days",
                priority=4,
            )

    def test_negative_estimated_saving_raises_validation_error(self):
        """estimated_saving_kg must be >= 0."""
        with pytest.raises(ValidationError):
            InsightItem(
                category="transport",
                action="action",
                estimated_saving_kg=-50.0,
                timeframe="30 days",
                priority=1,
            )
