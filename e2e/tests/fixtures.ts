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
    // Use pre-seeded admin account
    await use({
      email: "admin@samofujera.cz",
      password: "admin123",
    });
  },
});

export async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/prihlaseni");
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/muj-ucet|admin/);
}

export { expect };
