# Astro to Next.js Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Astro hybrid site at `apps/web` with a Next.js 16 App Router application deployed on Cloudflare via `@opennextjs/cloudflare`, keeping the visual design pixel-identical.

**Architecture:** Next.js App Router with route groups: `(public)` for marketing pages, `(auth)` for login/register, `(dashboard)` for admin+customer with shared layout. Middleware checks SESSION cookie for protected routes. TanStack Router removed, replaced by file-based routing. TanStack Query stays for client-side data fetching.

**Tech Stack:** Next.js 16, React 19, Tailwind 4 (`@tailwindcss/postcss`), TanStack Query, `@opennextjs/cloudflare`, `@samofujera/ui` + `api-client` + `i18n` + `config` shared packages.

**Design doc:** `docs/plans/2026-02-18-astro-to-nextjs-migration-design.md`

---

## Phase 1: Foundation

### Task 1: Remove Astro files and dependencies

**Files:**
- Delete: ALL files in `apps/web/src/` (will be recreated)
- Delete: `apps/web/astro.config.mjs`
- Delete: `apps/web/.astro/` directory
- Modify: `apps/web/package.json`

**Step 1: Clean the apps/web directory**

Remove Astro source files and config. Keep `public/` directory (static assets like images, favicon).

```bash
cd apps/web
rm -rf src .astro astro.config.mjs
```

**Step 2: Update package.json**

Replace the Astro-based package.json with Next.js dependencies:

```json
{
  "name": "@samofujera/web",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "typecheck": "next lint && tsc --noEmit",
    "lint": "next lint"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@opennextjs/cloudflare": "^1",
    "@samofujera/api-client": "workspace:^",
    "@samofujera/config": "workspace:^",
    "@samofujera/i18n": "workspace:^",
    "@samofujera/ui": "workspace:^",
    "@tanstack/react-query": "^5.90.21",
    "lucide-react": "^0.564.0",
    "next": "^16",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.18",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.7.0"
  }
}
```

**Step 3: Install dependencies**

```bash
cd /path/to/samofujera
pnpm install
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(web): remove astro, add next.js dependencies"
```

---

### Task 2: Create Next.js configuration files

**Files:**
- Create: `apps/web/next.config.ts`
- Create: `apps/web/open-next.config.ts`
- Create: `apps/web/wrangler.jsonc`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/tsconfig.json`

**Step 1: Create next.config.ts**

```ts
// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images from Cloudflare R2 and local
  images: {
    unoptimized: true, // Cloudflare Workers doesn't support next/image optimization
  },
  // Environment variable for API
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  },
};

export default nextConfig;
```

**Step 2: Create open-next.config.ts**

```ts
// apps/web/open-next.config.ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
```

**Step 3: Create wrangler.jsonc**

```jsonc
// apps/web/wrangler.jsonc
{
  "name": "samofujera",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "kv_namespaces": [
    {
      "binding": "NEXT_INC_CACHE_KV",
      "id": "PLACEHOLDER_KV_ID"
    }
  ]
}
```

**Step 4: Create postcss.config.mjs**

```js
// apps/web/postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore(web): add next.js and cloudflare configuration files"
```

---

### Task 3: Create root layout, global CSS, and font setup

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/styles/global.css`

**Step 1: Create global.css**

Port the existing `global.css` exactly as-is. The file starts with `@import "@samofujera/ui/tailwind.css"` and includes all `.topbar-auth-link`, `.nav-link`, `.public-*` typography classes, and `.public-cta` button styles.

Copy the exact contents from the old `apps/web/src/styles/global.css` (210 lines — see design doc for full reference). The file is identical; no changes needed.

**Step 2: Create root layout**

```tsx
// apps/web/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Josefin_Sans, Merriweather, Open_Sans } from "next/font/google";
import "@/styles/global.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const josefinSans = Josefin_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "600"],
  variable: "--font-heading",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin", "latin-ext"],
  weight: ["200", "300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sámo Fujera",
    template: "%s | Sámo Fujera",
  },
  description:
    "Oficiální web Sáma Fujery. Texty, přednášky a setkání o životě, zdraví a hlubších souvislostech, o kterých se běžně nemluví.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="cs"
      className={`${inter.variable} ${josefinSans.variable} ${merriweather.variable} ${openSans.variable}`}
    >
      <body className="min-h-screen bg-white text-[var(--foreground)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Step 3: Verify dev server starts**

```bash
cd apps/web && pnpm dev
```

Should show the Next.js dev server running. Visit http://localhost:3000 — should render an empty page with correct fonts loaded.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): add root layout with fonts and global css"
```

