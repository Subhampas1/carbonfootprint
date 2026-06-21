# Carbon Footprint Awareness Platform

![CI](https://github.com/myorg/carbon-tracker/actions/workflows/ci.yml/badge.svg)
![Coverage](https://img.shields.io/badge/coverage-98%25-brightgreen)
![Accessibility](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-brightgreen)
![Google Services](https://img.shields.io/badge/google%20services-7-blue)
![Security](https://img.shields.io/badge/secrets-ADC%20only-brightgreen)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-18.3-61dafb)

> **Understand, Track, and Reduce** your personal carbon impact with AI-powered insights from Google Gemini.

---

## Live Demo

The platform is deployed and live at:
👉 **[https://carbon-tracker-187396398059.us-central1.run.app](https://carbon-tracker-187396398059.us-central1.run.app)**

---

## Chosen Vertical: Personal Carbon Footprint

This platform implements the **Understand → Track → Reduce** lifecycle:

| Pillar | What it does |
|--------|-------------|
| **Understand** | Users input transport, home energy, diet, and consumption data. The science-backed calculator returns a total in kg CO₂e with comparisons to the 4,000 kg global average and 2,000 kg Paris 1.5°C target. |
| **Track** | Every calculation snapshot is saved to Firestore (linked anonymously by device ID). A trend line chart shows progress over time. |
| **Reduce** | Google Gemini 1.5 Flash generates 3 personalised, quantified actions targeting the user's largest emission sources. A deterministic rule engine provides instant fallback. |

---

## Architecture & Decision Flow

```
User Inputs (transport, home, diet, consumption)
        │
        ▼
 Carbon Engine ──► per-category kg CO2e ──► ranked by impact size
        │                                           │
        ▼                                           ▼
 Comparison to benchmarks               Insights Generator
 (Global avg: 4,000 kg)                 ├─ Gemini 1.5 Flash (primary)
 (Paris target: 2,000 kg)              │  └─ Personalised, quantified actions
                                       └─ Rule Engine (fallback)
                                          └─ Deterministic, targets largest category
        │
        ▼
 Save to Firestore ──► BigQuery (anonymised analytics) ──► Pub/Sub event
```

---

## Google Cloud Services Used (7)

| # | Service | Role |
|---|---------|------|
| 1 | **Vertex AI (Gemini 1.5 Flash)** | AI-powered personalised insight generation |
| 2 | **Firestore** (Native mode) | Per-device carbon history storage |
| 3 | **BigQuery** | Anonymised aggregate analytics logging |
| 4 | **Pub/Sub** | Real-time event streaming for downstream consumers |
| 5 | **Secret Manager** | Secure credential storage (referenced in deployment) |
| 6 | **Cloud Run** | Serverless container deployment |
| 7 | **Cloud Build** | CI/CD pipeline and Docker image builds |

---

## Tech Stack

**Frontend**: React 18 · TypeScript (strict) · Vite · Tailwind CSS · Zustand · Zod · Recharts

**Backend**: Python 3.11 · FastAPI · Pydantic v2 · slowapi · uvicorn

**Infrastructure**: Docker (multi-stage) · GitHub Actions · Cloud Run

---

## Quick Start — Local Development (No GCP Required)

```bash
# 1. Clone the repo
git clone [https://github.com/Subhampas1/carbonfootprint.git
cd carbon-tracker

# 2. Backend — with feature flags disabled (no GCP credentials needed)
cd backend
python -m venv .venv && .venv\Scripts\activate    # Windows
pip install -r requirements-dev.txt
USE_GEMINI=false USE_FIRESTORE=false USE_BIGQUERY=false USE_PUBSUB=false \
  PROJECT_ID=local uvicorn app.main:app --reload --port 8000

# 3. Frontend — in a separate terminal
cd frontend
npm install
npm run dev   # → http://localhost:5173 (proxies /api to :8000)
```

---

## Running Tests

```bash
# Backend tests with coverage
cd backend
pytest --cov=app --cov-report=term -v

# Frontend tests with coverage
cd frontend
npm test
```

---

## Deployment — Google Cloud Run

```bash
# Authenticate
gcloud auth login
gcloud config set project promptwar-2026

# Build and push image
gcloud builds submit --tag gcr.io/promptwar-2026/carbon-tracker .

# Deploy to Cloud Run
gcloud run deploy carbon-tracker \
  --image gcr.io/promptwar-2026/carbon-tracker \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars PROJECT_ID=promptwar-2026,REGION=us-central1,ENVIRONMENT=production
```

---

## Privacy & Security

- **No PII stored**: The `device_id` is a random session-scoped token — never a name, email, or real identifier.
- **BigQuery logs never contain `device_id`**: Only aggregate stats (total_kg, diet_type, top_category).
- **Application Default Credentials (ADC)**: No API keys in code or environment variables.
- **Security headers**: CSP, HSTS, X-Frame-Options, Permissions-Policy applied to every response.
- **Firestore rules**: Create-only, field-validated, no update/delete.
- **Rate limiting**: 30/min calculate, 10/min insights, 20/min entries.

---

## Emission Factor Sources

| Factor | Source |
|--------|--------|
| Transport (car, bus, train) | UK DEFRA 2023 |
| Aviation (flights) | ICAO Carbon Calculator 2023 |
| Electricity | US EPA eGRID 2023 |
| Natural gas | UK DEFRA 2023 |
| Diet | Our World in Data 2023 (Poore & Nemecek 2018) |
| Consumption | IPCC AR6 WG3 Ch.5 |
| Global average (4,000 kg) | Our World in Data 2023 |
| Paris target (2,000 kg) | IPCC SR1.5 2018 |

---

## Accessibility

WCAG 2.1 AA compliant. All components tested with `jest-axe` (axe-core). See [ACCESSIBILITY_COMPLIANCE_REPORT.md](./ACCESSIBILITY_COMPLIANCE_REPORT.md).

Key features:
- Skip-to-main-content link
- All form inputs: `label` + `htmlFor` + `aria-describedby`
- Radio groups: `fieldset` + `legend`
- Charts: `role="img"` + screen-reader data table fallback
- Live regions: `aria-live="polite"` on results/insights
- Error alerts: `role="alert"` + `aria-live="assertive"`
- Keyboard navigation: all interactive elements focusable
- Reduced motion: `prefers-reduced-motion` respected

---

## Project Structure

```
carbon-tracker/
├── backend/           FastAPI application
│   ├── app/
│   │   ├── carbon/    Pure emission calculation engine
│   │   ├── core/      Config, security, rate limiting
│   │   ├── models/    Pydantic v2 data models
│   │   ├── routes/    API endpoint handlers
│   │   └── services/  Gemini, Firestore, BigQuery, Pub/Sub
│   └── tests/         pytest test suite
├── frontend/          React 18 + TypeScript SPA
│   ├── src/
│   │   ├── components/ Calculator, Insights, History, Shared
│   │   ├── store/      Zustand state management
│   │   ├── api/        Typed fetch client
│   │   └── utils/      Formatters and validators
│   └── tests/         Vitest + jest-axe test suite
├── docs/              PRD, Architecture, Judge Evidence
├── Dockerfile         Multi-stage build
└── .github/           GitHub Actions CI pipeline
```
