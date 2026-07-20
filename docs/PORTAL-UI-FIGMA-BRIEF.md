# iTestU — Portal UI Figma AI Brief

> **Purpose.** Screen-state inventory + data bindings for **institution admin** and **student practice** portals. Paste into Figma Make after marketing site frames are approved.
>
> **Target file:** [IELTS-Mock-Platform (Figma Make)](https://www.figma.com/make/TW2GEVQyjU4r5RycLJ061y/IELTS-Mock-Platform)
>
> **Design system:** Reuse navy `#1B2A4A`, red CTA `#E31837`, portal shell pattern (dark sidebar + light content). Match existing app tokens in `web/src/app/globals.css`.

---

## 1. Portal roles & routes

| Portal | Prefix | Auth role |
|--------|--------|-----------|
| Centre admin | `/institution/*` | `institution` |
| Centre student | `/inst-student/*` | `STUDENT` (linked to centre) |
| Marketplace student | `/student/*` | `STUDENT` |

**Practice Hub is identical** for centre student and marketplace student — only URL prefix differs (`/inst-student/practice` vs `/student/practice`).

---

## 2. Commerce schema (what portals sell / unlock)

### Student practice (`PRACTICE_BUNDLE`)

- **Buyer:** Student (both portal types)
- **Product:** `PracticeProductPackage` with 5 credit types in `bundle` JSON:
  - `readingPassages`, `readingQuestionTypes`, `listeningSections`, `listeningQuestionTypes`, `aiWritingEssays`
- **Access model (both required to start):**
  - Wallet credits: `StudentPracticeWallet`
  - Content entitlement: `StudentPracticeUnitAccess` / `StudentPracticePromptAccess`
- **Shop route:** `{basePath}/shop` → Uzum checkout → return to hub

### Institution mock sets (`INSTITUTION_MOCK_SET`)

- **Buyer:** Centre admin
- **Product:** `InstitutionMockSet` (B2B bundle of section mocks)
- **Grant:** `InstitutionMockSetGrant` (source: `PURCHASE` or `ADMIN_GRANT`)
- **Benefit:** Unlimited student enrollments on included packages — no per-enrollment charge
- **Shop route:** `/institution/mocks/shop` → Uzum → return to `/institution/mocks?payment=success`

---

## 3. Institution admin — screen states

### 3.1 Mocks — locked (no grants)

| Field | Value |
|-------|-------|
| Route | `/institution/mocks` |
| Condition | `tabs.length === 0` && `preview != null` |
| UI intent | Blurred preview of mock set tabs + product cards (non-interactive) |
| Overlay CTA | **Buy Mocks** → `/institution/mocks/shop` |
| Copy | "Purchase a mock set to unlock student enrollment for {showcaseSetTitle}" |
| Data | `GET /institution/mocks` → `preview.tabs`, `preview.packages`, `preview.showcaseSetTitle` |

### 3.2 Mocks — owned (has grants)

| Field | Value |
|-------|-------|
| Route | `/institution/mocks` |
| Condition | `tabs.length > 0` |
| UI | Interactive `BrowseTypeTabs` + `MockProductCard` per package |
| Actions | **Enroll students** per card → student picker modal → `EnrollWizard` |
| Badges | `Set: {title}`, `Purchased` / `Granted by iTestU` |
| Data | `tabs`, `packages` from `GET /institution/mocks` |

### 3.3 Mocks — post-purchase

| Field | Value |
|-------|-------|
| Route | `/institution/mocks?payment=success&order=IMS-...` |
| UI | Success toast; reload grants; owned state replaces locked preview |
| Enhancement | Highlight newly purchased set (design in Figma) |

### 3.4 Mocks — empty fallback

| Field | Value |
|-------|-------|
| Condition | No grants AND no preview |
| UI | Empty state + CTA to shop (currently missing in code — design it) |

### 3.5 Buy mock sets (shop)

| Field | Value |
|-------|-------|
| Route | `/institution/mocks/shop` |
| States | Listed + priced + not owned → **Buy mock set**; Already owned → disabled; Not listed → `disabledReason` |
| Empty | Placeholder: "Mock sets are not available for purchase yet. Contact iTestU admin." |
| Data | `GET /institution/mocks/shop` → `sets[]` with `canPurchase`, `disabledReason`, `product` |

### 3.6 Enroll wizard (modal)

| Field | Value |
|-------|-------|
| Trigger | Enroll on owned mock card |
| Steps | Pick student → package (granted sets + centre private) → schedule → confirm |
| API | `POST /institution/enroll` |

---

## 4. Student Practice Hub — screen states

Shared component: `PracticeHubView` with `basePath` prop.

### 4.1 Hub — empty (no package)

| Field | Value |
|-------|-------|
| Route | `{basePath}` (e.g. `/inst-student/practice`) |
| Allowance | All 5 cards show `0` |
| Summary | "No practice attempts yet — purchase a package to get started" |
| Header CTA | **View packages** → `{basePath}/shop` |
| Tabs | Reading · Listening · Writing (AI) |
| Tab content | Empty panel: "No practice included in your packages for this category yet. Purchase a package to unlock content." |
| Writing tab | Secondary **View packages** when `aiWritingEssays === 0` |

### 4.2 Hub — entitled (after purchase)

| Field | Value |
|-------|-------|
| Allowance | Non-zero counts per credit type |
| Library | Unit tables with **Start** buttons (Reading/Listening sections) |
| Writing | Task 1 / Task 2 prompt tables + AI Writing Coach card |
| Recent | Completed attempts with scores |
| Data | `GET /practice/allowance`, `/library`, `/writing/prompts`, `/attempts` |

### 4.3 Practice shop

| Field | Value |
|-------|-------|
| Route | `{basePath}/shop` |
| UI | Package cards with bundle breakdown (5 credit types), price in UZS |
| CTA | **Get {title}** → checkout |
| Empty | "No practice packages are available yet." |
| Post-pay return | `{basePath}?purchased=1` or `{basePath}/shop?paid=1` — design success state |

### 4.4 Attempt player

| Route | `{basePath}/attempt/[attemptId]` |
| UI | CBT-style question player for Reading/Listening |

### 4.5 Writing coach

| Route | `{basePath}/writing`, `{basePath}/writing/[sessionId]` |
| UI | Essay editor → AI analyze (consumes credit on analyze) |

---

## 5. Practice Hub — tab & section map

| Tab | Section | Unit type | Credit key |
|-----|---------|-----------|------------|
| Reading | Reading passages | `READING_PASSAGE` | `readingPassages` |
| Reading | Reading Q-type drills | `READING_QUESTION_TYPE` | `readingQuestionTypes` |
| Listening | Listening sections | `LISTENING_SECTION` | `listeningSections` |
| Listening | Listening Q-type drills | `LISTENING_QUESTION_TYPE` | `listeningQuestionTypes` |
| Writing (AI) | Task 1 / Task 2 prompts | — | `aiWritingEssays` |

---

## 6. Per-skill accent (reuse marketing system)

- Reading → emerald `#059669`
- Listening → sky `#0EA5E9`
- Writing → violet `#8B5CF6`

---

## 7. Figma generation order (portals)

1. Portal shell (sidebar, top bar, search, user menu) — reuse from existing Make file if present
2. **Practice Hub** — empty state (priority — matches current screenshot)
3. **Practice Hub** — entitled state with unit tables
4. **Practice shop** — package cards
5. **Institution Mocks** — locked preview with blur overlay
6. **Institution Mocks** — owned + enroll flow
7. **Institution Mock shop** — buy flow
8. Enroll wizard modal
9. Post-purchase success states (both flows)

---

## 8. Do-not-design (out of scope)

- Exam-day CBT player internals (Listening/Reading exam UI)
- Admin platform screens (`/admin/*`)
- Backend payment webhook logic
