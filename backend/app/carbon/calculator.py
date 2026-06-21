"""
Pure carbon footprint calculation functions.

No I/O, no side effects — deterministic and fully testable.
All inputs come from validated Pydantic models (passed as dict).
"""

from __future__ import annotations

from typing import Any, cast

from app.carbon.factors import (
    CONSUMPTION,
    DIET,
    GLOBAL_AVERAGE,
    HOME,
    PARIS_TARGET,
    TRANSPORT,
)


def calculate_footprint(inputs: dict[str, Any]) -> dict[str, Any]:
    """Calculate annual carbon footprint from user lifestyle inputs.

    Args:
        inputs: Dict matching CarbonInput model fields (already validated).

    Returns:
        Dict with total_kg, breakdown, vs_global_average_pct,
        vs_paris_target_pct, and ranked_categories.
    """
    # ------------------------------------------------------------------
    # Transport
    # ------------------------------------------------------------------
    transport_kg = (
        inputs.get("transport_km_car_petrol", 0.0) * TRANSPORT["car_petrol"]
        + inputs.get("transport_km_car_diesel", 0.0) * TRANSPORT["car_diesel"]
        + inputs.get("transport_km_car_electric", 0.0) * TRANSPORT["car_electric"]
        + inputs.get("transport_km_bus", 0.0) * TRANSPORT["bus"]
        + inputs.get("transport_km_train", 0.0) * TRANSPORT["train"]
        + inputs.get("flights_short_haul", 0) * TRANSPORT["flight_short_haul_per_flight"]
        + inputs.get("flights_long_haul", 0) * TRANSPORT["flight_long_haul_per_flight"]
    )

    # ------------------------------------------------------------------
    # Home Energy (divided equally among household members)
    # ------------------------------------------------------------------
    household_size = max(inputs.get("household_size", 1), 1)
    home_kg = (
        inputs.get("home_electricity_kwh", 0.0) * HOME["electricity_per_kwh"]
        + inputs.get("home_gas_kwh", 0.0) * HOME["gas_per_kwh"]
    ) / household_size

    # ------------------------------------------------------------------
    # Diet (annual, already per-person)
    # ------------------------------------------------------------------
    diet_type = inputs.get("diet_type", "meat_medium")
    diet_kg = DIET.get(diet_type, DIET["meat_medium"])

    # ------------------------------------------------------------------
    # Consumption / Shopping
    # ------------------------------------------------------------------
    consumption_level = inputs.get("consumption_level", "medium")
    consumption_kg = CONSUMPTION.get(consumption_level, CONSUMPTION["medium"])

    # ------------------------------------------------------------------
    # Totals
    # ------------------------------------------------------------------
    breakdown: dict[str, float] = {
        "transport": round(transport_kg, 2),
        "home": round(home_kg, 2),
        "diet": round(diet_kg, 2),
        "consumption": round(consumption_kg, 2),
    }
    total_kg = round(sum(breakdown.values()), 2)

    # ------------------------------------------------------------------
    # Comparisons
    # ------------------------------------------------------------------
    vs_global_average_pct = round((total_kg / GLOBAL_AVERAGE) * 100, 1)
    vs_paris_target_pct = round((total_kg / PARIS_TARGET) * 100, 1)

    # ------------------------------------------------------------------
    # Rankings (highest emitting category first)
    # ------------------------------------------------------------------
    ranked_categories = sorted(
        [
            {
                "category": category,
                "kg": kg,
                "percentage": round((kg / total_kg) * 100, 1) if total_kg > 0 else 0.0,
            }
            for category, kg in breakdown.items()
        ],
        key=lambda x: cast(float, x["kg"]),
        reverse=True,
    )

    return {
        "total_kg": total_kg,
        "breakdown": breakdown,
        "vs_global_average_pct": vs_global_average_pct,
        "vs_paris_target_pct": vs_paris_target_pct,
        "ranked_categories": ranked_categories,
    }


