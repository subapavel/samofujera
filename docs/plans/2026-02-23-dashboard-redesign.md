# Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the custom dashboard shell (sidebar + header) with shadcn/ui's Sidebar component ported from satnaing/shadcn-admin, adding grouped nav with icons, collapsible sidebar, user dropdown, and light/dark theme.

**Architecture:** Port the shadcn/ui Sidebar primitive (728 lines) into `packages/ui/`. Build layout components (`AppSidebar`, `NavGroup`, `NavUser`, `Header`) in `apps/web/src/components/dashboard/` adapted from shadcn-admin's TanStack Router code to Next.js App Router. Nav items are data-driven config files. Theme via `next-themes`.

**Tech Stack:** Next.js 16, React 19, shadcn/ui Sidebar, Lucide icons, next-themes, Radix UI primitives

**Design doc:** `docs/plans/2026-02-23-dashboard-redesign-design.md`

**Reference repo:** Clone `satnaing/shadcn-admin` to `/tmp/shadcn-admin-ref/` for reference code.

---

## Task 1: Install Radix dependencies for new UI components

The sidebar component needs several shadcn/ui primitives that don't exist yet in `packages/ui/`. We need to install their Radix dependencies.

**Files:**
- Modify: `packages/ui/package.json`

**Step 1: Install Radix packages**

Run from project root:
```bash
cd packages/ui && pnpm add @radix-ui/react-separator @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-collapsible
```

**Step 2: Install next-themes in web app**

```bash
cd apps/web && pnpm add next-themes
```

**Step 3: Verify installs**

```bash
pnpm install
pnpm turbo typecheck --filter=@samofujera/ui
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/ui/package.json apps/web/package.json pnpm-lock.yaml
git commit -m "deps(ui,web): add radix primitives for sidebar and next-themes"
```

---

## Task 2: Add missing shadcn/ui primitive components

Port `Separator`, `Tooltip`, `Avatar`, `Collapsible`, `Skeleton`, and `Badge` from shadcn-admin into `packages/ui/`.

**Files:**
- Create: `packages/ui/src/components/separator.tsx`
- Create: `packages/ui/src/components/tooltip.tsx`
- Create: `packages/ui/src/components/avatar.tsx`
- Create: `packages/ui/src/components/collapsible.tsx`
- Create: `packages/ui/src/components/skeleton.tsx`
- Create: `packages/ui/src/components/badge.tsx`
- Modify: `packages/ui/src/components/index.ts` — add exports

**Step 1: Create each component file**

Copy from `/tmp/shadcn-admin-ref/src/components/ui/` for each file. Adjust import paths:
- Replace `@/lib/utils` with `../lib/utils`
- Add `"use client"` directive to tooltip.tsx (uses React context)

**Step 2: Export from barrel file**

Add to `packages/ui/src/components/index.ts`:
```typescript
export { Separator } from "./separator";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
export { Avatar, AvatarImage, AvatarFallback } from "./avatar";
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./collapsible";
export { Skeleton } from "./skeleton";
export { Badge, badgeVariants } from "./badge";
```

**Step 3: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/ui
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/ui/src/components/
git commit -m "feat(ui): add separator, tooltip, avatar, collapsible, skeleton, badge components"
```

---

## Task 3: Port the shadcn/ui Sidebar component

Port the 728-line Sidebar primitive from shadcn-admin. This is the core building block.

**Files:**
- Create: `packages/ui/src/components/sidebar.tsx`
- Create: `packages/ui/src/hooks/use-mobile.tsx`
- Modify: `packages/ui/src/components/index.ts` — add sidebar exports

**Step 1: Create `use-mobile` hook**

Copy from `/tmp/shadcn-admin-ref/src/hooks/use-mobile.tsx`. No changes needed.

Create `packages/ui/src/hooks/use-mobile.tsx`:
```typescript
"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

export function useIsMobile() {
  return React.useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(MOBILE_QUERY);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}
```

**Step 2: Port `sidebar.tsx`**

Copy from `/tmp/shadcn-admin-ref/src/components/ui/sidebar.tsx`. Adjust imports:
- `@/lib/utils` → `../lib/utils`
- `@/hooks/use-mobile` → `../hooks/use-mobile`
- `@/components/ui/button` → `./button`
- `@/components/ui/input` → `./input`
- `@/components/ui/separator` → `./separator`
- `@/components/ui/sheet` → `./sheet`
- `@/components/ui/skeleton` → `./skeleton`
- `@/components/ui/tooltip` → `./tooltip`
- Add `"use client"` at the top

**Step 3: Export from barrel**

Add to `packages/ui/src/components/index.ts`:
```typescript
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./sidebar";
export { useIsMobile } from "../hooks/use-mobile";
```

**Step 4: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/ui
```

Expected: PASS (may need minor type fixes)

