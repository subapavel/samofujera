import { test, expect } from "./fixtures";

test.describe("catalog", () => {
  test("browse products page", async ({ page }) => {
    await page.goto("/katalog");
    await expect(page.locator("h1")).toContainText(/Obchod/);
  });

  test("view product detail", async ({ page }) => {
    await page.goto("/katalog");

    // Click first product card if any exist
    const productCard = page.locator('[data-testid="product-card"]').first();
    if (await productCard.isVisible()) {
      await productCard.click();
      await expect(page.url()).toContain("/katalog/");
    }
  });
});
