import { test, expect, login } from "./fixtures";

test.describe("checkout", () => {
  test("complete purchase with stripe test card", async ({
    page,
    registeredUser,
  }) => {
    await login(page, registeredUser.email, registeredUser.password);

    // Navigate to catalog and find a product
    await page.goto("/katalog");
    const buyButton = page.locator('text=Koupit').first();

    // Skip if no products with buy button exist
    if (!(await buyButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await buyButton.click();

    // Should redirect to Stripe Checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 });

    // Fill Stripe test card
    const emailField = page.locator('[name="email"]');
    if (await emailField.isVisible()) {
      await emailField.fill(registeredUser.email);
    }
    await page.fill('[name="cardNumber"]', "4242424242424242");
    await page.fill('[name="cardExpiry"]', "12/30");
    await page.fill('[name="cardCvc"]', "123");
    await page.fill('[name="billingName"]', registeredUser.name);
    await page.click('button[type="submit"]');

    // Should redirect back to success page
    await page.waitForURL(/pokladna\/uspech/, { timeout: 30000 });
    await expect(page.locator("body")).toContainText(/úspěšně|děkujeme/i);
  });
});