---

## Phase 2: Public Pages

### Task 4: Create PublicLayout and navigation components

**Files:**
- Create: `apps/web/src/app/(public)/layout.tsx`
- Create: `apps/web/src/components/nav/TopBar.tsx`
- Create: `apps/web/src/components/nav/PublicNav.tsx`
- Create: `apps/web/src/components/nav/Footer.tsx`

**Step 1: Port TopBar component**

Copy `TopBar.tsx` from old codebase to `apps/web/src/components/nav/TopBar.tsx`. The component is already a React client component. Add `"use client";` at the top. No other changes needed — it uses `userApi` from `@samofujera/api-client`, `lucide-react` icons, and CSS classes from global.css.

The key change: replace `window.location.pathname` with `usePathname()` from `next/navigation`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { userApi } from "@samofujera/api-client";
import { Info, Mail, Phone } from "lucide-react";
// ... rest of the component is identical, but use:
// const pathname = usePathname();
// instead of: const pathname = typeof window !== "undefined" ? window.location.pathname : "";
```

**Step 2: Port PublicNav component**

Copy `PublicNav.tsx` (441 lines) to `apps/web/src/components/nav/PublicNav.tsx`. Add `"use client";` at the top. Change the `currentPath` prop approach:

```tsx
"use client";

import { usePathname } from "next/navigation";
// ... all existing imports (useState, useRef, useEffect, useCallback, lucide icons)

// Remove the `currentPath` prop — use usePathname() hook instead
export function PublicNav() {
  const currentPath = usePathname();
  // ... rest is identical
}
```

Replace all `<a href=` links with Next.js `<Link>` where they are internal navigation (not tel: or mailto:). Import `Link` from `next/link`.

**Step 3: Extract Footer component**

Create `apps/web/src/components/nav/Footer.tsx` from the footer HTML in `PublicLayout.astro` (lines 48-73):

```tsx
// apps/web/src/components/nav/Footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <div className="px-2 pb-2 nav:px-4 nav:pb-4">
      <footer
        className="bg-repeat"
        style={{ backgroundImage: "url('/images/bg-pattern-green.jpg')" }}
      >
        <div
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center text-[hsla(0,0%,100%,.7)] font-extralight"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <p className="text-[1.075rem] leading-[1.8] mb-6">
            Tento prostor vznikl jako místo pro klidné zkoumání života, těla
            a&nbsp;souvislostí, které běžně zůstávají stranou.
          </p>
          <p className="text-[1.075rem] leading-[1.8] mb-8">
            Sámo Fujera &ndash; živá setkání, přednášky, konzultace
            a&nbsp;autorská tvorba.
          </p>
          <nav className="flex flex-col items-center gap-3 mb-8">
            <Link
              href="/muj-ucet"
              className="text-[1.14rem] font-normal underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Vstoupit do členské části
            </Link>
            <Link
              href="/kontakt"
              className="text-[1.14rem] font-normal underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Kontakt
            </Link>
            <Link
              href="/pravidla-ochrany-soukromi"
              className="text-sm underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Zásady ochrany osobních údajů
            </Link>
            <Link
              href="/obchodni-podminky"
              className="text-sm underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Obchodní podmínky
            </Link>
          </nav>
          <p className="text-sm opacity-70">
            &copy; {new Date().getFullYear()} Sámo Fujera
            <span className="mx-2">&middot;</span>
            <a
              href="#"
              className="underline decoration-[0.5px] underline-offset-2 hover:opacity-80"
            >
              Cookies
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
```

**Step 4: Create public layout**

```tsx
// apps/web/src/app/(public)/layout.tsx
import { TopBar } from "@/components/nav/TopBar";
import { PublicNav } from "@/components/nav/PublicNav";
import { Footer } from "@/components/nav/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="px-2 mt-2 nav:mt-4 nav:px-4">
        <PublicNav />
      </div>
      <main className="flex-1 px-2 py-2 nav:px-4 nav:py-4">{children}</main>
      <Footer />
    </div>
  );
}
```

**Step 5: Verify layout renders**

Create a placeholder `apps/web/src/app/(public)/page.tsx`:

```tsx
export default function HomePage() {
  return <div>Homepage placeholder</div>;
}
```

Run `pnpm dev` and verify TopBar, PublicNav, and Footer render correctly at http://localhost:3000.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): add public layout with topbar, navigation, and footer"
```

