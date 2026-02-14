import { test, expect } from "@playwright/test";

test.describe("auth flow", () => {
  test("register, login, view profile, logout", async ({ page }) => {
    // Register
    await page.goto("/registrace");
    await page.fill('[name="email"]', "e2e@test.com");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="name"]', "E2E User");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/prihlaseni/);

    // Login
    await page.fill('[name="email"]', "e2e@test.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // View profile
    await page.goto("/dashboard/profile");
    await expect(page.locator("text=E2E User")).toBeVisible();

    // Logout
    await page.click("text=Odhlásit");
    await expect(page).toHaveURL(/prihlaseni/);
  });
});
