# Testing Strategy
## Carbon Footprint Awareness Platform

---

## Overview

| Layer | Framework | Coverage Target | Current |
|-------|-----------|----------------|---------|
| Backend unit        | pytest               | ≥90% | ~90% |
| Backend integration | pytest + TestClient  | ≥90% | ~90% |
| Frontend unit       | vitest + Testing Library | ≥90% | ~90% |
| Frontend E2E        | Playwright (planned) | —    | —    |
| Accessibility | jest-axe (axe-core) | 0 violations | ✅ 0 |

---

## Backend Test Suite

### Test Philosophy
- **No real GCP calls**: All GCP services disabled via `USE_*=false` environment variables in CI
- **Fast**: Tests run in <10 seconds total (no network, no I/O)
- **Deterministic**: Calculator tests use exact arithmetic — no floating point tolerance except where noted

### Test Files

#### `test_calculator.py` — Pure function unit tests (9 tests)
```
test_zero_inputs_returns_diet_and_consumption_only
test_petrol_car_calculation
test_home_energy_divided_by_household
test_ranked_categories_sorted_descending
test_vs_global_average_above_one_for_high_footprint
test_vs_paris_target_ratio
test_max_inputs_no_overflow
test_percentage_in_ranked_categories_sums_to_100
test_always_returns_exactly_3_insights  (rule engine)
```

#### `test_routes.py` — API integration tests (12 tests)
```
test_calculate_returns_200
test_calculate_returns_correct_structure
test_calculate_breakdown_has_four_categories
test_calculate_validates_negative_km          → 422
test_calculate_validates_invalid_diet_type    → 422
test_calculate_validates_missing_device_id    → 422
test_calculate_total_kg_is_positive
test_calculate_ranked_categories_sorted_desc
test_insights_uses_gemini_when_available      → source=="gemini"
test_insights_falls_back_to_rules_on_gemini_error → source=="rules"
test_insights_returns_total_potential_saving
test_entries_get_invalid_device_id_special_chars → 422
```

#### `test_gemini_fallback.py` — Gemini resilience tests (6 tests)
```
test_network_error_triggers_unavailable_error
test_invalid_json_response_triggers_unavailable_error
test_timeout_triggers_unavailable_error
test_empty_list_response_triggers_unavailable_error
test_rule_engine_always_returns_3_insights
test_rule_engine_insight_for_heavy_meat_eater
```

#### `test_validation.py` — Pydantic validation tests (13 tests)
```
test_all_defaults_valid_with_only_device_id
test_device_id_too_short_raises_validation_error
test_device_id_with_spaces_raises_validation_error
test_device_id_with_special_chars_raises_validation_error
test_household_size_zero_raises_validation_error
test_flights_short_haul_exceeds_max_raises_validation_error
test_flights_long_haul_exceeds_max_raises_validation_error
test_invalid_diet_type_literal_raises_validation_error
test_invalid_consumption_level_raises_validation_error
test_negative_km_raises_validation_error
test_electricity_kwh_exceeds_max_raises_validation_error
test_device_id_at_max_length_is_valid
test_device_id_too_long_raises_validation_error
```

### Running Backend Tests

```bash
cd backend

# All tests
pytest -v

# With coverage report
pytest --cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=90

# Specific file
pytest tests/test_calculator.py -v

# Environment (must disable all GCP services)
USE_GEMINI=false USE_FIRESTORE=false USE_BIGQUERY=false USE_PUBSUB=false \
PROJECT_ID=test pytest
```

---

## Frontend Test Suite

### Test Philosophy
- **Isolated**: Zustand store mocked per-test; fetch API mocked via `vi.spyOn`
- **Behaviour-driven**: Tests verify what the user sees and does, not implementation details
- **Accessibility-first**: Every component has an axe-core scan as the first test

### Test Files

#### `accessibility.test.tsx` — WCAG compliance (8 tests)
Each major component is rendered and scanned with `jest-axe`:
- CarbonForm, CategoryChart, ResultsDisplay, InsightCard, InsightsList, HistoryChart (with data), HistoryChart (empty), HistoryTable

#### `CarbonForm.test.tsx` (13 tests)
- Renders all 3 sections (Transport, Home, Diet)
- All inputs have associated labels
- Radio group has fieldset + legend
- Validation error shown on blur with `role="alert"`
- Submit button disabled + aria-busy during calculation
- Form calls `calculate` on valid submit
- Error message rendered from store

#### `ResultsDisplay.test.tsx` (8 tests)
- Renders total footprint value
- Renders both comparison bars with `role="progressbar"`
- Progressbar `aria-valuenow` matches result percentage
- CategoryChart section heading rendered
- "Get Personalised Insights" button calls `fetchInsights`
- Section has `aria-live="polite"`

#### `InsightsList.test.tsx` (9 tests)
- All 3 insights rendered
- Gemini badge shown when `source === "gemini"`
- Rule-based badge shown when `source === "rules"`
- Total potential saving displayed
- Each InsightCard has `role="article"` and `aria-label`
- Ordered list for insights
- Section has `aria-live="polite"`
- Save to History button present

#### `api.test.ts` (10 tests)
- `calculateFootprint` calls correct endpoint + method
- Returns parsed result on 200
- Throws Error on 422
- Throws Error on 500
- `getInsights` calls correct endpoint
- `getHistory` calls correct endpoint (GET)
- `getHistory` returns array on 200
- Throws on 404
- `saveEntry` calls correct endpoint
- Returns id on success

### Running Frontend Tests

```bash
cd frontend

# All tests with coverage
npm test

# Watch mode
npm run test:watch

# TypeScript check only
npm run typecheck

# Lint only
npm run lint
```

---

## CI Pipeline Test Integration

`.github/workflows/ci.yml` runs on every push to main and all PRs:

```yaml
backend-quality:
  - ruff check (lint)
  - pytest --cov (test + coverage)
  - codecov upload

frontend-quality:
  - tsc --noEmit (typecheck)
  - eslint (lint)
  - vitest run --coverage (test + coverage)
  - codecov upload

docker-build:
  - docker build (runs only after both quality jobs pass)
  - docker run → curl /api/health (smoke test)
```
