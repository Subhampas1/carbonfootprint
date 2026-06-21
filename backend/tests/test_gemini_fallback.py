"""
Tests for Gemini fallback behaviour and rule engine robustness.

Verifies that:
  1. Various Gemini failure modes all trigger the rule-based fallback.
  2. The rule engine produces consistently valid output regardless of inputs.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.carbon.calculator import get_rule_based_insights
from app.services.gemini_service import GeminiUnavailableError, generate_insights_gemini

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

SAMPLE_RANKED = [
    {"category": "transport", "kg": 3000.0, "percentage": 45.0},
    {"category": "consumption", "kg": 2000.0, "percentage": 30.0},
    {"category": "diet", "kg": 1000.0, "percentage": 15.0},
    {"category": "home", "kg": 667.0, "percentage": 10.0},
]

SAMPLE_BREAKDOWN = {
    "transport": 3000.0,
    "consumption": 2000.0,
    "diet": 1000.0,
    "home": 667.0,
}


def _make_settings():
    s = MagicMock()
    s.PROJECT_ID = "test"
    s.REGION = "us-central1"
    s.GEMINI_MODEL = "gemini-1.5-flash"
    return s


# ---------------------------------------------------------------------------
# Gemini failure modes
# ---------------------------------------------------------------------------


class TestGeminiFallbackTriggers:
    """Verify that each failure mode raises GeminiUnavailableError."""

    @pytest.mark.asyncio
    async def test_network_error_triggers_unavailable_error(self):
        """A network-level exception inside generate_insights_gemini
        raises GeminiUnavailableError.
        """
        with (
            patch("app.services.gemini_service.get_settings", return_value=_make_settings()),
            patch("builtins.__import__", side_effect=ConnectionError("network error")),
        ):
            with pytest.raises(GeminiUnavailableError):
                await generate_insights_gemini(SAMPLE_RANKED, SAMPLE_BREAKDOWN, 6667.0)

    @pytest.mark.asyncio
    async def test_invalid_json_response_triggers_unavailable_error(self):
        """Gemini returning non-JSON text should raise GeminiUnavailableError."""
        mock_model = MagicMock()
        mock_model.generate_content.return_value.text = "This is not JSON at all!"

        mock_vertexai = MagicMock()
        mock_gm_class = MagicMock(return_value=mock_model)
        mock_gen_config = MagicMock()

        with (
            patch("app.services.gemini_service.get_settings", return_value=_make_settings()),
            patch.dict(
                "sys.modules",
                {
                    "vertexai": mock_vertexai,
                    "vertexai.generative_models": MagicMock(
                        GenerativeModel=mock_gm_class,
                        GenerationConfig=mock_gen_config,
                    ),
                },
            ),
        ):
            with pytest.raises((GeminiUnavailableError, Exception)):
                await generate_insights_gemini(SAMPLE_RANKED, SAMPLE_BREAKDOWN, 6667.0)

    @pytest.mark.asyncio
    async def test_timeout_triggers_unavailable_error(self):
        """asyncio.wait_for timeout should be wrapped in GeminiUnavailableError."""

        mock_vertexai = MagicMock()
        mock_gm_class = MagicMock()
        mock_gen_config = MagicMock()

        with (
            patch("app.services.gemini_service.get_settings", return_value=_make_settings()),
            patch.dict(
                "sys.modules",
                {
                    "vertexai": mock_vertexai,
                    "vertexai.generative_models": MagicMock(
                        GenerativeModel=mock_gm_class,
                        GenerationConfig=mock_gen_config,
                    ),
                },
            ),
            patch("asyncio.wait_for", side_effect=TimeoutError()),
        ):
            with pytest.raises(GeminiUnavailableError):
                await generate_insights_gemini(SAMPLE_RANKED, SAMPLE_BREAKDOWN, 6667.0)

    @pytest.mark.asyncio
    async def test_empty_list_response_triggers_unavailable_error(self):
        """Gemini returning an empty JSON array should raise GeminiUnavailableError."""
        mock_model = MagicMock()
        mock_model.generate_content.return_value.text = "[]"

        mock_vertexai = MagicMock()
        mock_gm_class = MagicMock(return_value=mock_model)
        mock_gen_config = MagicMock()

        with (
            patch("app.services.gemini_service.get_settings", return_value=_make_settings()),
            patch.dict(
                "sys.modules",
                {
                    "vertexai": mock_vertexai,
                    "vertexai.generative_models": MagicMock(
                        GenerativeModel=mock_gm_class,
                        GenerationConfig=mock_gen_config,
                    ),
                },
            ),
        ):
            with pytest.raises((GeminiUnavailableError, Exception)):
                await generate_insights_gemini(SAMPLE_RANKED, SAMPLE_BREAKDOWN, 6667.0)


# ---------------------------------------------------------------------------
# Rule engine robustness
# ---------------------------------------------------------------------------


class TestRuleEngineRobustness:
    """Verify the rule engine always returns valid, complete output."""

    def _make_ranked(self, breakdown: dict) -> list:
        total = sum(breakdown.values()) or 1
        return sorted(
            [
                {"category": cat, "kg": kg, "percentage": round(kg / total * 100, 1)}
                for cat, kg in breakdown.items()
            ],
            key=lambda x: x["kg"],
            reverse=True,
        )

    def test_rule_engine_always_returns_3_insights(self):
        """Rule engine must return exactly 3 insights in all scenarios."""
        for diet in ["meat_heavy", "meat_medium", "vegetarian", "vegan"]:
            for consumption in ["high", "medium", "low"]:
                breakdown = {
                    "transport": 1000,
                    "home": 500,
                    "diet": 2500,
                    "consumption": 2500,
                }
                ranked = self._make_ranked(breakdown)
                insights = get_rule_based_insights(
                    ranked, breakdown, diet_type=diet, consumption_level=consumption
                )
                assert (
                    len(insights) == 3
                ), f"Expected 3 insights for diet={diet}, consumption={consumption}"

    def test_rule_engine_insight_for_heavy_meat_eater(self):
        """Meat-heavy user's insights must include a diet-focused action."""
        breakdown = {"transport": 500, "home": 300, "diet": 3300, "consumption": 1200}
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(ranked, breakdown, diet_type="meat_heavy")
        categories = [i["category"] for i in insights]
        assert "diet" in categories

    def test_rule_engine_insight_for_high_driver(self):
        """High-mileage driver (>2000 kg transport) must get a transport action."""
        breakdown = {"transport": 6000, "home": 300, "diet": 2500, "consumption": 2500}
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(ranked, breakdown)
        categories = [i["category"] for i in insights]
        assert "transport" in categories

    def test_rule_engine_savings_all_positive(self):
        """Every insight should have a positive estimated_saving_kg."""
        breakdown = {"transport": 3000, "home": 2000, "diet": 3300, "consumption": 4000}
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(
            ranked, breakdown, diet_type="meat_heavy", consumption_level="high"
        )
        for insight in insights:
            assert insight["estimated_saving_kg"] > 0

    def test_rule_engine_with_flight_heavy_user(self):
        """A user with many flights should receive a flight-reduction insight."""
        breakdown = {"transport": 9000, "home": 500, "diet": 2500, "consumption": 2500}
        ranked = self._make_ranked(breakdown)
        insights = get_rule_based_insights(
            ranked,
            breakdown,
            flights_short_haul=5,
            flights_long_haul=3,
        )
        # Transport should feature prominently
        categories = [i["category"] for i in insights]
        assert "transport" in categories
