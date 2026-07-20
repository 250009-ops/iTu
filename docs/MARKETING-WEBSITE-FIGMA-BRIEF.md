# iTestU — Marketing Website UI Architecture & Figma AI Brief

> **Brand:** **iTestU** (wordmark) · logo mark **iTu** (red rounded square) · domain **https://www.itestu.uz** · founded **2026** · support **support@itestu.uz**
>
> **Purpose.** Enterprise-grade architecture + design schema for the **public marketing site** of iTestU. Paste into Figma AI / Figma Make for page and component generation.
>
> **Product truth (must match shipped features):**
> - Book **Full Academic** mock + **Listening / Reading / Writing / Speaking** single modules — **General Training coming soon**
> - Choose examiner at booking; **see ratings** (no filter-by-rating UI)
> - Check-in = **identity confirm + device check** (not government ID upload)
> - Results release **when all skills graded** — typically same day once Speaking submitted
> - **Reschedule** supported in account; refunds via **support@itestu.uz** (48h window in Terms)
> - **No analytics cookies** — localStorage session + sessionStorage exam prefs
> - **Desktop app optional** — footer + How It Works + home section only; **header CTA = Book a Mock**
> - Do **not** claim official IELTS endorsement, verify.itestu.uz, or bulk 10+/50+/100+ student discounts

