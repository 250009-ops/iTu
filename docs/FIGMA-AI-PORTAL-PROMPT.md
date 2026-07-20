# Figma AI — Portal Screens Prompt

> Paste into [IELTS-Mock-Platform (Figma Make)](https://www.figma.com/make/TW2GEVQyjU4r5RycLJ061y/IELTS-Mock-Platform) **after** marketing site frames are done.
> Full schema: [`PORTAL-UI-FIGMA-BRIEF.md`](./PORTAL-UI-FIGMA-BRIEF.md)

---

## Section A — Master prompt (paste first)

Design **portal screens** for **iTestU** — an IELTS mock exam ERP with institution admin and student practice flows.

**Reuse brand:** Navy sidebar `#1B2A4A`, red accent `#E31837`, light content `#F8FAFC`, white cards, Inter typography.

**Portal shell:** Dark navy left sidebar (logo, nav, desktop app promo card) + light main area with top bar (search, centre badge, notifications, user avatar).

**Two flows to design:**

1. **Centre admin — Mock sets:** Locked blurred preview → Buy mock sets shop → Owned mocks with Enroll students
2. **Student — Practice Hub:** Empty (0 allowance, shop CTAs) → Entitled (allowance cards, unit tables, Start buttons) → Practice shop

Practice Hub is **identical** for centre-linked students (`/inst-student/practice`) and marketplace students (`/student/practice`).

Generate portal shell first, then screens in Section B order. Bind all copy and counts to the data shapes in Section C.

---

## Section B — Screen generation order

1. **Portal shell** — sidebar + top bar (Student and Institution variants)
2. **Practice Hub — empty** (Reading tab active, 0 on all 5 allowance cards, empty library, View packages CTAs)
3. **Practice Hub — entitled** (non-zero allowance, Reading passages table with Start, Writing tab with prompts)
4. **Practice shop** — 2–3 package cards with 5 credit type breakdown, UZS pricing
5. **Institution Mocks — locked** — blurred preview tabs/cards + centred Buy Mocks overlay
6. **Institution Mocks — owned** — tabs, mock product cards, Enroll students buttons, set badges
7. **Institution Mock shop** — B2B set cards with Buy mock set
8. **Enroll wizard modal** — student picker, package, schedule steps
9. **Post-purchase success** — toast/banner states for both practice and mock set flows

---

## Section C — Data bindings

### Practice allowance (5 cards)

```json
{
  "readingPassages": 0,
  "readingQuestionTypes": 0,
  "listeningSections": 0,
  "listeningQuestionTypes": 0,
  "aiWritingEssays": 0
}
```

### Practice library unit row

```json
{
  "title": "Academic Reading Passage 1",
  "format": "Mixed question types",
  "questionCount": 13,
  "durationMin": 20,
  "action": "Start | View packages"
}
```

### Institution mock preview (locked)

```json
{
  "showcaseSetTitle": "Academic Section Mock Set",
  "tabs": ["Listening", "Reading", "Writing"],
  "packages": [{ "title": "Listening Mock 1", "skills": ["listening"] }]
}
```

### Mock shop offer

```json
{
  "setTitle": "Academic Section Bundle",
  "listPrice": 1200000,
  "currency": "UZS",
  "canPurchase": true,
  "disabledReason": null
}
```

---

## Section D — Per-screen prompt template

> Using the portal design system, design **[SCREEN NAME]** in **[STATE]**. Bind to **[DATA SHAPE]**. Include primary CTA, empty state, and loading skeleton variants. Match navy sidebar + light content area from the shell.

**Example:**

> Design **Practice Hub — empty state** for centre student. Show page title "Practice Hub", description about attempts from packages, header "View packages" button, 5 allowance cards all at 0, Reading tab with empty panel and purchase CTA. Use emerald/sky/violet skill accents.
