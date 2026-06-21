"""
Unit tests for the carbon calculator engine.

All tests operate on pure functions with no I/O dependencies.
"""

from __future__ import annotations

import pytest

from app.carbon.calculator import calculate_footprint, get_rule_based_insights
from app.carbon.factors import PARIS_TARGET, TRANSPORT


class TestCalculateFootprint:
    """Tests for the calculate_footprint() pure function."""

    def test_zero_inputs_returns_diet_and_consumption_only(self):
        """When all transport/home inputs are 0, total = diet + consumption only."""
        result = calculate_footprint(
            {
                "transport_km_car_petrol": 0,
                "transport_km_car_diesel": 0,
                "transport_km_car_electric": 0,
                "transport_km_bus": 0,
                "transport_km_train": 0,
                "flights_short_haul": 0,
                "flights_long_haul": 0,
                "home_electricity_kwh": 0,
                "home_gas_kwh": 0,
                "household_size": 1,
                "diet_type": "meat_medium",
                "consumption_level": "medium",
            }
        )
        assert result["breakdown"]["transport"] == 0.0
        assert result["breakdown"]["home"] == 0.0
        # diet_medium = 2500, consumption_medium = 2500
        assert result["breakdown"]["diet"] == 2500.0
        assert result["breakdown"]["consumption"] == 2500.0
        assert result["total_kg"] == 5000.0

    def test_petrol_car_calculation(self):
        """Known petrol km should produce factor * km kg CO2e."""
        km = 10_000.0
        result = calculate_footprint(
            {
                "transport_km_car_petrol": km,
                "transport_km_car_diesel": 0,
                "transport_km_car_electric": 0,
                "transport_km_bus": 0,
                "transport_km_train": 0,
                "flights_short_haul": 0,
                "flights_long_haul": 0,
                "home_electricity_kwh": 0,
                "home_gas_kwh": 0,
                "household_size": 1,
                "diet_type": "vegan",
                "consumption_level": "low",
            }
        )
        expected_transport = round(km * TRANSPORT["car_petrol"], 2)
        assert result["breakdown"]["transport"] == expected_transport

    def test_home_energy_divided_by_household(self):
        """Home emissions should be split equally across household members."""
        result_1 = calculate_footprint(
            {
                "transport_km_car_petrol": 0,
                "transport_km_car_diesel": 0,
                "transport_km_car_electric": 0,
                "transport_km_bus": 0,
                "transport_km_train": 0,
                "flights_short_haul": 0,
                "flights_long_haul": 0,
                "home_electricity_kwh": 4000,
                "home_gas_kwh": 0,
                "household_size": 1,
                "diet_type": "vegan",
                "consumption_level": "low",
            }
        )
        result_2 = calculate_footprint(
            {
                "transport_km_car_petrol": 0,
                "transport_km_car_diesel": 0,
                "transport_km_car_electric": 0,
                "transport_km_bus": 0,
                "transport_km_train": 0,
                "flights_short_haul": 0,
                "flights_long_haul": 0,
                "home_electricity_kwh": 4000,
                "home_gas_kwh": 0,
                "household_size": 2,
                "diet_type": "vegan",
                "consumption_level": "low",
            }
        )
        # 2-person household should have half the home emissions per person
        assert result_2["breakdown"]["home"] == pytest.approx(
            result_1["breakdown"]["home"] / 2, rel=0.01
        )

    def test_ranked_categories_sorted_descending(self):
        """ranked_categories must always be sorted by kg descending."""
        result = calculate_footprint(
            {
                "transport_km_car_petrol": 20000,
                "transport_km_car_diesel": 0,
                "transport_km_car_electric": 0,
                "transport_km_bus": 500,
                "transport_km_train": 200,
                "flights_short_haul": 1,
                "flights_long_haul": 0,
                "home_electricity_kwh": 2000,
                "home_gas_kwh": 5000,
                "household_size": 1,
                "diet_type": "meat_medium",
                "consumption_level": "medium",
            }
        )
        ranked = result["ranked_categories"]
        for i in range(len(ranked) - 1):
            assert (
                ranked[i]["kg"] >= ranked[i + 1]["kg"]
            ), f"ranked_categories not sorted: {ranked[i]['kg']} < {ranked[i+1]['kg']}"

    def test_vs_global_average_above_one_for_high_footprint(self):
        """A heavy user should have vs_global_average_pct > 100."""
        result = calculate_footprint(
            {
                "transport_km_car_petrol": 50000,
                "transport_km_car_diesel": 0,
                "transport_km_car_electric": 0,
                "transport_km_bus": 0,
                "transport_km_train": 0,
                "flights_short_haul": 10,
                "flights_long_haul": 5,
                "home_electricity_kwh": 20000,
                "home_gas_kwh": 20000,
                "household_size": 1,
                "diet_type": "meat_heavy",
                "consumption_level": "high",
            }
        )
        assert result["vs_global_average_pct"] > 100

    def test_vs_paris_target_ratio(self):
        """vs_paris_target_pct should equal (total_kg / 2000) * 100."""
        result = calculate_footprint(
            {
                "transport_km_car_petrol": 5000,
                "transport_km_car_diesel": 0,
                "transport_km_car_electric": 0,
                "transport_km_bus": 0,
                "transport_km_train": 0,
                "flights_short_haul": 0,
                "flights_long_haul": 0,
                "home_electricity_kwh": 3000,
                "home_gas_kwh": 0,
                "household_size": 1,
                "diet_type": "vegetarian",
                "consumption_level": "low",
            }
        )
        expected = round((result["total_kg"] / PARIS_TARGET) * 100, 1)
        assert result["vs_paris_target_pct"] == pytest.approx(expected, rel=0.001)

    def test_max_inputs_no_overflow(self):
        """All inputs at maximum valid values should not raise any exception."""
        result = calculate_footprint(
            {
                "transport_km_car_petrol": 100_000,
                "transport_km_car_diesel": 100_000,
                "transport_km_car_electric": 100_000,
                "transport_km_bus": 100_000,
                "transport_km_train": 100_000,
                "flights_short_haul": 50,
                "flights_long_haul": 20,
                "home_electricity_kwh": 50_000,
                "home_gas_kwh": 50_000,
                "household_size": 10,
                "diet_type": "meat_heavy",
                "consumption_level": "high",
            }
        )
        assert result["total_kg"] > 0
        assert isinstance(result["ranked_categories"], list)
        assert len(result["ranked_categories"]) == 4

    def test_percentage_in_ranked_categories_sums_to_100(self):
        """Percentages in ranked_categories should sum to ~100%."""
        result = calculate_footprint(
            {
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
            }
        )
        total_pct = sum(c["percentage"] for c in result["ranked_categories"])
        assert total_pct == pytest.approx(100.0, abs=1.0)