> **Figma file (v2):** [iTestU Marketing Site v2](https://www.figma.com/design/cCJEEcBevlLPLxjsBBySW2) — Foundations, Components, and all route wireframes aligned to product truth.
>
> **Figma Make (platform):** [IELTS-Mock-Platform](https://www.figma.com/make/TW2GEVQyjU4r5RycLJ061y/IELTS-Mock-Platform) — initial AI-generated UI; marketing pages regenerated from this brief first, portal screens second.

> **Post-deploy SEO checklist:** After deploy, verify `curl -I https://www.itestu.uz/favicon.ico` and `/logo/itestu3.svg` return 200. In Google Search Console (properties for both apex and www, preferred domain www), request re-index of `/` and favicon refresh.

---

> **Purpose of this document.** A complete, enterprise-grade architecture + design schema for the **public-facing marketing & product website** of the IELTS Mock Exam ERP. It is written to be pasted directly into **Figma AI / Figma Make (First Draft)** so the AI can imagine and generate the entire UI — pages, sections, components, content, motion — from a single source of truth.
>
> **How to use it.** Paste the whole document, or paste **Section 0 (Master Prompt)** first, then feed page sections one at a time for higher fidelity. Everything is grounded in the real product: a multi-role IELTS mock-exam platform (Student · Teacher · Admin) delivering IDP-faithful computer-delivered exams with human-graded Writing & Speaking.

---

## 0. Master Prompt (paste this first into Figma AI)

> Design a **premium, enterprise-grade marketing website** for **"iTestU"** (logo mark **iTu**) — a professional platform that delivers realistic, computer-delivered IELTS mock exams (Listening → Reading → Writing → Speaking in one day) with **human expert grading** and **results when all skills are graded**.
>
> **Audience:** IELTS candidates targeting Band 7+, plus IELTS teachers who earn by grading, and institutions. **Tone:** trustworthy, exam-official, modern SaaS — like Apple/Linear/Stripe polish meets an exam authority. **Not** cartoonish, **not** generic edtech.
>
> **Brand:** Deep navy `#1B2A4A` primary, signal red `#E31837` for primary CTAs, emerald `#059669` for success/scores, amber `#F59E0B` for ratings/stars, slate neutrals, `#F8FAFC` page background, `#FFFFFF` cards. Typography: **Inter** (or Geist). Generous whitespace, 12–16px rounded corners, soft layered shadows, subtle glassmorphism on overlays.
>
> **Feel:** "buttery smooth" — built motion-first. Smooth interpolated scrolling, scroll-triggered fade/slide/scale reveals, staggered groups, micro-parallax depth, blurred gradient glow blobs behind sections, custom easing `cubic-bezier(0.22, 1, 0.36, 1)`. Animate only `transform` + `opacity`. 60fps.
>
> **Build:** desktop-first responsive (1440 / 1024 / 768 / 390), dark navy hero with light body, sticky translucent header, consistent 1200px max content width with 24px gutters.
>
> Generate the full site using the page list and section specs that follow.

---

## 1. Product Context (what the site is selling)

| Aspect | Detail |
|--------|--------|
| **Product** | Full Mock Exam — all 4 IELTS skills delivered in one calendar day |
| **Skills** | Listening (auto-scored), Reading (auto-scored), Writing (teacher-graded), Speaking (live video, teacher-graded) |
| **Differentiators** | IDP-faithful CBT UI · server-authoritative timers · no pause/rewind · pick your examiner · same-day human grading · unified band release |
| **Roles** | **Student** (book, take, results) · **Teacher** (sell grading + live speaking) · **Admin** (content, ops, compliance) |
| **Proof points** | Top-scoring students, top-rated certified examiners, real band-score testimonials, exam-day realism |

**Three audience funnels** the site must serve: **Students** (primary), **Teachers** (earn by examining), **Institutions** (bulk). Marketing site is the front door; the app portals live behind login.

---

## 2. Design System (tokens)

### 2.1 Color

```
Primary / Navy        #1B2A4A   (headers, hero bg, headings)
Navy Light            #243656   (elevated navy surfaces)
Navy Muted            #94A3B8   (muted text on navy)
Brand Red (CTA)       #E31837   (primary buttons, accents)
Brand Red Hover       #C41430
Success / Emerald     #059669   (band scores, "released", checks)
Amber                 #F59E0B   (stars, ratings, highlights)
Sky                   #0EA5E9   (Listening accent / links)
Violet                #8B5CF6   (Writing accent)
Rose                  #F43F5E   (Speaking accent)
Background            #F8FAFC
Surface / Card        #FFFFFF
Border                #E2E8F0
Foreground            #0F172A
Muted text            #64748B
```

**Per-skill accent system** (reuse everywhere skills appear):
- Listening → **Sky** `#0EA5E9` (headphones icon)
- Reading → **Emerald** `#059669` (book-open icon)
- Writing → **Violet** `#8B5CF6` (pen icon)
- Speaking → **Rose** `#F43F5E` (mic icon)

### 2.2 Typography (Inter)

| Token | Size / Line / Weight | Use |
|-------|----------------------|-----|
| Display | 64–72 / 1.05 / 700, tight tracking | Hero headline |
| H1 | 44–52 / 1.1 / 700 | Page titles |
| H2 | 32–36 / 1.15 / 700 | Section titles |
| H3 | 22–24 / 1.25 / 600 | Card titles |
| Body L | 18 / 1.6 / 400 | Hero subcopy |
| Body | 16 / 1.6 / 400 | Default |
| Small | 14 / 1.5 / 500 | Meta, captions |
| Eyebrow | 13 / 1.4 / 600, uppercase, +0.08em tracking | Pill labels above titles |
| Numeric/Stat | 40–56 / 1 / 800, tabular figures | Stat counters, band scores |

### 2.3 Spacing, radius, elevation

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section vertical padding: 96–128 desktop, 64 mobile.
- Radius: inputs/buttons 10px, cards 16px, pills 9999px, modals 20px.
- Shadows: `sm` 0 1px 2px rgba(15,23,42,.06); `md` 0 8px 24px rgba(15,23,42,.08); `lg` 0 24px 60px rgba(27,42,74,.16); glow `0 0 80px rgba(14,165,233,.25)`.
- Content max-width 1200px; wide hero 1320px; gutters 24px.

### 2.4 Iconography & imagery

- Line icons (Lucide style), 1.75 stroke. Skill icons: headphones, book-open, pen-line, mic.
- Photography: real candidates at screens, examiner video calls, score dashboards (UI screenshots in device mockups). Avoid stocky handshake clichés.
- Decorative: soft blurred gradient "glow blobs" (navy→sky, violet→rose) behind hero and CTA bands; thin grid/dot textures at low opacity.

---

## 3. Motion & Interaction System (the "buttery smooth" layer)

Design **motion-first**: every section is defined by how it *enters, exits, and responds to scroll*. Recommended implementation stack noted for the dev hand-off; Figma should reflect the **end states + transitions** as prototype interactions.

| Layer | Technique | Spec |
|-------|-----------|------|
| **Smooth scroll** | Lenis (interpolated) | `current += (target - current) * 0.08`; lerp ~0.08–0.1, no hard jumps |
| **Reveal on scroll** | GSAP ScrollTrigger / Framer Motion | elements start `opacity:0, y:60`; animate to `opacity:1, y:0`, 0.8–1s |
| **Stagger** | grouped children | `stagger: 0.08–0.12` (Card1 +100ms, Card2 +200ms…) |
| **Micro-parallax** | layered speeds | background 0.5×, foreground 1×, floating shapes 1.3× |
| **Easing** | custom bezier | `cubic-bezier(0.22, 1, 0.36, 1)` / GSAP `power4.out` |
| **GPU only** | performance | animate `transform: translate3d/scale` + `opacity`; `will-change: transform`; never `top/left/width/height` |
| **Glow/blur depth** | soft edges | blurred gradient layers + translucent cards so moving objects have no hard edges |
| **Micro-interactions** | hover/press | buttons: scale 1.0→1.02 + shadow lift; cards: lift 6px + border glow; magnetic CTA optional |
| **Hero motion** | entrance | headline words rise + fade staggered; device mockup floats with subtle 3D tilt on cursor |
| **Counters** | stat reveal | numbers count up when in viewport (e.g., 0→9,500) |
| **Marquee** | logos/bands | infinite horizontal auto-scroll, pauses on hover |

**Recommended dev stack (hand-off note):** Next.js + Tailwind CSS · GSAP + ScrollTrigger · Lenis (smooth scroll) · Framer Motion (component motion). Respect `prefers-reduced-motion` (disable parallax/large moves, keep opacity fades).

---

## 4. Sitemap / Information Architecture

```
Public Marketing Site
├── /                       Home / Landing
├── /how-it-works           The mock-day journey (L→R→W→S)
├── /mock-exams             Product / packages catalog + detail
├── /teachers               Examiner directory (Top-rated)
│   └── /teachers/[slug]    Examiner profile
├── /results                Results experience + sample band report
├── /pricing                Plans & pricing
├── /for-students           Audience landing
├── /for-teachers           Become an examiner (earn)
├── /practice               Practice packages funnel (buy in student portal)
├── /centers                Edu Centers directory + partner apply (#partner)
├── /for-institutions       → redirect /centers#partner (keep for SEO only)
├── /download               Desktop app (optional exam-day delivery)
├── /about                  Mission, team, credibility
├── /faq                    Frequently asked questions
├── /contact                Contact / demo request
├── /login   /register      Auth entry (hand off to app portals)
└── /legal/*                Terms, Privacy, Exam rules

Persistent: Header (sticky, translucent) · Footer (mega)
```

**Primary nav (header):** Logo · Mock Exams · **Practice** · How It Works · Teachers · Pricing · Results · [Log in] · **[Book a Mock]** (red CTA → `/mock-exams`).

**Footer "For" column:** Students · Teachers · **Edu Centers** (`/centers`) — not "Institutions".

**Practice CTAs on marketing:** Link to `/practice` for product info; purchase happens inside the student portal (`/student/practice/shop` or `/inst-student/practice/shop`) after login — **no checkout on marketing site for practice**.

---

## 5. Home / Landing — section-by-section spec

> Order = scroll order. Each section lists: purpose, layout, content, data, and motion.

### 5.1 Sticky Header
- Translucent navy `rgba(27,42,74,.7)` + backdrop-blur on scroll; transparent over hero at top.
- Logo left; nav center; "Log in" ghost + "Book a Mock" red CTA right.
- Motion: shrinks height 80→64px and gains blur/shadow after 40px scroll.

### 5.2 Hero
- **Layout:** left 55% copy, right 45% floating product mockup (exam CBT screen + a band-score result card peeking).
- **Eyebrow pill:** ✓ "Official computer-delivered IELTS format".
- **Headline:** "Sit a real IELTS mock. Get your real band." (display size, 2 lines).
- **Subcopy:** "Full 4-skill mock in one day — Listening, Reading, Writing, Speaking. Human-graded by certified examiners. Same-day band scores."
- **CTAs:** primary red "Book a Full Mock — 56,000 so'm" (or dynamic price from catalog), secondary ghost "See how it works".
- **Trust row:** small avatars + "9,500+ candidates · 4.9★ · 320+ certified examiners".
- **Background:** navy with two blurred gradient glow blobs (sky + violet), faint dot grid.
- **Motion:** staggered word rise on headline; mockup floats + parallax tilt to cursor; glow blobs drift slowly.

### 5.3 Partner Edu Centers marquee
- "Partner Edu Centers" + centre logos from API (`/marketing/centers`), infinite marquee, grayscale→color on hover. Link each to `/centers/[slug]`. **Do not** use generic university logos unless API provides them.

### 5.4 Stats band (count-up)
- 4 stat tiles on navy from API (`/marketing/stats`): mocks delivered · examiner rating · certified examiners · avg band improvement. Hide entire section when API returns fewer than 50 total (social proof threshold).
- Motion: numbers count up on enter; subtle stagger.
- **Do not** hardcode "48h avg writing grading" — use `PRODUCT_CLAIMS.resultsTiming` ("typically the same day once Speaking submitted").

### 5.5 The 4 Skills showcase ("A real exam, faithfully recreated")
- 4 cards in a row, each in its skill accent (Sky/Emerald/Violet/Rose), skill icon, name, one-line realism claim, "Auto-scored" or "Teacher-graded" badge.
  - Listening — "Server-driven audio, plays once, no rewind." · Auto-scored
  - Reading — "60-minute CBT, exact IDP layout." · Auto-scored
  - Writing — "Task 1 + Task 2, word counter, expert feedback." · Teacher-graded
  - Speaking — "Live video with a real examiner, 11–14 min." · Teacher-graded
- Motion: staggered slide-up; on hover, card lifts and the skill icon does a soft pop.

### 5.6 How it works (mock-day journey)
- Horizontal stepper / connected timeline: **Book → Check-in → Listening → Reading → Writing → Speaking → Results released**.
- Each node = icon + label + micro-caption; a progress line draws as you scroll (scroll-linked).
- Note: "All scores held until Speaking is graded, then released together." 
- Motion: line draws on scroll; nodes pop in sequence.

### 5.7 Top Students leaderboard ("Band heroes")  ⭐ requested
- **Purpose:** social proof + aspiration. Showcases highest achievers.
- **Layout:** podium for top 3 (center tallest) + ranked list 4–10. Each: avatar, name, country flag, **overall band (big, emerald)**, per-skill mini-bands (L/R/W/S), target→achieved delta chip, package taken.
- **Data shape:** see §8 `TopStudent`.
- Motion: podium cards rise with stagger; band numbers count up; subtle confetti shimmer on #1.

### 5.8 Top Rated Teachers / Examiners ("Meet your examiners")  ⭐ requested
- **Layout:** carousel/grid of examiner cards. Each: photo, name, **rating ★ (amber)**, speciality chip (Writing / Speaking / Both), total sessions, short bio, credential badges, "from $X" optional, "View profile" + "Book".
- Sort/filter pills: Speciality · Highest rated · Most sessions.
- **Data shape:** see §8 `TopTeacher`.
- Motion: horizontal drag/auto carousel with momentum; cards lift on hover; star rating fills on enter.

### 5.9 Packages / Pricing teaser
- 1–3 product cards (mirror the in-app product card): navy header with exam type + delivery + ★rating(reviews), price, 4-skill grid (accent tiles), "What's included" checklist, "Exam rules" shield list, highlights row, red "Book Full Mock Exam" CTA + "Secure payment" lock.
- **Data shape:** see §8 `MockPackage`.
- Motion: cards stagger in; selected card scales slightly; price has count-up.

### 5.10 Sample band report ("See exactly what you get")
- Device mockup of the **results dashboard**: overall band gauge (emerald), 4 skill bars, examiner written feedback excerpt, score-progression chart.
- Side copy: "Criteria-level feedback from a real examiner, not an algorithm."
- Motion: gauge animates from 0 to band; bars grow; chart line draws.

### 5.11 Testimonials wall
- Masonry/3-col cards: 5★ row, quote, avatar+name, **Band X chip (emerald)**. (Mirror existing in-app testimonials component.)
- Motion: staggered reveal; gentle infinite vertical drift optional.

### 5.12 For Teachers band (earn)
- Split section, navy: "Certified examiner? Turn your expertise into income." Bullets: set your availability · grade Writing · run live Speaking · transparent payouts. CTA "Become an examiner".
- Motion: parallax mockup of teacher earnings dashboard.

### 5.13 FAQ (accordion)
- Reuse questions: pause/rewind, results timing, examiner choice, refunds, device requirements, academic vs general. Single-open accordion, sky highlight on open, chevron rotate.

### 5.14 Final CTA band
- Big centered: "Ready to find out your real band?" red CTA "Book a Full Mock", ghost "Talk to us". Glow gradient bg, floating shapes parallax.

### 5.15 Footer (mega)
- 4–5 columns: Product (Mock Exams, Pricing, Results, How it works) · For (Students, Teachers, Institutions) · Company (About, Contact, Careers) · Resources (FAQ, Blog, Exam rules) · Legal. Newsletter input. Social. Trust badges (secure payment, IDP-style). Bottom: © + locale switcher.

---

## 6. Other pages — concise specs

### 6.1 /mock-exams (catalog + detail)
- Header + filters (Academic / General Training, skill bundles). Grid of `MockPackage` cards → detail view (full product card + curriculum of the 4 sections, what's auto vs teacher-graded, timeline, examiner selection preview, reviews).

### 6.2 /teachers (directory) & /teachers/[slug]
- Directory: filter (speciality, rating, language, price), grid of `TopTeacher` cards, "Top rated" highlighted strip at top.
- Profile: hero (photo, name, rating, sessions, speciality, bio, credentials), availability calendar preview, sample feedback, student reviews, "Book this examiner" sticky CTA.

### 6.3 /results
- Explains deferred unified release; interactive sample report (gauge + bars + feedback + progression chart); FAQ on band conversion.

### 6.4 /how-it-works
- Long-form of §5.6 with section-by-section CBT screenshots (Listening player, Reading split view, Writing dual-task, Speaking live console), integrity rules, break rules, same-day timeline table.

### 6.5 /for-students · /for-teachers · /centers
- Audience-tailored hero + benefits + proof + pricing/CTA. Teachers: earnings calculator + payout on your schedule. **Edu Centers** (`/centers`): mock sets (B2B bundles), cohort scheduling, centre reporting, student practice hub between mock days, partner apply form at `#partner`.

### 6.5b /practice
- Explain 5 practice types (Reading passages, Reading Q-type drills, Listening sections, Listening Q-type drills, AI Writing reviews). Mock vs practice comparison table. 3-step flow: sign in → buy package in Practice shop → start drills. CTAs to `/register/student` or login — **not** direct checkout.

### 6.6 /pricing
- Toggle Academic/GT; package comparison table (skills, grading SLA, examiner choice, retake); FAQ; trust + secure payment.

### 6.7 /about · /contact · /faq
- About: mission, exam-fidelity story, team, credibility badges. Contact: form + demo request + support routes. FAQ: full searchable accordion grouped by topic.

### 6.8 /login · /register
- Clean split layout: left navy brand panel with rotating proof; right form. Role hint (Student/Teacher). Hand off to app portals after auth.

---

## 7. Reusable Component Library (design these as Figma components/variants)

| Component | Variants / props |
|-----------|------------------|
| **Button** | primary(red), secondary(navy), ghost, link · sizes sm/md/lg · with icon · loading · disabled |
| **Pill / Badge** | eyebrow, skill (sky/emerald/violet/rose), band (emerald), status, rating |
| **Card** | base, product, teacher, student/leaderboard, testimonial, stat, feature-skill |
| **Skill tile** | accent color × icon × auto/teacher-graded badge |
| **Stat counter** | number + label + optional delta arrow |
| **Rating** | 5 stars (amber, fill states) + count |
| **Avatar** | image / initials fallback + size + country flag + rank ring |
| **Band gauge** | circular gauge 0–9 emerald + per-skill bars |
| **Accordion** | item open/closed, sky highlight, chevron rotate |
| **Carousel** | draggable, autoplay, dots/arrows, momentum |
| **Stepper/Timeline** | horizontal (desktop) / vertical (mobile), scroll-progress line |
| **Header** | transparent-over-hero & solid-blur states, mega-menu |
| **Footer** | mega columns + newsletter |
| **Device mockup** | laptop / phone frame containing UI screenshot |
| **Glow blob** | blurred radial gradient decorative layer |
| **Section wrapper** | eyebrow + title + subtitle + content slot, consistent padding |

---

## 8. Data Schemas for dynamic sections (mirrors the real ERP model)

Use these JSON shapes to generate realistic content. Field names mirror the production Prisma model so design ↔ data stays 1:1.

### 8.1 TopStudent (leaderboard)
```json
{
  "id": "stu_001",
  "rank": 1,
  "name": "Aisha Karimova",
  "initials": "AK",
  "country": "UZ",
  "examType": "ACADEMIC",
  "overallBand": 8.5,
  "skillBands": { "listening": 9.0, "reading": 8.5, "writing": 8.0, "speaking": 8.5 },
  "targetBand": 7.5,
  "improvementDelta": 1.0,
  "packageTitle": "Full Academic Mock",
  "avatarUrl": null
}
```

### 8.2 TopTeacher (examiner)
```json
{
  "id": "tch_001",
  "slug": "daniel-whitfield",
  "name": "Daniel Whitfield",
  "avatarUrl": "...",
  "speciality": "BOTH",
  "rating": 4.9,
  "totalSessions": 1280,
  "bio": "Former IDP examiner. 12 years coaching Band 8+ writing & speaking.",
  "credentials": ["CELTA", "Ex-IDP Examiner", "MA Applied Linguistics"],
  "languages": ["English", "Arabic"],
  "fromPrice": 0,
  "isTopRated": true
}
```

### 8.3 MockPackage (product card)
```json
{
  "id": "pkg_001",
  "slug": "full-academic-mock",
  "title": "Full Academic Mock",
  "description": "All four skills in one day, graded by certified examiners.",
  "examType": "ACADEMIC",
  "delivery": "Computer-delivered",
  "price": 56000,
  "currency": "UZS",
  "rating": 4.9,
  "reviewCount": 1240,
  "skills": [
    { "id": "listening", "name": "Listening", "detail": "~32 min · plays once", "badge": "Auto-scored", "color": "sky" },
    { "id": "reading", "name": "Reading", "detail": "60 min · 3 passages", "badge": "Auto-scored", "color": "emerald" },
    { "id": "writing", "name": "Writing", "detail": "Task 1 + Task 2", "badge": "Teacher-graded", "color": "violet" },
    { "id": "speaking", "name": "Speaking", "detail": "Live · 11–14 min", "badge": "Teacher-graded", "color": "rose" }
  ],
  "included": ["Pick your examiner", "Same-day band results", "Criteria-level written feedback", "Score progression tracking"],
  "rules": ["No pause or rewind", "Server-authoritative timers", "Strict exam-day integrity", "All scores released together"],
  "highlights": [
    { "icon": "clock", "label": "One calendar day" },
    { "icon": "user", "label": "Real examiner" },
    { "icon": "globe", "label": "From anywhere" },
    { "icon": "chart", "label": "Track your band" }
  ]
}
```

### 8.4 Testimonial
```json
{ "id": "t1", "name": "Maria S.", "initials": "MS", "band": 8.0, "rating": 5, "quote": "Felt exactly like the real IDP test. The examiner feedback was gold." }
```

### 8.5 Stat
```json
{ "id": "mocks", "value": 9500, "suffix": "+", "label": "Mocks delivered", "delta": null }
```

### 8.6 SkillSpec
```json
{ "id": "writing", "name": "Writing", "accent": "violet", "icon": "pen-line", "grading": "teacher", "duration": "60 min", "claim": "Task 1 + Task 2 with live word count and expert feedback." }
```

---

## 9. Responsive behavior

| Breakpoint | Layout rules |
|-----------|--------------|
| **≥1440 desktop** | full multi-column, 1200px content, hero split 55/45, leaderboard podium + list |
| **1024 laptop** | reduce paddings, 3→2 col grids where tight |
| **768 tablet** | 2-col grids; carousels become swipe; mega-menu collapses |
| **390 mobile** | single column; sticky bottom "Book a Mock" bar; timeline vertical; leaderboard becomes ranked list (no podium); reduce parallax; stats 2×2 |

Accessibility: WCAG AA contrast (navy/white passes; ensure red CTA text white), focus rings (navy ring), keyboard nav for accordion/carousel, `prefers-reduced-motion` fallback.

---

## 10. Page generation order for Figma AI (recommended)

1. Design system page (colors, type, buttons, cards, badges) — generate first so styles propagate.
2. Header + Footer components.
3. **Home** (all sections in §5) — the flagship.
4. /mock-exams + product detail.
5. /teachers directory + profile.
6. /results + sample report.
7. Audience pages (/for-students, /for-teachers, /centers) + /practice.
8. /pricing, /how-it-works, /download, /about, /faq, /contact.
9. /login + /register.

> **Per-section prompt pattern:** "Using the established design system and motion rules, design the **<section name>** for the **<page>**. Layout: <layout>. Content: <content>. Use the <DataShape> data. Apply: staggered scroll reveal, accent colors per skill, custom easing, glow background. Match brand: navy #1B2A4A, red CTA #E31837, emerald scores, Inter."

---

## Appendix A — Copy bank (ready-to-use marketing strings)

- Hero: "Sit a real IELTS mock. Get your real band."
- Sub: "Full 4-skill mock in one day — graded by certified examiners. Same-day band scores."
- Skills realism: "We didn't redesign the IELTS test. We recreated it."
- Grading: "Real examiners. Criteria-level feedback. Not an algorithm."
- Results: "All four bands, released together — exactly like the real thing."
- Teachers CTA: "Certified examiner? Turn your expertise into income."
- Final CTA: "Ready to find out your real band?"
- Trust: "9,500+ candidates · 4.9★ examiner rating · 320+ certified examiners"

## Appendix B — Source-of-truth mapping (ERP → site)

| Site section | Backed by ERP entity |
|--------------|----------------------|
| Top Students | `StudentProfile` + `Grade.overallBand` + `Enrollment` |
| Top Teachers | `TeacherProfile` (`rating`, `totalSessions`, `speciality`, `credentials`) |
| Packages/Pricing | `MockTestPackage` (`price`, `skills`, `included`, `rules`) |
| Sample report | `Grade` (`criteriaScores`, `overallBand`, `feedback`) + `SectionAttempt.band` |
| How it works | `ExamSessionState` machine (CHECK_IN → … → RESULTS_RELEASED) |
| Testimonials | reviews tied to `Enrollment` / examiner ratings |
| For Teachers | `Payout`, `TeacherAvailability`, `TeacherSlot` |
| Practice offerings | `PracticeProductPackage` (`bundle` JSON: 5 credit types) |
| Edu Centers | `Institution`, `InstitutionMockSet`, `InstitutionMockSetGrant` |

---

## 11. Product truth delta (July 2026 — sync with shipped ERP)

This section captures changes since the original brief. **Figma AI must follow these over any stale spec above.**

### 11.1 Navigation & IA
| Item | Current truth |
|------|---------------|
| Header nav | Mock Exams · **Practice** · How It Works · Teachers · Pricing · Results |
| B2B audience | **Edu Centers** at `/centers` — `/for-institutions` redirects to `/centers#partner` |
| Practice purchase | In student portal only (`PRACTICE_BUNDLE` order) — marketing links to `/practice` + register/login |
| Desktop app | `/download` in footer; optional exam-day aid — not in header CTA |

### 11.2 Pricing & currency
- All live prices in **UZS** (e.g. full Academic mock **56,000 so'm** from `SITE.fullMockPrice` / catalog API).
- Display via `formatPrice()` — do not show USD unless legacy row normalized.
- **General Training:** coming soon — Academic only in catalog UI.

### 11.3 Product lines to communicate
| Line | Buyer | Marketing message |
|------|-------|-------------------|
| Full / single-skill mock | Student | Book at `/mock-exams` → login → `/student/browse?book=1` |
| Practice bundle | Student (marketplace + centre-linked) | Self-serve drills + AI Writing — buy in Practice shop after login |
| Institution mock set | Edu Center admin | B2B bundles; unlimited student enrollments on included section mocks |
| Credit pack | Edu Center (legacy) | Superseded by mock sets in UI — do not lead with bulk credit packs |

### 11.4 Home page — required sections (currently missing in code)
- **§5.9 Packages / Pricing teaser** — 1–3 `MockPackage` cards from API, CTA to book.
- **§5.10 Sample band report** — results dashboard mockup (also on `/results`).
- **Practice teaser** — between journey and desktop app; link to `/practice`.

### 11.5 Booking CTA consistency
- All "Book a Mock" CTAs → `/mock-exams` or `/student/browse?tab=academic&book=1` (logged-in).
- Deep link `/mock-exams?package={slug}` must scroll/highlight matching package when present.
- Do **not** split between dead query params and browse paths.

### 11.6 Copy alignment (single source: `PRODUCT_CLAIMS` in `web/src/lib/marketing/data.ts`)
- Results timing: "typically the same day once Speaking submitted" — not "12 hours" or "48h avg writing".
- Contact SLA: "< 1 business day" on contact page; FAQ can say "4 business hours" for urgent exam-day — pick one and sync.
- Teacher payouts: "Request payout on your schedule" — not "weekly payments".
- Edu Centers: lead with **mock sets**, not per-enrollment credit top-ups.

### 11.7 Do-not-claim (unchanged)
- No official IELTS / IDP / British Council endorsement.
- No verify.itestu.uz certificate URL.
- No bulk 10+/50+/100+ student discount tiers on marketing site.

### 11.8 Dynamic sections — empty states
- Leaderboard, teachers grid, testimonials, stats, partner marquee: **hidden** when API empty or below social-proof threshold (50).
- Package grid: empty state "Packages loading from catalog" — no fake seed data.

### 11.9 Figma generation order (marketing-first)
1. Design system → Header/Footer → Home (incl. §5.9 + §5.10) → `/mock-exams` + `/pricing` + `/practice`
2. Audience pages → `/how-it-works` + `/results` + `/teachers` + `/centers`
3. `/faq` + `/contact` + `/download` + auth pages
4. **Phase 2 (separate brief):** Portal screens — see `docs/PORTAL-UI-FIGMA-BRIEF.md`
