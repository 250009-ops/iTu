# Portal Data Audit — Static vs Dynamic

**Date:** June 2026  
**Scope:** Student, Teacher, Admin portals + shared portal components

## Summary

| Portal | Core data | Status |
|--------|-----------|--------|
| Student | Dashboard, browse products, mock-day, results, profile, notifications | **API-driven** |
| Teacher | Dashboard, grading, speaking, availability, earnings, profile | **API-driven** |
| Admin | Dashboard, enrollments, orders, sessions, disputes, packages, content, settings | **API-driven** |
| Exam delivery | Session state, timers, content | **API-driven** (content fallback to fixtures if API fails) |

## Student portal

| Page / section | Data source | Notes |
|----------------|-------------|-------|
| Dashboard stats, past mocks, band chart | `/students/dashboard` | Dynamic |
| Browse product cards | `/catalog/packages` | Dynamic |
| Browse FAQs, highlights | `lib/student/constants.ts` | **Static copy** (product education — OK) |
| Browse testimonials | `/marketing/testimonials` | **Fixed** — was static constants |
| Mock Day Hub (booked) | `/students/mock-day` | Dynamic |
| Mock Day empty state preview | `lib/student/mock-day-preview.ts` | Static preview copy — OK |
| Results (with data) | `/results` | Dynamic |
| Results empty state | `lib/student/results-preview.ts` | Static preview — OK |
| Profile hero stats | `/students/profile` | Dynamic |
| Profile IELTS Plan tab | Profile API + user input | **Fixed** — was “coming soon” |
| Profile Security — password | `/auth/change-password` | **Fixed** — was fake toast |
| Profile Security — sessions | Current browser via `navigator` | **Fixed** — was fake Chrome/Safari |
| Profile Security — 2FA | Not implemented | Honest message shown |
| Profile Notifications | `/students/profile` `notificationPrefs` | **Fixed** — was local-only |
| Profile mock package | `/students/profile` package | **Fixed** — empty state when no order |
| Help — ticket form | `/support/tickets` | **Fixed** — works for all roles |
| Help — FAQs, channels | Component constants | Static support copy — OK |

## Teacher portal

| Page / section | Data source | Notes |
|----------------|-------------|-------|
| Dashboard, grading, speaking, availability, earnings | Teacher API modules | Dynamic |
| Profile performance / security cards | Mapped from `/teachers/profile` | Dynamic (derived metrics) |
| Notification prefs dialog | `/teachers/profile` PATCH | Dynamic |
| Help | Shared `HelpCenter` | **Fixed** — `/support/tickets` |

## Admin portal

| Page / section | Data source | Notes |
|----------------|-------------|-------|
| Dashboard KPIs, live sessions, revenue chart | `GET /admin/dashboard` | Dynamic — 6-month revenue, completion rates, sync timestamp |
| Sidebar nav badges | `GET /admin/nav-badges` | Dynamic — live sessions & open tickets |
| All main list pages | Admin API | Dynamic |
| Content “new test” wizard | UI only | Feature not built — toast |
| Reports full export | UI only | Feature not built — toast |
| Help | Shared `HelpCenter` | **Fixed** — `/support/tickets` |

## Acceptable static content (no change required)

- Marketing website (`lib/marketing/data.ts`)
- Student browse FAQs and exam-rule highlights
- Empty-state educational previews (results, mock-day, IELTS plan tips)
- Profile photo upload (coming soon toast)

## Fixes applied in this pass

1. Student testimonials → `/marketing/testimonials`
2. Student notification prefs → DB field + API + UI save
3. Student security → real password API + current session only
4. Student mock package → empty state when no purchase
5. Generic `/support/tickets` for Student, Teacher, Admin
6. `POST /auth/change-password` for all authenticated users
7. Fresh Alex seed/reset → `targetBand: null`