class TestRuleBasedInsights:
    """Tests for the get_rule_based_insights() pure function."""

    def _make_ranked(self, breakdown: dict) -> list:
        total = sum(breakdown.values()) or 1
        return sorted(
            [
                {
                    "category": cat,
                    "kg": kg,
                    "percentage": round(kg / total * 100, 1),
                }
                for cat, kg in breakdown.items()
            ],
            key=lambda x: x["kg"],
            reverse=True,
        )

    def test_always_returns_exactly_3_insights(self):
        """Rule engine must always return exactly 3 insights."""
        breakdown = {"transport": 500, "home": 300, "diet": 2500, "consumption": 2500}
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(ranked, breakdown)
        assert len(insights) == 3

    def test_rule_based_insights_have_positive_estimated_savings(self):
        """All insights must have estimated_saving_kg > 0."""
        breakdown = {
            "transport": 3000,
            "home": 2000,
            "diet": 2500,
            "consumption": 4000,
        }
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(
            ranked, breakdown, diet_type="meat_heavy", consumption_level="high"
        )
        for insight in insights:
            assert (
                insight["estimated_saving_kg"] > 0
            ), f"Insight has zero/negative saving: {insight}"

    def test_rule_engine_targets_largest_category_first(self):
        """When transport is the biggest category, first insight should target transport."""
        breakdown = {
            "transport": 8000,
            "home": 500,
            "diet": 1100,
            "consumption": 1200,
        }
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(ranked, breakdown, flights_short_haul=0)
        assert insights[0]["category"] == "transport"

    def test_heavy_meat_eater_gets_diet_insight(self):
        """A meat_heavy user should receive a diet-related insight."""
        breakdown = {
            "transport": 1000,
            "home": 800,
            "diet": 3300,
            "consumption": 1200,
        }
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(ranked, breakdown, diet_type="meat_heavy")
        categories = [i["category"] for i in insights]
        assert "diet" in categories

    def test_high_driver_gets_transport_insight(self):
        """A user with >2000 kg transport emissions should get a transport insight."""
        breakdown = {
            "transport": 5000,
            "home": 400,
            "diet": 2500,
            "consumption": 2500,
        }
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(ranked, breakdown)
        categories = [i["category"] for i in insights]
        assert "transport" in categories

    def test_priorities_are_sequential_1_to_3(self):
        """Returned insights should have priority values 1, 2, 3 in order."""
        breakdown = {
            "transport": 3000,
            "home": 2000,
            "diet": 2500,
            "consumption": 4000,
        }
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(
            ranked, breakdown, diet_type="meat_heavy", consumption_level="high"
        )
        priorities = [i["priority"] for i in insights]
        assert priorities == [1, 2, 3]