def get_rule_based_insights(
    ranked_categories: list[dict[str, Any]],
    breakdown: dict[str, float],
    diet_type: str = "meat_medium",
    consumption_level: str = "medium",
    flights_short_haul: int = 0,
    flights_long_haul: int = 0,
) -> list[dict[str, Any]]:
    """Generate deterministic, rule-based carbon reduction insights.

    Args:
        ranked_categories: Sorted list of category emission dicts.
        breakdown: Per-category kg CO2e dict.
        diet_type: User's diet type pattern.
        consumption_level: User's goods consumption pattern level.
        flights_short_haul: Number of annual short-haul flights.
        flights_long_haul: Number of annual long-haul flights.

    Returns:
        List of exactly 3 insight dicts with priority and carbon savings.
    """
    transport_kg = breakdown.get("transport", 0.0)
    home_kg = breakdown.get("home", 0.0)

    candidate_insights: list[dict[str, Any]] = []

    # -- Transport insights --------------------------------------------------
    if transport_kg > 2000:
        candidate_insights.append(
            {
                "category": "transport",
                "action": (
                    "Switch to public transport or carpooling for your daily commute. "
                    "Replacing a petrol car commute with bus or train "
                    "cuts per-km emissions by ~75%."
                ),
                "estimated_saving_kg": round(transport_kg * 0.40, 1),
                "timeframe": "Achievable within 30 days",
                "priority": 1,
            }
        )
    elif transport_kg > 500:
        candidate_insights.append(
            {
                "category": "transport",
                "action": (
                    "Combine car trips and plan routes efficiently. "
                    "Reducing driving by 20% through trip consolidation saves fuel and emissions."
                ),
                "estimated_saving_kg": round(transport_kg * 0.20, 1),
                "timeframe": "Achievable within 30 days",
                "priority": 2,
            }
        )

    if flights_short_haul > 2 or flights_long_haul > 1:
        flight_saving = min(flights_short_haul, 1) * 255.0 + min(flights_long_haul, 1) * 1620.0
        candidate_insights.append(
            {
                "category": "transport",
                "action": (
                    "Replace one flight with a train journey or video call. "
                    "A single long-haul flight produces more CO2e than driving for 9,500 km."
                ),
                "estimated_saving_kg": round(flight_saving, 1),
                "timeframe": "Next planned trip",
                "priority": 1,
            }
        )

    # -- Home Energy insights ------------------------------------------------
    if home_kg > 1500:
        candidate_insights.append(
            {
                "category": "home",
                "action": (
                    "Install LED bulbs throughout your home and set a smart thermostat. "
                    "LEDs use 75% less energy; a 1°C thermostat reduction "
                    "saves ~3% on heating bills."
                ),
                "estimated_saving_kg": round(home_kg * 0.20, 1),
                "timeframe": "Achievable within 30 days",
                "priority": 2,
            }
        )
    elif home_kg > 500:
        candidate_insights.append(
            {
                "category": "home",
                "action": (
                    "Switch to a 100% renewable electricity tariff. "
                    "Green energy tariffs are now competitively priced "
                    "and eliminate electricity grid emissions."
                ),
                "estimated_saving_kg": round(home_kg * 0.15, 1),
                "timeframe": "Achievable within 7 days",
                "priority": 3,
            }
        )

    # -- Diet insights -------------------------------------------------------
    if diet_type == "meat_heavy":
        candidate_insights.append(
            {
                "category": "diet",
                "action": (
                    "Reduce red meat consumption to 3 times per week. "
                    "Beef has 20x the carbon footprint of chicken and "
                    "100x that of legumes per gram of protein."
                ),
                "estimated_saving_kg": 800.0,
                "timeframe": "Achievable within 30 days",
                "priority": 1,
            }
        )
    elif diet_type == "meat_medium":
        candidate_insights.append(
            {
                "category": "diet",
                "action": (
                    "Try 2 plant-based meals per day. "
                    "Swapping one beef meal per week for plant protein saves ~350 kg CO2e per year."
                ),
                "estimated_saving_kg": 400.0,
                "timeframe": "Achievable within 30 days",
                "priority": 2,
            }
        )

    # -- Consumption insights ------------------------------------------------
    if consumption_level == "high":
        candidate_insights.append(
            {
                "category": "consumption",
                "action": (
                    "Buy second-hand for your next clothing or electronics purchase. "
                    "Extending a garment's life by 9 months reduces "
                    "its carbon and water footprint by ~30%."
                ),
                "estimated_saving_kg": 600.0,
                "timeframe": "Next purchase decision",
                "priority": 2,
            }
        )
    elif consumption_level == "medium":
        candidate_insights.append(
            {
                "category": "consumption",
                "action": (
                    "Audit subscriptions and physical goods — "
                    "cancel unused services and avoid impulse purchases. "
                    "Reducing consumption by 20% saves both money "
                    "and ~500 kg CO2e annually."
                ),
                "estimated_saving_kg": 500.0,
                "timeframe": "Achievable within 30 days",
                "priority": 3,
            }
        )

    # -- Fallback generic insight (ensures we always have enough) -----------
    fallback_insight = {
        "category": "general",
        "action": (
            "Track your footprint monthly and set a 10% reduction target for next quarter. "
            "Consistent monitoring is the most effective habit to sustain long-term reductions."
        ),
        "estimated_saving_kg": round(sum(breakdown.values()) * 0.10, 1),
        "timeframe": "Ongoing",
        "priority": 3,
    }

    # Sort candidates: highest priority (lowest number) first,
    # then by estimated_saving_kg descending
    candidate_insights.sort(key=lambda x: (x["priority"], -x["estimated_saving_kg"]))

    # Ensure exactly 3 insights
    insights = candidate_insights[:3]
    while len(insights) < 3:
        insights.append(fallback_insight)

    # Assign sequential priority numbers in final list
    for idx, insight in enumerate(insights, start=1):
        insight["priority"] = idx

    return insights
