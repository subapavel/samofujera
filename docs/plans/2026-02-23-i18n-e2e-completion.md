# i18n Integration & E2E Test Coverage — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire Lingui into all frontend components (big bang), add full Slovak translations, enable locale switching in user profile, and add Playwright E2E tests for 6 core flows.

**Architecture:** Use Lingui 5 `t` macro with Czech as source text (not custom message IDs). The existing `.po` files with manual IDs will be replaced by auto-extracted catalogs. LinguiProvider wraps the dashboard via Providers.tsx. Next.js SWC plugin compiles macros at build time. Locale detected from user profile → cookie → default `cs`.

**Tech Stack:** Lingui 5.2, @lingui/swc-plugin, Next.js 16, Playwright

---

## Part A: i18n Integration

### Task 1: Install Lingui SWC plugin and configure Next.js

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`
- Modify: `packages/i18n/lingui.config.ts`

**Step 1: Install @lingui/swc-plugin in the web app**

Run: `cd apps/web && pnpm add @lingui/core @lingui/react && pnpm add -D @lingui/swc-plugin`

**Step 2: Update next.config.ts to use the SWC plugin**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [["@lingui/swc-plugin", {}]],
  },
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
```

**Step 3: Update lingui.config.ts to scan the web app source**

The existing config only scans `packages/i18n/src`. Update it to scan the web app components where `t` macros will be used:

```typescript
import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-po";

export default defineConfig({
  sourceLocale: "cs",
  locales: ["cs", "sk"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: [
        "<rootDir>/../../apps/web/src/**/*.tsx",
        "<rootDir>/../../apps/web/src/**/*.ts",
      ],
    },
  ],
  format: formatter({ lineNumbers: false }),
});
```

**Step 4: Verify the SWC plugin loads**

Run: `cd apps/web && pnpm dev`
Expected: Dev server starts without errors. Console should NOT show "Failed to load SWC plugin".

**Step 5: Commit**

```bash
git add apps/web/package.json apps/web/next.config.ts packages/i18n/lingui.config.ts pnpm-lock.yaml
git commit -m "feat(i18n): configure lingui swc plugin for next.js"
```

---

### Task 2: Create LinguiProvider and wire into Providers

**Files:**
- Create: `apps/web/src/components/i18n-provider.tsx`
- Modify: `apps/web/src/components/dashboard/Providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Create the i18n provider component**

```tsx
// apps/web/src/components/i18n-provider.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nProvider as LinguiI18nProvider } from "@lingui/react";
import { i18n, loadCatalog, defaultLocale, type Locale } from "@samofujera/i18n";

interface I18nProviderProps {
  locale?: string;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const [loaded, setLoaded] = useState(false);
  const activeLocale = (locale === "sk" ? "sk" : "cs") as Locale;

  useEffect(() => {
    loadCatalog(activeLocale).then(() => setLoaded(true));
  }, [activeLocale]);

  if (!loaded) return null;

  return <LinguiI18nProvider i18n={i18n}>{children}</LinguiI18nProvider>;
}
```

**Step 2: Update Providers.tsx to include I18nProvider**

```tsx
// apps/web/src/components/dashboard/Providers.tsx
"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "../i18n-provider";

interface ProvidersProps {
  locale?: string;
  children: ReactNode;
}