---

### Task 5: Port all public content pages

**Files:**
- Create: `apps/web/src/app/(public)/page.tsx` (homepage)
- Create: `apps/web/src/app/(public)/o-samovi/page.tsx`
- Create: `apps/web/src/app/(public)/kontakt/page.tsx`
- Create: `apps/web/src/app/(public)/tvorba/page.tsx`
- Create: `apps/web/src/app/(public)/jak-probihaji-konzultace/page.tsx`
- Create: `apps/web/src/app/(public)/objednat-online-konzultaci/page.tsx`
- Create: `apps/web/src/app/(public)/kalendar-setkani-2026/page.tsx`
- Create: `apps/web/src/app/(public)/pravidla-ochrany-soukromi/page.tsx`
- Create: `apps/web/src/app/(public)/obchodni-podminky/page.tsx`

**Step 1: Port each Astro page to a Next.js server component**

Each Astro page follows the same pattern:
1. Has a `<PublicLayout title="...">` wrapper (now handled by the `(public)/layout.tsx`)
2. Contains HTML content with `.public-*` CSS classes

For each page, convert the Astro template to a Next.js page:
- Remove the Astro frontmatter (`---` blocks)
- Remove the `<PublicLayout>` wrapper (handled by layout)
- Convert `class=` to `className=`
- Add `export const metadata` for SEO (title, description, keywords)
- Replace `<a href=` with `<Link href=` for internal links
- Keep `&nbsp;` entities as-is (JSX supports them)

**Example — Homepage (`page.tsx`):**

```tsx
// apps/web/src/app/(public)/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sámo Fujera – pohled na život, zdraví a souvislosti",
  keywords:
    "Sámo Fujera, filozofie života, zdraví v souvislostech, vědomý život",
};

export default function HomePage() {
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16 text-center"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        {/* Port the exact HTML from index.astro, converting class→className */}
        {/* ... all sections ... */}
      </div>
    </section>
  );
}
```

Repeat for all 9 pages. Each page is a server component (no "use client" needed) with static HTML content.

**Step 2: Verify all pages render**

Visit each page in the browser:
- http://localhost:3000/
- http://localhost:3000/o-samovi
- http://localhost:3000/kontakt
- http://localhost:3000/tvorba
- etc.

Check that typography, spacing, and layout match the original.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): port all public content pages to next.js"
```

---

## Phase 3: Auth

### Task 6: Create middleware for auth protection

**Files:**
- Create: `apps/web/src/middleware.ts`

**Step 1: Create middleware**

```ts
// apps/web/src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/admin", "/muj-ucet"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is protected
  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for SESSION cookie (Spring Session)
  const sessionCookie = request.cookies.get("SESSION");

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/prihlaseni", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists — let the request through
  // Actual session validation happens server-side in the dashboard layout
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    "/((?!_next/static|_next/image|favicon.ico|images|api).*)",
  ],
};
```

**Step 2: Verify middleware works**

1. Visit http://localhost:3000/admin without being logged in → should redirect to `/prihlaseni?redirect=/admin`
2. Visit http://localhost:3000/ → should load normally (no redirect)

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): add auth middleware for protected routes"
```

---

### Task 7: Port auth page components and create auth routes

