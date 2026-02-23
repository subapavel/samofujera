import { test, expect, login } from "./fixtures";

test.describe.configure({ mode: "serial" });
test.describe("admin orders", () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser.email, adminUser.password);
  });

  test("view orders list", async ({ page }) => {
    await page.goto("/admin/objednavky");
    await expect(page.locator("h2")).toContainText(/Objednávky/, { timeout: 15000 });
  });

  test("filter orders by status", async ({ page }) => {
    await page.goto("/admin/objednavky");

    // Wait for the DataTable to load
    await expect(page.locator("table")).toBeVisible({ timeout: 15000 });

    // Click the "Stav" faceted filter button (first match — the toolbar filter, not the column header)
    await page.getByRole("button", { name: /Stav/ }).first().click();

    // Select "Zaplaceno" (PAID) from the command list
    await page.getByRole("option", { name: /Zaplaceno/ }).click();

    // Close the popover by pressing Escape
    await page.keyboard.press("Escape");

    // The page should still work without errors
    await expect(page.locator("h2")).toContainText(/Objednávky/);
  });
});