export function Providers({ locale, children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <I18nProvider locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
```

**Step 3: Update root layout to pass locale**

In `apps/web/src/app/layout.tsx`, make the `lang` attribute dynamic. Read locale from a cookie:

```tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Allura, Inter, Josefin_Sans, Open_Sans } from "next/font/google";
import "@/styles/global.css";

// ... font declarations stay the same ...

export const metadata: Metadata = {
  title: {
    default: "Sámo Fujera",
    template: "%s | Sámo Fujera",
  },
  description:
    "Oficiální web Sáma Fujery. Texty, přednášky a setkání o životě, zdraví a hlubších souvislostech, o kterých se běžně nemluví.",
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "cs";

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${josefinSans.variable} ${openSans.variable} ${allura.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white text-[var(--foreground)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 4: Update dashboard layout to pass locale to Providers**

In `apps/web/src/app/(dashboard)/layout.tsx`, pass the locale:

```tsx
// In the existing DashboardLayout function, add:
const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "cs";

// And pass to Providers:
<Providers locale={locale}>
```

**Step 5: Verify provider loads**

Run: `cd apps/web && pnpm dev`
Navigate to `/admin` — page should render normally (Lingui loaded with Czech catalog).

**Step 6: Commit**

```bash
git add apps/web/src/components/i18n-provider.tsx apps/web/src/components/dashboard/Providers.tsx apps/web/src/app/layout.tsx apps/web/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(i18n): add lingui provider to dashboard and root layout"
```

---

### Task 3: Migrate ALL components — replace hardcoded strings with t() macro

This is the big bang task. Replace every hardcoded Czech string across all components with `t` macro calls from `@lingui/core/macro`.

**Pattern for every component:**

1. Add import: `import { t } from "@lingui/core/macro";`
2. Replace hardcoded strings: `"Přihlášení"` → `` t`Přihlášení` ``
3. For strings with variables: `"Stránka {page}"` → `` t`Stránka ${data.page} z ${data.totalPages}` ``
4. For JSX-only text that doesn't need variables, `t` macro is sufficient (no need for `<Trans>`)

**Files to modify (ALL of these):**

Auth components:
- `apps/web/src/components/auth/LoginForm.tsx`
- `apps/web/src/components/auth/RegisterForm.tsx`
- `apps/web/src/components/auth/ForgotPasswordForm.tsx`
- `apps/web/src/components/auth/ResetPasswordForm.tsx`

Admin routes:
- `apps/web/src/components/admin/routes/dashboard.tsx`
- `apps/web/src/components/admin/routes/products.tsx`
- `apps/web/src/components/admin/routes/orders.tsx`
- `apps/web/src/components/admin/routes/order-detail.tsx`
- `apps/web/src/components/admin/routes/users.tsx`
- `apps/web/src/components/admin/routes/media.tsx`
- `apps/web/src/components/admin/routes/pages-list.tsx`
- `apps/web/src/components/admin/routes/page-editor.tsx`
- `apps/web/src/components/admin/routes/product-edit.tsx`
- `apps/web/src/components/admin/routes/product-new.tsx`
- `apps/web/src/components/admin/routes/category-list.tsx`
- `apps/web/src/components/admin/routes/category-edit.tsx`
- `apps/web/src/components/admin/routes/category-new.tsx`
- `apps/web/src/components/admin/media/MediaGrid.tsx`

Customer routes:
- `apps/web/src/components/customer/routes/dashboard.tsx`
- `apps/web/src/components/customer/routes/profile.tsx`
- `apps/web/src/components/customer/routes/orders.tsx`
- `apps/web/src/components/customer/routes/order-detail.tsx`
- `apps/web/src/components/customer/routes/library.tsx`
- `apps/web/src/components/customer/routes/library-product.tsx`
- `apps/web/src/components/customer/routes/sessions.tsx`
- `apps/web/src/components/customer/routes/delete-account.tsx`

Catalog components:
- `apps/web/src/components/catalog/CatalogContent.tsx`
- `apps/web/src/components/catalog/ProductCard.tsx`
- `apps/web/src/components/catalog/CategoryFilter.tsx`
- `apps/web/src/components/catalog/ProductDetail.tsx`

Dashboard components:
- `apps/web/src/components/dashboard/sidebar-data.ts`
- `apps/web/src/components/dashboard/customer-sidebar-data.ts`
- `apps/web/src/components/dashboard/nav-user.tsx`
- `apps/web/src/components/dashboard/brand-header.tsx`
- `apps/web/src/components/dashboard/theme-switch.tsx`

**Example transformation (profile.tsx):**

Before:
```tsx
<h2 className="mb-4 text-2xl font-bold">Profil</h2>
```

After:
```tsx
import { t } from "@lingui/core/macro";
// ...
<h2 className="mb-4 text-2xl font-bold">{t`Profil`}</h2>
```

Before:
```tsx
<p className="text-[var(--muted-foreground)]">Načítání profilu...</p>
```

After:
```tsx
<p className="text-[var(--muted-foreground)]">{t`Načítání profilu...`}</p>
```

Before:
```tsx
placeholder="Vase jmeno"
```

After:
```tsx
placeholder={t`Vaše jméno`}
```

**Important notes for the implementer:**
- `t` macro works in JSX: `{t`text`}` and in props: `placeholder={t`text`}`
- For Record/object literals like `STATUS_LABELS`, wrap values: `PENDING: t`Čekající``
- For strings in arrays/objects defined at module level (outside component), use `msg` macro from `@lingui/core/macro` instead of `t`. The `msg` macro creates a message descriptor that gets resolved later. Example:
  ```tsx
  import { msg } from "@lingui/core/macro";
  import { useLingui } from "@lingui/react";

  const STATUS_LABELS = {
    PENDING: msg`Čekající`,
    PAID: msg`Zaplaceno`,
  };

  // Inside component:
  const { _ } = useLingui();
  // Use: _(STATUS_LABELS[order.status])
  ```
- For sidebar-data.ts and customer-sidebar-data.ts, the `title` strings in nav items need `msg` macro since they're defined outside a component. The NavGroup component that renders them should use `useLingui` + `_()` to resolve them.
- Fix remaining diacritics issues while migrating (e.g., "Osobni udaje" → `t`Osobní údaje``, "Jmeno" → `t`Jméno``)
- The `t` macro is for strings used inside React components/hooks. The `msg` macro is for strings defined at module scope that will be rendered later.

**Step 1: Migrate all components**

Go through every file listed above and replace all hardcoded Czech strings with `t` or `msg` macros. This is the largest step in the plan.

**Step 2: Verify the app compiles**

Run: `cd apps/web && pnpm dev`
Expected: App compiles without errors. All pages render correctly with Czech text.

**Step 3: Run typecheck**

Run: `pnpm turbo typecheck`
Expected: No type errors.

**Step 4: Run lint**

Run: `pnpm turbo lint`
Expected: No lint errors.

**Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "feat(i18n): replace all hardcoded czech strings with lingui t() macros"
```

---

### Task 4: Extract catalogs and add Slovak translations

**Files:**
- Modify: `packages/i18n/src/locales/cs/messages.po` (auto-generated by extract)
- Modify: `packages/i18n/src/locales/sk/messages.po` (fill in Slovak)

**Step 1: Run lingui extract**

Run: `cd packages/i18n && pnpm extract`

Expected: Lingui scans all web app source files, finds all `t` and `msg` macro calls, and generates/updates the `.po` files. The Czech `.po` should have ~150+ entries with msgid = source Czech text and msgstr = same Czech text (identity for source locale).

**Step 2: Verify the Czech catalog is complete**

Open `packages/i18n/src/locales/cs/messages.po` and verify it has entries for all strings. Run:

`cd packages/i18n && pnpm extract 2>&1 | tail -5`

Expected output should show 0 missing translations for Czech.

**Step 3: Fill in Slovak translations**

Open `packages/i18n/src/locales/sk/messages.po`. For each `msgid` (Czech text), provide the Slovak `msgstr`. Examples:

```po
msgid "Přihlášení"
msgstr "Prihlásenie"

msgid "Registrace"
msgstr "Registrácia"

msgid "Objednávky"
msgstr "Objednávky"

msgid "Nástěnka"
msgstr "Nástenka"

msgid "Profil"
msgstr "Profil"

msgid "Knihovna"
msgstr "Knižnica"

msgid "Produkty"
msgstr "Produkty"

msgid "Stránky"
msgstr "Stránky"

msgid "Uživatelé"
msgstr "Používatelia"

msgid "Načítání..."
msgstr "Načítavanie..."

msgid "Předchozí"
msgstr "Predchádzajúci"

msgid "Další"
msgstr "Ďalší"

msgid "Uložit"
msgstr "Uložiť"

msgid "Zrušit"
msgstr "Zrušiť"

msgid "Smazat"
msgstr "Zmazať"

msgid "Upravit"
msgstr "Upraviť"
```

Fill ALL entries. Czech and Slovak are similar enough that many strings will be very close.

**Step 4: Compile catalogs**

Run: `cd packages/i18n && pnpm compile`

Expected: Generates optimized JS modules for runtime loading.

**Step 5: Verify Slovak works**

Manually test: In browser dev tools, set cookie `NEXT_LOCALE=sk`, reload the dashboard. All strings should appear in Slovak.

**Step 6: Commit**

```bash
git add packages/i18n/src/locales/
git commit -m "feat(i18n): add extracted czech catalog and full slovak translations"
```

---

### Task 5: Add language selector to profile page

**Files:**
- Modify: `apps/web/src/components/customer/routes/profile.tsx`

**Step 1: Add locale selector to the profile page**

Add a language selector section below the name/email fields in the profile page. When the user selects a language:

1. Call `userApi.updateLocale(locale)` to persist on backend
2. Set `NEXT_LOCALE` cookie in the browser
3. Reload the page to apply new locale

```tsx
// Add to profile.tsx, inside the Card after the name section:

// State for locale
const [locale, setLocale] = useState<string>("");

// Load current locale from profile
useEffect(() => {
  if (profileQuery.data) {
    setLocale(profileQuery.data.data.locale ?? "cs");
  }
}, [profileQuery.data]);

// Mutation for locale change
const localeMutation = useMutation({
  mutationFn: (newLocale: string) => userApi.updateLocale(newLocale),
  onSuccess: (_data, newLocale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  },
});

// In the JSX, after the name section:
<div>
  <p className="text-sm font-medium text-[var(--muted-foreground)]">{t`Jazyk`}</p>
  <div className="mt-1 flex gap-2">
    <Button
      variant={locale === "cs" ? "default" : "outline"}
      size="sm"
      disabled={localeMutation.isPending}
      onClick={() => localeMutation.mutate("cs")}
    >
      Čeština
    </Button>
    <Button
      variant={locale === "sk" ? "default" : "outline"}
      size="sm"
      disabled={localeMutation.isPending}
      onClick={() => localeMutation.mutate("sk")}
    >
      Slovenčina
    </Button>
  </div>
</div>
```

**Step 2: Verify locale switching works**

1. Navigate to `/muj-ucet/profile`
2. Click "Slovenčina" button
3. Page reloads, all strings now in Slovak
4. Click "Čeština" to switch back

**Step 3: Commit**

```bash
git add apps/web/src/components/customer/routes/profile.tsx
git commit -m "feat(customer): add language selector to profile page"
```

---

### Task 6: Update i18n package exports and clean up old .po files

**Files:**
- Modify: `packages/i18n/src/i18n.ts`
- Modify: `packages/i18n/src/index.ts`

**Step 1: Ensure i18n.ts exports are correct**

The existing `i18n.ts` should work as-is. Verify `loadCatalog` correctly imports the generated `.po` files.

**Step 2: Verify the i18n package index re-exports everything needed**

```typescript
// packages/i18n/src/index.ts
export { i18n, loadCatalog, locales, defaultLocale } from "./i18n";
export type { Locale } from "./i18n";
```

**Step 3: Run full build to verify**

Run: `pnpm turbo typecheck && pnpm turbo lint`
Expected: All green.

**Step 4: Commit**

```bash
git add packages/i18n/
git commit -m "chore(i18n): clean up i18n package exports"
```

---

## Part B: E2E Tests

### Task 7: Update Playwright config and create fixtures

**Files:**
- Modify: `e2e/playwright.config.ts`
- Create: `e2e/tests/fixtures.ts`

**Step 1: Update Playwright config**

The current config uses `baseURL: "http://localhost:4321"` (old Astro URL). Update to Next.js:

```typescript
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
});
```

**Step 2: Create shared test fixtures**

```typescript
// e2e/tests/fixtures.ts
import { test as base, expect } from "@playwright/test";

const API_URL = "http://localhost:8080";

export const test = base.extend<{
  registeredUser: { email: string; password: string; name: string };
  adminUser: { email: string; password: string };
}>({
  registeredUser: async ({}, use) => {
    const unique = Date.now();
    const user = {
      email: `e2e-${unique}@test.com`,
      password: "TestPassword123!",
      name: `E2E User ${unique}`,
    };

    // Register via API
    await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    await use(user);
  },

  adminUser: async ({}, use) => {
    // Use pre-seeded admin account
    await use({
      email: "admin@samofujera.cz",
      password: "admin123",
    });
  },
});

export async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/prihlaseni");
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/muj-ucet|admin/);
}

