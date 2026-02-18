# Astro to Next.js Migration Design

**Date:** 2026-02-18
**Status:** Approved

## Motivation

Migrate the current Astro hybrid site to Next.js on Cloudflare for:
- Better DX and familiarity (unified React framework)
- Full SSR/dynamic capabilities (server components, middleware, API routes)
- Unified stack (eliminate Astro + React SPA split)
- Stronger ecosystem and long-term confidence

## Key Decisions

### Framework & Deployment
- **Next.js 16** with App Router (latest stable)
- **`@opennextjs/cloudflare`** adapter for Cloudflare Workers deployment
- **Cloudflare KV** for Next.js incremental cache
- **Tailwind 4** with `@tailwindcss/postcss` (same CSS config, different integration)

### Admin / Customer Split (Option B: Separate Routes, Shared Layout)
- `/admin` and `/muj-ucet` remain separate route trees
- Share a `(dashboard)/layout.tsx` for the sidebar + header shell
- Separate auth middleware per section (ADMIN role vs. any authenticated user)
- Clean separation of concerns with zero layout duplication

### Authentication (Keep Spring Backend Auth)
- Spring Security remains the auth authority (login, registration, sessions, roles)
- Next.js middleware checks `SESSION` cookie presence (fast edge redirect)
- Server components forward cookies to Spring API for real session validation
- No new auth library — avoids dual session complexity

### Routing
- **TanStack Router removed** — replaced entirely by Next.js file-based routing
- **TanStack Query stays** — for client-side data fetching in interactive components
- Catalog converts from client SPA to server component pages (better SEO)
- Admin/customer convert from TanStack Router SPAs to Next.js App Router pages

### Styling (Direct Port)
- All CSS ports 1:1 (`.public-*` classes, design tokens, Tailwind config)
- Google Fonts switch to `next/font` for automatic optimization
- `@samofujera/ui` package works unchanged
- Visual output is pixel-identical — no design changes

### Data Fetching (Two Patterns)
- **Server components**: Fetch data server-side using api-client with cookie forwarding (public pages, catalog)
- **Client components**: TanStack Query for interactive dashboards (same as current)
- `@samofujera/api-client` stays unchanged

## Project Structure

```
apps/web/
├── next.config.ts
├── open-next.config.ts
├── wrangler.jsonc
├── middleware.ts                # Auth: cookie check for /admin, /muj-ucet
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root: html, body, fonts, global CSS
│   │   ├── (public)/           # Marketing pages (SSR)
│   │   │   ├── layout.tsx      # TopBar + PublicNav + Footer
│   │   │   ├── page.tsx        # Homepage
│   │   │   ├── o-samovi/
│   │   │   ├── kontakt/
│   │   │   ├── tvorba/
│   │   │   ├── jak-probihaji-konzultace/
│   │   │   ├── objednat-online-konzultaci/
│   │   │   ├── kalendar-setkani-2026/
│   │   │   ├── pravidla-ochrany-soukromi/
│   │   │   └── obchodni-podminky/
│   │   ├── (auth)/             # Auth pages
│   │   │   ├── layout.tsx
│   │   │   ├── prihlaseni/
│   │   │   ├── registrace/
│   │   │   ├── zapomenute-heslo/
│   │   │   └── reset-hesla/
│   │   ├── katalog/            # Catalog (server components)
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── pokladna/           # Checkout
│   │   │   ├── uspech/
│   │   │   └── zruseno/
│   │   └── (dashboard)/        # Authenticated area
│   │       ├── layout.tsx      # Shared sidebar + header
│   │       ├── admin/          # Admin (ADMIN role)
│   │       │   ├── page.tsx
│   │       │   ├── users/
│   │       │   ├── produkty/
│   │       │   │   ├── page.tsx
│   │       │   │   ├── novy/
│   │       │   │   ├── [productId]/
│   │       │   │   └── kategorie/
│   │       │   ├── media/
│   │       │   └── objednavky/
│   │       └── muj-ucet/       # Customer (any auth user)
│   │           ├── page.tsx
│   │           ├── sessions/
│   │           ├── profile/
│   │           ├── delete-account/
│   │           ├── knihovna/
│   │           └── objednavky/
│   ├── components/
│   │   ├── nav/                # TopBar, PublicNav, Footer
│   │   ├── auth/               # LoginForm, RegisterForm, etc.
│   │   ├── admin/              # Admin-specific components
│   │   ├── customer/           # Customer-specific components
│   │   ├── catalog/            # Catalog components
│   │   └── media/              # Media library components
│   └── styles/
│       └── global.css
```

## Migration Phases

### Phase 1: Foundation
- Create Next.js app at `apps/web` (replace Astro)
- Configure: next.config.ts, open-next.config.ts, wrangler.jsonc, tsconfig.json
- Set up Tailwind 4 with @tailwindcss/postcss, port global.css
- Configure next/font for Google Fonts
- Wire up shared packages (@samofujera/ui, api-client, i18n, config)
- Root layout with fonts, global styles, metadata

### Phase 2: Public Pages
- Create (public)/layout.tsx with TopBar, PublicNav, Footer (client components)
- Port all 9 content pages as server components
- Port custom typography classes
- Verify visual fidelity

### Phase 3: Auth Pages & Middleware
- Create middleware.ts with cookie-presence check
- Port auth form components as client components
- Create (auth)/layout.tsx
- Verify login/register flow with Spring backend

### Phase 4: Dashboard Shell
- Create (dashboard)/layout.tsx with shared sidebar + header
- Server-side auth check (fetch profile, redirect on 401)
- Sidebar nav config for admin vs. customer
- Verify auth redirect flow

### Phase 5: Admin Routes
- Port all admin pages (products, categories, media, orders, users)
- Wire up QueryClientProvider in dashboard layout
- Verify all admin CRUD functionality

### Phase 6: Customer Routes
- Port customer pages (library, orders, profile, sessions, delete-account)
- Verify customer dashboard

### Phase 7: Catalog
- Convert to server component pages with SSR data fetching
- Client interactivity for checkout
- Verify SSR rendering and checkout flow

### Phase 8: Deployment & CI
- Update GitHub Actions for OpenNext build + Wrangler deploy
- Configure Cloudflare KV for incremental cache
- Test production deployment

### Phase 9: Cleanup & Documentation
- Remove Astro dependencies (@astrojs/*, astro)
- Remove TanStack Router
- Clean up unused files, components, utilities
- Update CLAUDE.md (tech stack, conventions, structure)
- Update package.json scripts, turbo.json
- Final lint + typecheck verification

## Dependencies Removed
- `astro`, `@astrojs/react`, `@astrojs/cloudflare`, `@astrojs/check`
- `@tanstack/react-router`

## Dependencies Added
- `next` (v16)
- `@opennextjs/cloudflare`
- `@tailwindcss/postcss` (replaces `@tailwindcss/vite`)

## Dependencies Kept
- `react`, `react-dom` (v19)
- `@tanstack/react-query`
- `tailwindcss` (v4)
- `lucide-react`
- `@dnd-kit/core`, `@dnd-kit/sortable`
- All `@samofujera/*` shared packages
