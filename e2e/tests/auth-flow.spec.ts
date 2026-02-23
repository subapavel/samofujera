import { test, expect, login } from "./fixtures";

test.describe("auth flow", () => {
  test("register new user", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/registrace");

    // Wait for hydration to complete
    await page.locator('#name').waitFor({ state: "attached" });
    await page.locator('#name').fill(`Test User ${unique}`);
    await page.locator('#email').fill(`reg-${unique}@test.com`);
    await page.locator('#password').fill("TestPassword123!");
    await page.locator('button[type="submit"]').click();

    // Registration may take a moment — wait for redirect with longer timeout
    await expect(page).toHaveURL(/prihlaseni/, { timeout: 15000 });
  });

  test("login and view profile", async ({ page, registeredUser }) => {
    await login(page, registeredUser.email, registeredUser.password);

    await page.goto("/muj-ucet/profile");
    await expect(page.getByRole("main").getByText(registeredUser.name)).toBeVisible({ timeout: 10000 });
  });

  test("logout", async ({ page, registeredUser }) => {
    await login(page, registeredUser.email, registeredUser.password);

    // Click user menu and logout
    await page.click('[data-testid="nav-user-trigger"]');
    await page.click('text=Odhlásit se');

    await expect(page).toHaveURL(/prihlaseni/);
  });
});
