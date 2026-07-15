import { test, expect, type Page } from "@playwright/test";
import {
  apiLogin,
  completeExamSections,
} from "./helpers/api";
import { login, expectLoggedInDashboard } from "./helpers/ui";
import { e2eState } from "./state";

test.describe.configure({ mode: "serial" });

test.describe("Student portal (scenarios 1–13)", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, "student@example.com", "student");
    await expectLoggedInDashboard(page, /\/student/);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. Login & empty dashboard", async () => {
    await page.goto("/student");
    await expect(page.getByText(/Welcome back, Alex/i)).toBeVisible();
    await expect(page.getByText("0 mocks completed")).toBeVisible();
    const targetCard = page.locator(".rounded-xl").filter({ hasText: "Target Band" });
    await expect(targetCard.getByText("—", { exact: true })).toBeVisible();
    await expect(page.getByText("No mock scheduled")).toBeVisible();
  });

  test("2. Browse mock packages", async () => {
    await page.goto("/student/browse");
    await expect(
      page.getByRole("button", { name: "Full Academic", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Full Academic Mock" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Frequently Asked Questions" }),
    ).toBeVisible();
  });

  test("3. Booking wizard (5 steps)", async () => {
    test.setTimeout(180_000);
    await page.goto("/student/browse");
    await page.getByRole("button", { name: "Book Full Mock Exam" }).first().click();
    await expect(
      page.getByRole("heading", { name: /Book Full Academic Mock/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "09:00" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    const writingExaminer = page
      .getByRole("button")
      .filter({ hasText: /Dr\. Sarah Chen|Sarah Chen/i })
      .first();
    await expect(writingExaminer).toBeVisible({ timeout: 20_000 });
    await writingExaminer.click();
    await page.getByRole("button", { name: "Continue" }).click();

    const speakingExaminer = page
      .getByRole("button")
      .filter({ hasText: /open slot/i })
      .first();
    await expect(speakingExaminer).toBeVisible({ timeout: 20_000 });
    await speakingExaminer.click();
    await page.getByRole("button", { name: "Continue" }).click();

    const speakingSlot = page
      .locator("button")
      .filter({ hasText: /^\d{2}:\d{2}$/ })
      .first();
    await expect(speakingSlot).toBeVisible({ timeout: 20_000 });
    await speakingSlot.click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByPlaceholder("Name on card").fill("Alex Johnson");
    await page.getByPlaceholder("Card number").fill("4242424242424242");
    await page.getByPlaceholder("MM / YY").fill("12/30");
    await page.getByPlaceholder("CVC").fill("123");
    await page.getByRole("button", { name: /Pay \$/ }).click();

    await expect(page).toHaveURL(/\/student\/mock-day/, { timeout: 20_000 });
  });

  test("4. Mock Day Hub", async () => {
    await page.goto("/student/mock-day");
    await expect(
      page.getByRole("link", { name: /Enter Exam · Check-in/i }),
    ).toBeVisible();
    const checkInLink = page.getByRole("link", { name: /Enter Exam · Check-in/i });
    const href = await checkInLink.getAttribute("href");
    expect(href).toMatch(/\/exam\/MOCK-/);
    e2eState.sessionCode = href!.split("/")[2];
  });

  test("5. Exam check-in", async () => {
    const sessionCode = e2eState.sessionCode;
    expect(sessionCode).toBeTruthy();

    await page.goto(`/exam/${sessionCode}/check-in`);
    await expect(page.getByRole("heading", { name: "Exam day check-in" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm my identity" }).click();
    await page.getByRole("button", { name: "I have read and accept the rules" }).click();
    await page.getByRole("button", { name: "Devices working correctly" }).click();
    await page.getByRole("button", { name: "Begin Listening section" }).click();
    await expect(page).toHaveURL(new RegExp(`/exam/${sessionCode}/listening`), {
      timeout: 20_000,
    });
  });

  test("6. Listening CBT loads", async () => {
    const sessionCode = e2eState.sessionCode;
    await page.goto(`/exam/${sessionCode}/listening`);
    await expect(page.getByRole("button", { name: "End Listening" })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("7–10. Complete exam sections (API-assisted)", async () => {
    const auth = await apiLogin("student@example.com", "student");
    e2eState.studentToken = auth.accessToken;
    await completeExamSections(e2eState.sessionCode, auth.accessToken);
  });

  test("11. Profile — IELTS Plan & target band", async () => {
    await page.goto("/student/profile");
    await page.getByRole("button", { name: "IELTS Plan" }).click();
    await expect(page.getByText("Set your IELTS target band")).toBeVisible();
    await page.locator("select").first().selectOption("7");
    await page.getByRole("button", { name: "Save my IELTS plan" }).click();
    await expect(page.getByText("7.0").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Overview" }).click();
    await expect(page.getByText("Full Academic Mock")).toBeVisible();
  });

  test("12. Notifications", async () => {
    await page.goto("/student/notifications");
    await expect(page.getByRole("heading", { name: /Notifications/i })).toBeVisible();
    await expect(
      page.getByText("Notifications about your mocks and results will appear here."),
    ).not.toBeVisible({ timeout: 15_000 });
  });

  test("13. Help — submit support ticket", async () => {
    await page.goto("/student/help");
    await expect(page.getByRole("heading", { name: /Help & Support/i })).toBeVisible();
    await page.getByPlaceholder("Subject").fill("Playwright E2E student help");
    await page.getByPlaceholder("Describe your issue…").fill(
      "Automated browser E2E — technical issue scenario.",
    );
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/Ticket/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
