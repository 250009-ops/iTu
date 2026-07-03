import { test, expect } from "@playwright/test";
import { login } from "./helpers/ui";

const PACKAGES = {
  academic: {
    title: "Full Academic Mock",
    examType: "Academic",
    price: "$49",
    delivery: "Computer-Based",
    bookCta: "Book Full Mock Exam",
    description:
      "All four skills in one day. IELTS Academic — for university, visa, and professional registration.",
    skills: ["Listening", "Reading", "Writing", "Speaking"],
    included: [
      "Pick your certified examiner",
      "Full band report within 24 hours",
      "Criteria-level written feedback",
      "Score progression tracking",
      "Secure exam environment",
    ],
    highlights: [
      "~4.5 hours total",
      "Pick your certified examiner",
      "Results within 24 hours",
      "Official CBT interface",
      "Detailed band feedback",
    ],
    rules: [
      "No pause or rewind",
      "Server-authoritative timers",
      "Strict exam-day integrity",
      "All scores released together",
    ],
  },
  generalTraining: {
    title: "General Training Mock",
    examType: "General Training",
    price: "$45",
    delivery: "Computer-Based",
    bookCta: "Book Full Mock Exam",
    description:
      "All four skills. IELTS General Training — for migration, permanent residency, and work programs.",
    skills: ["Listening", "Reading", "Writing", "Speaking"],
    included: [
      "Pick your certified examiner",
      "Full band report within 24 hours",
      "Criteria-level written feedback",
      "Score progression tracking",
      "Secure exam environment",
    ],
    highlights: [
      "~4.5 hours total",
      "Pick your certified examiner",
      "Results within 24 hours",
      "Official CBT interface",
      "Detailed band feedback",
    ],
    rules: [
      "No pause or rewind",
      "Server-authoritative timers",
      "Strict exam-day integrity",
      "All scores released together",
    ],
  },
  speakingOnly: {
    title: "Speaking Only",
    price: "$22",
    delivery: "Live Session",
    bookCta: "Book Speaking Session",
    description:
      "A single live Speaking session with a certified examiner, with criteria-level feedback.",
    skills: ["Speaking"],
    included: [
      "Pick your certified examiner",
      "Speaking score within 24 hours",
      "Criteria-level speaking feedback",
      "Part 1, 2 & 3 transcript notes",
    ],
    highlights: [
      "11–14 minutes live",
      "Pick your certified examiner",
      "Results within 24 hours",
      "Live video session",
      "Detailed band feedback",
    ],
    rules: [
      "Live video session",
      "11–14 minutes",
      "Recorded for examiner reference",
    ],
  },
  writingOnly: {
    title: "Writing Only",
    price: "$18",
    delivery: "Online Submission",
    bookCta: "Book Writing Mock",
    description:
      "Task 1 + Task 2 graded by a certified examiner with full criteria-level written feedback.",
    skills: ["Writing"],
    included: [
      "Expert examiner grading",
      "Task 1 + Task 2 feedback",
      "Criteria-level breakdown",
      "Turnaround within 24 hours",
    ],
    highlights: [
      "60-minute window",
      "Certified examiner grading",
      "Results within 24 hours",
      "Task 1 + Task 2",
      "Criteria-level feedback",
    ],
    rules: ["60-minute window", "Live word counter", "Spell-check disabled"],
  },
} as const;

const FAQ_QUESTIONS = [
  "What is included in a full mock exam?",
  "How long does the whole exam take?",
  "When will I receive my results?",
  "Can I pause or retake the exam?",
  "Who grades my Writing and Speaking?",
];

const BROWSE_TABS = {
  academic: "Full Academic",
  speakingOnly: "Speaking Only",
  writingOnly: "Writing Only",
} as const;

async function selectBrowseTab(
  page: import("@playwright/test").Page,
  label: string,
) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

