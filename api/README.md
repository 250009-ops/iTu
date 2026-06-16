# IELTS Mock ERP — API

NestJS modular monolith backend for the IELTS computer-delivered mock exam platform.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL 17 |
| Cache | Redis 7 — exam section timers & distributed session locks |
| Auth | JWT + bcrypt |
| API docs | Swagger at `/api/docs` |

## Quick start

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Install & migrate

```bash
npm install
npm run db:generate
npm run db:migrate
npm run sync:exam-content   # copies L/R/W/S content from web fixtures into prisma/data/
npm run db:seed
```

### 3. Run API

```bash
npm run start:dev
```

- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs
- Health: http://localhost:3001/api/v1/health

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Student | `student` | `student` |
| Teacher | `teacher` | `teacher` |
| Admin | `admin` | `admin` |

Demo exam session: `MOCK-005`

## API modules

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/auth` | Login, register, me |
| Catalog | `/catalog` | Mock packages |
| Bookings | `/bookings` | Teacher slots, create enrollment |
| Students | `/students` | Dashboard, mock-day, profile |
| Teachers | `/teachers` | Availability, earnings, profile |
| Exam Sessions | `/exam-sessions` | CBT delivery engine, timers, autosave |
| Grading | `/grading` | Writing/Speaking scoring |
| Results | `/results` | Band reports (gated release) |
| Notifications | `/notifications` | In-app notifications |
| Admin | `/admin` | Operations console, audit logs (`/admin/audit-logs`) |
| Content | `/admin/content` | Test bank management |
| Settings | `/admin/settings` | Platform configuration |

## Environment

Copy `.env.example` to `.env`. Set `REDIS_URL` (start Redis via `docker compose up -d`) for server-authoritative exam timers. Production templates: `../deploy/env/`.

## Frontend integration

Point the Next.js app at `http://localhost:3001/api/v1` and replace static mock imports with authenticated `fetch` calls. Send the JWT as `Authorization: Bearer <token>`.
