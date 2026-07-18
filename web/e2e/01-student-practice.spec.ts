import { test, expect } from "@playwright/test";

test.describe("Practice hub", () => {
  test("platform student can open practice hub", async ({ page }) => {
    await page.goto("/student/practice");
    await expect(page.getByRole("heading", { name: /Practice Hub/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
