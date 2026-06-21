"""
Google Vertex AI Gemini integration for personalized carbon reduction insights.

Uses the Vertex AI SDK (google-cloud-aiplatform / vertexai) to call
Gemini 1.5 Flash and generate 3 structured, quantified reduction actions
tailored to the user's actual emission profile.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import vertexai
from vertexai.generative_models import GenerationConfig, GenerativeModel

from app.core.config import get_settings
from app.models.insights import InsightItem

logger = logging.getLogger(__name__)


class GeminiUnavailableError(Exception):
    """Raised when Gemini cannot produce a valid response (network, parse, timeout)."""


def _build_prompt(
    ranked_categories: list[dict[str, Any]],
    breakdown: dict[str, float],
    total_kg: float,
) -> str:
    """Construct the structured prompt for Gemini."""
    category_lines = "\n".join(
        f"  {i + 1}. {item['category'].title()}: {item['kg']} kg CO2e/year "
        f"({item['percentage']}% of total)"
        for i, item in enumerate(ranked_categories)
    )

    return f"""\
You are a carbon footprint reduction expert helping a user reduce their personal CO2e emissions.

USER'S CARBON FOOTPRINT PROFILE:
- Total annual footprint: {total_kg} kg CO2e/year
- Breakdown by category (ranked largest first):
{category_lines}

TASK:
Generate exactly 3 highly personalized, quantified carbon reduction actions for this user.

REQUIREMENTS for each action:
1. Target this user's ACTUAL biggest emission sources (use the ranked list above)
2. Include a SPECIFIC estimated annual CO2e saving in kg (be realistic, not exaggerated)
3. Be ACTIONABLE within 30 days — no vague advice like "be more conscious"
4. Be SPECIFIC — e.g., "Switch daily 15 km petrol commute to train" not just "use less transit"
5. The saving estimate must reflect user's actual numbers (e.g., drive 20k km/year)

RESPONSE FORMAT:
Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Example:
[
  {{
    "category": "transport",
    "action": "Replace daily petrol car commute with transit 4 days per week.",
    "estimated_saving_kg": 1200.0,
    "timeframe": "Achievable within 30 days",
    "priority": 1
  }},
  ...
]

Valid category values: transport, home, diet, consumption
Priority must be 1, 2, or 3 (1 = highest impact)
"""


async def generate_insights_gemini(
    ranked_categories: list[dict[str, Any]],
    breakdown: dict[str, float],
    total_kg: float,
) -> list[InsightItem]:
    """Call Vertex AI Gemini 1.5 Flash to generate personalized carbon insights.

    Args:
        ranked_categories: Sorted list of {category, kg, percentage} dicts (biggest first).
        breakdown: Per-category kg CO2e dict.
        total_kg: Total annual footprint in kg CO2e.

    Returns:
        List of exactly 3 InsightItem instances.

    Raises:
        GeminiUnavailableError: If Gemini returns an error, invalid JSON, or times out.
    """
    settings = get_settings()

    try:
        vertexai.init(project=settings.PROJECT_ID, location=settings.REGION)

        model = GenerativeModel(settings.GEMINI_MODEL)

        prompt = _build_prompt(ranked_categories, breakdown, total_kg)

        generation_config = GenerationConfig(
            temperature=0.4,  # Low temp for consistent, factual outputs
            top_p=0.8,
            max_output_tokens=1024,
        )

        # Run synchronous SDK call in a thread-pool to avoid blocking event loop
        response = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None,
                lambda: model.generate_content(
                    prompt,
                    generation_config=generation_config,
                ),
            ),
            timeout=15.0,  # 15-second hard timeout
        )

        raw_text = response.text.strip()

        # Strip potential markdown code fences Gemini sometimes adds
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1]
            raw_text = raw_text.rsplit("```", 1)[0].strip()

        raw_insights: list[dict[str, Any]] = json.loads(raw_text)

        if not isinstance(raw_insights, list) or len(raw_insights) == 0:
            raise ValueError("Gemini returned empty or non-list JSON")

        # Parse and validate each insight through Pydantic
        items: list[InsightItem] = []
        for idx, raw in enumerate(raw_insights[:3], start=1):
            raw["priority"] = idx  # Normalise priority to 1-3 sequence
            items.append(InsightItem(**raw))

        logger.info("Gemini generated %d insights successfully", len(items))
        return items

    except GeminiUnavailableError:
        raise
    except Exception as exc:
        logger.warning("Gemini unavailable: %s — %s", type(exc).__name__, exc)
        raise GeminiUnavailableError(f"Gemini call failed: {exc}") from exc
