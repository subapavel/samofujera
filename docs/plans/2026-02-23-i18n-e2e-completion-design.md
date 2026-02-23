# i18n Integration & E2E Test Coverage — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire Lingui into all frontend components (big bang migration), add Slovak translations, enable locale switching via user profile, and add Playwright E2E tests for core user flows.

**Context:** Phase 1B Task 14 created the `packages/i18n` Lingui package with 107 Czech strings, but no component uses it. Phase 2 is ~90% complete but has only 1 outdated E2E test. This design closes both gaps.

---

## Workstream A: i18n Integration

### Architecture

LinguiProvider wraps the app at the Providers level (dashboard). For public pages (server components), a client boundary component provides the locale context.

### Locale Detection Chain

1. Authenticated users: `locale` field from user profile (stored in DB, `PUT /api/me` endpoint already exists)
2. Unauthenticated: cookie `NEXT_LOCALE` → default `cs`
3. Next.js middleware reads the cookie and passes it to components

### String Extraction Scope

Every user-facing string in:

- **Auth components** (~15 strings): login, register, password reset forms
- **Admin routes** (~60 strings): products, orders, pages, media, users, categories, dashboard
- **Customer routes** (~30 strings): library, orders, profile, sessions, delete account
- **Public pages** (~10 strings): catalog, checkout success/cancel

**Excluded:** Email templates (backend-rendered with Mustache `{{variables}}`, not Lingui)

### Translation Files

- Update `packages/i18n/src/locales/cs/messages.po` with all extracted strings
- Fill `packages/i18n/src/locales/sk/messages.po` with Slovak translations
- Use `lingui extract` to generate the catalog after wrapping strings

### Locale Switching UX

- Language selector lives **only in user profile settings page**
- Calls `PUT /api/me` with `{ locale: "sk" }` or `{ locale: "cs" }`
- Sets `NEXT_LOCALE` cookie for middleware
- Lingui switches locale in-memory immediately (no full reload)
- Public pages and unauthenticated users: always Czech, no language switch visible

### File Changes

**Modified:**
- `packages/i18n/` — Update `.po` files, export `LinguiProvider` wrapper
- `apps/web/package.json` — Add `@lingui/react`, `@lingui/core`
- `apps/web/src/components/dashboard/Providers.tsx` — Wrap with LinguiProvider
- `apps/web/src/middleware.ts` — Read `NEXT_LOCALE` cookie
- ~60 component files — Replace hardcoded strings with `t()` macros

**New:**
- `apps/web/src/components/i18n-provider.tsx` — Client component wrapping Lingui's I18nProvider with locale loading
- Language selector component in user profile page

**No changes to:**
- Email templates (backend-rendered)
- Backend code (locale endpoint already exists)
- Database schema (locale field already on users table)

---

## Workstream B: E2E Tests (Playwright)

### Test Files

| File | Flow |
|------|------|
| `auth.spec.ts` | Register → Login → View profile → Logout |
| `catalog.spec.ts` | Browse catalog → View product detail → Check prices |
| `checkout.spec.ts` | Add to cart → Stripe checkout (test mode, card 4242...) → Success page → Order created |
| `customer-library.spec.ts` | Login → Library → See purchased product → Download file |
| `admin-products.spec.ts` | Admin login → Create product → Edit → Delete |
| `admin-orders.spec.ts` | Admin login → Orders list → Order detail |

### Test Infrastructure

- Shared fixtures: `auth.fixture.ts` (login/register helpers), `db.fixture.ts` (seed test data via API)
- Stripe test mode with `4242424242424242` card
- Tests run against `http://localhost:3000` + `http://localhost:8080`
- Each test file is independent — no shared state between files
- Database seeded before each test suite via admin API calls

### Not Included

- Page editor/CMS flows
- Media upload
- Password reset email flow (needs Mailpit integration)
- Session management / account deletion

---

## Execution Order

1. **i18n first** — Set up provider, migrate all components, extract catalog, add Slovak translations, add profile language selector
2. **E2E second** — Tests verify the localized UI works correctly

## Success Criteria

- Zero hardcoded Czech strings in any component
- `lingui extract` produces clean catalog with no missing translations
- Slovak locale works when user switches language in profile
- 6 Playwright tests pass covering core user journeys
