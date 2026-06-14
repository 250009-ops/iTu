# E2E Smoke Report

**Date:** June 2026  
**Runner:** `cd api && npx tsx scripts/e2e-smoke.ts`

## API smoke results (13/13 passed)

See **[E2E-FULL-REPORT.md](./E2E-FULL-REPORT.md)** for the complete 47-scenario cross-portal run (Student + Teacher + Admin full journey).

Quick smoke:

| Check | Result |
|-------|--------|
| Public `GET /catalog/packages` | Pass — 4 packages |
| Public `GET /marketing/testimonials` | Pass |
| Student login + dashboard | Pass — fresh user metrics |
| Student `targetBand` null after reset | Pass |
| Student profile (no package when fresh) | Pass |
| Student `POST /support/tickets` | Pass |
| Teacher dashboard + profile + support ticket | Pass |
| Admin dashboard + enrollments + live sessions | Pass |

## Manual UI checklist (next stage)

Follow [`STUDENT-TESTING-GUIDE.md`](./STUDENT-TESTING-GUIDE.md) for full browser E2E:

1. Login & empty dashboard
2. Browse → book wizard (4 steps)
3. Mock Day Hub
4. Exam check-in → L/R/W/S sections
5. Profile (Overview, IELTS Plan, Security, Notifications)
6. Help ticket → verify in Admin Disputes
7. Teacher grades → Student Results
8. Cross-portal admin monitor

**Prerequisites:** `docker compose up -d`, `npm run start:dev` (api), `npm run dev` (web)

**Reset fresh student:** `cd api && npm run db:reset-student`

## Recommended next stage

1. **Playwright** — automate Student guide cases 1–14
2. **Teacher grading path** — dedicated teacher E2E guide
3. **Production hardening** — auth expiry, API error states, mobile nav
4. **Remove exam content fallback** in production builds (fail loud if API missing)
