# IELTS Mock Exam ERP — Architecture

**Document version:** 1.0  
**Last updated:** June 2026  
**Status:** Full-stack platform — API + portals wired · Phase A foundation (audit, Redis timers) complete

This document describes the **full system architecture** for the IELTS Mock Exam ERP: what we are building, how the pieces fit together, what is implemented today, and what remains. It complements the detailed product specification in [`IELTS-MOCK-ERP-SPECIFICATION.md`](./IELTS-MOCK-ERP-SPECIFICATION.md).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Context](#2-system-context)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Product Domains & Roles](#4-product-domains--roles)
5. [Core Business Flows](#5-core-business-flows)
6. [Frontend Architecture (Implemented)](#6-frontend-architecture-implemented)
7. [Backend Architecture (Planned)](#7-backend-architecture-planned)
8. [Data Model](#8-data-model)
9. [Integrations](#9-integrations)
10. [Security, Auth & Exam Integrity](#10-security-auth--exam-integrity)
11. [Implementation Status](#11-implementation-status)
12. [Roadmap](#12-roadmap)
13. [Key File Paths](#13-key-file-paths)
14. [Related Documents](#14-related-documents)

---

## 1. Executive Summary

The **IELTS Mock Exam ERP** is a multi-role platform that delivers realistic **official computer-delivered IELTS (IELTS CBT)** mock examinations. Students purchase and complete a full four-skill mock on a single calendar day. Certified IELTS teachers conduct live Speaking sessions and grade Writing submissions. Administrators manage content, enrollments, payments, disputes, and platform configuration.

### What exists today

| Layer | Status |
|-------|--------|
| **Student / Teacher / Admin portals** | API-driven with JWT auth and route guards |
| **CBT exam players** | Listening, Reading, Writing — server timers (Redis-backed when available) |
| **Speaking** | LiveKit video when configured; offline fallback otherwise |
| **Backend API** | NestJS 11, Prisma, PostgreSQL/SQLite, 47/47 API E2E scenarios |
| **Audit trail (M16)** | Writes on auth, booking, exam, admin, and content actions |
| **Redis** | Exam section timers and per-session distributed locks |
| **Payments** | Mock card booking (Stripe deferred to Phase H) |

The codebase is a **working full-stack ERP**. Remaining gaps (content studio UI, Stripe, email automation, etc.) are tracked in the implementation roadmap (§12).

---

## 2. System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL ACTORS                                  │
├──────────────┬──────────────┬──────────────┬────────────────────────────┤
│   Students   │   Teachers   │    Admins    │  Third-party services      │
│  (browsers)  │  (browsers)  │  (browsers)  │  Stripe, SendGrid, Zoom,   │
│              │              │              │  LiveKit/Daily.co, AWS S3  │
└──────┬───────┴──────┬───────┴──────┬───────┴──────────────┬─────────────┘
       │              │              │                      │
       ▼              ▼              ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    IELTS MOCK ERP PLATFORM                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   Student   │  │   Teacher   │  │    Admin    │   Next.js Web Apps    │
│  │   Portal    │  │   Portal    │  │   Portal    │                      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
│         └─────────────────┼─────────────────┘                            │
│                           ▼                                              │
│              ┌────────────────────────┐                                  │
│              │   API Gateway / BFF    │  (planned)                       │
│              └────────────┬───────────┘                                  │
│                           ▼                                              │
│              ┌────────────────────────┐                                  │
│              │   Modular Monolith API │  NestJS / Node (planned)       │
│              │   21 bounded contexts  │                                  │
│              └────────────┬───────────┘                                  │
│         ┌─────────────────┼─────────────────┐                            │
│         ▼                 ▼                 ▼                            │
│   PostgreSQL          Redis            S3 + Job Queue                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Design principles

- **Exam-realistic** — Server-authoritative timers, no pause/rewind, integrity logging
- **Deferred results** — Band scores released only after Speaking is completed and all grading is done
- **Admin-owned content** — Teachers select from admin banks; they do not author L/R tests
- **Same-day orchestration** — Listening → Reading → Writing → Speaking on one calendar day
- **Role isolation** — Students see only their data; teachers see assigned work; admins have global access

---

## 3. High-Level Architecture

### 3.1 Target deployment topology

```
┌──────────────────────────────────────────────────────────────────┐
│  CDN / Edge                                                       │
├──────────────────────────────────────────────────────────────────┤
│  Next.js 16 (App Router)                                         │
│  ├── Student SPA shell     /student/*                            │
│  ├── Teacher page routes   /teacher/*                            │
│  ├── Admin page routes     /admin/*                              │
│  └── Auth pages            /login, /register, /forgot-password   │
├──────────────────────────────────────────────────────────────────┤
│  API Layer (BFF)                                                  │
│  REST or tRPC · JWT/session cookies · RBAC middleware            │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│   IAM    │ Catalog  │ Booking  │   Exam   │  Payments           │
│ Content  │ Session  │ Grading  │ Results  │  Notify             │
│ Disputes │ Reports  │ Settings │  Media   │  Audit              │
├──────────┴──────────┴──────────┴──────────┴─────────────────────┤
│  PostgreSQL  │  Redis (sessions, locks, timers)  │  S3 (media)   │
│  BullMQ / SQS (grading queue, emails, webhooks)                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Architecture pattern

**Modular monolith** for v1 — 21 bounded contexts in one deployable API service. Extract video, scoring queue, or payment webhooks into separate services only when scale requires it.

### 3.3 21 core modules

| Domain | ID | Module |
|--------|-----|--------|
| **Foundation** | M1 | Identity & Access Management |
| | M2 | User & Profile Management |
| | M3 | Organization & Multi-Tenancy |
| **Academic & Exam** | M4 | Exam Content Management |
| | M5 | Exam Delivery Engine |
| | M6 | Booking & Scheduling |
| | M7 | Grading & Evaluation |
| | M8 | Results & Learning Analytics |
| | M18 | CBT Exam Player (Listening & Reading) |
| | M19 | Admin Content Authoring Studio |
| | M20 | Auto-Scoring Engine |
| | M21 | Exam Session Control & Proctoring |
| **Commerce** | M9 | Service Catalog & Marketplace |
| | M10 | Orders & Enrollments |
| | M11 | Payments (Student) |
| | M12 | Payouts & Commission (Teacher) |
| **Operations** | M13 | Notifications & Communication |
| | M14 | Media & Document Management |
| | M15 | Support & Disputes |
| **Governance** | M16 | Admin Console & Audit |
| | M17 | Reporting & Business Intelligence |

---

## 4. Product Domains & Roles

### 4.1 Roles

| Role | Portal | Primary responsibilities |
|------|--------|--------------------------|
| **Student** | `/student/*` | Browse/purchase mocks, book teachers, take exams, view results |
| **Teacher** | `/teacher/*` | Set availability, conduct Speaking, grade Writing/Speaking, view earnings |
| **Admin** | `/admin/*` | Content studio, teacher approval, live monitoring, enrollments, orders, disputes, reports, settings |

### 4.2 Permission model

```
Admin     →  Global access (all students, teachers, content, finance)
Teacher   →  Own schedule, assigned students, own grades and earnings
Student   →  Own enrollments, sessions, and results only
```

### 4.3 Primary product — Full Academic Mock

| Section | Duration (approx.) | Delivery | Scoring |
|---------|-------------------|----------|---------|
| Listening | ~40 min (incl. transfer) | CBT player | Automatic (raw /40 → band table) |
| Reading | 60 min | CBT player | Automatic |
| Writing | 60 min (Task 1 + Task 2) | CBT player | Teacher rubric |
| Speaking | 11–14 min | Live video | Teacher rubric |

All four sections occur on **one calendar day** in fixed order: L → R → W → S.

---

## 5. Core Business Flows

### 5.1 Purchase & enrollment

```
Student browses mock package
    → Selects mock date
    → Selects Writing teacher (grading assignment)
    → Selects Speaking teacher + time slot (after estimated Writing end)
    → Pays via Stripe
    → Enrollment created (status: enrolled)
    → Confirmation email sent
```

**Conflict rules:** One student per Speaking slot; database-level lock on `teacher_slot`; slot overlap prevented at booking API.

### 5.2 Mock day orchestration

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ LISTENING  │ →  │  READING   │ →  │  WRITING   │ →  │  SPEAKING  │
│  (CBT)     │    │   (CBT)    │    │   (CBT)    │    │  (Live)    │
│ Auto-score │    │ Auto-score │    │  Teacher   │    │  Teacher   │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
```

- **Server timers** are the source of truth; client displays only
- **No pause, no rewind** on audio; paste blocked in text inputs
- **Integrity events** logged (tab blur, fullscreen exit, paste attempts)
- **Admin Live Monitor** shows active sessions and flags

### 5.3 Grading & results release

| Milestone | Student sees |
|-----------|--------------|
| After Listening | Progress only ("2/4 done") |
| After Reading | Progress only |
| After Writing | Progress only |
| After Speaking session | "Results processing" |
| Writing + Speaking graded | **Full report** — L/R/W/S bands + overall + PDF |

```sql
-- Results release pseudocode
IF speaking_session.status = 'graded'
   AND writing_submission.status = 'graded'
   AND enrollment.all_sections_submitted
THEN enrollment.results_status = 'released'
```

### 5.4 Enrollment lifecycle (admin view)

```
Enrolled → In Progress → Awaiting Results → Completed
```

Tracked per enrollment with module progress (L/R/W/S completion dots), examiner assignments, and SLA-aware dispute queue.

### 5.5 Commerce flow

```
Order (paid) → Enrollment ref linked
    → Revenue split: Platform commission + Teacher payout
    → Weekly/bi-weekly/monthly payout schedule
    → Refunds capped per dispute policy
```

### 5.6 Support & disputes

Ticket types: Regrade Request, Teacher No-show, Technical Issue, Payment Dispute. SLA countdown on open tickets; breach alerts to admin Slack/email.

---

## 6. Frontend Architecture (Implemented)

### 6.1 Tech stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.2.7 |
| UI | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Forms | React Hook Form | ^7 |
| Validation | Zod | ^4 |
| Icons | lucide-react | ^1.17 |
| Charts | Custom inline SVG | — |

**Not in dependencies:** chart libraries, ORM, NextAuth, API routes.

### 6.2 Repository structure

```
IELTS_MOCK_ERP/
├── docs/
│   ├── ARCHITECTURE.md              ← this document
│   └── IELTS-MOCK-ERP-SPECIFICATION.md
├── README.md
└── web/                             ← sole implementation
    ├── package.json
    ├── next.config.ts
    └── src/
        ├── app/                     # Next.js App Router
        │   ├── (auth)/              # login, register
        │   ├── (student)/           # student layout + catch-all
        │   ├── (teacher)/           # teacher layout + pages
        │   ├── (admin)/             # admin layout + pages
        │   └── forgot-password/
        ├── components/
        │   ├── admin/               # feature folders per page
        │   ├── teacher/
        │   ├── student/
        │   ├── portal/              # shared search, notifications, user menu
        │   ├── auth/
        │   ├── brand/
        │   └── ui/                  # button, input, select, switch, etc.
        ├── contexts/
        │   └── sidebar-context.tsx  # collapsible sidebar state
        ├── hooks/
        │   ├── use-auth.ts
        │   └── use-click-outside.ts
        └── lib/
            ├── auth/session.ts      # demo localStorage auth
            ├── admin/nav.ts
            ├── teacher/nav.ts
            ├── student/nav.ts
            ├── student/routes.ts    # SPA view router config
            ├── mock/                # 21 static fixture files
            ├── validations/auth.ts
            └── utils.ts             # cn() helper
```

### 6.3 Portal shell pattern

All three portals share the same structural pattern:

```
┌─────────────────────────────────────────────────────────────┐
│ Brand bar (navy strip) — logo, portal label, sidebar toggle   │
├──────────┬──────────────────────────────────────────────────┤
│          │ Top bar — search (⌘K), notifications, user menu  │
│ Sidebar  ├──────────────────────────────────────────────────┤
│ (navy)   │                                                  │
│          │  Main content (scrollable, bg-slate-50)          │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│ Mobile nav (horizontal, md:hidden)                          │
└─────────────────────────────────────────────────────────────┘
```

**Shared components:** `SearchBar`, `NotificationMenu`, `UserMenu` in `components/portal/`.

**Sidebar state:** `SidebarProvider` persists collapse in `localStorage` key `ielts-sidebar-collapsed`.

### 6.4 Routing model

#### Student portal — SPA-style client router

Single layout with `StudentViewRouter` mapping URL segments to views:

| URL | View |
|-----|------|
| `/student`, `/student/dashboard` | Dashboard |
| `/student/browse` | Browse Mocks |
| `/student/mock-day` | Mock Day Hub |
| `/student/results` | Results |
| `/student/profile` | Profile |

Page file `app/(student)/student/[[...view]]/page.tsx` is an anchor; routing is client-side via `lib/student/routes.ts`.

**Legacy redirects:** `/dashboard` → `/student`, `/browse` → `/student/browse`, etc.

#### Teacher portal — file-based routes

| Route | Page |
|-------|------|
| `/teacher/dashboard` | Dashboard |
| `/teacher/availability` | Weekly availability grid |
| `/teacher/speaking` | Examiner console |
| `/teacher/grading` | Writing submissions queue |
| `/teacher/earnings` | Earnings & charts |
| `/teacher/profile` | Profile & credentials |

#### Admin portal — file-based routes

| Route | Page |
|-------|------|
| `/admin/dashboard` | KPIs, 6-month revenue trend, module completion rates, live sessions preview |
| `/admin/content` | Content Studio |
| `/admin/teachers` | Examiner roster |
| `/admin/sessions` | Live Monitor |
| `/admin/enrollments` | Enrollment lifecycle |
| `/admin/orders` | Orders & payments |
| `/admin/disputes` | Support tickets & SLA |
| `/admin/reports` | Analytics & leaderboard |
| `/admin/settings` | Platform settings (6 tabs) |

### 6.5 Navigation configuration

Nav items are defined in dedicated config files (not hardcoded in sidebars):

- `lib/student/nav.ts` — 5 items
- `lib/teacher/nav.ts` — 6 items
- `lib/admin/nav.ts` — grouped: Content, Management, Analytics

Badges on **Live Monitor** and **Disputes** are loaded from `GET /admin/nav-badges` (live session count and open ticket count) via `AdminNavBadgesProvider` in the admin shell. Badges appear only when the count is greater than zero.

**Note:** Portal switcher links (Student / Teacher / Admin) appear in sidebar footers for navigation between portals in the prototype. They are not a production multi-tenant switcher.

### 6.6 Authentication (current — demo only)

| Concern | Implementation |
|---------|----------------|
| Storage | `localStorage` key `ielts_mock_session` |
| Session shape | `{ role, email, name }` where role ∈ `student \| teacher \| admin` |
| Login | `authenticateDemo()` against hardcoded accounts |
| Hook | `useAuth()` via `useSyncExternalStore` |
| Route protection | **None** — no middleware; portals accessible without login |
| Sign out | `clearSession()` + redirect to `/login` |

**Demo credentials:**

| Role | Username | Password | Redirect |
|------|----------|----------|----------|
| Student | `student` | `student` | `/student` |
| Teacher | `teacher` | `teacher` | `/teacher/dashboard` |
| Admin | `admin` | `admin` | `/admin/dashboard` |

Register and forgot-password forms have `// TODO: wire to auth API` placeholders.

### 6.7 Design system

**CSS tokens** (`app/globals.css`):

| Token | Value | Usage |
|-------|-------|-------|
| `--navy` | `#1b2a4a` | Sidebar, primary buttons |
| `--brand-red` | `#e31837` | Accents, active indicators |
| `--background` | `#f8fafc` | Page background |
| `--muted` | `#64748b` | Secondary text |
| `--border` | `#e2e8f0` | Card borders |

**UI conventions:**

- Cards: `rounded-xl border border-border bg-white shadow-sm`
- Page padding: `p-4 lg:p-6 xl:p-8`, content `max-w-5xl` to `max-w-7xl`
- Status pills: colored dot + rounded-full badge
- Tables: uppercase column headers, hover rows, search + filter controls
- Charts: Recharts for admin/teacher revenue and band charts; SVG for some legacy widgets

**Branding rule:** UI text uses **"official computer-delivered IELTS"** / **"IELTS CBT"** — not third-party test-centre branding.

**Component library** (`components/ui/`): `Button`, `Input`, `Select`, `Switch`, `Checkbox`, `Label`, `FormField`, `PasswordInput` — custom, not shadcn.

### 6.8 Mock data layer

All screens import static fixtures from `lib/mock/*.ts`. No fetch layer, no React Query, no server actions.

| File | Domain |
|------|--------|
| `student-dashboard.ts` | Dashboard stats, upcoming mock, activity |
| `browse-mocks.ts` | Product card, FAQ, testimonials |
| `mock-day-hub.ts` | Schedule timeline, section cards, countdown |
| `exam-results.ts` | Band breakdown, progression, feedback |
| `student-profile.ts` | Profile fields, exam stats |
| `notifications.ts` | Header notification dropdown |
| `teacher-dashboard.ts` | Schedule, writing queue |
| `teacher-availability.ts` | Weekly slot grid |
| `speaking-session.ts` | Live session, rubric, band options |
| `writing-grading.ts` | Grading queue |
| `teacher-earnings.ts` | Charts, payout, transactions |
| `teacher-profile.ts` | Credentials, performance |
| `admin-dashboard-context.tsx` | KPIs, revenue trend, completion rates, live sessions, sync meta |
| `live-monitor.ts` | Active exams, integrity alerts |
| `content-studio.ts` | Tests table, listening editor |
| `admin-teachers.ts` | Examiner roster |
| `admin-enrollments.ts` | Lifecycle pipeline, enrollments table |
| `admin-orders.ts` | Transaction ledger, revenue trend |
| `admin-disputes.ts` | Tickets, SLA states |
| `admin-reports.ts` | Charts, module performance, leaderboard |
| `admin-settings.ts` | All settings tab fixtures |

**Target replacement:** Each mock file maps to one or more API endpoints; components switch from static imports to `fetch`/SWR/tRPC when backend is wired.

### 6.9 Feature component organization

```
components/{portal}/{feature}/
  ├── {feature}-view.tsx          # page composition
  ├── {feature}-header.tsx        # breadcrumbs + actions
  ├── {feature}-summary-cards.tsx
  ├── {feature}-table.tsx         # data table with filters
  └── ...                         # charts, panels, etc.
```

Views are imported by thin `app/.../page.tsx` files that only set metadata and render the view.

---

## 7. Backend Architecture (Planned)

### 7.1 Recommended stack

| Layer | Technology |
|-------|------------|
| API | NestJS (Node.js) or .NET |
| Database | PostgreSQL |
| Cache / locks | Redis |
| Object storage | S3-compatible (AWS S3) |
| Job queue | BullMQ or AWS SQS |
| Video | LiveKit or Daily.co |
| Payments | Stripe |
| Email | SendGrid |

### 7.2 API design principles

- **RESTful** resources with role-scoped endpoints
- **JWT or session cookies** issued by IAM module
- **RBAC middleware** on every route — enforce student/teacher/admin boundaries
- **Idempotent webhooks** for Stripe payment events
- **Optimistic locking** on `teacher_slot` and `exam_session` state transitions
- **Server-sent events or WebSocket** for live monitor and exam timer sync

### 7.3 Key API surface (illustrative)

```
POST   /auth/login
POST   /auth/register
GET    /auth/me

GET    /catalog/packages
POST   /bookings                          # create enrollment + payment intent
GET    /bookings/:id/availability         # teacher slots for date

POST   /exam-sessions/:id/start-section   # L/R/W/S state machine
POST   /exam-sessions/:id/answers         # autosave
POST   /exam-sessions/:id/submit-section
GET    /exam-sessions/:id/timer           # server time remaining

POST   /speaking-sessions/:id/join        # WebRTC token
POST   /speaking-sessions/:id/grade

GET    /grading/writing-queue             # teacher
POST   /grading/:submissionId/score

GET    /results/:enrollmentId             # gated on release policy

GET    /admin/enrollments
GET    /admin/sessions/live
POST   /admin/content/tests
GET    /admin/reports/summary
PATCH  /admin/settings/:section
```

### 7.4 Exam session state machine

```
enrolled
  → check_in_open
  → listening_active → listening_submitted
  → reading_active → reading_submitted
  → [break]
  → writing_active → writing_submitted
  → speaking_scheduled → speaking_active → speaking_submitted
  → awaiting_grading
  → results_released
```

Transitions are server-validated. Client cannot skip sections or extend timers.

### 7.5 Auto-scoring engine (M20)

1. On L/R section submit, calculate raw score from `Answer` records
2. Look up band from `BandConversionTable` (admin-configurable)
3. Store provisional band on `SectionAttempt` (hidden from student until release)
4. Writing/Speaking bands set by teacher `Grade` records

### 7.6 CBT exam player (M18) — planned frontend submodule

Dedicated React component library (or route group `/exam/[sessionId]/[skill]`) with:

- IDP-faithful layout shell per skill
- Question type registry (see specification §14.3)
- Server-synced timer display
- Autosave every 10–30 seconds
- Integrity event reporting

Question types: note/form/table completion, matching, map labeling, flowchart, MCQ, TFNG, matching headings, essay tasks, instruction screens.

---

## 8. Data Model

### 8.1 Core entities

```
User (role: admin | teacher | student)
├── TeacherProfile (credentials, bio, commission_rate, status: approved|pending|suspended)
├── StudentProfile (target_band, exam_type, country)
│
TeacherAvailability (day, start, end, slot_duration)
TeacherSlot (teacher_id, datetime, status: available|booked|blocked)
│
MockTestPackage (listening_test_id, reading_test_id, writing_test_id, speaking_bank_id)
│
Enrollment (student, package, mock_date, status, results_status)
├── EnrollmentTeachers (writing_teacher_id, speaking_teacher_id, speaking_slot_id)
├── Order (payment_id, amount, status: paid|refunded|failed)
│
ExamSession (enrollment_id, state, section_timers, integrity_log)
├── SectionAttempt (skill, started_at, submitted_at, raw_score, band)
│   ├── Answer (question_number, question_type, value, revision)
│   ├── WritingSubmission (task1_text, task2_text, word_counts)
│   └── SpeakingSession (recording_url, part_timestamps, teacher_notes)
│       └── Grade (criteria_scores, overall_band, graded_by, graded_at)
│
Payment, Payout, Refund
Notification, SupportTicket (SLA fields), AuditLog
BandConversionTable, PlatformSettings
ContentTest, Question, MediaAsset
```

### 8.2 Key relationships

```
Student ──< Enrollment >── MockTestPackage
Enrollment ──< ExamSession ──< SectionAttempt ──< Answer
Enrollment ──< Order
Enrollment ──> TeacherSlot (speaking)
Enrollment ──> TeacherProfile (writing examiner)
SupportTicket ──> Enrollment
```

### 8.3 Enrollment status enum

| Status | Meaning |
|--------|---------|
| `enrolled` | Paid, not yet started |
| `in_progress` | At least one module active |
| `awaiting_results` | All modules submitted, grading in progress |
| `completed` | Results released |

---

## 9. Integrations

| Service | Purpose | UI reference |
|---------|---------|--------------|
| **Stripe** | Payments, subscriptions, refunds, chargeback webhooks | Admin Orders, Settings |
| **SendGrid** | Transactional email (booking, reminders, results) | Settings → Notifications |
| **Zoom / LiveKit / Daily.co** | Speaking video sessions + server-side recording | Teacher Speaking console |
| **Slack** | Admin alerts (disputes, SLA breach, fraud) | Settings → Notifications |
| **AWS S3** | Audio files, exam recordings, PDF results | Settings → Integrations |

API keys and webhook signing secrets are managed in Admin Settings → Integrations (UI built; backend not wired).

---

## 10. Security, Auth & Exam Integrity

### 10.1 Target auth (production)

- Email/password or OAuth with bcrypt/argon2 hashing
- HTTP-only secure cookies or short-lived JWT + refresh rotation
- Next.js middleware route guards per role
- CSRF protection on mutations
- Rate limiting on login and exam autosave endpoints

### 10.2 Exam integrity controls

| Control | Listening | Reading | Writing | Speaking |
|---------|-----------|---------|---------|----------|
| Server timer | ✓ | ✓ | ✓ | ✓ |
| No pause | ✓ | ✓ | ✓ | ✓ |
| Audio rewind blocked | ✓ | — | — | — |
| Paste blocked | ✓ | ✓ | ✓ | — |
| Fullscreen required | ✓ | ✓ | ✓ | Recommended |
| Tab-blur logging | ✓ | ✓ | ✓ | ✓ |
| Admin live monitor | ✓ | ✓ | ✓ | ✓ |
| Force submit | ✓ | ✓ | ✓ | ✓ |

### 10.3 Audit & compliance

- Immutable `AuditLog` for grade changes, settings changes, refund actions
- Recording consent captured before Speaking session
- GDPR-style data export and deletion (Settings danger zone)
- Dispute refund cap enforced server-side

---

## 11. Implementation Status

### 11.1 Built (UI with mock data)

| Area | Routes / features |
|------|-------------------|
| **Auth** | Login (demo session), register form, forgot-password form |
| **Student** | Dashboard, Browse Mocks, Mock Day Hub, Results, Profile |
| **Teacher** | Dashboard, Availability, Speaking console, Grading, Earnings, Profile |
| **Admin** | Dashboard, Content Studio, Teachers, Live Monitor, Enrollments, Orders, Disputes, Reports, Settings (6 tabs) |
| **CBT players** | Full-screen `/exam/[sessionId]/*` route group — Listening, Reading (resizable split-pane), Writing (split-pane editor with live word count) |
| **Question types** | Note/form/table/summary/sentence completion, MCQ single & multi, TFNG/YNG, matching, matching headings, map labeling (drag + click-to-place) |
| **Exam flow** | Check-in, timed break, waiting-for-speaking, Speaking waiting room → rules → live session → complete |
| **Shell** | Collapsible sidebars, search bar, notifications, user menu, mobile nav |
| **Charts** | Revenue, band distribution, enrollment funnel, earnings (SVG) |

### 11.1 Built (frontend + backend)

| Area | Notes |
|------|-------|
| **Portals** | Student, Teacher, Admin — REST API via `web/src/lib/api/*` |
| **Auth** | JWT login, register, forgot/reset password, change password |
| **Exam delivery** | State machine, autosave (L/R), integrity logging, Redis timers |
| **Grading & results** | Writing/Speaking queues, deferred results release |
| **Admin ops** | Enrollments, orders, refunds, disputes, packages, live monitor |
| **Audit log** | `GET /admin/audit-logs` + automatic writes on sensitive actions |
| **Marketing site** | Public pages with API-backed stats where available |

### 11.2 Not built (selected)

| Area | Notes |
|------|-------|
| Real Stripe payments | Mock card flow until Phase H |
| Full content authoring UI | Admin wizard still stubbed; API create/publish exists |
| Transactional email (beyond reset) | SMTP wired for password reset only |
| Server PDF certificates | Client print/txt export only |
| Portal global search | `GET /search` — role-scoped (enrollments, orders, content, tickets, sessions) |
| Phase 5 hardening | Load test, security audit, beta program |

---

## 12. Roadmap

Aligned with specification §17, updated for current progress:

### Phase 0 — Portal shells ✅ (complete)

### Phase 1 — Foundation + L/R CBT (in progress)

- ✅ NestJS API + Prisma schema
- ✅ Auth + RBAC
- ✅ CBT players + session control engine
- ✅ Redis-backed timers & locks (Phase A)
- ✅ Audit trail (Phase A)
- ⏳ Admin content authoring (full UI)

### Phase 2 — Commerce + Writing

- M9, M10, M11, M13
- Booking wizard with teacher/slot selection
- Writing CBT player
- Teacher grading queue (wired to API)

### Phase 3 — Speaking + Scheduling

- M6, M5 (Speaking), M14
- Teacher availability API
- WebRTC integration
- Speaking student + examiner flows (live)

### Phase 4 — Full mock orchestration

- Same-day state machine end-to-end
- Teacher payouts (M12)
- Results release pipeline
- Admin console API (M16), BI (M17)

### Phase 5 — Hardening

- Load testing, security audit
- Dispute workflow automation (M15)
- Beta with pilot teachers and students

---

## 13. Key File Paths

### Configuration

| Path | Purpose |
|------|---------|
| `web/package.json` | Dependencies and scripts |
| `web/src/app/globals.css` | Design tokens |
| `web/src/app/layout.tsx` | Root layout, fonts |

### Auth

| Path | Purpose |
|------|---------|
| `web/src/lib/auth/session.ts` | Demo session read/write |
| `web/src/hooks/use-auth.ts` | Auth hook |
| `web/src/lib/validations/auth.ts` | Zod schemas |
| `web/src/app/(auth)/login/login-form.tsx` | Login UI |

### Navigation

| Path | Purpose |
|------|---------|
| `web/src/lib/student/nav.ts` | Student sidebar items |
| `web/src/lib/student/routes.ts` | Student SPA route map |
| `web/src/lib/teacher/nav.ts` | Teacher sidebar items |
| `web/src/lib/admin/nav.ts` | Admin grouped nav |

### Portal shells

| Path | Purpose |
|------|---------|
| `web/src/app/(student)/layout.tsx` | Student layout |
| `web/src/components/student/student-view-router.tsx` | Student SPA router |
| `web/src/components/teacher/teacher-shell.tsx` | Teacher shell |
| `web/src/components/admin/admin-shell.tsx` | Admin shell |
| `web/src/contexts/sidebar-context.tsx` | Sidebar collapse state |
| `web/src/components/portal/` | Shared search, notifications, user menu |

### Representative views

| Path | Purpose |
|------|---------|
| `web/src/components/student/views/dashboard-view.tsx` | Student dashboard |
| `web/src/components/student/views/mock-day-view.tsx` | Mock day hub |
| `web/src/components/teacher/speaking/speaking-console-view.tsx` | Examiner console |
| `web/src/components/admin/enrollments/enrollments-view.tsx` | Enrollment management |
| `web/src/components/admin/settings/settings-view.tsx` | Platform settings |
| `web/src/app/(exam)/exam/[sessionId]/` | Full-screen CBT exam route group |
| `web/src/components/exam/listening/listening-player.tsx` | Listening CBT player |
| `web/src/components/exam/reading/reading-player.tsx` | Reading split-pane player |
| `web/src/components/exam/writing/writing-player.tsx` | Writing split-pane editor |
| `web/src/components/exam/speaking/speaking-student-flow.tsx` | Speaking student suite |
| `web/src/components/exam/questions/question-group.tsx` | Question-type renderer registry |
| `web/src/lib/mock/exam-content.ts` | Offline exam content fallback (synced to DB via `npm run sync:exam-content`) |

### Infrastructure (Phase A)

| Path | Purpose |
|------|---------|
| `api/src/common/audit/` | M16 audit trail |
| `api/src/common/redis/` | Redis client, exam timers & locks |
| `deploy/env/` | Production `.env` templates |

---

## 14. Related Documents

| Document | Description |
|----------|-------------|
| [`IELTS-MOCK-ERP-SPECIFICATION.md`](./IELTS-MOCK-ERP-SPECIFICATION.md) | Full product spec: CBT UI wireframes, question types, Speaking flows, NFRs |
| [`../README.md`](../README.md) | Project overview and quick links |
| [`../web/README.md`](../web/README.md) | Frontend dev setup (run `npm run dev` in `web/`) |

---

## Document maintenance

Update this architecture document when:

- Backend services are added or module boundaries change
- New portals, routes, or major UI patterns are introduced
- Data model entities are created or renamed in PostgreSQL migrations
- Integration providers change (e.g. video SDK selection)

*This document reflects the system as designed and as implemented in the frontend prototype as of June 2026.*
