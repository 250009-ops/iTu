import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

export async function expectLoggedInDashboard(page: Page, pathPattern: RegExp) {
  await expect(page).toHaveURL(pathPattern, { timeout: 20_000 });
}

export async function logout(page: Page) {
  const userMenu = page.locator("button[aria-expanded]").filter({
    has: page.locator(".rounded-full.bg-navy"),
  });
  if (await userMenu.first().isVisible().catch(() => false)) {
    await userMenu.first().click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    return;
  }
  await page.evaluate(() => {
    sessionStorage.removeItem("ielts_mock_session");
    localStorage.removeItem("ielts_mock_session");
  });
  await page.goto("/login");
}

export async function pickTeacherByName(page: Page, namePart: string) {
  const teacher = page.getByRole("button", { name: new RegExp(namePart, "i") });
  await teacher.first().click();
}

export async function confirmDialog(page: Page) {
  const heading = page.getByRole("heading", {
    name: /Submit speaking grade|Submit writing grade|Update writing grade/i,
  });
  await expect(heading).toBeVisible({ timeout: 10_000 });
  const dialog = page.locator(".fixed.inset-0").filter({ has: heading });
  const confirm = dialog.getByRole("button", { name: "Submit grade", exact: true });
  const update = dialog.getByRole("button", { name: "Update grade", exact: true });
  if (await confirm.isVisible()) {
    await confirm.click();
  } else {
    await update.click();
  }
}