**Step 5: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): port shadcn sidebar component from shadcn-admin"
```

---

## Task 4: Create nav data configs

Create the data-driven nav configuration files for admin and customer sections.

**Files:**
- Create: `apps/web/src/components/dashboard/sidebar-data.ts`
- Create: `apps/web/src/components/dashboard/customer-sidebar-data.ts`
- Create: `apps/web/src/components/dashboard/types.ts`

**Step 1: Create types**

Create `apps/web/src/components/dashboard/types.ts`:
```typescript
type BaseNavItem = {
  title: string;
  badge?: string;
  icon?: React.ElementType;
};

export type NavLink = BaseNavItem & {
  url: string;
  items?: never;
};

export type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[];
  url?: never;
};

export type NavItem = NavCollapsible | NavLink;

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export type SidebarData = {
  navGroups: NavGroup[];
};
```

**Step 2: Create admin sidebar data**

Create `apps/web/src/components/dashboard/sidebar-data.ts`:
```typescript
import {
  LayoutDashboard,
  FileText,
  Image,
  Package,
  Tags,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { SidebarData } from "./types";

export const adminSidebarData: SidebarData = {
  navGroups: [
    {
      title: "Obecné",
      items: [
        { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "Obsah",
      items: [
        { title: "Stránky", url: "/admin/stranky", icon: FileText },
        { title: "Média", url: "/admin/media", icon: Image },
      ],
    },
    {
      title: "Prodej",
      items: [
        { title: "Produkty", url: "/admin/produkty", icon: Package },
        { title: "Kategorie", url: "/admin/produkty/kategorie", icon: Tags },
        { title: "Objednávky", url: "/admin/objednavky", icon: ShoppingCart },
      ],
    },
    {
      title: "Systém",
      items: [
        { title: "Uživatelé", url: "/admin/users", icon: Users },
      ],
    },
  ],
};
```

**Step 3: Create customer sidebar data**

Create `apps/web/src/components/dashboard/customer-sidebar-data.ts`:
```typescript
import {
  LayoutDashboard,
  Library,
  ShoppingCart,
  UserCog,
  Monitor,
  Trash2,
} from "lucide-react";
import type { SidebarData } from "./types";

export const customerSidebarData: SidebarData = {
  navGroups: [
    {
      title: "Obecné",
      items: [
        { title: "Dashboard", url: "/muj-ucet", icon: LayoutDashboard },
      ],
    },
    {
      title: "Nákupy",
      items: [
        { title: "Knihovna", url: "/muj-ucet/knihovna", icon: Library },
        { title: "Objednávky", url: "/muj-ucet/objednavky", icon: ShoppingCart },
      ],
    },
    {
      title: "Účet",
      items: [
        { title: "Profil", url: "/muj-ucet/profile", icon: UserCog },
        { title: "Aktivní sezení", url: "/muj-ucet/sessions", icon: Monitor },
        { title: "Smazat účet", url: "/muj-ucet/delete-account", icon: Trash2 },
      ],
    },
  ],
};
```

**Step 4: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/sidebar-data.ts apps/web/src/components/dashboard/customer-sidebar-data.ts apps/web/src/components/dashboard/types.ts
git commit -m "feat(web): add data-driven nav configs for admin and customer sidebars"
```

---

## Task 5: Create NavGroup component

Port the NavGroup component from shadcn-admin, adapting TanStack Router to Next.js.

**Files:**
- Create: `apps/web/src/components/dashboard/nav-group.tsx`

**Step 1: Create NavGroup**

Port from `/tmp/shadcn-admin-ref/src/components/layout/nav-group.tsx`. Key changes:
- Replace `import { Link, useLocation } from '@tanstack/react-router'` with `import Link from "next/link"` and `import { usePathname } from "next/navigation"`
- Replace `useLocation({ select: (location) => location.href })` with `usePathname()`
- Replace `<Link to={url}>` with `<Link href={url}>`
- Update `checkIsActive` to work with Next.js pathname (no query params in `usePathname()`)
- Import types from `./types` instead of `./types`
- Import UI components from `@samofujera/ui`

The `checkIsActive` function should be:
```typescript
function checkIsActive(pathname: string, item: NavItem, mainNav = false) {
  if ("url" in item && item.url) {
    if (pathname === item.url) return true;
  }
  if (item.items?.some((i) => pathname === i.url)) return true;
  if (mainNav && item.url) {
    const itemSegment = item.url.split("/").filter(Boolean)[1];
    const pathSegment = pathname.split("/").filter(Boolean)[1];
    return itemSegment !== undefined && itemSegment === pathSegment;
  }
  return false;
}
```

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/nav-group.tsx
git commit -m "feat(web): add NavGroup component for grouped sidebar navigation"
```

---

## Task 6: Create NavUser component

Port the NavUser component — user avatar + dropdown menu with logout.

**Files:**
- Create: `apps/web/src/components/dashboard/nav-user.tsx`

**Step 1: Create NavUser**

Simplified version adapted for our app:
- Shows user avatar (initials fallback) + name + email
- Dropdown with: "Profil" link, separator, "Odhlásit se" button
- Uses `authApi.logout()` from `@samofujera/api-client` for logout
- Admin users get a "Profil" link to `/muj-ucet/profile`; customer users same
- Replace TanStack Router `<Link>` with Next.js `<Link>`
- Import: `useSidebar` from `@samofujera/ui`, `Avatar/AvatarFallback` from `@samofujera/ui`, `DropdownMenu` set from `@samofujera/ui`
- User data comes from props (passed from parent which fetches via `userApi.getProfile()`)

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/nav-user.tsx
git commit -m "feat(web): add NavUser component with avatar dropdown and logout"
```

---

## Task 7: Create BrandHeader component (replaces TeamSwitcher)

Static brand header for the sidebar top area.

**Files:**
- Create: `apps/web/src/components/dashboard/brand-header.tsx`

**Step 1: Create BrandHeader**

Uses `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` from `@samofujera/ui`. Shows:
- Samo Fujera logo (from `/images/logo.png` or an inline SVG/icon)
- "Samo Fujera" text
- In collapsed mode, only the logo icon shows (handled by sidebar CSS automatically — text inside `SidebarMenuButton` hides when collapsed)

```typescript
"use client";

import Link from "next/link";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@samofujera/ui";

export function BrandHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
              <span className="font-bold text-sm">SF</span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Samo Fujera</span>
              <span className="truncate text-xs text-[var(--muted-foreground)]">Administrace</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
```

The subtitle should show "Administrace" or "Můj účet" based on pathname — pass as prop or detect from pathname.

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/brand-header.tsx
git commit -m "feat(web): add BrandHeader component for sidebar logo"
```

---

## Task 8: Create ThemeSwitch component

Light/dark mode toggle.

**Files:**
- Create: `apps/web/src/components/dashboard/theme-switch.tsx`

**Step 1: Create ThemeSwitch**

Uses `next-themes` `useTheme()` hook. Simple button that cycles light → dark → system, or a dropdown with three options.

Use a dropdown approach (matching shadcn-admin):
- Trigger: `Button` variant=ghost size=icon with Sun/Moon icon
- Content: Light, Dark, System options with check mark on active

Import `useTheme` from `next-themes`, icons from `lucide-react`, dropdown from `@samofujera/ui`.

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/theme-switch.tsx
git commit -m "feat(web): add ThemeSwitch component for light/dark mode"
```

---

## Task 9: Create Header component

Minimal top bar with sidebar trigger and theme switch.

**Files:**
- Create: `apps/web/src/components/dashboard/header.tsx`

**Step 1: Create Header**

Port from `/tmp/shadcn-admin-ref/src/components/layout/header.tsx`. Simplified:
- `SidebarTrigger` from `@samofujera/ui`
- `Separator` (vertical) from `@samofujera/ui`
- `ThemeSwitch` on the right side
- Fixed height `h-16`, sticky top

```typescript
"use client";

import { Separator, SidebarTrigger } from "@samofujera/ui";
import { ThemeSwitch } from "./theme-switch";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1" />
      <ThemeSwitch />
    </header>
  );
}
```

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/header.tsx
git commit -m "feat(web): add Header component with sidebar trigger and theme switch"
```

---

## Task 10: Create AppSidebar component

The main sidebar that composes everything: brand, nav groups, user footer.

**Files:**
- Create: `apps/web/src/components/dashboard/app-sidebar.tsx`

**Step 1: Create AppSidebar**

```typescript
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail,
} from "@samofujera/ui";
import { userApi } from "@samofujera/api-client";
import { BrandHeader } from "./brand-header";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { adminSidebarData } from "./sidebar-data";
import { customerSidebarData } from "./customer-sidebar-data";

export function AppSidebar() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const data = isAdmin ? adminSidebarData : customerSidebarData;

  // Fetch user profile for NavUser
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    userApi.getProfile()
      .then((res) => setUser({ name: res.data.name, email: res.data.email }))
      .catch(() => {});
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <BrandHeader section={isAdmin ? "Administrace" : "Můj účet"} />
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/app-sidebar.tsx
git commit -m "feat(web): add AppSidebar composing brand, nav groups, and user footer"
```

---

## Task 11: Update Providers and dashboard layout

Wire everything together. Update Providers to include ThemeProvider, update the dashboard layout to use new components.

**Files:**
- Modify: `apps/web/src/components/dashboard/Providers.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Delete (after): `apps/web/src/components/dashboard/Sidebar.tsx`
- Delete (after): `apps/web/src/components/dashboard/DashboardHeader.tsx`

**Step 1: Update Providers**

Add `ThemeProvider` from `next-themes`:
```typescript
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

**Step 2: Update dashboard layout**

Replace the current layout with the new sidebar-based layout:
```typescript
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@samofujera/ui";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Header } from "@/components/dashboard/header";
import { Providers } from "@/components/dashboard/Providers";

export const metadata: Metadata = { robots: "noindex, nofollow" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <Providers>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </Providers>
  );
}
```

**Step 3: Delete old components**

Delete `apps/web/src/components/dashboard/Sidebar.tsx` and `apps/web/src/components/dashboard/DashboardHeader.tsx`.

**Step 4: Verify**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

Fix any import errors in files that reference old Sidebar or DashboardHeader.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): wire up new sidebar layout, remove old sidebar and header"
```

---

## Task 12: Add dark mode CSS variables

Ensure the theme works with existing OKLCH color system. The `dark` class on `<html>` needs corresponding CSS variable overrides.

**Files:**
- Modify: `apps/web/src/app/globals.css` (or wherever the CSS theme variables are defined)

**Step 1: Check existing CSS variables**

Look at the current `@theme` or `:root` CSS block. Check if `dark` variants exist. If not, add a `.dark` block with inverted colors following shadcn/ui conventions.

The sidebar component uses CSS variables like `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, etc. These need to be defined in both light and dark modes. Check the shadcn-admin CSS at `/tmp/shadcn-admin-ref/src/styles/` for reference values.

**Step 2: Add sidebar-specific CSS variables**

Add to the CSS theme:
```css
:root {
  --sidebar-background: /* light sidebar bg */;
  --sidebar-foreground: /* light sidebar text */;
  --sidebar-primary: /* light sidebar active */;
  --sidebar-primary-foreground: /* light sidebar active text */;
  --sidebar-accent: /* light sidebar hover */;
  --sidebar-accent-foreground: /* light sidebar hover text */;
  --sidebar-border: /* light sidebar border */;
  --sidebar-ring: /* light sidebar focus ring */;
}

.dark {
  --sidebar-background: /* dark sidebar bg */;
  --sidebar-foreground: /* dark sidebar text */;
  /* ... etc */
}
```

**Step 3: Verify visually**

Start the dev server and check both light and dark modes render correctly.

```bash
cd apps/web && pnpm dev
```

**Step 4: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style(web): add dark mode and sidebar css variables"
```

---

## Task 13: Visual testing and polish

Final verification pass.

**Step 1: Test all admin routes**

Navigate to each admin route and verify the sidebar highlights the correct item:
- `/admin` — Dashboard active
- `/admin/stranky` — Stránky active
- `/admin/media` — Média active
- `/admin/produkty` — Produkty active
- `/admin/produkty/kategorie` — Kategorie active
- `/admin/objednavky` — Objednávky active
- `/admin/users` — Uživatelé active

**Step 2: Test all customer routes**

Navigate to each customer route:
- `/muj-ucet` — Dashboard active
- `/muj-ucet/knihovna` — Knihovna active
- `/muj-ucet/objednavky` — Objednávky active
- `/muj-ucet/profile` — Profil active
- `/muj-ucet/sessions` — Aktivní sezení active
- `/muj-ucet/delete-account` — Smazat účet active

**Step 3: Test sidebar collapse**

- Click sidebar trigger — sidebar collapses to icon-only
- Hover icons in collapsed mode — tooltip shows
- Refresh page — collapsed state persists (cookie)
- Click trigger again — sidebar expands

**Step 4: Test mobile**

- Resize to <768px — sidebar becomes sheet overlay
- Click trigger — sheet opens from left
- Click nav item — sheet closes, navigates

**Step 5: Test theme**

- Click theme switch — toggles light/dark/system
- Refresh — theme persists
- Both modes render correctly

**Step 6: Test user dropdown**

- Click user avatar in sidebar footer — dropdown opens
- Click "Profil" — navigates to profile
- Click "Odhlásit se" — logs out and redirects

**Step 7: Run lint and typecheck**

```bash
pnpm turbo lint --filter=@samofujera/web
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 8: Final commit**

```bash
git add -A
git commit -m "style(web): polish dashboard redesign, fix active states and theme"
```

---

## Task 14: Deploy and verify in production

**Step 1: Push to main**

```bash
git push origin main
```

**Step 2: Watch CI**

```bash
gh run list --limit 2
gh run watch <run-id> --exit-status
```

**Step 3: Verify production**

Open `https://samofujera.subapav.workers.dev/admin` and verify:
- Sidebar renders with grouped nav and icons
- Collapse/expand works
- Theme switch works
- User dropdown shows correct user
- All navigation works