export { expect };
```

**Step 3: Commit**

```bash
git add e2e/playwright.config.ts e2e/tests/fixtures.ts
git commit -m "test(e2e): update playwright config and add shared fixtures"
```

---

### Task 8: Rewrite auth flow E2E test

**Files:**
- Modify: `e2e/tests/auth-flow.spec.ts`

**Step 1: Rewrite the outdated auth test**

```typescript
import { test, expect, login } from "./fixtures";

test.describe("auth flow", () => {
  test("register new user", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/registrace");

    await page.fill('[name="name"]', `Test User ${unique}`);
    await page.fill('[name="email"]', `reg-${unique}@test.com`);
    await page.fill('[name="password"]', "TestPassword123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/prihlaseni/);
  });

  test("login and view profile", async ({ page, registeredUser }) => {
    await login(page, registeredUser.email, registeredUser.password);

    await page.goto("/muj-ucet/profile");
    await expect(page.locator(`text=${registeredUser.name}`)).toBeVisible();
  });

  test("logout", async ({ page, registeredUser }) => {
    await login(page, registeredUser.email, registeredUser.password);

    // Click user menu and logout
    await page.click('[data-testid="nav-user-trigger"]');
    await page.click('text=Odhlásit se');

    await expect(page).toHaveURL(/prihlaseni/);
  });
});
```

Note: The nav-user component needs a `data-testid="nav-user-trigger"` attribute added to the dropdown trigger for E2E targeting. Add this in `apps/web/src/components/dashboard/nav-user.tsx`.

**Step 2: Run the test**

Run: `cd e2e && npx playwright test tests/auth-flow.spec.ts`
Expected: All 3 tests pass.

**Step 3: Commit**

```bash
git add e2e/tests/auth-flow.spec.ts
git commit -m "test(e2e): rewrite auth flow tests for next.js routes"
```

---

### Task 9: Catalog browse E2E test

**Files:**
- Create: `e2e/tests/catalog.spec.ts`

**Step 1: Write catalog test**

```typescript
import { test, expect } from "./fixtures";

