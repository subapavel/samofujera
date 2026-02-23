import { test, expect, login } from "./fixtures";

test.describe("auth flow", () => {
  test("register new user", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/registrace");

    await page.fill('[name="name"]', `Test User ${unique}`);
    await page.fill('[name="email"]', `reg-${unique}@test.com`);
    await page.fill('[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/prihlaseni/);
  });

  test("login and view profile", async ({ page, registeredUser }) => {
    await login(page, registeredUser.email, registeredUser.password);

    await page.goto("/muj-ucet/profile");
    await expect(page.locator(`text=${registeredUser.name}`)).toBeVisible();
  });

  test("logout", async ({ page, registeredUser }) => {
    await login(page, registeredUser.email, registeredUser.password);

    // Click user menu and logout
    await page.click('[data-testid="nav-user-trigger"]');
    await page.click('text=Odhlásit se');

    await expect(page).toHaveURL(/prihlaseni/);
  });
});
