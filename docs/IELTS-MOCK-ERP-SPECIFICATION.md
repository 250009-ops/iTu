# IELTS Mock Exam ERP — System Specification

**Document version:** 1.0  
**Last updated:** June 2026  
**Status:** Approved for implementation  
**UI reference:** IDP computer-delivered test layout

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Scope](#2-product-vision--scope)
3. [Stakeholders & Roles](#3-stakeholders--roles)
4. [Product Catalog](#4-product-catalog)
5. [Full Mock Exam Flow](#5-full-mock-exam-flow)
6. [Teacher Scheduling & Booking](#6-teacher-scheduling--booking)
7. [ERP Module Architecture](#7-erp-module-architecture)
8. [Exam Session Control](#8-exam-session-control)
9. [Scoring & Results Release](#9-scoring--results-release)
10. [CBT User Interface — Listening](#10-cbt-user-interface--listening)
11. [CBT User Interface — Reading](#11-cbt-user-interface--reading)
12. [CBT User Interface — Writing](#12-cbt-user-interface--writing)
13. [Speaking Mock User Interface](#13-speaking-mock-user-interface)
14. [Admin Content Authoring](#14-admin-content-authoring)
15. [Data Model Overview](#15-data-model-overview)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Implementation Roadmap](#17-implementation-roadmap)
18. [Glossary](#18-glossary)

---

## 1. Executive Summary

The **IELTS Mock Exam ERP** is a professional multi-role platform that delivers realistic IELTS computer-delivered mock examinations for students, enables certified IELTS teachers to sell Writing and Speaking evaluation services, and provides administrators with full control over exam content, operations, and compliance.

The platform supports:

- **Full mock exams** — Listening → Reading → Writing → Speaking in a single calendar day
- **IDP-faithful CBT interfaces** for Listening, Reading, and Writing
- **Live Speaking mocks** with video-based examiner sessions
- **Human grading** for Writing and Speaking by booked teachers
- **Auto-scoring** for Listening and Reading from an admin-managed question bank
- **100% official exam rules** — no pause, no rewind, server-authoritative timers, integrity logging
- **Deferred score release** — all band scores published only after the Speaking section is completed and graded

---

## 2. Product Vision & Scope

### 2.1 Vision

Give students an exam-day experience indistinguishable from IDP computer-delivered IELTS, while giving teachers a turnkey way to monetize professional Writing and Speaking evaluation — all orchestrated by a single ERP.

### 2.2 In Scope (v1)

| Area | Included |
|------|----------|
| Skills | Listening, Reading, Writing, Speaking (Academic; General Training optional v1.1) |
| Delivery | CBT for L/R/W; live video for Speaking |
| Roles | Admin, IELTS Teacher, Student |
| Commerce | Full mock purchase, teacher payouts, refunds |
| Content | Admin-only question and prompt bank |
| UI | IDP layout for L/R/W; IDP-consistent Speaking suite |

### 2.3 Out of Scope (v1)

- Official IELTS registration or test-centre certification
- Visa or immigration services
- Practice-mode toggle (strict mode only in v1)
- Teacher-authored Listening/Reading content

---

## 3. Stakeholders & Roles

### 3.1 Admin

| Responsibility |
|----------------|
| Create, review, and publish Listening & Reading tests |
| Manage Writing prompts and Speaking cue-card banks |
| Approve and suspend teachers |
| Set platform commission and pricing rules |
| Monitor live exam sessions and resolve disputes |
| Configure band conversion tables and exam timers |
| Export financial and compliance reports |

### 3.2 IELTS Teacher

| Responsibility |
|----------------|
| Set weekly availability and bookable time slots |
| Conduct live Speaking mock sessions |
| Grade assigned Writing submissions |
| Grade assigned Speaking sessions |
| View earnings and student feedback |
| Cannot create L/R test content |

### 3.3 Student

| Responsibility |
|----------------|
| Browse and purchase full mock packages |
| Select Writing and Speaking teachers based on available slots |
| Complete all exam sections on the scheduled mock day |
| View unified results after Speaking is graded |

### 3.4 Permission Model

```
Admin     →  Global access
Teacher   →  Own schedule, assigned students, own grades and earnings
Student   →  Own enrollments, sessions, and results only
```

---

## 4. Product Catalog

### 4.1 Primary Product — Full Mock (4 Skills)

A single-day examination experience:

| Section | Duration (approx.) | Delivery | Scoring |
|---------|-------------------|----------|---------|
| Listening | ~32 min (incl. transfer) | CBT | Automatic |
| Reading | 60 min | CBT | Automatic |
| Writing | 60 min (20 + 40) | CBT | Teacher |
| Speaking | 11–14 min | Live video | Teacher |

### 4.2 Future Products (post-v1)

- Listening-only mock
- Reading-only mock
- Writing-only mock
- Speaking-only mock
- L+R bundle

---

## 5. Full Mock Exam Flow

### 5.1 Same-Day Orchestration

All four sections **must occur on one calendar day**. The system enforces section order and time gates.

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ LISTENING  │ →  │  READING   │ →  │  WRITING   │ →  │  SPEAKING  │
│  CBT       │    │  CBT       │    │  CBT       │    │  Live      │
│  Auto      │    │  Auto      │    │  Teacher   │    │  Teacher   │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
       │                 │                 │                 │
       └─────────────────┴─────────────────┴─────────────────┘
                    Scores held until Speaking graded
                              ↓
                    Unified results released
```

### 5.2 Typical Timeline (Example)

| Time | Activity |
|------|----------|
| 08:30 | Check-in, identity confirmation, rules acknowledgment, device check |
| 08:45 | Listening begins (strict — audio server-driven) |
| 09:20 | Short controlled break |
| 09:25 | Reading begins (60 min) |
| 10:25 | Short controlled break |
| 10:30 | Writing begins (Task 1 → Task 2, 60 min total) |
| 11:30 | Lunch / rest until Speaking slot |
| 14:00 | Speaking session (pre-booked teacher slot) |
| 14:20 | Session ends; teacher completes grading |
| — | **All scores released** to student |

### 5.3 Session State Machine

```
scheduled → check_in → listening → break → reading → break → writing
    → waiting_speaking → speaking → grading → completed → results_released
```

| State | Gate |
|-------|------|
| `reading` | Listening submitted |
| `writing` | Reading submitted |
| `waiting_speaking` | Writing submitted |
| `speaking` | Booked slot time reached |
| `grading` | Speaking session ended |
| `results_released` | Writing + Speaking graded; L/R auto-scored |

### 5.4 Break Rules

- Breaks between L/R/W are **timed and non-skippable** (configurable, default 2–5 min)
- No access to practice material during breaks
- Speaking cannot start until Writing is submitted

---

## 6. Teacher Scheduling & Booking

### 6.1 Teacher Availability

Teachers define:

- **Working days** (e.g., Mon–Sat)
- **Time blocks** (e.g., 09:00–12:00, 14:00–18:00)
- **Slot duration** (default 20 min per Speaking session including buffer)
- **Maximum concurrent students** (always 1 for Speaking)
- **Time off / holidays** (blocked dates)

### 6.2 Student Booking at Purchase

When purchasing a full mock, the student must:

1. Select **mock date**
2. Select **Writing teacher** (for grading assignment)
3. Select **Speaking teacher** and **available time slot** on the same date
4. Confirm timeline: Speaking slot must be **after** estimated Writing end time

The system displays a **real-time availability grid** per teacher to prevent double-booking.

### 6.3 Conflict Prevention

| Rule | Behavior |
|------|----------|
| One student per slot | Database-level lock on `teacher_slot` |
| Slot overlap | Prevented at booking API |
| Teacher marks day off after booking | Student notified; refund or rebook offered |
| Teacher no-show | Admin escalation; student offered alternate teacher/slot |
| Student late to Speaking | Grace period (configurable, e.g., 5 min); then mark no-show per policy |

### 6.4 Writing Teacher Assignment

Writing does not require a live slot. The selected Writing teacher receives the submission in their **grading queue** after the student completes the Writing section.

---

## 7. ERP Module Architecture

### 7.1 Module Count — 21 Core Modules

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

### 7.2 Architecture Pattern

**Modular monolith** recommended for v1, with clear bounded contexts. Extract services (video, scoring queue) only when scale requires.

```
┌─────────────────────────────────────────────────────────┐
│  Web Apps: Student Portal | Teacher Portal | Admin      │
├─────────────────────────────────────────────────────────┤
│  API Gateway / BFF                                      │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ IAM      │ Catalog  │ Booking  │ Exam     │ Payments    │
│ Content  │ Session  │ Grading  │ Results  │ Notify      │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│  PostgreSQL  |  Redis  |  S3 (media)  |  Job Queue        │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Exam Session Control

### 8.1 Principles

- **Server is source of truth** for all timers
- **100% official rules** — no pause, no rewind, no practice mode in v1
- **Client timer is display-only**
- **Autosave** every 10–30 seconds
- **Integrity events** logged with optional penalties

### 8.2 Controls by Skill

| Control | Listening | Reading | Writing | Speaking |
|---------|-----------|---------|---------|----------|
| Server timer | ✓ | ✓ (60 min) | ✓ (20+40 min) | ✓ (per part) |
| No pause | ✓ | ✓ | ✓ | ✓ |
| Audio rewind | Blocked | N/A | N/A | N/A |
| Paste block | ✓ (text inputs) | ✓ | ✓ | N/A |
| Fullscreen | Required | Required | Required | Recommended |
| Tab-blur log | ✓ | ✓ | ✓ | ✓ |
| Admin live monitor | ✓ | ✓ | ✓ | ✓ |
| Force submit | ✓ | ✓ | ✓ | ✓ (end session) |

### 8.3 Integrity Events

| Event | Action |
|-------|--------|
| Tab visibility lost | Log + warning (1st); flag session (repeat) |
| Paste attempt | Block + log |
| Fullscreen exit | Prompt to re-enter; log |
| Late API submission | Reject save; mark submitted at server time |
| Multiple sessions | Block second login |

### 8.4 Penalties (Configurable by Admin)

- Warning only (default for first offense)
- Section score hold pending review
- Annotation on results report for admin-reviewed sessions

---

## 9. Scoring & Results Release

### 9.1 Scoring by Skill

| Skill | Method | Criteria | When Calculated |
|-------|--------|----------|-----------------|
| Listening | Auto | Raw /40 → band table | On section submit |
| Reading | Auto | Raw /40 → band table | On section submit |
| Writing | Teacher | TA, CC, LR, GRA per task; Task 2 double weight | After Writing submit |
| Speaking | Teacher | FC, LEX, GRA, PR | After live session |

### 9.2 Results Release Policy

> **All scores remain hidden until every skill *included in the purchased package* has been graded.**

Release is **package-aware** (see §22). Results are released the moment all
required sections for that package reach a graded state — not a fixed count of
four. Examples:

| Package | Releases when |
|---------|---------------|
| Full Mock (L/R/W/S) | All four graded (Speaking last) |
| Writing-Only | Writing graded by teacher |
| Speaking-Only | Speaking graded by examiner |
| Listening + Reading | Both auto-scored on submit (immediate) |

| Milestone (full mock) | Student sees |
|-----------|--------------|
| After Listening | Progress only ("Listening complete") |
| After Reading | Progress only |
| After Writing | Progress only |
| After Speaking | "Results processing" |
| All required grading complete | **Full report**: bands + overall + PDF |

### 9.3 Results Report Contents

- Band score per skill
- Optional overall band (average of four skills, rounded per IELTS rules)
- Writing: task-level sub-scores and examiner comments
- Speaking: criterion scores, examiner notes, session recording link (retention per policy)
- Listening/Reading: raw score; item review optional (admin-configurable delay)

---

## 10. CBT User Interface — Listening

### 10.1 Layout Shell

Single-column layout with fixed header and footer.

```
┌──────────────────────────────────────────────────────────────┐
│ IELTS | Test taker ID | 🔊 Audio is Playing    WiFi 🔔 ≡    │
├──────────────────────────────────────────────────────────────┤
│ Part N | Listen and answer questions X–Y.                    │
├──────────────────────────────────────────────────────────────┤
│                    QUESTION CANVAS                            │
│                                         [ ◀ ]  [ ▶ ]         │
├──────────────────────────────────────────────────────────────┤
│ Part1 0/10 | Part2 [11..20] | Part3 0/10 | Part4 0/10  [✓] │
└──────────────────────────────────────────────────────────────┘
```

### 10.2 Footer Navigation

| Visual | Meaning |
|--------|---------|
| Green line above number | Answered |
| Blue box around number | Active question |
| "X of 10" | Answered count per part |
| Checkmark | End Listening section |

### 10.3 Question Types

| Type | Interaction |
|------|-------------|
| Note / form completion | Inline text input in sentence flow |
| Matching | Drag option from pool → gap |
| Map / diagram labeling | Drag option → positioned zone on image |
| Flow-chart completion | Drag option → node in vertical flow |
| Table completion | Text input in table cells |
| Multiple choice (single) | Radio; full row highlight on select |
| Instruction interstitial | "Click next to continue" + Next button |

### 10.4 Audio Behavior

- Audio status banner: **"Audio is Playing"**
- No pause, rewind, or seek controls visible to student
- Audio progression tied to part unlock rules
- Server streams audio via signed URL

### 10.4 Structure

- **4 parts × 10 questions = 40 total**
- ~30 minutes listening + transfer time

---

## 11. CBT User Interface — Reading

### 11.1 Layout Shell

Split-pane with resizable divider.

```
┌──────────────────────────────────────────────────────────────┐
│ IELTS | Test taker ID                         WiFi 🔔 ≡    │
├──────────────────────────────────────────────────────────────┤
│ Part N | Read the text and answer questions X–Y.             │
├──────────────────────────┬───────────────────────────────────┤
│  PASSAGE (scroll)        │  QUESTIONS (scroll)        [◀][▶]│
│  Title + paragraphs      │  Instructions + inputs           │
│  [heading drop zones]    │                                  │
├──────────────────────────┴───────────────────────────────────┤
│ Part1 [1..13] | Part2 [14..26] | Part3 [27..40]        [✓] │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 Split-Pane Requirements

- **Independent vertical scroll** per pane
- **Draggable divider** (↔) with width persisted per session
- Passage uses serif-style body text; UI chrome uses sans-serif

### 11.3 Question Types

| Type | Interaction | Pane |
|------|-------------|------|
| True / False / Not Given | Radio; row highlight | Right |
| Note completion | Inline text; "ONE WORD ONLY from text" | Right |
| Matching headings | Drag heading → section drop zone | **Left + Right** |
| Multiple choice (choose TWO) | Checkbox; max 2; grouped footer label (e.g. 18–19) | Right |
| Summary completion | Inline gaps in prose paragraph | Right |
| Instruction interstitial | Click next to continue | Full |

### 11.4 Structure

- **Part 1:** Q1–13 | **Part 2:** Q14–26 | **Part 3:** Q27–40
- **60 minutes** total

---

## 12. CBT User Interface — Writing

### 12.1 Layout Shell

Split-pane: prompt left, essay editor right.

```
┌──────────────────────────────────────────────────────────────┐
│ IELTS | Test taker ID                         WiFi 🔔 ≡    │
├──────────────────────────────────────────────────────────────┤
│ Part 1 | Spend about 20 minutes. Write at least 150 words.   │
├──────────────────────────┬───────────────────────────────────┤
│  TASK PROMPT             │  ESSAY EDITOR                    │
│  Text + chart/diagram    │  Plain text area                 │
│                          │  Words: 168              [◀][▶] │
├──────────────────────────┴───────────────────────────────────┤
│ ✓ Part 1  |  Part 2  0 of 1                            [✓] │
└──────────────────────────────────────────────────────────────┘
```

### 12.2 Task Structure

| Part | Task | Time | Min words |
|------|------|------|-----------|
| Part 1 | Task 1 (Academic: chart/diagram; GT: letter) | 20 min | 150 |
| Part 2 | Task 2 (essay) | 40 min | 250 |

### 12.3 Editor Requirements

| Feature | Specification |
|---------|---------------|
| Word counter | Live; bottom-right of editor |
| Input | Plain text only; no rich formatting |
| Paste | Blocked; integrity event logged |
| Autosave | Every 10–30 seconds |
| Navigation | Back to Task 1 allowed until section submit |
| Submit | Checkmark locks both tasks |

### 12.4 Task 1 Visual Types (Admin)

Bar chart, line graph, pie chart, table, process diagram, map — rendered or uploaded as image in prompt pane.

---

## 13. Speaking Mock User Interface

The Speaking module uses a **dedicated live-session suite** that extends the IDP visual language (header chrome, typography, progress indicators) while adapting for real-time video interaction. Speaking is the only skill with **distinct Student and Teacher interfaces**.

### 13.1 Design Principles

- **Exam-realistic flow** — Parts 1, 2, and 3 with official timing guidance
- **Low cognitive load** — student sees minimal UI; teacher sees full examiner toolkit
- **IDP consistency** — red IELTS branding, Test taker ID, WiFi status, clean white/grey palette
- **No student self-recording controls** — session recorded server-side with consent
- **Teacher-led pacing** — examiner advances parts; student cannot skip ahead

### 13.2 Student Speaking Flow

```
Waiting Room → Device Check → Rules & Consent → Live Session → Session Complete
```

### 13.3 Student — Waiting Room

Displayed 10–15 minutes before booked slot.

```
┌──────────────────────────────────────────────────────────────┐
│ IELTS | Test taker ID                         WiFi 🔔 ≡    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              Speaking Mock — Waiting Room                    │
│                                                              │
│   Examiner: [Teacher Name]          Slot: 14:00 – 14:20     │
│   Status: ● Waiting for examiner to join                    │
│                                                              │
│   ┌────────────────────────────────────────────────────┐    │
│   │           [ Self-view camera preview ]              │    │
│   └────────────────────────────────────────────────────┘    │
│                                                              │
│   Microphone:  ████████░░  Good                             │
│   Camera:      ✓ Connected                                  │
│   Connection:  ✓ Stable                                     │
│                                                              │
│              [ Run device check again ]                      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Full Mock Progress:  L ✓   R ✓   W ✓   S ● current         │
└──────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| Self-view preview | Camera/mic test without examiner |
| Examiner status | "Waiting" → "Examiner joined" → "Session starting" |
| Device check | Validates mic level, camera, browser WebRTC support |
| Progress bar | Shows L/R/W complete; Speaking current |
| Entry gate | "Join session" enabled only when examiner ready + devices OK |

### 13.4 Student — Rules & Consent (Pre-Session)

Modal or full-screen interstitial (IDP-style):

```
┌──────────────────────────────────────────────────────────────┐
│                    Speaking Test — Rules                     │
│                                                              │
│  • This session will be recorded for evaluation.             │
│  • You may ask the examiner to repeat a question in Part 1.  │
│  • Part 2 includes 1 minute preparation time.                │
│  • Do not use notes during the test.                         │
│  • Remain in fullscreen for the duration.                    │
│                                                              │
│  ☐ I agree to the recording and exam rules.                  │
│                                                              │
│                    [ Join Speaking Test ]                    │
└──────────────────────────────────────────────────────────────┘
```

### 13.5 Student — Live Session Layout

```
┌──────────────────────────────────────────────────────────────┐
│ IELTS | Test taker ID: XXXX          WiFi 🔔 ≡   ⏱ 08:42  │
├──────────────────────────────────────────────────────────────┤
│ Part 2  |  Describe a topic. 1 min preparation. 2 min talk. │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │            [ EXAMINER VIDEO — large ]               │   │
│   │                                                     │   │
│   │                              ┌──────────────┐       │   │
│   │                              │ Self-view    │       │   │
│   │                              │ (small PiP)  │       │   │
│   │                              └──────────────┘       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─ Part progress ─────────────────────────────────────┐   │
│   │  ● Part 1  Introduction    ✓ Complete                 │   │
│   │  ● Part 2  Cue card        ◐ In progress  ⏱ 0:45   │   │
│   │  ○ Part 3  Discussion      Pending                    │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   [ Part 2 only ] Cue card topic shown when examiner       │
│   releases it — student does NOT see questions in advance    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  🔴 Recording   |  Do not leave this page          [ Help ] │
└──────────────────────────────────────────────────────────────┘
```

#### Student UI Rules

| Rule | Implementation |
|------|----------------|
| Examiner video dominant | ~80% of video area |
| Self-view PiP | Small, draggable corner overlay |
| Part indicator | Vertical stepper: Part 1 → 2 → 3 |
| Timer | Visible only during Part 2 prep and Part 2/3 speaking |
| Cue card | Shown to student **only** when examiner starts Part 2 prep |
| No mute/deafen | Student mic always live during session |
| No chat | Voice only (exam-realistic) |
| Help button | Technical support only — not content hints |
| Recording indicator | Persistent red dot + "Recording" label |

### 13.6 Student — Part 2 Cue Card Display

When examiner triggers Part 2, a card overlay appears (fades in center or slides into main area):

```
┌─────────────────────────────────────────┐
│           Part 2 — Cue Card             │
│                                         │
│  Describe a book you read recently.       │
│                                         │
│  You should say:                          │
│  • what the book was about                 │
│  • when you read it                        │
│  • why you chose to read it                │
│  • and explain whether you would          │
│    recommend it to others.                │
│                                         │
│         Preparation time: 0:58           │
└─────────────────────────────────────────┘
```

- **1-minute countdown** during preparation (notepad icon shown but input disabled — no notes)
- Card remains visible during 2-minute speaking period
- Pencil/notepad graphic for realism; typing disabled

### 13.7 Student — Session Complete

```
┌──────────────────────────────────────────────────────────────┐
│              Speaking Test Complete                          │
│                                                              │
│   Thank you. Your examiner will finalize your evaluation.    │
│                                                              │
│   Full Mock Progress:  L ✓   R ✓   W ✓   S ✓               │
│                                                              │
│   Your complete results will be available once grading       │
│   is finished. You will receive an email notification.     │
│                                                              │
│              [ Return to Dashboard ]                         │
└──────────────────────────────────────────────────────────────┘
```

### 13.8 Teacher — Examiner Console Layout

Full examiner workstation optimized for conducting and grading in one flow.

```
┌──────────────────────────────────────────────────────────────┐
│ Examiner Console | Student: XXXX | Slot: 14:00    [ End ]   │
├──────────────────────────┬───────────────────────────────────┤
│  STUDENT VIDEO (large)   │  EXAMINER PANEL                   │
│                          │                                   │
│                          │  ┌─ Session phase ─────────────┐  │
│                          │  │ ● Part 1  [ Start Part 1 ]  │  │
│                          │  │ ○ Part 2  [ Start Part 2 ]  │  │
│                          │  │ ○ Part 3  [ Start Part 3 ]  │  │
│                          │  └─────────────────────────────┘  │
│                          │                                   │
│                          │  ┌─ Part 1 script (admin bank) ──┐ │
│                          │  │ • Home/accommodation (4-5m)  │ │
│                          │  │ • Work/study                 │ │
│                          │  │ • Hobbies...                 │ │
│                          │  └──────────────────────────────┘ │
│                          │                                   │
│                          │  ┌─ Part 2 cue card selector ───┐ │
│                          │  │ [ Card from admin bank ▼ ]   │ │
│                          │  │ [ Release to student ]       │ │
│                          │  │ Prep timer: [1:00] [Start]   │ │
│                          │  └──────────────────────────────┘ │
│                          │                                   │
│                          │  ┌─ Part 3 questions ───────────┐ │
│                          │  │ (unlocked after Part 2)      │ │
│                          │  └──────────────────────────────┘ │
├──────────────────────────┴───────────────────────────────────┤
│  ┌─ Live scoring (post-session or inline) ─────────────────┐ │
│  │ Fluency & Coherence  [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ][ 7 ]│ │
│  │ Lexical Resource     [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ][ 7 ]│ │
│  │ Grammatical Range    [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ][ 7 ]│ │
│  │ Pronunciation        [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ][ 6 ][ 7 ]│ │
│  │ Overall Speaking Band: (auto-calculated)                 │ │
│  │ Examiner notes: [________________________]               │ │
│  │                              [ Save & Submit Grade ]     │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

#### Teacher Console Features

| Feature | Description |
|---------|-------------|
| Phase controls | Start Part 1 / 2 / 3 — pushes state to student UI |
| Script panel | Part 1 topic prompts from admin bank (examiner guide, not shown to student as text) |
| Cue card picker | Select card from admin bank; "Release" sends to student |
| Timers | Part 2 prep (1 min) + speak (2 min); Part 1/3 guidance timers |
| Student video | Large view with connection quality indicator |
| End session | Graceful disconnect; triggers recording finalize |
| Rubric scoring | FC, LEX, GRA, PR — 0.5 increments; band calculator |
| Notes | Free-text examiner comments for results report |
| Recording | Auto-start on session join; stored in M14 Media |

### 13.9 Speaking Timing Guide (Official)

| Part | Duration | Pacing |
|------|----------|--------|
| Part 1 | 4–5 min | Examiner asks 4–8 questions on familiar topics |
| Part 2 | 1 min prep + 2 min speak | Cue card released at prep start |
| Part 3 | 4–5 min | Abstract discussion linked to Part 2 topic |
| **Total** | **11–14 min** | Teacher console shows elapsed time |

### 13.10 Speaking Technical Requirements

| Requirement | Specification |
|-------------|---------------|
| Video provider | WebRTC (Daily.co, LiveKit, or Twilio) |
| Recording | Server-side composite (student + examiner) |
| Min bandwidth | 2 Mbps up/down recommended; warn if below |
| Browser | Chrome/Edge latest; Safari supported |
| Fallback | Audio-only mode if video fails (admin flag on report) |
| Reconnection | 60-second grace; examiner can pause session (exception log) |

### 13.11 Speaking Content (Admin Bank)

Admin maintains:

- **Part 1 topic pools** (home, work, hobbies, etc.) with suggested questions
- **Part 2 cue cards** (topic + bullet prompts)
- **Part 3 question sets** linked to Part 2 topics
- Versioning: draft → published; assigned to mock test packages

Teachers **select from admin bank** during session — they do not author cue cards.

---

## 14. Admin Content Authoring

### 14.1 Content Types

| Content | Owner | Used in |
|---------|-------|---------|
| Listening tests (4 parts, audio, 40 Q) | Admin | CBT Listening |
| Reading tests (3 passages, 40 Q) | Admin | CBT Reading |
| Writing Task 1 & 2 prompts | Admin | CBT Writing |
| Speaking scripts, cue cards, Part 3 Q | Admin | Examiner console |
| Band conversion tables | Admin | Auto-scoring |

### 14.2 Authoring Studio Features

- WYSIWYG preview in IDP player shell
- Version control: draft → review → published
- Bulk import (JSON/CSV) for question banks
- Media library for audio, images, charts
- Map labeling coordinate editor
- Passage section marker for matching headings
- Cannot edit published tests in use — clone to new version

### 14.3 Question Type Registry (Complete)

| `question_type` | Skill | Input |
|-----------------|-------|-------|
| `note_completion` | L, R | string |
| `form_completion` | L | string |
| `table_completion` | L | string |
| `matching` | L | optionId |
| `map_labeling` | L | optionId |
| `flowchart_completion` | L | optionId |
| `mcq_single` | L | optionId |
| `tfng` | R | TRUE \| FALSE \| NOT_GIVEN |
| `matching_headings` | R | headingId (cross-pane) |
| `mcq_multi` | R | optionId[] (max 2) |
| `summary_completion` | R | string |
| `essay_task` | W | string (full essay) |
| `speaking_session` | S | teacher rubric scores |
| `instruction_screen` | L, R, W | null |

---

## 15. Data Model Overview

### 15.1 Core Entities

```
User (role: admin | teacher | student)
TeacherProfile (credentials, bio, commission_rate, status)
StudentProfile (target_band, exam_type)
TeacherAvailability (day, start, end, slot_duration)
TeacherSlot (teacher_id, datetime, status: available | booked | blocked)
MockTestPackage (listening_test_id, reading_test_id, writing_test_id, speaking_bank_id)
Enrollment (student, package, mock_date, status)
EnrollmentTeachers (writing_teacher_id, speaking_teacher_id, speaking_slot_id)
ExamSession (enrollment_id, state, section_timers, integrity_log)
SectionAttempt (session_id, skill, started_at, submitted_at)
Answer (attempt_id, question_number, question_type, value, revision)
WritingSubmission (task1_text, task2_text, word_counts)
SpeakingSession (recording_url, part_timestamps, teacher_notes)
Grade (attempt_id, criteria_scores, overall_band, graded_by, graded_at)
Payment, Payout, Refund
Notification, SupportTicket, AuditLog
```

### 15.2 Results Release Logic

```sql
-- Pseudocode
IF speaking_session.status = 'graded'
   AND writing_submission.status = 'graded'
   AND enrollment.all_sections_submitted
THEN enrollment.results_status = 'released'
```

---

## 16. Non-Functional Requirements

| Area | Target |
|------|--------|
| Availability | 99.5% uptime; Speaking sessions time-critical |
| Performance | CBT interactions < 200ms; autosave < 500ms |
| Security | RBAC, TLS, encryption at rest, signed media URLs |
| Privacy | GDPR-style export/delete; recording consent |
| Scalability | Queue-based grading notifications; CDN for audio |
| Accessibility | Keyboard navigation for CBT; WCAG 2.1 AA target |
| Audit | Immutable log for session events and grade changes |

### 16.1 Recommended Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React / Next.js, TypeScript |
| CBT Player | Dedicated React component library |
| Backend | Node.js (NestJS) or .NET |
| Database | PostgreSQL |
| Cache | Redis |
| Media | S3-compatible object storage |
| Queue | BullMQ / SQS |
| Video | LiveKit or Daily.co |
| Payments | Stripe |

---

## 17. Implementation Roadmap

### Phase 1 — Foundation + L/R CBT (Weeks 1–8)

- M1, M2, M4, M18, M19, M20, M21
- IDP Listening & Reading players with all question types
- Admin authoring studio
- Session control engine

### Phase 2 — Commerce + Writing (Weeks 9–12)

- M9, M10, M11, M13
- Writing CBT player
- Teacher grading queue for Writing

### Phase 3 — Speaking + Scheduling (Weeks 13–16)

- M6, M5 (Speaking), M14
- Teacher availability & booking
- Speaking student + examiner UIs
- Video integration

### Phase 4 — Full Mock Orchestration (Weeks 17–20)

- Same-day flow state machine
- Teacher payouts (M12)
- Results release pipeline
- Admin console (M16), BI (M17)

### Phase 5 — Hardening (Weeks 21–24)

- Load testing, security audit
- Dispute workflow (M15)
- Beta with pilot teachers and students

---

## 17.5 Launch Hardening Addendum (v1.1)

This addendum records behaviors added during pre-launch hardening. It amends
§4 (catalog), §5.3 (state machine), §6 (booking/assignment), and §9 (release).

### 17.5.1 Content Pool & Rotation (No-Repeat)

- A package may define a **content pool per skill** (`PackageContentTest`) in
  addition to the legacy single-test foreign keys. Each pool entry references a
  **published** content test of the matching type.
- At booking time, an **assignment engine** pins one test per skill onto each
  `SectionAttempt` (`SectionAttempt.contentTestId`), preferring tests the
  student has **never taken** before.
- Selection order: pool entries (oldest first) → explicit package FK →
  any published test of the type (legacy fallback).
- **Exhaustion policy:** if every eligible test has been seen, the engine
  **recycles** the test taken longest ago (rather than failing the purchase).
- `getExamContent` and speaking-bank resolution read the **pinned** test, so
  the student always sees exactly what was assigned at purchase.

### 17.5.2 Re-Purchase Policy

- Re-buying the same package is allowed and **guarantees different content**
  while unseen tests remain in the pool.
- `GET /bookings/packages/:id/content-availability` reports, per skill,
  `total` eligible and `remaining` unseen tests, plus `freshAvailable` /
  `anyExhausted` flags so the booking wizard can guide or warn the student.

### 17.5.3 Package-Aware Orchestration

- The exam **state machine** derives the next section from the package's
  ordered skill set (`orderedPackageSkills`). Section-only and arbitrary
  subsets (Listening-only, Writing-only, L+R, etc.) are first-class.
- `assertStartTransition` validates that the skill being started is the next
  expected skill for the package; `nextStateAfterSubmit` computes the next
  state (next skill / Speaking scheduling / `AWAITING_GRADING`).
- The student player computes the next route via `examRouteAfterSection`
  rather than hardcoded `listening → reading → writing` URLs.

### 17.5.4 Results Release (Package-Aware)

- A single `ResultsReleaseService.tryRelease()` is the **source of truth** for
  release. It requires **every skill the package includes** to be graded — not
  a hardcoded count of four.
- CBT-only packages release immediately after auto-scoring; partial packages
  (Writing-Only, Speaking-Only) release as soon as their section is graded.

### 17.5.5 Grading SLA, Reassignment & Re-grade

- **SLA monitor** (`GradingSlaService`, hourly): ungraded Writing past
  `slaDueAt` and Speaking ungraded > 48h past `endedAt` trigger a teacher
  reminder and an admin breach alert.
- **Reassignment** (`POST /admin/enrollments/:id/reassign-writing-teacher`):
  admin moves a writing submission to another approved teacher and resets SLA.
- **Re-grade** (`POST /admin/enrollments/:id/regrade`): admin reopens a graded
  Writing/Speaking section — deletes the grade, returns results to `PENDING`,
  session to `AWAITING_GRADING`, and re-notifies the teacher. Re-release runs
  automatically once re-graded.
- **Band validation** (server-side): every criterion and the overall band must
  be 0–9 in 0.5 steps; the overall must be within one band of the criteria
  average (guards against typos).

### 17.5.6 Runtime Stability

- Content JSON is **structurally normalized** on save, on publish, and in
  `getExamContent` so malformed question groups can never crash the player.
- Publish is **blocked** when any L/R question group has non-array
  `nodes`/`lines`/`rows`.
- The student exam routes have an **error boundary** (graceful recovery UI),
  and fullscreen is requested from the check-in **user gesture**.

---

## 18. Glossary

| Term | Definition |
|------|------------|
| **CBT** | Computer-based test |
| **IDP** | International Development Program — IELTS co-owner; UI reference standard |
| **Full mock** | All four skills in one enrollment on one day |
| **Cue card** | Part 2 Speaking prompt card with topic and bullet points |
| **TFNG** | True / False / Not Given (Reading question type) |
| **Band** | IELTS score from 0–9 in 0.5 increments |
| **TA/CC/LR/GRA** | Writing criteria: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy |
| **FC/LEX/GRA/PR** | Speaking criteria: Fluency & Coherence, Lexical Resource, Grammatical Range, Pronunciation |
| **Session control** | Server-side exam governance: timers, locks, integrity |
| **Admin bank** | Central content repository; only admins publish content |

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| UX Lead | | | |

---

*This specification is the authoritative reference for the IELTS Mock Exam ERP v1. All implementation decisions should align with this document or be proposed as formal amendments.*
