import { test, expect } from "@playwright/test";
import { login } from "./helpers/ui";

test.describe("Student dashboard (fresh user, detailed)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "student@example.com", "student");
    await expect(page).toHaveURL(/\/student/, { timeout: 20_000 });
    await page.goto("/student");
    await expect(page.getByText(/Welcome back, Alex/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("welcome section shows greeting, profile summary, and CTA", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /Welcome back, Alex/i }),
    ).toBeVisible();
    await expect(page.getByText(/Good (morning|afternoon|evening)/i)).toBeVisible();
    await expect(page.getByText("0 mocks completed")).toBeVisible();
    await expect(page.getByText(/Academic · .*0 mocks completed/)).toBeVisible();

    const bookBtn = page.getByRole("link", { name: /Book New Mock/i });
    await expect(bookBtn).toBeVisible();
    await expect(bookBtn).toHaveAttribute("href", "/student/browse");
  });

  test("welcome promo cards show for fresh user", async ({ page }) => {
    await expect(page.getByText("Your welcome gifts")).toBeVisible();
    await expect(page.getByText("Free Listening mock")).toBeVisible();
    await expect(page.getByText("Free Reading mock")).toBeVisible();

    const claimButtons = page.getByRole("button", { name: /Claim free mock/i });
    await expect(claimButtons).toHaveCount(2);
  });

  test("results alert is hidden for fresh user", async ({ page }) => {
    await expect(
      page.getByText("Your mock results are ready!"),
    ).not.toBeVisible();
  });

  test("stat cards show empty-state values", async ({ page }) => {
    const labels = [
      "Current Best Band",
      "Mocks Completed",
      "Target Band",
      "Next Mock",
    ] as const;

    for (const label of labels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    const currentBest = page
      .locator(".rounded-xl")
      .filter({ hasText: "Current Best Band" });
    await expect(currentBest.getByText("—", { exact: true })).toBeVisible();
    await expect(
      currentBest.getByText("Complete a mock to track progress"),
    ).toBeVisible();

    const mocksCompleted = page
      .locator(".rounded-xl")
      .filter({ hasText: "Mocks Completed" });
    await expect(mocksCompleted.getByText("0", { exact: true })).toBeVisible();
    await expect(mocksCompleted.getByText("Book your next mock")).toBeVisible();

    const targetBand = page
      .locator(".rounded-xl")
      .filter({ hasText: "Target Band" });
    await expect(targetBand.getByText("—", { exact: true })).toBeVisible();
    await expect(targetBand.getByText("Set your goal in Profile")).toBeVisible();

    const nextMock = page.locator(".rounded-xl").filter({ hasText: "Next Mock" });
    await expect(nextMock.getByText("—", { exact: true })).toBeVisible();
    await expect(nextMock.getByText("No mock scheduled")).toBeVisible();
  });

  test("upcoming mock card shows empty state with browse link", async ({
    page,
  }) => {
    await expect(page.getByText("No upcoming mock")).toBeVisible();
    await expect(
      page.getByText("Book a full academic mock to get started."),
    ).toBeVisible();

    const browseBtn = page
      .locator(".rounded-xl")
      .filter({ hasText: "No upcoming mock" })
      .getByRole("link", { name: "Browse Mocks" });
    await expect(browseBtn).toBeVisible();
    await expect(browseBtn).toHaveAttribute("href", "/student/browse");
  });

  test("band progress chart shows empty state", async ({ page }) => {
    await expect(page.getByText("Band Progress")).toBeVisible();
    await expect(
      page.getByText("Complete mocks to see your progression"),
    ).toBeVisible();
  });

  test("past mocks table shows empty state and view-all link", async ({
    page,
  }) => {
    await expect(page.getByText("Past Mock Exams")).toBeVisible();
    await expect(
      page.getByText(
        "No completed mocks yet. Your history will appear here after your first exam.",
      ),
    ).toBeVisible();

    const viewAll = page.getByRole("link", { name: /View all/i });
    await expect(viewAll).toBeVisible();
    await expect(viewAll).toHaveAttribute("href", "/student/results");
  });

  test("activity feed and preparation tip render", async ({ page }) => {
    await expect(page.getByText("Activity", { exact: true })).toBeVisible();
    await expect(page.getByText("No recent activity")).toBeVisible();

    await expect(page.getByText("Preparation Tip")).toBeVisible();
    await expect(
      page.getByText(/Practice timed writing tasks/i),
    ).toBeVisible();

    const moreTips = page.getByRole("link", { name: /More tips/i });
    await expect(moreTips).toBeVisible();
    await expect(moreTips).toHaveAttribute("href", "/student/browse");
  });

  test("sidebar navigation highlights dashboard and links work", async ({
    page,
  }) => {
    const navItems = [
      { label: "Dashboard", href: "/student" },
      { label: "Browse Mocks", href: "/student/browse" },
      { label: "Mock Day Hub", href: "/student/mock-day" },
      { label: "Results", href: "/student/results" },
      { label: "Profile", href: "/student/profile" },
    ];

    for (const item of navItems) {
      const link = page.getByRole("link", { name: item.label, exact: true });
      await expect(link.first()).toBeVisible();
      await expect(link.first()).toHaveAttribute("href", item.href);
    }

    const dashboardLink = page
      .getByRole("link", { name: "Dashboard", exact: true })
      .first();
    await expect(dashboardLink).toHaveClass(/bg-white\/10/);
  });

  test("top bar shows search, notifications, and user menu", async ({
    page,
  }) => {
    await expect(
      page.getByPlaceholder("Search mocks, tests, sessions…"),
    ).toBeVisible();

    const notifBtn = page.getByRole("button", { name: /notifications/i });
    await expect(notifBtn).toBeVisible();

    await expect(page.getByText("Alex Johnson")).toBeVisible();
  });

  test("dashboard does not show API error state", async ({ page }) => {
    await expect(page.getByText("Could not load dashboard")).not.toBeVisible();
  });

  test("Book New Mock navigates to browse page", async ({ page }) => {
    await page.getByRole("link", { name: /Book New Mock/i }).click();
    await expect(page).toHaveURL(/\/student\/browse/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Full Academic Mock/i }),
    ).toBeVisible();
  });

  test("claim free listening mock from dashboard promo", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().slice(0, 10);

    await page
      .locator(".rounded-xl")
      .filter({ hasText: "Free Listening mock" })
      .getByRole("button", { name: /Claim free mock/i })
      .click();

    await expect(
      page.getByRole("dialog", { name: /Claim free Listening mock/i }),
    ).toBeVisible();

    await page.locator("#welcome-promo-mock-date").fill(tomorrowIso);
    await page
      .getByRole("dialog", { name: /Claim free Listening mock/i })
      .getByRole("button", { name: /^Claim free mock$/i })
      .click();

    await expect(page.getByText("Welcome gift claimed")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Free Listening mock")).not.toBeVisible();
    await expect(page.getByText("Free Reading mock")).toBeVisible();
  });
});
