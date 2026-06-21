# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [1.0.0] - 2025-06-01

### Added
- Carbon footprint calculator with transport, home energy, diet, and consumption inputs
- Science-backed emission factors (UK DEFRA 2023, US EPA eGRID 2023, IPCC AR6)
- Google Gemini 1.5 Flash AI-powered personalised insight generation
- Deterministic rule-engine fallback when Gemini is unavailable
- Firestore history tracking per anonymous device_id
- BigQuery anonymised aggregate analytics logging
- Pub/Sub event streaming for downstream consumers
- React 18 + TypeScript frontend with Zustand state management
- WCAG 2.1 AA accessibility compliance (jest-axe verified)
- Rate limiting: 30/min calculate, 10/min insights, 20/min entries
- Security headers: CSP, HSTS, X-Frame-Options, Permissions-Policy
- Multi-stage Docker build with non-root user
- GitHub Actions CI with lint, typecheck, test, and coverage gates
- Cloud Run deployment on project vinay-carbonfootprint
