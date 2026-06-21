# Product Requirements Document (PRD)
## Carbon Footprint Awareness Platform

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production-ready

---

## 1. Problem Statement

Personal carbon footprints are largely invisible. Despite climate urgency, most individuals lack a fast, science-backed tool to understand their actual emissions and receive concrete, actionable guidance. Generic advice ("fly less", "eat less meat") fails because it doesn't account for individual profiles — a low-income family that rarely flies has very different priorities to a frequent business traveller.

---

## 2. Target Users

| Persona | Description |
|---------|-------------|
| Climate-curious individual | Wants to understand their impact but doesn't know where to start |
| Sustainability-committed professional | Already taking steps, wants to quantify impact and find next marginal gains |
| Educator / policy researcher | Needs a reliable calculation tool with cited emission factors |

---

## 3. Core User Journey

```
Landing Page
    │
    ▼
Carbon Form (4 sections: Transport · Home · Diet · Consumption)
    │
    ▼
Results Page
    ├── Total footprint (kg CO2e)
    ├── vs Global Average (4,000 kg) — visual bar
    ├── vs Paris Target (2,000 kg) — visual bar
    └── Category breakdown chart
    │
    ▼
Insights (Gemini AI → rule engine fallback)
    ├── 3 personalised, quantified actions
    └── Total potential saving (kg CO2e/year)
    │
    ▼
Save to Firestore → History View
    ├── Trend line chart
    └── Detailed history table
```

---

## 4. Functional Requirements

### FR-1: Carbon Calculator
- Accept transport (km/year by vehicle type), home energy (kWh/year), diet type, consumption level
- Return total kg CO2e with ±5% accuracy relative to published emission factors
- Show per-category breakdown and percentage contribution
- Compare to IPCC/DEFRA-cited global average (4,000 kg) and Paris target (2,000 kg)

### FR-2: AI Insights
- Generate 3 personalised, quantified reduction actions using Gemini 1.5 Flash
- Each action must target the user's actual highest-emission categories
- Each action must include a realistic estimated annual saving in kg CO2e
- Automatic fallback to deterministic rule engine if Gemini is unavailable
- Indicate which engine generated the insights (Gemini badge / rule-based label)

### FR-3: History Tracking
- Save calculation snapshots anonymously (device_id only, no PII)
- Display trend line chart ordered oldest → newest
- Display sortable/expandable history table with inline insight viewer

### FR-4: Privacy & Security
- No PII ever collected or stored
- device_id is a random session-scoped token
- BigQuery logging never includes device_id
- HTTPS-only (HSTS enforced)
- Rate limiting on all API endpoints

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | API p95 response < 500ms (excluding Gemini) |
| Availability | 99.9% uptime via Cloud Run auto-scaling |
| Accessibility | WCAG 2.1 AA — tested with axe-core |
| Security | OWASP Top 10 mitigated; ADC-only credentials |
| Test Coverage | ≥80% backend (pytest), ≥80% frontend (vitest) |
| Localisation | English (extensible via i18n design) |

---

## 6. Emission Factor Methodology

All factors are annual, per-person, in kg CO2e and sourced from peer-reviewed publications:

- **Transport**: UK DEFRA 2023 Vehicle GHG factors (location: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023)
- **Aviation**: ICAO Carbon Calculator 2023, per-passenger including radiative forcing index
- **Electricity**: US EPA eGRID 2023 national average (0.233 kg CO2e/kWh)
- **Gas heating**: UK DEFRA 2023 natural gas gross calorific value (0.203 kg CO2e/kWh)
- **Diet**: Poore & Nemecek (2018) via Our World in Data 2023
- **Consumption**: IPCC AR6 Working Group 3 Chapter 5 (2023)
- **Global average benchmark**: Our World in Data 2023 (4,000 kg CO2e/person/year)
- **Paris 1.5°C target**: IPCC Special Report 1.5°C (2018) → 2,000 kg CO2e/person/year by 2050

---

## 7. Out of Scope (v1.0)

- Multi-language support
- Account creation / user authentication
- Social sharing features
- Corporate/organisational footprints
- Scope 3 supply chain emissions
- Carbon offsetting marketplace