**Files:**
- Create: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/app/(auth)/prihlaseni/page.tsx`
- Create: `apps/web/src/app/(auth)/registrace/page.tsx`
- Create: `apps/web/src/app/(auth)/zapomenute-heslo/page.tsx`
- Create: `apps/web/src/app/(auth)/reset-hesla/page.tsx`
- Create: `apps/web/src/components/auth/LoginForm.tsx`
- Create: `apps/web/src/components/auth/RegisterForm.tsx`
- Create: `apps/web/src/components/auth/ForgotPasswordForm.tsx`
- Create: `apps/web/src/components/auth/ResetPasswordForm.tsx`

**Step 1: Port form components**

Copy all 4 form components to `apps/web/src/components/auth/`. Add `"use client";` at the top of each. Replace `<a href=` with `<Link href=` from `next/link` for internal navigation. Replace `window.location.href = ...` with `router.push(...)` from `useRouter()` (`next/navigation`).

Example change for LoginForm:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// ... same imports from @samofujera/ui and @samofujera/api-client

export function LoginForm() {
  const router = useRouter();
  // ... same state

  async function doLogin(force: boolean) {
    // ... same logic, but replace:
    // window.location.href = redirect;
    // with:
    router.push(redirect);
  }

  // In JSX, replace <a href="/zapomenute-heslo"> with <Link href="/zapomenute-heslo">
  // and <a href="/registrace"> with <Link href="/registrace">
}
```

**Step 2: Create auth layout**

The auth pages use the same PublicLayout (TopBar + Nav + Footer). They render within the `(public)` route group but we want them in a separate `(auth)` group for clarity. However, since auth pages also show the public nav, we can either:

Option A: Put auth pages under `(public)` route group
Option B: Create `(auth)` with same layout

Use Option B for cleaner separation:

```tsx
// apps/web/src/app/(auth)/layout.tsx
import { TopBar } from "@/components/nav/TopBar";
import { PublicNav } from "@/components/nav/PublicNav";
import { Footer } from "@/components/nav/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />
      <div className="px-2 mt-2 nav:mt-4 nav:px-4">
        <PublicNav />
      </div>
      <main className="flex-1 px-2 py-2 nav:px-4 nav:py-4">{children}</main>
      <Footer />
    </div>
  );
}
```

**Step 3: Create auth pages**

```tsx
// apps/web/src/app/(auth)/prihlaseni/page.tsx
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Přihlášení",
};

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <LoginForm />
    </div>
  );
}
```

Repeat for registrace, zapomenute-heslo, reset-hesla.

**Step 4: Verify auth flow**

1. Visit http://localhost:3000/prihlaseni → login form renders
2. Visit http://localhost:3000/registrace → register form renders
3. Test login with valid credentials (requires backend running)

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add auth pages with login, register, and password reset"
```

---

## Phase 4: Dashboard Shell

### Task 8: Create shared dashboard layout

**Files:**
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/components/dashboard/DashboardLayout.tsx`
- Create: `apps/web/src/components/dashboard/Sidebar.tsx`
- Create: `apps/web/src/components/dashboard/Providers.tsx`

**Step 1: Create QueryClient provider**

```tsx
// apps/web/src/components/dashboard/Providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

**Step 2: Create Sidebar component**

Port the shared sidebar pattern from AdminLayout/CustomerLayout. The sidebar reads the current pathname and shows the appropriate nav items based on whether it's `/admin` or `/muj-ucet`:

```tsx
// apps/web/src/components/dashboard/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

const adminNavItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Produkty", href: "/admin/produkty" },
  { label: "Kategorie", href: "/admin/produkty/kategorie" },
  { label: "Media", href: "/admin/media" },
  { label: "Objednávky", href: "/admin/objednavky" },
];

