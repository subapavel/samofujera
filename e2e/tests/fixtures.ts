import { test as base, expect } from "@playwright/test";

const API_URL = "http://localhost:8080";

export const test = base.extend<{
  registeredUser: { email: string; password: string; name: string };
  adminUser: { email: string; password: string };
}>({
  registeredUser: async ({}, use) => {
    const unique = Date.now();
    const user = {
      email: `e2e-${unique}@test.com`,
      password: "TestPassword123!",
      name: `E2E User ${unique}`,
    };

    // Register via API
    await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    await use(user);
  },

  adminUser: async ({}, use) => {
    await use({
      email: process.env.E2E_ADMIN_EMAIL ?? "admin@samofujera.cz",
      password: process.env.E2E_ADMIN_PASSWORD ?? "Admin1234!",
    });
  },
});

export async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/prihlaseni");
  // Wait for hydration to complete before interacting
  const emailInput = page.locator('#email');
  await emailInput.waitFor({ state: "attached" });
  await emailInput.fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();

  // Handle session conflict dialog if it appears
  const forceLoginBtn = page.getByRole("button", { name: "Ano, přihlásit se zde" });
  const navigated = page.waitForURL(/muj-ucet|admin/, { timeout: 5000 }).catch(() => false);
  const conflictAppeared = forceLoginBtn.waitFor({ state: "visible", timeout: 5000 }).catch(() => false);
  const result = await Promise.race([navigated, conflictAppeared]);
  if (result === false) {
    // Neither happened — check if we're already on the target URL
    if (!/muj-ucet|admin/.test(page.url())) {
      throw new Error(`Login failed — stuck on ${page.url()}`);
    }
  }
  if (await forceLoginBtn.isVisible().catch(() => false)) {
    await forceLoginBtn.click();
    await page.waitForURL(/muj-ucet|admin/);
  }
}

export { expect };
