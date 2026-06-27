# Student QA Guide — Alex Johnson (Fresh User)

End-to-end manual test plan for the student portal. Alex Johnson is the primary demo student account, seeded with **no mocks booked** so you can walk through every feature in order.

## Prerequisites

| Service | URL | Start command |
|---------|-----|---------------|
| API | http://localhost:3001/api/v1 | `cd api && npm run start:dev` |
| Frontend | http://localhost:3000 | `cd web && npm run dev` |

## Local seed accounts

| Role | Login | Password | Use for |
|------|-------|----------|---------|
| **Student (Alex)** | `student@example.com` | `student` | This guide — full student journey |
| Teacher | `teacher@example.com` | `teacher` | Grading & speaking after Alex completes sections |
| Admin | `serkinov393@gmail.com` | See the owner-provided/admin-seed password | Live monitor, enrollments, orders |

## Reset Alex to fresh state

Run this anytime you want to start the student journey over (clears bookings, exams, orders, notifications):

```bash
cd api
npm run db:reset-student
```

Or re-seed everything:

```bash
cd api
npm run db:seed
```

---

## Test cases (in recommended order)

### 1. Login & empty dashboard

| | |
|---|---|
| **Goal** | Confirm fresh student sees an empty state |
| **Login** | `student` / `student` |
| **Go to** | http://localhost:3000/login → Sign In |
| **Expect** | Redirect to `/student` dashboard |
| **Check** | Welcome message for Alex Johnson · 0 mocks completed · no upcoming mock card · prompt to browse mocks · Target Band shows **—** (not set) |

---

### 2. Browse mock packages

| | |
|---|---|
| **Goal** | View catalogue and package details |
| **Go to** | Sidebar → **Browse Mocks** (`/student/browse`) |
| **Check** | Packages listed (Full Academic Mock, General Training, Speaking Only, Writing Only) |
| **Check** | FAQs, testimonials, and highlights render |
| **Action** | Click **Book now** on **Full Academic Mock** |

---

### 3. Booking wizard (4 steps)

| | |
|---|---|
| **Goal** | Complete purchase and create enrollment |
| **Go to** | Booking wizard (opens from Browse) |

**Step 1 — Date & time**
- Pick **today's date** (so you can check in immediately)
- Pick start time e.g. `09:00`
- Click **Continue**

**Step 2 — Writing examiner**
- Select any approved teacher (e.g. Emma Williams)
- Click **Continue**

**Step 3 — Speaking slot**
- Pick an available speaking slot on the same day
- Click **Continue**

**Step 4 — Payment**
- Enter any demo card details (not validated in dev):
  - Name: `Alex Johnson`
  - Number: `4242 4242 4242 4242`
  - Expiry: `12/30`
  - CVC: `123`
- Click **Confirm booking**

| **Expect** | Toast “Booking confirmed” · redirect to Mock Day Hub |
| **Verify (admin)** | Log in as `admin` → **Enrollments** shows new enrollment · **Orders** shows paid order |

---

### 4. Mock Day Hub

| | |
|---|---|
| **Goal** | Review schedule before exam day |
| **Go to** | Sidebar → **Mock Day Hub** (`/student/mock-day`) |
| **Check** | Session code displayed (e.g. `MOCK-XXXX`) |
| **Check** | Timeline: Listening → Reading → Writing → Speaking |
| **Check** | Writing & speaking examiner names shown |
| **Check** | Exam rules banner visible |
| **Optional** | **Reschedule** (only while status is enrolled) — pick new date/slot |

---

### 5. Exam check-in

| | |
|---|---|
| **Goal** | Enter the exam flow |
| **Go to** | Mock Day Hub → **Start check-in** (or open `/exam/[sessionCode]/check-in`) |
| **Check** | Identity / environment checklist |
| **Action** | Complete check-in steps |
| **Expect** | Proceed to Listening or exam lobby |

---

### 6. Listening (CBT)

| | |
|---|---|
| **Goal** | Complete Listening section |
| **Go to** | `/exam/[sessionCode]/listening` |
| **Check** | Audio player, question navigation, timer (server-authoritative) |
| **Action** | Answer some questions · use flag/review if available |
| **Action** | Submit section |
| **Expect** | Break screen or redirect to Reading |

---

### 7. Reading (CBT)

| | |
|---|---|
| **Goal** | Complete Reading section |
| **Go to** | `/exam/[sessionCode]/reading` |
| **Check** | Passage panel + questions · timer counts down |
| **Action** | Answer questions · submit section |
| **Expect** | Break before Writing |