const customerNavItems = [
  { label: "Dashboard", href: "/muj-ucet" },
  { label: "Knihovna", href: "/muj-ucet/knihovna" },
  { label: "Objednávky", href: "/muj-ucet/objednavky" },
  { label: "Profil", href: "/muj-ucet/profile" },
  { label: "Aktivní sezení", href: "/muj-ucet/sessions" },
  { label: "Smazat účet", href: "/muj-ucet/delete-account" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const navItems = isAdmin ? adminNavItems : customerNavItems;
  const sectionLabel = isAdmin ? "Administrace" : "Můj účet";
  const headerLabel = `Samo Fujera — ${sectionLabel}`;

  function isActive(href: string) {
    // Exact match for dashboard root, startsWith for nested
    const basePath = isAdmin ? "/admin" : "/muj-ucet";
    if (href === basePath) {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      router.push("/prihlaseni");
    }
  }

  return (
    <>
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] p-4">
          <Link href="/" className="text-lg font-semibold text-[var(--primary)]">
            Samo Fujera
          </Link>
          <p className="text-xs text-[var(--muted-foreground)]">{sectionLabel}</p>
        </div>
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* This is just the sidebar — header is separate in the layout */}
    </>
  );
}
```

**Step 3: Create dashboard layout**

```tsx
// apps/web/src/app/(dashboard)/layout.tsx
import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Providers } from "@/components/dashboard/Providers";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
```

Also create DashboardHeader:

```tsx
// apps/web/src/components/dashboard/DashboardHeader.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@samofujera/api-client";
import { Button } from "@samofujera/ui";

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = pathname.startsWith("/admin");
  const headerLabel = isAdmin ? "Samo Fujera — Administrace" : "Samo Fujera — Můj účet";

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      router.push("/prihlaseni");
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-6">
      <span className="text-sm font-medium text-[var(--muted-foreground)]">
        {headerLabel}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void handleLogout()}
      >
        Odhlásit se
      </Button>
    </header>
  );
}
```

**Step 4: Create AuthGuard as a client component**

Port `AuthGuard.tsx` to `apps/web/src/components/auth/AuthGuard.tsx`. Adapt for Next.js:

```tsx
// apps/web/src/components/auth/AuthGuard.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { userApi } from "@samofujera/api-client";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [state, setState] = useState<"loading" | "authenticated" | "redirecting">("loading");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await userApi.getProfile();
        if (!cancelled) {
          if (requiredRole && response.data.role !== requiredRole) {
            setState("redirecting");
            router.push("/muj-ucet");
          } else {
            setState("authenticated");
          }
        }
      } catch {
        if (!cancelled) {
          setState("redirecting");
          sessionStorage.setItem("redirectAfterLogin", pathname);
          router.push("/prihlaseni");
        }
      }
    }

    void checkAuth();
    return () => { cancelled = true; };
  }, [requiredRole, pathname, router]);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Načítání...</div>
      </div>
    );
  }

  if (state === "redirecting") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-[var(--muted-foreground)]">Přesměrování...</div>
      </div>
    );
  }

  return <>{children}</>;
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): add shared dashboard layout with sidebar, header, and auth guard"
```

---

## Phase 5: Admin Routes

### Task 9: Port all admin pages

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/users/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/produkty/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/produkty/novy/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/produkty/[productId]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/produkty/kategorie/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/produkty/kategorie/nova/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/produkty/kategorie/[categoryId]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/media/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/objednavky/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/objednavky/[orderId]/page.tsx`
- Port: All admin component files to `apps/web/src/components/admin/`

**Step 1: Create admin layout with AuthGuard**

```tsx
// apps/web/src/app/(dashboard)/admin/layout.tsx
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard requiredRole="ADMIN">{children}</AuthGuard>;
}
```

**Step 2: Port admin route components**

For each admin route component (dashboard, products, media, etc.):
1. Copy to `apps/web/src/components/admin/`
2. Add `"use client";` at the top
3. Replace TanStack Router imports:
   - `Link` from `@tanstack/react-router` → `Link` from `next/link`
   - `useParams` from `@tanstack/react-router` → `useParams` from `next/navigation`
   - `useNavigate` → `useRouter().push()`
   - `useRouterState` → `usePathname()`
4. Update route paths (TanStack Router used relative paths like `to="/produkty"`; Next.js Link uses absolute paths like `href="/admin/produkty"`)

**Step 3: Create Next.js pages that render admin components**

Each page is thin — it just renders the component:

```tsx
// apps/web/src/app/(dashboard)/admin/page.tsx
import { DashboardPage } from "@/components/admin/routes/dashboard";
export default DashboardPage;
```

```tsx
// apps/web/src/app/(dashboard)/admin/produkty/page.tsx
import { ProductsPage } from "@/components/admin/routes/products";
export default ProductsPage;
```

```tsx
// apps/web/src/app/(dashboard)/admin/produkty/[productId]/page.tsx
import { ProductEditPage } from "@/components/admin/routes/product-edit";
export default ProductEditPage;
```

Repeat for all admin routes.

**Step 4: Verify admin pages**

