import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "public",
      testMatch: /auth-flow|catalog|checkout|customer-library/,
    },
    {
      name: "admin",
      testMatch: /admin-/,
      fullyParallel: false,
      workers: 1,
    },
  ],
});
