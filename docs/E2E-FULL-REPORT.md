# Full Cross-Portal E2E Report

**Date:** June 2026  
**Runner:** `cd api && npm run e2e:full`  
**Result:** **47/47 passed**

## Student portal (26 scenarios)

| # | Scenario | Result |
|---|----------|--------|
| 1 | Login → `/student`, Alex Johnson, 0 mocks, no target band | Pass |
| 2 | Browse 4 packages + dynamic testimonials API | Pass |
| 3 | Full booking wizard (date, teachers, speaking slot, payment) | Pass |
| 4 | Mock Day Hub — session code, L→R→W→S timeline | Pass |
| 5 | Exam check-in | Pass |
| 6 | Listening CBT submit | Pass |
| 7 | Reading CBT submit | Pass |
| 8 | Writing CBT submit → `speaking_scheduled` | Pass |
| 9 | Speaking waiting room state | Pass |
| 10 | Speaking section submit → `awaiting_grading` | Pass |
| 11 | Profile update + mock package after booking | Pass |
| 12 | Notifications (mock booked) + mark read | Pass |
| 13 | Help support ticket | Pass |
| 14 | Results released (overall band 7) + detail breakdown | Pass |
| 15 | Post-mock review + leaderboard consent | Pass |

## Teacher portal (8 scenarios)

| Scenario | Result |
|----------|--------|
| Login + dashboard KPIs | Pass |
| Availability API | Pass |
| Earnings API | Pass |
| Profile (Dr. Sarah Chen) | Pass |
| Writing grading queue → score Alex Johnson | Pass |
| Speaking session → score Alex Johnson | Pass |
| Help support ticket | Pass |

## Admin portal (12 scenarios)

| Scenario | Result |
|----------|--------|
| Login + dashboard KPIs | Pass |
| Enrollments (Alex → `complete` after results) | Pass |
| Orders (paid) | Pass |
| Live monitor | Pass |
| Teachers list | Pass |
| Disputes / support tickets | Pass |
| Packages | Pass |
| Content studio (`/admin/content/tests`) | Pass |
| Reports summary | Pass |
| Settings (`/admin/settings`) | Pass |
| Help support ticket | Pass |

## Bugs fixed during this test run

1. **Writing submit** did not advance to `SPEAKING_SCHEDULED` — fixed next-state after writing.
2. **Results never released** when L/R raw score was 0 but band was null — fixed `tryReleaseResults` to accept auto-scored sections with `rawScore`.
3. **Admin API paths** in test script corrected (`/admin/content/tests`, `/admin/settings`).

## Re-run anytime

```bash
cd api
npm run e2e:full      # full journey (resets Alex first)
npm run e2e:smoke     # quick API health check
npm run db:reset-student  # reset Alex only
```

**Note:** If `e2e:full` fails on results release after grading, restart the API (`npm run start:dev`) so the latest `grading.service.ts` is loaded, then re-run.

## Next stage (browser UI)

Automate UI flows with Playwright using this script as API oracle, or manually follow [`STUDENT-TESTING-GUIDE.md`](./STUDENT-TESTING-GUIDE.md) in the browser.
