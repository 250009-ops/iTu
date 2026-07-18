import { test, expect } from "@playwright/test";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";

/**
 * Verifies desktop download card renders on help pages and releases API is reachable.
 * Full suspend/resume flow requires a live mock session — covered by API unit tests.
 */
test.describe("Desktop download & exam resume API", () => {
  test("student help shows desktop download card", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("student@example.com");
    await page.getByLabel(/password/i).fill("student");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/student/);

    await page.goto("/student/help");
    await expect(page.getByText("Desktop app")).toBeVisible();
    await expect(page.getByText(/Download for/i)).toBeVisible();
  });

  test("releases API returns desktop platform metadata", async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/releases/desktop/latest?platform=windows`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.platform).toBe("windows");
    expect(body.version).toBeTruthy();
  });
});
