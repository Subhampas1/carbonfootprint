"""Pydantic v2 data models for carbon footprint inputs and results."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CarbonInput(BaseModel):
    """Validated user lifestyle inputs for carbon calculation."""

    model_config = {"str_strip_whitespace": True}

    # -- Transport -----------------------------------------------------------
    transport_km_car_petrol: float = Field(
        default=0.0,
        ge=0,
        le=100_000,
        description="Annual km driven in a petrol/gasoline car",
    )
    transport_km_car_diesel: float = Field(
        default=0.0,
        ge=0,
        le=100_000,
        description="Annual km driven in a diesel car",
    )
    transport_km_car_electric: float = Field(
        default=0.0,
        ge=0,
        le=100_000,
        description="Annual km driven in a battery electric vehicle",
    )
    transport_km_bus: float = Field(
        default=0.0,
        ge=0,
        le=100_000,
        description="Annual km travelled by bus",
    )
    transport_km_train: float = Field(
        default=0.0,
        ge=0,
        le=100_000,
        description="Annual km travelled by train/metro",
    )
    flights_short_haul: int = Field(
        default=0,
        ge=0,
        le=50,
        description="Number of short-haul flights per year (journey < 3 hours / ~1000 km)",
    )
    flights_long_haul: int = Field(
        default=0,
        ge=0,
        le=20,
        description="Number of long-haul flights per year (journey > 3 hours / ~8000 km)",
    )

    # -- Home Energy ---------------------------------------------------------
    home_electricity_kwh: float = Field(
        default=0.0,
        ge=0,
        le=50_000,
        description="Annual household electricity consumption in kWh",
    )
    home_gas_kwh: float = Field(
        default=0.0,
        ge=0,
        le=50_000,
        description="Annual household natural gas consumption in kWh",
    )
    household_size: int = Field(
        default=1,
        ge=1,
        le=10,
        description="Number of people sharing the household (home emissions divided equally)",
    )

    # -- Diet & Lifestyle ----------------------------------------------------
    diet_type: Literal["meat_heavy", "meat_medium", "vegetarian", "vegan"] = Field(
        default="meat_medium",
        description="Primary dietary pattern",
    )
    consumption_level: Literal["high", "medium", "low"] = Field(
        default="medium",
        description="Shopping and goods consumption pattern",
    )

    # -- Identity ------------------------------------------------------------
    device_id: str = Field(
        min_length=8,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Opaque anonymous device identifier (alphanumeric, hyphens, underscores only)",
    )


class RankedCategory(BaseModel):
    """A single emission category ranked by emission size."""

    category: str = Field(description="Category name: transport, home, diet, or consumption")
    kg: float = Field(ge=0, description="Emissions for this category in kg CO\u2082e")
    percentage: float = Field(ge=0, le=100, description="Percentage of total footprint")


class CarbonResult(BaseModel):
    """Calculated carbon footprint result returned to the client."""

    total_kg: float = Field(description="Total annual carbon footprint in kg CO2e")
    breakdown: dict[str, float] = Field(
        description="Emission breakdown by category (transport, home, diet, consumption)"
    )
    vs_global_average_pct: float = Field(
        description="User's footprint as a percentage of the global average (4000 kg CO2e)"
    )
    vs_paris_target_pct: float = Field(
        description="User's footprint as a percentage of the Paris 1.5°C target (2000 kg CO2e)"
    )
    ranked_categories: list[RankedCategory] = Field(
        description=(
            "Categories sorted by emission size descending; "
            "each has category, kg, percentage"
        )
    )
    device_id: str = Field(description="Device identifier echoed back for client correlation")


class HistoryEntryResponse(BaseModel):
    """A single carbon footprint history entry returned from storage."""

    model_config = {"extra": "allow"}

    id: str = Field(description="Firestore document ID")
    timestamp: str = Field(
        default="",
        description="ISO 8601 UTC timestamp when the entry was recorded",
    )
    total_kg: float = Field(
        default=0.0, ge=0, description="Total annual carbon footprint in kg CO\u2082e"
    )
    breakdown: dict[str, float] = Field(
        default_factory=dict, description="Emission breakdown by category in kg CO\u2082e"
    )
    vs_global_average_pct: float = Field(
        default=0.0, description="Footprint as a percentage of the global average"
    )
    vs_paris_target_pct: float = Field(
        default=0.0, description="Footprint as a percentage of the Paris 1.5\u00b0C target"
    )
    ranked_categories: list[RankedCategory] = Field(
        default_factory=list, description="Categories sorted by emission size descending"
    )