1. Login as admin
2. Visit http://localhost:3000/admin → dashboard
3. Visit http://localhost:3000/admin/produkty → products list
4. Visit http://localhost:3000/admin/media → media library

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): port all admin pages to next.js app router"
```

---

## Phase 6: Customer Routes

### Task 10: Port all customer pages

**Files:**
- Create: `apps/web/src/app/(dashboard)/muj-ucet/page.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/sessions/page.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/profile/page.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/delete-account/page.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/knihovna/page.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/knihovna/[productId]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/objednavky/page.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/objednavky/[orderId]/page.tsx`
- Port: All customer component files to `apps/web/src/components/customer/`

**Step 1: Create customer layout with AuthGuard**

```tsx
// apps/web/src/app/(dashboard)/muj-ucet/layout.tsx
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
```

**Step 2: Port customer components**

Same process as admin (Task 9):
1. Copy to `apps/web/src/components/customer/`
2. Add `"use client";`
3. Replace TanStack Router → Next.js navigation
4. Update paths to absolute (`/muj-ucet/knihovna` instead of `/knihovna`)

**Step 3: Create thin page files**

```tsx
// apps/web/src/app/(dashboard)/muj-ucet/page.tsx
import { DashboardPage } from "@/components/customer/routes/dashboard";
export default DashboardPage;
```

Repeat for all customer routes.

**Step 4: Verify customer pages**

1. Login as a regular user
2. Visit http://localhost:3000/muj-ucet → customer dashboard
3. Navigate to all customer sections

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): port all customer pages to next.js app router"
```

---

## Phase 7: Catalog

### Task 11: Convert catalog to Next.js server component pages

**Files:**
- Create: `apps/web/src/app/(public)/katalog/page.tsx`
- Create: `apps/web/src/app/(public)/katalog/[slug]/page.tsx`
- Port: `apps/web/src/components/catalog/CatalogPage.tsx` (adapt for server+client split)
- Port: `apps/web/src/components/catalog/ProductDetailPage.tsx` (adapt)
- Port: `apps/web/src/components/catalog/utils.ts`

**Step 1: Port catalog utilities**

Copy `utils.ts` to `apps/web/src/components/catalog/utils.ts` — no changes needed, it's pure functions.

**Step 2: Create catalog listing page**

The catalog listing can remain a client component with TanStack Query for now (data comes from Spring API):

```tsx
// apps/web/src/app/(public)/katalog/page.tsx
import type { Metadata } from "next";
import { CatalogContent } from "@/components/catalog/CatalogContent";
import { Providers } from "@/components/dashboard/Providers";

export const metadata: Metadata = {
  title: "Obchod",
};

export default function CatalogPage() {
  return (
    <Providers>
      <CatalogContent />
    </Providers>
  );
}
```

Port `CatalogPage.tsx` → `CatalogContent.tsx`, replacing `Link` from TanStack Router with `Link` from `next/link`:

```tsx
// apps/web/src/components/catalog/CatalogContent.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { catalogApi } from "@samofujera/api-client";
import { formatPrices, productTypeLabel } from "./utils";

export function CatalogContent() {
  // Same as old CatalogPage but:
  // Replace <Link to="/$slug" params={{ slug: product.slug }}> with:
  // <Link href={`/katalog/${product.slug}`}>
  // ... rest is identical
}
```

**Step 3: Create product detail page**

```tsx
// apps/web/src/app/(public)/katalog/[slug]/page.tsx
import { ProductDetail } from "@/components/catalog/ProductDetail";
import { Providers } from "@/components/dashboard/Providers";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Providers>
      <ProductDetailWrapper params={params} />
    </Providers>
  );
}

async function ProductDetailWrapper({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
```

Port `ProductDetailPage.tsx` → `ProductDetail.tsx`:
- Add `"use client";`
- Accept `slug` as a prop instead of `useParams()`
- Replace TanStack Router `Link` with Next.js `Link`

**Step 4: Create checkout pages**

```tsx
// apps/web/src/app/(public)/pokladna/uspech/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Platba úspěšná" };

export default function CheckoutSuccessPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-6 text-center">
      <div className="text-5xl mb-4">✓</div>
      <h1 className="text-2xl font-semibold mb-4">Platba proběhla úspěšně</h1>
      <p className="text-[var(--muted-foreground)] mb-6">
        Děkujeme za nákup. Zakoupený obsah najdete ve své knihovně.
      </p>
      <Link
        href="/muj-ucet/knihovna"
        className="text-[var(--primary)] hover:underline"
      >
        Přejít do knihovny →
      </Link>
    </div>
  );
}
```