---

### 8. Writing (CBT)

| | |
|---|---|
| **Goal** | Submit Task 1 & Task 2 |
| **Go to** | `/exam/[sessionId]/writing` |
| **Check** | Task tabs · word counters · spell-check off |
| **Action** | Type responses for both tasks · submit |
| **Expect** | Writing queued for teacher grading |
| **Verify (teacher)** | Log in as `teacher` → **Grading** → Alex's writing appears in queue |

---

### 9. Speaking waiting room

| | |
|---|---|
| **Goal** | Wait for live speaking slot |
| **Go to** | `/exam/[sessionCode]/waiting-speaking` |
| **Check** | Scheduled time · examiner name · pre-session instructions |

---

### 10. Speaking exam (student)

| | |
|---|---|
| **Goal** | Complete live speaking session UI |
| **Go to** | `/exam/[sessionCode]/speaking` |
| **Check** | Part 1 / 2 / 3 flow · timer · recording indicator |
| **Verify (teacher)** | `teacher` → **Speaking** → session appears for examiner |

---

### 11. Student profile

| | |
|---|---|
| **Goal** | View and edit profile |
| **Go to** | Sidebar → **Profile** (`/student/profile`) |
| **Check** | Personal info, target band (**Not set** for fresh Alex), exam type (Academic) |
| **Action** | Update name or target band · save |
| **Check** | Mock package summary reflects current enrollment |

---

### 12. Notifications

| | |
|---|---|
| **Goal** | See booking and exam alerts |
| **Go to** | Top bar bell or `/student/notifications` |
| **Check** | “Mock booked” notification after step 3 |
| **Check** | Mark as read works |

---

### 13. Help & support ticket

| | |
|---|---|
| **Goal** | Submit a support request |
| **Go to** | Sidebar → **Help** (`/student/help`) |
| **Action** | Open support form · type: Technical issue · submit |
| **Verify (admin)** | `admin` → **Disputes** → new ticket appears |

---

### 14. Results (after grading)

| | |
|---|---|
| **Goal** | View band scores when released |
| **Precondition** | Teacher grades Writing + Speaking (see teacher guide) |
| **Go to** | Sidebar → **Results** (`/student/results`) |
| **Check** | Overall band · per-module breakdown · progression chart |
| **Check** | Export / print report if available |

**Teacher grading quick path:**
1. `teacher` / `teacher` → **Grading** → open Alex's writing → score & submit
2. **Speaking** → complete session → score & submit
3. Admin may need to release results (if not auto-released)

---

### 15. Reviews & leaderboard consent

| | |
|---|---|
| **Goal** | Submit post-mock review |
| **Precondition** | Completed mock with released results |
| **Go to** | Profile → Reviews section (or results page panel) |
| **Action** | Rate mock · leave comment · toggle leaderboard consent |
| **Verify** | Browse page testimonials may include published reviews |

---

### 16. Cross-portal verification (admin)

After Alex books and starts an exam:

| Admin page | What to verify |
|------------|----------------|
| `/admin/dashboard` | KPIs update · live session row for Alex |
| `/admin/sessions` | Live monitor shows current skill & progress |
| `/admin/enrollments` | Enrollment status moves ENROLLED → IN_PROGRESS |
| `/admin/orders` | Order shows PAID |

---

## Quick reference — student routes

| Feature | URL |
|---------|-----|
| Dashboard | `/student` |
| Browse & book | `/student/browse` |
| Mock day hub | `/student/mock-day` |
| Results | `/student/results` |
| Profile | `/student/profile` |
| Notifications | `/student/notifications` |
| Help | `/student/help` |
| Check-in | `/exam/[sessionCode]/check-in` |
| Listening | `/exam/[sessionCode]/listening` |
| Reading | `/exam/[sessionCode]/reading` |
| Writing | `/exam/[sessionCode]/writing` |
| Speaking wait | `/exam/[sessionCode]/waiting-speaking` |
| Speaking | `/exam/[sessionCode]/speaking` |

Replace `[sessionCode]` with the code shown on Mock Day Hub after booking.

---

## Tips

- **Book for today** so check-in is available immediately without waiting.
- **Speaking slots** are seeded for the next 14 days — pick any available slot.
- **Reset between runs:** `cd api && npm run db:reset-student` then log in again as `student`.
- **Session code** is generated at booking time — note it from Mock Day Hub before starting the exam.
