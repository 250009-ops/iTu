# Figma AI — Marketing Site Regeneration Prompt

> Paste **Section A** into Figma Make / Figma AI first, then feed **Section B** page-by-page.
> Source of truth: [`MARKETING-WEBSITE-FIGMA-BRIEF.md`](./MARKETING-WEBSITE-FIGMA-BRIEF.md) (incl. §11 Product truth delta).
> Target file: [iTestU Marketing Site v2](https://www.figma.com/design/cCJEEcBevlLPLxjsBBySW2)

---

## Section A — Master prompt (paste first)

Design a **premium marketing website** for **iTestU** (logo mark **iTu**) — computer-delivered IELTS mocks with human examiner grading, plus self-serve practice packages.

**Audience:** IELTS candidates (primary), certified examiners, Edu Centers. **Tone:** trustworthy exam authority + modern SaaS polish. **Not** cartoonish edtech.

**Brand tokens:** Navy `#1B2A4A`, CTA red `#E31837`, emerald `#059669` (scores), amber `#F59E0B` (ratings), sky/violet/rose per skill. Background `#F8FAFC`, cards `#FFFFFF`. Inter typography. 1200px max width, 24px gutters.

**Motion:** scroll reveals, stagger, Lenis-smooth feel, `cubic-bezier(0.22, 1, 0.36, 1)`. GPU-only transforms.

**Nav:** Mock Exams · Practice · How It Works · Teachers · Pricing · Results · Log in · **Book a Mock** (red).

**Footer For column:** Students · Teachers · **Edu Centers** (`/centers`).

**Currency:** UZS — full Academic mock **56,000 so'm**. General Training coming soon.

**Practice:** marketed on `/practice`; purchased only inside student portal after login — no checkout on marketing site.

**Edu Centers:** B2B mock sets (primary), not bulk credit packs.

**Do not claim:** official IELTS endorsement, verify.itestu.uz, bulk student discount tiers.

Generate design system first, then Header/Footer, then all pages in Section B order.

---

## Section B — Page generation order

1. **Design system** — colors, type, Button, Pill, Card, Skill tile, Stat, Rating, Accordion, Section wrapper
2. **Header + Footer**
3. **Home `/`** — all sections including:
   - Hero (56,000 so'm CTA)
   - Partner Edu Centers marquee (API-driven, hide if empty)
   - Stats band (API, hide if below threshold)
   - 4 Skills grid
   - Journey stepper
   - **Practice teaser** → `/practice`
   - Desktop app section
   - Leaderboard / Teachers / Testimonials (API-gated)
   - **§5.9 Pricing teaser** (1–3 MockPackage cards)
   - **§5.10 Sample band report**
   - Examiner band, FAQ, Final CTA
4. **`/mock-exams`** — Academic filter, package grid, filters
5. **`/pricing`** — full mock + single-skill cards, comparison table, practice upsell
6. **`/practice`** — 5 practice types, mock vs practice table, sign-in CTA
7. **`/for-students`**, **`/for-teachers`**, **`/centers`** (partner form at #partner)
8. **`/how-it-works`**, **`/results`**, **`/teachers`**, **`/faq`**, **`/contact`**, **`/download`**
9. **`/login`**, **`/register/student`**, **`/register/teacher`**

---

## Section C — Data shapes (sample JSON)

Use [`MARKETING-WEBSITE-FIGMA-BRIEF.md` §8](./MARKETING-WEBSITE-FIGMA-BRIEF.md) for `MockPackage`, `TopStudent`, `TopTeacher`, `Testimonial`, `Stat`, `SkillSpec`.

**MockPackage example (UZS):**
```json
{
  "title": "Full Academic Mock",
  "price": 56000,
  "currency": "UZS",
  "examType": "ACADEMIC",
  "skills": ["listening", "reading", "writing", "speaking"]
}
```

**Practice offerings (5 types):**
- Reading passages · Reading Q-type drills · Listening sections · Listening Q-type drills · AI Writing reviews

---

## Section D — Per-page prompt template

> Using the established design system, design **[PAGE NAME]**. Bind to data shape **[SHAPE]**. Include empty states when API returns no data. CTAs: mocks → `/mock-exams`; practice purchase → register/login. Match §11 product truth delta.
