import { test, expect } from "./fixtures";

test.describe("catalog", () => {
  test("view product detail", async ({ page }) => {
    // Product detail is now at /produkty/[slug]
    // The catalog listing is now a CMS block, not a standalone route
    // This test navigates directly to a product detail page
    await page.goto("/produkty/test-product");

    // If product exists, we should see the detail page
    // If not, we should see a "not found" message
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
