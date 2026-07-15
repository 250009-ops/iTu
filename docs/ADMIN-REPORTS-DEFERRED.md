# Admin Reports — Deferred & Future Fixes

Tracked intentionally disabled or incomplete parts of **Admin → Reports & Analytics** (`/admin/reports`). Use this list when continuing wiring work.

## Disabled UI (no toast, no navigation)

| Control | Location | Intended behaviour (future) |
|---------|----------|----------------------------|
| **Profile** button | Teacher Performance Leaderboard → Action column | Open teacher detail (drawer or `/admin/teachers` deep link) for the row’s examiner |
| **Full Report** link | Teacher Performance Leaderboard header | Dedicated teacher analytics page/export (sessions, ratings, earnings, MoM trends) |

Both controls are **disabled** until the above is implemented.

---

## Fixed in current pass

- **Jun / Q2 / YTD** — refetches `GET /admin/reports/summary?timeframe=`; period-scoped metrics update; teacher **status** and **speciality** remain profile snapshots (not time-filtered)
- **Revenue card** — period revenue (not all-time); label follows period (`June revenue`, `Q2 revenue`, `YTD revenue`)
- **Revenue chart Y-axis** — numeric ticks only; `(so'm)` shown in legend; tooltips still show full formatted amounts
- **Exams Delivered** — completed mocks in period (not paid order count)
- **Enrollment Funnel** — monthly enrolled vs completed within period
- **Band Score Distribution** — from released results in period
- **Module Performance** — wired from section attempts in period (exams, avg band, pass rate ≥ 6.0, MoM pass-rate delta)
- **Revenue & Exam Volume chart** — multi-month series from API; exam line = completed mocks per month
- **Teacher leaderboard** — real `status`, `speciality`, period sessions (grades), period earnings (paid payouts)

---

## Still open / polish

1. **Teacher rating on leaderboard** — shows profile lifetime rating, not period-scoped reviews
2. **Pass rate threshold** — hardcoded at band ≥ 6.0; could move to Settings if product wants configurable target
3. **Jun when not June** — `Jun` always means June of the current calendar year; consider rolling “last month” if product prefers
4. **Institution / B2B revenue** — paid institution credit orders included in revenue; no separate B2B vs B2C split on this page
5. **Export CSV** — exports currently loaded period data; no separate “all time” export
6. **Admin Help FAQ** — no Reports-specific help entry yet for operators
7. **Cross-link to Orders / Teachers / Enrollments** — summary cards are not clickable drill-downs

---

## API reference

```
GET /admin/reports/summary?timeframe=jun|q2|ytd
```

**Period definitions (calendar year of request):**

| Filter | Range |
|--------|--------|
| `jun` | 1 Jun – 30 Jun |
| `q2` | 1 Apr – 30 Jun |
| `ytd` | 1 Jan – end of current month |

Trends compare the selected period to the immediately preceding period of equal length.
