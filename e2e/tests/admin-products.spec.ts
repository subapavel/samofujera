import { test, expect, login } from "./fixtures";

test.describe.configure({ mode: "serial" });
test.describe("admin products", () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser.email, adminUser.password);
  });

  test("view products list", async ({ page }) => {
    await page.goto("/admin/produkty");
    await expect(page.locator("h2")).toContainText(/Produkty/);
  });

  test("create a product via new product flow", async ({ page }) => {
    const productName = `E2E Product ${Date.now()}`;

    // Navigate directly to the new product page
    await page.goto("/admin/produkty/novy");
    await expect(page.getByRole("heading", { name: "Nový produkt" })).toBeVisible();

    // Click E-book type card
    await page.locator("button", { hasText: "E-book" }).first().click();

    // Should navigate to product edit page
    await page.waitForURL(/admin\/produkty\/[a-f0-9-]+/, { timeout: 15000 });

    // Verify the edit page loaded
    await expect(page.getByRole("heading", { name: "Upravit produkt" })).toBeVisible();

    // Fill in title using the label
    await page.getByLabel("Název").fill(productName);

    // Save as draft
    await page.getByRole("button", { name: "Uložit jako draft" }).click();

    // Go back to products list and verify product appears
    await page.goto("/admin/produkty");
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 10000 });
  });
});
