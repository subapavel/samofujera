import { test, expect, login } from "./fixtures";

test.describe.configure({ mode: "serial" });
test.describe("admin orders", () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser.email, adminUser.password);
  });

  test("view orders list", async ({ page }) => {
    await page.goto("/admin/objednavky");
    await expect(page.locator("h2")).toContainText(/Objednávky/);
  });

  test("filter orders by status", async ({ page }) => {
    await page.goto("/admin/objednavky");

    // Select a status filter
    await page.selectOption("select", "PAID");

    // The page should still work without errors
    await expect(page.locator("h2")).toContainText(/Objednávky/);
  });
});
