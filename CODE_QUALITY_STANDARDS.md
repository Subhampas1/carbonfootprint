# Code Quality Standards
## Carbon Footprint Awareness Platform

---

## 1. Backend Standards (Python 3.11)

### Style & Linting
- **Tool**: ruff (`ruff==0.4.3`)
- **Rules enabled**: E (pycodestyle errors), F (pyflakes), I (isort), N (pep8-naming), W (warnings), UP (pyupgrade)
- **Line length**: 100 characters
- **Target**: Python 3.11+

Run: `cd backend && ruff check .`

### Type Safety
- All public functions have full type annotations
- `from __future__ import annotations` in all modules (PEP 563 deferred evaluation)
- Pydantic v2 models provide runtime type enforcement at API boundaries

### Architecture Patterns
- **Pure functions**: `app/carbon/calculator.py` contains zero side effects — fully deterministic, no I/O
- **Dependency direction**: Routes → Services → Models (never reverse)
- **Service toggle**: Feature flags (`USE_GEMINI`, `USE_FIRESTORE`, etc.) enable local dev without GCP
- **Fallback chain**: Gemini → Rule engine (graceful degradation)
- **Fire-and-forget**: Analytics calls use `asyncio.create_task()` — never block request handling

### Error Handling
- `GeminiUnavailableError` is the only explicitly surfaced exception class
- All GCP service calls (BigQuery, Pub/Sub) catch `Exception` broadly and log warnings — never raise
- FastAPI's Pydantic integration returns structured 422 errors automatically

---

## 2. Frontend Standards (TypeScript 5.4+)

### Style & Linting
- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **ESLint**: `@typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`
- **Prettier**: Single quotes, 100 char line width, trailing commas (ES5)

Run: `cd frontend && npm run lint && npm run typecheck`

### Component Patterns
- All components are functional (no class components except `ErrorBoundary`)
- Zustand store accessed via selectors to minimise re-renders: `useCarbonStore(s => s.result)`
- Props are typed with explicit interfaces — no `any` or implicit returns
- Side effects in `useEffect` only where necessary (step change focus management)

### Accessibility Standard
- Every form input: `id` + `htmlFor` + `aria-describedby` (helper text) + `aria-describedby` (error)
- Radio groups: `<fieldset>` + `<legend>` (never just a heading)
- Charts: `role="img"` + `aria-label` + screen reader `<table className="sr-only">`
- Dynamic content: `aria-live="polite"` on result/insight sections

### Validation Strategy
- Zod schema (`validators.ts`) is the single source of truth for form constraints
- Schema mirrors backend Pydantic model field-for-field
- `safeParse()` used everywhere — never `.parse()` (avoids uncaught exceptions)

---

## 3. Git Workflow

### Commit Convention
```
feat: add history chart component
fix: correct household energy division
test: add Pydantic validation tests
docs: update README deployment section
```

### Branch Protection (recommended)
- Require PR for changes to `main`
- Require CI to pass (all 3 jobs)
- Require code review (1 approver)

---

## 4. Dependencies

### Backend
All dependencies pinned to exact versions in `requirements.txt`. Update via:
```bash
pip-compile requirements.in --upgrade
```

### Frontend
All dependencies use `^` semver ranges in `package.json`. Lock file (`package-lock.json`) committed. Update via:
```bash
npm update && npm audit fix
```

---

## 5. Code Review Checklist

Before merging any PR:

- [ ] `ruff check .` passes (backend)
- [ ] `npm run lint` + `npm run typecheck` pass (frontend)
- [ ] All tests pass: `pytest` + `npm test`
- [ ] Coverage does not drop below 80%
- [ ] No new `any` types in TypeScript
- [ ] New Pydantic fields have `ge`/`le`/`description` where applicable
- [ ] New API endpoints have rate limit decorator
- [ ] New GCP service calls have try/except fallback
- [ ] New form inputs have `label` + `aria-describedby`
- [ ] Emission factors have source citation comment
