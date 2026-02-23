import { test, expect, login } from "./fixtures";

test.describe("admin products", () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser.email, adminUser.password);
  });

  test("view products list", async ({ page }) => {
    await page.goto("/admin/produkty");
    await expect(page.locator("h2")).toContainText(/Produkty/);
  });

  test("create and delete a product", async ({ page }) => {
    await page.goto("/admin/produkty");

    // Click "Nový produkt" button
    await page.click('text=Nový produkt');

    // Select product type (e.g., E-book)
    await page.click('text=E-book');

    // Should navigate to product edit page
    await page.waitForURL(/admin\/produkty\/[a-f0-9-]+/);

    // Fill in title
    const titleInput = page.locator('[name="title"], input[placeholder*="název" i]').first();
    await titleInput.fill("E2E Test Product");

    // Save the product
    await page.click('button:has-text("Uložit")');

    // Go back to products list
    await page.goto("/admin/produkty");

    // Verify product appears
    await expect(page.locator("text=E2E Test Product")).toBeVisible();

    // Delete the product
    const row = page.locator("tr", { hasText: "E2E Test Product" });
    await row.locator('button:has-text("Smazat")').click();

    // Confirm deletion dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Verify product is gone
    await expect(page.locator("text=E2E Test Product")).not.toBeVisible();
  });
});
