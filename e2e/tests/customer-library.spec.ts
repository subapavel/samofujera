import { test, expect, login } from "./fixtures";

test.describe("customer library", () => {
  test("view library page", async ({ page, registeredUser }) => {
    await login(page, registeredUser.email, registeredUser.password);

    await page.goto("/muj-ucet/knihovna");
    await expect(page.locator("h2")).toContainText(/Knihovna/);
  });

  test("shows empty state when no purchases", async ({
    page,
    registeredUser,
  }) => {
    await login(page, registeredUser.email, registeredUser.password);

    await page.goto("/muj-ucet/knihovna");
    await expect(page.locator("body")).toContainText(/nemáte|žádné/i);
  });
});
