import { test, expect, type Page } from "@playwright/test";
import { apiLogin, api as apiRequest, gradeSpeakingForStudent } from "./helpers/api";
import { login, expectLoggedInDashboard, confirmDialog } from "./helpers/ui";
import { e2eState } from "./state";

test.describe.configure({ mode: "serial" });

test.describe("Teacher portal", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    if (!e2eState.sessionCode) {
      throw new Error(
        "Student journey must run first (01-student-journey.spec.ts).",
      );
    }
    page = await browser.newPage();
    await login(page, "teacher@example.com", "teacher");
    await expectLoggedInDashboard(page, /\/teacher/);
  });

  test.afterAll(async () => {
    if (page) await page.close();
  });

  test("Login & dashboard", async () => {
    await page.goto("/teacher/dashboard");
    await expect(page.getByText(/Writing/i).first()).toBeVisible();
  });

  test("Writing grading queue & grade Alex", async () => {
    await page.goto("/teacher/grading");
    await expect(page.getByRole("heading", { name: "Writing Grading Queue" })).toBeVisible();
    await expect(page.getByText("Alex Johnson")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Grade Now" }).first().click();
    await expect(
      page.getByRole("heading", { name: /Grade Writing · Alex Johnson/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save & Submit Grade" }).click();
    await confirmDialog(page);
    await expect(page.getByRole("heading", { name: "Writing Grading Queue" })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("Speaking console & grade Alex", async () => {
    const auth = await apiLogin("teacher@example.com", "teacher");
    const dash = await apiRequest<{
      speakingSchedule: { id: string; studentName: string }[];
    }>("GET", "/teachers/dashboard", auth.accessToken);
    const speaking = dash.speakingSchedule.find((s) =>
      s.studentName.includes("Alex"),
    );
    expect(speaking).toBeTruthy();

    await page.goto(`/teacher/speaking?session=${speaking!.id}`);
    await expect(page.getByRole("heading", { name: "Speaking Examiner Console" })).toBeVisible();
    await expect(page.getByText("Alex Johnson").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Live Scoring" })).toBeVisible();

    await gradeSpeakingForStudent(auth.accessToken);
  });

  test("Availability, earnings, profile", async () => {
    await page.goto("/teacher/availability");
    await expect(page.getByText(/availability/i).first()).toBeVisible();
    await page.goto("/teacher/earnings");
    await expect(page.getByText(/earnings|revenue/i).first()).toBeVisible();
    await page.goto("/teacher/profile");
    await expect(page.getByText(/profile/i).first()).toBeVisible();
  });

  test("Help — submit support ticket", async () => {
    await page.goto("/teacher/help");
    await page.getByPlaceholder("Subject").fill("Playwright E2E teacher help");
    await page.getByPlaceholder("Describe your issue…").fill(
      "Teacher portal browser E2E automated test.",
    );
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/Ticket/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("Student results released after grading", async ({ browser }) => {
    const studentPage = await browser.newPage();
    await login(studentPage, "student@example.com", "student");
    await expectLoggedInDashboard(studentPage, /\/student/);
    await studentPage.goto("/student/results");
    await expect(studentPage.getByText("Overall").first()).toBeVisible({ timeout: 30_000 });
    await expect(studentPage.getByText("7.0").first()).toBeVisible();
    await studentPage.close();
  });
});

test.describe("Admin portal", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, "serkinov393@gmail.com", "admin");
    await expectLoggedInDashboard(page, /\/admin/);
  });

  test.afterAll(async () => {
    if (page) await page.close();
  });

  test("Login & visit all admin pages", async () => {
    const pages: { path: string; heading: string | RegExp }[] = [
      { path: "/admin/dashboard", heading: "Admin Dashboard" },
      { path: "/admin/enrollments", heading: "Enrollments" },
      { path: "/admin/orders", heading: "Orders & Payments" },
      { path: "/admin/sessions", heading: "Live Sessions Monitor" },
      { path: "/admin/disputes", heading: "Disputes & Support" },
      { path: "/admin/packages", heading: "Packages & Pricing" },
      { path: "/admin/content", heading: "Content Studio" },
      { path: "/admin/settings", heading: "Platform Settings" },
    ];

    for (const { path: adminPath, heading } of pages) {
      await page.goto(adminPath);
      await expect(
        page.getByRole("heading", { name: heading, exact: typeof heading === "string" }).first(),
      ).toBeVisible({
        timeout: 20_000,
      });
    }

    await page.goto("/admin/help");
    await expect(page.getByRole("heading", { name: /Help & Support/i })).toBeVisible();
    await page.getByPlaceholder("Subject").fill("Playwright E2E admin help");
    await page.getByPlaceholder("Describe your issue…").fill("Admin portal browser E2E.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/Ticket/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("Enrollments list includes Alex booking", async () => {
    await page.goto("/admin/enrollments");
    await expect(page.getByText("Alex Johnson")).toBeVisible({ timeout: 20_000 });
  });
});
