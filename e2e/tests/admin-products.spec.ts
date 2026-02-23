import { test, expect, login } from "./fixtures";

test.describe.configure({ mode: "serial" });
test.describe("admin products", () => {
  test.beforeEach(async ({ page, adminUser }) => {
    await login(page, adminUser.email, adminUser.password);
  });

  test("view products list", async ({ page }) => {
    await page.goto("/admin/produkty");
    await expect(page.locator("h2")).toContainText(/Produkty/, { timeout: 15000 });
  });

  test("create and edit a product via dialogs", async ({ page }) => {
    const productName = `E2E Product ${Date.now()}`;

    // Open the products list
    await page.goto("/admin/produkty");
    await expect(page.locator("h2")).toContainText(/Produkty/, { timeout: 15000 });

    // Click the primary "Nový produkt" button (the one with the Plus icon, not table row buttons)
    await page.getByRole("button", { name: /Nový produkt/ }).first().click();

    // Create dialog should appear with product type selection
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click E-book type button in the create dialog
    await page.getByRole("dialog").getByRole("button", { name: "E-book" }).click();

    // Edit dialog should open (create dialog closes, edit dialog opens)
    await expect(
      page.getByRole("dialog").getByText(/Upravit produkt/),
    ).toBeVisible({ timeout: 15000 });

    // Fill in title using the label
    await page.getByRole("dialog").getByLabel("Název").fill(productName);

    // Save as draft
    await page.getByRole("dialog").getByRole("button", { name: "Uložit jako draft" }).click();

    // Wait for save to complete
    await expect(
      page.getByRole("dialog").getByText(/úspěšně/),
    ).toBeVisible({ timeout: 10000 });

    // Close the edit dialog
    await page.keyboard.press("Escape");

    // Verify product appears in the list
    await expect(page.getByText(productName).first()).toBeVisible({ timeout: 10000 });
  });
});