test.describe("catalog", () => {
  test("browse products page", async ({ page }) => {
    await page.goto("/katalog");
    await expect(page.locator("h1, h2")).toContainText(/Katalog|Produkty/);
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
```

Note: ProductCard component needs `data-testid="product-card"` attribute. Add this in `apps/web/src/components/catalog/ProductCard.tsx`.

**Step 2: Run the test**

Run: `cd e2e && npx playwright test tests/catalog.spec.ts`

**Step 3: Commit**

```bash
git add e2e/tests/catalog.spec.ts
git commit -m "test(e2e): add catalog browse test"
```

---

### Task 10: Checkout flow E2E test

**Files:**
- Create: `e2e/tests/checkout.spec.ts`

**Step 1: Write checkout test**

This test requires a product to exist in the database and Stripe test mode configured.

```typescript
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

    // Should redirect to Stripe Checkout (or handle inline)
    // Wait for Stripe checkout page
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
```

**Step 2: Run the test**

Run: `cd e2e && npx playwright test tests/checkout.spec.ts`

Note: This test requires Stripe test mode to be configured on the backend. It may need to be skipped in CI if Stripe keys aren't available.

**Step 3: Commit**

```bash
git add e2e/tests/checkout.spec.ts
git commit -m "test(e2e): add checkout flow test with stripe test mode"
```

---

### Task 11: Customer library E2E test

**Files:**
- Create: `e2e/tests/customer-library.spec.ts`

**Step 1: Write library test**

```typescript
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
```

**Step 2: Run**

Run: `cd e2e && npx playwright test tests/customer-library.spec.ts`

**Step 3: Commit**

```bash
git add e2e/tests/customer-library.spec.ts
git commit -m "test(e2e): add customer library test"
```

---

### Task 12: Admin products E2E test

**Files:**
- Create: `e2e/tests/admin-products.spec.ts`

**Step 1: Write admin products test**

```typescript
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

    // Select product type from dropdown (e.g., E-book)
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
```

**Step 2: Run**

Run: `cd e2e && npx playwright test tests/admin-products.spec.ts`

**Step 3: Commit**

```bash
git add e2e/tests/admin-products.spec.ts
git commit -m "test(e2e): add admin products crud test"
```

---

### Task 13: Admin orders E2E test

**Files:**
- Create: `e2e/tests/admin-orders.spec.ts`

**Step 1: Write admin orders test**

```typescript
import { test, expect, login } from "./fixtures";

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
```

**Step 2: Run all E2E tests**

Run: `cd e2e && npx playwright test`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add e2e/tests/admin-orders.spec.ts
git commit -m "test(e2e): add admin orders test"
```

---

### Task 14: Final verification and data-testid attributes

**Files:**
- Modify: `apps/web/src/components/dashboard/nav-user.tsx` (add data-testid)
- Modify: `apps/web/src/components/catalog/ProductCard.tsx` (add data-testid)

**Step 1: Add data-testid attributes needed by E2E tests**

In `nav-user.tsx`, add `data-testid="nav-user-trigger"` to the dropdown trigger button.

In `ProductCard.tsx`, add `data-testid="product-card"` to the card wrapper element.

**Step 2: Run full E2E suite**

Run: `cd e2e && npx playwright test`
Expected: All 6 test files pass.

**Step 3: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: All green.

**Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/nav-user.tsx apps/web/src/components/catalog/ProductCard.tsx
git commit -m "test(e2e): add data-testid attributes for playwright targeting"
```
