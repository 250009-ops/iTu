# Phase G — Hardening & Manual E2E

Phase G prepares iTestU for beta and real payments (Phase H). Run these checks **before** Lemon Squeezy integration.

## Status checklist

| Area | What | Command / doc |
|------|------|----------------|
| API smoke | 13 public + auth checks | `cd api && npm run e2e:smoke` |
| Full API journey | 47 scenarios (student → teacher → admin) | `cd api && npm run e2e:full` |
| Browser E2E | Playwright UI flows | `cd web && npm run test:e2e` |
| Load smoke | Health + catalog under concurrency | `cd api && npm run load:test` |
| Security | Rate limits, helmet, prod swagger off | See §Security below |
| Support SLA | Auto breach detection every 15 min | Cron in `SupportSlaService` |
| Manual QA | Step-by-step browser walkthrough | [STUDENT-TESTING-GUIDE.md](./STUDENT-TESTING-GUIDE.md) |

---

## Prerequisites (local)

```bash
# Terminal 1 — Redis + DB (if using Docker)
docker compose up -d

# Terminal 2 — API
cd api
npm run start:dev

# Terminal 3 — Web
cd web
npm run dev
```

Reset Alex Johnson (fresh student) anytime:

```bash
cd api
npm run db:reset-student
```

---

## 1. API automated tests

### Quick smoke (~30 seconds)

```bash
cd api
npm run e2e:smoke
```

Expect **13/13 passed**.

### Full cross-portal journey (~2–3 minutes)

```bash
cd api
npm run e2e:full
```

Expect **47/47 passed**. See [E2E-FULL-REPORT.md](./E2E-FULL-REPORT.md).

---

## 2. Browser E2E (Playwright)

```bash
cd web
npm run test:e2e
```

Runs in order:

1. `00-student-dashboard.spec.ts` — login shell
2. `01-student-journey.spec.ts` — book → exam → profile → help
3. `02-teacher-admin.spec.ts` — grade → results → admin pages

**Note:** Global setup resets Alex and requires API at `http://localhost:3001`.

---

## 3. Manual E2E (recommended before go-live)

Follow **[STUDENT-TESTING-GUIDE.md](./STUDENT-TESTING-GUIDE.md)** in the browser. Minimum pass:

- [ ] Login as `student` / `student` — empty dashboard
- [ ] Browse → book Full Academic Mock (4-step wizard)
- [ ] Mock Day Hub → check-in → Listening loads
- [ ] Complete exam (or use API-assisted path from Playwright)
- [ ] Teacher grades Writing + Speaking
- [ ] Student sees results with band scores
- [ ] Help ticket appears in **Admin → Disputes**
- [ ] Contact form at `/contact` emails `support@itestu.uz`
- [ ] Forgot-password email arrives (SMTP configured)
- [ ] Admin exports CSV from Enrollments / Orders
- [ ] 2FA setup on student profile (optional)

Local seed accounts use email-based sign-in only: `student@example.com`, `teacher@example.com`, and the configured owner admin email.

---

## 4. Load smoke

With API running:

```bash
cd api
npm run load:test
```

Defaults: 200 requests × 20 concurrent to `/health` and `/catalog/packages`.

Tune via env:

```env
API_URL=http://localhost:3001/api/v1
LOAD_TEST_CONCURRENCY=20
LOAD_TEST_REQUESTS=200
```

---

## 5. Security hardening (implemented)

| Control | Detail |
|---------|--------|
| **Rate limiting** | Global 120 req/min; auth 15/min; contact form 5/min |
| **Helmet** | Security headers on API responses |
| **Swagger** | Disabled in `NODE_ENV=production` (set `SWAGGER_ENABLED=true` to override) |
| **CORS** | Strict origin list via `CORS_ORIGIN` |
| **Validation** | `whitelist` + `forbidNonWhitelisted` on all DTOs |
| **Exam content** | Production fails loud if API content missing (`NEXT_PUBLIC_ALLOW_EXAM_CONTENT_FALLBACK=true` for dev rescue) |

### Rate limit env (optional)

```env
RATE_LIMIT_TTL_MS=60000
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_TTL_MS=60000
AUTH_RATE_LIMIT_MAX=15
CONTACT_RATE_LIMIT_TTL_MS=60000
CONTACT_RATE_LIMIT_MAX=5
```

### Production exam content

In production builds, exam players **do not** fall back to bundled mock content unless explicitly allowed:

```env
# web/.env.production — leave unset or false
NEXT_PUBLIC_ALLOW_EXAM_CONTENT_FALLBACK=false
```

---

## 6. Support SLA automation

`SupportSlaService` runs every **15 minutes** and updates open tickets:

| Priority | SLA window |
|----------|------------|
| Urgent | 4 hours |
| High | 24 hours |
| Medium | 48 hours |
| Low | 72 hours |

When a ticket breaches SLA, admins receive a **SLA breach** notification (if enabled in Settings → Notifications).

Verify: create a ticket in Admin → Disputes, wait or backdate `createdAt` in DB, run API, confirm banner shows overdue count.

---

## 7. Production VPS checklist

Before beta on `itestu.uz`:

- [ ] `NODE_ENV=production` on API
- [ ] PostgreSQL + Redis running
- [ ] Prisma migrations applied
- [ ] SMTP block in `api/.env` (test with `npm run mail:test`)
- [ ] `CORS_ORIGIN` includes `https://itestu.uz`
- [ ] `APP_URL=https://itestu.uz`
- [ ] Media served via nginx (`SERVE_MEDIA_LOCALLY=false`)
- [ ] Run `e2e:smoke` against production API URL
- [ ] Manual student journey on live site

---

## 8. After Phase G → Phase H (payments)

Only start Lemon Squeezy after this checklist passes. Phase H will:

1. Create `PENDING` orders (not instant `PAID`)
2. Redirect to Lemon checkout
3. Confirm payment via webhook
4. Then unlock enrollment / exam access

---

## Quick command reference

```bash
cd api && npm run e2e:smoke      # API health
cd api && npm run e2e:full       # Full API journey
cd api && npm run load:test      # Load smoke
cd api && npm run db:reset-student
cd web && npm run test:e2e       # Playwright UI
```