Port `pokladna/zruseno` similarly.

**Step 5: Verify catalog**

1. Visit http://localhost:3000/katalog → product listing
2. Click a product → product detail with checkout button
3. Verify checkout flow redirects to Stripe

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): port catalog pages to next.js with client-side data fetching"
```

---

## Phase 8: Deployment & CI

### Task 12: Update turbo.json and CI workflow

**Files:**
- Modify: `turbo.json` (root)
- Modify: `.github/workflows/frontend.yml`

**Step 1: Update turbo.json outputs**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".open-next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "interactive": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

**Step 2: Update frontend CI workflow**

Update `.github/workflows/frontend.yml` deploy step:

```yaml
deploy:
  needs: check
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm turbo build
      env:
        NEXT_PUBLIC_API_URL: https://samofujera-api.fly.dev
    - name: Build for Cloudflare
      run: cd apps/web && npx opennextjs-cloudflare build
    - name: Deploy
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CF_API_TOKEN }}
        accountId: ${{ secrets.CF_ACCOUNT_ID }}
        workingDirectory: apps/web
        command: deploy
```

**Step 3: Commit**

```bash
git add -A
git commit -m "ci(web): update turbo.json and frontend workflow for next.js + opennext"
```

---

## Phase 9: Cleanup & Documentation

### Task 13: Remove unused dependencies and files

**Files:**
- Modify: `apps/web/package.json` — verify no Astro or TanStack Router deps remain
- Delete: Any remaining Astro-specific files/dirs
- Delete: Old TanStack Router files (router.tsx, main.tsx in admin/customer/catalog)

**Step 1: Verify package.json is clean**

Ensure these are NOT in package.json:
- `astro`
- `@astrojs/react`
- `@astrojs/cloudflare`
- `@astrojs/check`
- `@tanstack/react-router`
- `@tailwindcss/vite` (replaced by `@tailwindcss/postcss`)

**Step 2: Remove old router/main files**

Delete these files that were replaced by Next.js routing:
- `src/components/admin/router.tsx`
- `src/components/admin/main.tsx`
- `src/components/customer/router.tsx`
- `src/components/customer/main.tsx`
- `src/components/catalog/router.tsx`
- `src/components/catalog/main.tsx`

Also remove the old `AdminLayout.tsx` and `CustomerLayout.tsx` if they were fully replaced by the shared `Sidebar` + `DashboardHeader` components.

**Step 3: Run pnpm install to update lockfile**

```bash
pnpm install
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(web): remove astro, tanstack router, and unused files"
```

---

### Task 14: Update documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md tech stack table**

Replace the Frontend row:

```
| Frontend       | Next.js 16 (App Router), React 19, TanStack Query       |
```

Remove mentions of Astro throughout. Update:
- Tech Stack table
- Code Conventions → Frontend section (remove Astro references, add Next.js patterns)
- Project Structure tree (update `apps/web/` to show `src/app/` instead of `src/pages/`)
- Local Dev section (replace `pnpm dev` note about Astro with Next.js)
- Critical Rule #10 about SPA catch-all routes (no longer needed — Next.js handles routing natively)

**Step 2: Update any references to `@astrojs/*`**

Search and replace in CLAUDE.md and any docs.

**Step 3: Commit**

```bash
git add -A
git commit -m "docs: update claude.md for next.js migration"
```

---

### Task 15: Final verification

**Step 1: Run lint and typecheck**

```bash
pnpm turbo lint
pnpm turbo typecheck
```

Fix any errors.

**Step 2: Run build**

```bash
pnpm turbo build
```

Fix any build errors.

**Step 3: Test all pages manually**

Start dev server and verify:
- [ ] Homepage renders with correct typography
- [ ] All public pages load (o-samovi, kontakt, tvorba, etc.)
- [ ] TopBar shows correct auth state
- [ ] PublicNav works (desktop + mobile)
- [ ] Login flow works end-to-end
- [ ] Admin dashboard loads (requires admin login)
- [ ] Admin products page with filters/pagination
- [ ] Customer dashboard loads
- [ ] Catalog listing works
- [ ] Product detail + checkout redirect works
- [ ] Middleware redirects unauthenticated users from /admin and /muj-ucet

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix(web): resolve lint and typecheck issues after migration"
```