test.describe("Student Browse Mocks (detailed)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "student@example.com", "student");
    await expect(page).toHaveURL(/\/student/, { timeout: 20_000 });
    await page.goto("/student/browse");
    await expect(
      page.getByRole("heading", { name: "Browse Mock Exams" }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("sidebar highlights Browse Mocks as active", async ({ page }) => {
    const browseLink = page
      .getByRole("link", { name: "Browse Mocks", exact: true })
      .first();
    await expect(browseLink).toHaveClass(/bg-white\/10/);
  });

  test("page header shows official format badge and tagline", async ({
    page,
  }) => {
    await expect(
      page.getByText("Official computer-delivered IELTS format"),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Expert human grading · Results within 24 hours · Pick your certified examiner/i,
      ),
    ).toBeVisible();
  });

  test("mock type tabs are shown and only one card is visible at a time", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: BROWSE_TABS.academic, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: BROWSE_TABS.speakingOnly, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: BROWSE_TABS.writingOnly, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: PACKAGES.academic.title, level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: PACKAGES.speakingOnly.title, level: 2 }),
    ).not.toBeVisible();
  });

  test("excluded mock types are not shown in the tab bar", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "General Training", exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Listening & Reading", exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Writing & Speaking", exact: true }),
    ).not.toBeVisible();
  });

  test("each mock type tab reveals its offer card", async ({ page }) => {
    const cases = [
      { tab: BROWSE_TABS.academic, pkg: PACKAGES.academic },
      { tab: BROWSE_TABS.speakingOnly, pkg: PACKAGES.speakingOnly },
      { tab: BROWSE_TABS.writingOnly, pkg: PACKAGES.writingOnly },
    ] as const;

    for (const { tab, pkg } of cases) {
      await selectBrowseTab(page, tab);
      await expect(
        page.getByRole("heading", { name: pkg.title, level: 2 }),
      ).toBeVisible();
    }
  });

  test("Full Academic Mock card shows complete details", async ({ page }) => {
    await selectBrowseTab(page, BROWSE_TABS.academic);
    const pkg = PACKAGES.academic;
    const card = page.locator(".rounded-xl").filter({ hasText: pkg.title });

    await expect(card.getByText(pkg.examType, { exact: true })).toBeVisible();
    await expect(card.getByText(pkg.delivery)).toBeVisible();
    await expect(card.getByText(pkg.description)).toBeVisible();
    await expect(card.getByText(pkg.price)).toBeVisible();
    await expect(card.getByText("4.9")).toBeVisible();
    await expect(card.getByText("(1240 reviews)")).toBeVisible();

    for (const skill of pkg.skills) {
      await expect(card.getByText(skill, { exact: true })).toBeVisible();
    }
    for (const item of pkg.included) {
      await expect(card.getByText(item)).toBeVisible();
    }
    for (const rule of pkg.rules) {
      await expect(card.getByText(rule)).toBeVisible();
    }
    for (const highlight of pkg.highlights) {
      await expect(card.getByText(highlight)).toBeVisible();
    }
    await expect(
      card.getByRole("button", { name: pkg.bookCta }),
    ).toBeVisible();
  });

  test.skip("General Training Mock card shows complete details", async ({
    page,
  }) => {
    // General Training is excluded from the student browse tab bar.
    const pkg = PACKAGES.generalTraining;
    const card = page.locator(".rounded-xl").filter({ hasText: pkg.title });

    await expect(card.getByText(pkg.examType, { exact: true })).toBeVisible();
    await expect(card.getByText(pkg.delivery)).toBeVisible();
    await expect(card.getByText(pkg.description)).toBeVisible();
    await expect(card.getByText(pkg.price)).toBeVisible();
    await expect(card.getByText("4.8")).toBeVisible();
    await expect(card.getByText("(680 reviews)")).toBeVisible();
    await expect(card.getByText("Auto scored", { exact: true })).toHaveCount(2);
  });

  test("Speaking Only card shows single skill and correct copy", async ({
    page,
  }) => {
    await selectBrowseTab(page, BROWSE_TABS.speakingOnly);
    const pkg = PACKAGES.speakingOnly;
    const card = page.locator(".rounded-xl").filter({ hasText: pkg.title });

    await expect(card.getByText(pkg.delivery)).toBeVisible();
    await expect(card.getByText(pkg.description)).toBeVisible();
    await expect(card.getByText("Speaking", { exact: true })).toBeVisible();
    await expect(card.getByText("Live video session")).toBeVisible();
    await expect(
      card.getByRole("button", { name: pkg.bookCta }),
    ).toBeVisible();
    await expect(card.getByText("Listening", { exact: true })).not.toBeVisible();
  });

  test("Writing Only card shows single skill and correct copy", async ({
    page,
  }) => {
    await selectBrowseTab(page, BROWSE_TABS.writingOnly);
    const pkg = PACKAGES.writingOnly;
    const card = page.locator(".rounded-xl").filter({ hasText: pkg.title });

    await expect(card.getByText(pkg.delivery)).toBeVisible();
    await expect(
      card.getByRole("button", { name: pkg.bookCta }),
    ).toBeVisible();
    await expect(card.getByText("Speaking", { exact: true })).not.toBeVisible();
  });

  test("each tab shows package-specific CTA and secure payment note", async ({
    page,
  }) => {
    const cases = [
      { tab: BROWSE_TABS.academic, cta: "Book Full Mock Exam" },
      { tab: BROWSE_TABS.speakingOnly, cta: "Book Speaking Session" },
      { tab: BROWSE_TABS.writingOnly, cta: "Book Writing Mock" },
    ] as const;

    for (const { tab, cta } of cases) {
      await selectBrowseTab(page, tab);
      await expect(page.getByRole("button", { name: cta })).toHaveCount(1);
      await expect(page.getByText("Secure payment")).toHaveCount(1);
    }
  });

  test.skip("Book button opens wizard with correct product title", async ({
    page,
  }) => {
    // General Training is excluded from the student browse tab bar.
    const gtCard = page
      .locator(".rounded-xl")
      .filter({ hasText: PACKAGES.generalTraining.title });
    await gtCard
      .getByRole("button", { name: PACKAGES.generalTraining.bookCta })
      .click();

    await expect(
      page.getByRole("heading", { name: /Book General Training Mock/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Date & time")).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
  });

  test("Speaking Only wizard skips writing examiner step", async ({ page }) => {
    await selectBrowseTab(page, BROWSE_TABS.speakingOnly);
    const card = page
      .locator(".rounded-xl")
      .filter({ hasText: PACKAGES.speakingOnly.title });
    await card
      .getByRole("button", { name: PACKAGES.speakingOnly.bookCta })
      .click();

    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Step 2 of 3 · Speaking slot")).toBeVisible();
    await expect(page.getByText("Writing examiner")).not.toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
  });

  test("FAQ section renders all questions and accordion works", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Frequently Asked Questions" }),
    ).toBeVisible();

    for (const question of FAQ_QUESTIONS) {
      await expect(page.getByText(question)).toBeVisible();
    }

    await page.getByText("What is included in a full mock exam?").click();
    await expect(
      page.getByText(/Academic or General Training/i),
    ).toBeVisible();
  });

  test("testimonials section loads published reviews", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "What students say" }),
    ).toBeVisible();
    await expect(page.getByText("Priya Sharma")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("page does not show API error or empty state", async ({ page }) => {
    await expect(
      page.getByText("No mock packages available right now."),
    ).not.toBeVisible();
  });
});
