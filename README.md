# IELTS Mock Exam ERP

Professional ERP platform for delivering IDP-style IELTS computer-delivered mock exams with teacher-graded Writing and Speaking services.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture: portals, flows, frontend/backend design, data model, implementation status |
| [IELTS Mock ERP Specification](docs/IELTS-MOCK-ERP-SPECIFICATION.md) | Full system design: modules, flows, CBT UI (L/R/W), Speaking UI, scoring, and roadmap |

## Key Features

- **Full mock flow** — Listening → Reading → Writing → Speaking on one calendar day
- **IDP-faithful CBT** for Listening, Reading, and Writing
- **Live Speaking mocks** with student waiting room and teacher examiner console
- **Admin-only content bank** for all exam materials
- **Teacher scheduling** with conflict-free slot booking
- **Strict exam rules** — server timers, no pause/rewind, integrity logging
- **Deferred results** — all band scores released after Speaking is graded

## Roles

- **Admin** — Content, operations, compliance
- **IELTS Teacher** — Availability, Speaking sessions, Writing/Speaking grading
- **Student** — Purchase, book, take exams, view results

## Status

- **Specification:** Complete
- **Frontend:** All three portal shells built (Student, Teacher, Admin) with mock data
- **Exam delivery:** Complete CBT players (Listening, Reading, Writing) + Speaking student suite + check-in/break flow at `/exam/[sessionId]/*`
- **Backend:** NestJS API with PostgreSQL, Prisma, JWT auth, exam session engine, grading, and admin APIs
- **Integration:** Frontend fully wired to backend API (all portals + exam delivery)

### Run locally

**1. Start infrastructure & API**
```bash
cd api
docker compose up -d
npm install
npm run db:migrate
npm run sync:exam-content   # sync exam JSON from web fixtures
npm run db:seed
npm run start:dev
```

**2. Start frontend**
```bash
cd web
cp .env.example .env.local   # if not present
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1
- Swagger: http://localhost:3001/api/docs

Demo login: `admin`/`admin`, `teacher`/`teacher`, `student`/`student`  
Fresh student QA: Alex Johnson (`student`/`student`) — see [Student Testing Guide](docs/STUDENT-TESTING-GUIDE.md)  
Reset Alex anytime: `cd api && npm run db:reset-student`

See [api/README.md](api/README.md) for full API documentation.

### Architecture

```
web/ (Next.js 16)  ──REST/JWT──►  api/ (NestJS 11)
                                      ├── PostgreSQL (Prisma)
                                      └── Redis (exam timers & session locks)
```

All portal data flows through `web/src/lib/api/*` with role-based route guards. Exam delivery uses server-authoritative timers, autosave, and section state machine.
