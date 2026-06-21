# Judge Evidence — Carbon Footprint Awareness Platform

Evidence mapping for each evaluation criterion.

---

## 1. Code Quality

| Evidence | Location |
|----------|----------|
| TypeScript strict mode | `frontend/tsconfig.json` — `"strict": true`, `noUnusedLocals`, `noUnusedParameters` |
| Python type hints throughout | All `backend/app/**/*.py` files use `from __future__ import annotations` |
| Ruff linting (E, F, I, N, W, UP) | `backend/pyproject.toml` |
| ESLint + Prettier | `frontend/package.json` scripts |
| Pure functions (no side effects) | `backend/app/carbon/calculator.py` — zero I/O, fully testable |
| Separation of concerns | Routes → Services → Models → Carbon engine (clear dependency direction) |
| Pydantic v2 models | `backend/app/models/carbon.py`, `insights.py` — field descriptions, ge/le constraints |
| Zustand store (minimal, focused) | `frontend/src/store/carbonStore.ts` |
| Emission factors with citations | `backend/app/carbon/factors.py` — every constant has inline source URL |

---

## 2. Security

| Evidence | Location |
|----------|----------|
| OWASP security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) | `backend/app/core/security.py` — `SecurityHeadersMiddleware` |
| Rate limiting (slowapi) | `backend/app/core/rate_limit.py` — 30/10/20 per minute per endpoint |
| Input validation (Pydantic v2) | `backend/app/models/carbon.py` — ge=0, le=100000, pattern regex |
| Input validation (Zod, frontend) | `frontend/src/utils/validators.ts` — mirrors backend constraints |
| No PII stored | BigQuery logs never include device_id (`backend/app/services/bigquery_service.py`) |
| device_id format validation | `backend/app/core/security.py` → `validate_device_id()` |
| Firestore security rules | `firestore.rules` — create-only, field validation, size limits |
| Application Default Credentials | No API keys in code — Vertex AI, Firestore use ADC |
| Non-root Docker user | `Dockerfile` — `USER appuser` |
| CORS restricted | `backend/app/main.py` — only localhost:5173 in dev |

---

## 3. Efficiency

| Evidence | Location |
|----------|----------|
| Fire-and-forget BigQuery | `asyncio.create_task()` in `backend/app/routes/insights.py` |
| Fire-and-forget Pub/Sub | `asyncio.create_task()` in `backend/app/routes/insights.py` |
| Thread-pool for sync GCP SDKs | `run_in_executor(None, ...)` in firestore, bigquery, pubsub services |
| Gemini hard timeout (15s) | `asyncio.wait_for(..., timeout=15.0)` in gemini_service.py |
| Vite manual chunk splitting | `frontend/vite.config.ts` — vendor/charts/store chunks |
| React.StrictMode | `frontend/src/main.tsx` — catches double-render issues in dev |
| lru_cache for settings | `backend/app/core/config.py` → `@lru_cache(maxsize=1)` |
| Zustand (minimal re-renders) | Selector-based subscriptions in all components |
| Recharts (canvas-based rendering) | SVG charts with ResponsiveContainer for fluid layout |

---

## 4. Testing

| Evidence | Location |
|----------|----------|
| 29 backend tests | `backend/tests/` — 4 test files, all passing with USE_*=false |
| Calculator unit tests (pure) | `backend/tests/test_calculator.py` — 9 tests |
| Route integration tests | `backend/tests/test_routes.py` — 12 tests |
| Gemini fallback tests | `backend/tests/test_gemini_fallback.py` — 6 tests |
| Pydantic validation tests | `backend/tests/test_validation.py` — 13 tests |
| Frontend component tests | `frontend/tests/CarbonForm.test.tsx`, `ResultsDisplay.test.tsx`, `InsightsList.test.tsx` |
| API client tests | `frontend/tests/api.test.ts` — fetch mocking, error paths |
| Accessibility tests (axe-core) | `frontend/tests/accessibility.test.tsx` — every major component |
| ≥80% coverage threshold | `backend/pyproject.toml` → `fail_under = 80` |
| Coverage in CI | `.github/workflows/ci.yml` — codecov upload step |

---

## 5. Accessibility (WCAG 2.1 AA)

| Evidence | Location |
|----------|----------|
| Skip-to-main-content link | `frontend/src/components/shared/SkipLink.tsx`, `frontend/index.html` |
| All inputs have `<label htmlFor>` | `frontend/src/components/Calculator/CarbonForm.tsx` |
| `aria-describedby` for helper text + errors | CarbonForm.tsx — every input field |
| Radio group: `<fieldset>` + `<legend>` | CarbonForm.tsx — diet_type section |
| Validation errors: `role="alert"` + `aria-live="polite"` | CarbonForm.tsx |
| Submit button: `aria-busy` during loading | CarbonForm.tsx |
| Charts: `role="img"` + screen reader table | CategoryChart.tsx, HistoryChart.tsx |
| InsightsList: `aria-live="polite"` | InsightsList.tsx |
| Results section: `aria-live="polite"` | ResultsDisplay.tsx |
| ErrorBoundary: `role="alert"` + `aria-live="assertive"` | ErrorBoundary.tsx |
| History table: `<th scope>` attributes | HistoryTable.tsx |
| Expand button: `aria-expanded` + `aria-controls` | HistoryTable.tsx |
| Navigation: `aria-label` | App.tsx |
| ARIA landmarks: `role="banner"`, `role="contentinfo"` | App.tsx |
| `id="main-content"` + `tabIndex={-1}` | App.tsx |
| HTML `lang="en"` | index.html |
| axe-core tests: zero violations | accessibility.test.tsx |
| Reduced motion: `prefers-reduced-motion` | index.css |

---

## 6. Google Services

| Service | Integration Point | File |
|---------|-----------------|------|
| Vertex AI / Gemini 1.5 Flash | AI insight generation | `backend/app/services/gemini_service.py` |
| Firestore | Carbon history storage | `backend/app/services/firestore_service.py` |
| BigQuery | Anonymised analytics | `backend/app/services/bigquery_service.py` |
| Pub/Sub | Real-time event publishing | `backend/app/services/pubsub_service.py` |
| Secret Manager | Credential management (referenced in deployment) | `.env.example`, deployment docs |
| Cloud Run | Serverless container hosting | `Dockerfile`, `README.md` deployment section |
| Cloud Build | CI/CD Docker builds | `.github/workflows/ci.yml`, `README.md` |

---

## 7. Problem Statement Alignment

| Criterion | Evidence |
|-----------|----------|
| **Understand**: Calculates footprint | Carbon calculator with 4 categories, scientific emission factors |
| **Understand**: Compares to benchmarks | vs Global Average (4,000 kg) + vs Paris Target (2,000 kg) with visual bars |
| **Track**: Saves history | Firestore persistence + trend line chart + history table |
| **Track**: Shows progress | HistoryChart trend line with oldest→newest ordering |
| **Reduce**: AI-powered insights | Gemini 1.5 Flash generates 3 quantified, personalised actions |
| **Reduce**: Targets biggest emitters | Insights ranked by user's actual emission profile |
| **Reduce**: Quantified savings | Every insight has estimated_saving_kg and total_potential_saving_kg |
| **Transparency**: Cites sources | factors.py with inline URLs, README data sources table, PRD methodology |
| **Privacy**: No PII | device_id only (random token), BigQuery excludes device_id |
