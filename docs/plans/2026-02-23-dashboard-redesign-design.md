# Dashboard Redesign — Design Document

**Date:** 2026-02-23
**Status:** Approved
**Scope:** Admin (`/admin`) + Customer (`/muj-ucet`) dashboard shell

## Goal

Replace the current custom sidebar and header with shadcn/ui's Sidebar component,
ported from [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin).
Add grouped navigation with icons, collapsible sidebar, user dropdown, and
light/dark theme switching.

## Reference

- Source repo: `satnaing/shadcn-admin` (cloned to `/tmp/shadcn-admin-ref/`)
- Uses TanStack Router — we adapt to Next.js App Router
- Key components: `Sidebar` (728-line primitive), `AppSidebar`, `NavGroup`,
  `NavUser`, `Header`, `TeamSwitcher`

## Features

1. **Collapsible sidebar with icons** — expanded (256px) / collapsed (icon-only rail) / mobile sheet
2. **Grouped navigation** — admin and customer each have logical groups with Lucide icons
3. **User dropdown in sidebar footer** — avatar, name, profile link, logout
4. **Theme switcher** — light/dark mode via `next-themes`

### NOT in scope

- Command palette / search (Ctrl+K)
- Breadcrumbs in header
- Team switcher (single-tenant app)

## Component Architecture

```
packages/ui/src/components/
  sidebar.tsx                    ← Port from shadcn-admin (core primitives)

apps/web/src/components/dashboard/
  app-sidebar.tsx                ← Brand header + nav groups + user footer
  nav-group.tsx                  ← Grouped nav items (collapsible sub-items)
  nav-user.tsx                   ← User avatar + dropdown (profile, logout)
  header.tsx                     ← Top bar: sidebar trigger + theme switch
  theme-switch.tsx               ← Light/dark toggle component
  sidebar-data.ts                ← Admin nav config
  customer-sidebar-data.ts       ← Customer nav config
  Providers.tsx                  ← Add ThemeProvider (next-themes)
```

### Layout hierarchy

```
(dashboard)/layout.tsx
  → Providers (QueryClient + ThemeProvider)
    → SidebarProvider (cookie-persisted state)
      → AppSidebar (nav groups switch based on pathname)
      → SidebarInset
        → Header (trigger + theme switch)
        → <main>{children}</main>

(dashboard)/admin/layout.tsx   → AuthGuard(requiredRole="ADMIN")
(dashboard)/muj-ucet/layout.tsx → AuthGuard()
```

## Admin Navigation

| Group      | Item        | Icon              | URL                        |
|------------|-------------|-------------------|----------------------------|
| **Obecné** | Dashboard   | `LayoutDashboard` | `/admin`                   |
| **Obsah**  | Stránky     | `FileText`        | `/admin/stranky`           |
|            | Média       | `Image`           | `/admin/media`             |
| **Prodej** | Produkty    | `Package`         | `/admin/produkty`          |
|            | Kategorie   | `Tags`            | `/admin/produkty/kategorie`|
|            | Objednávky  | `ShoppingCart`     | `/admin/objednavky`        |
| **Systém** | Uživatelé   | `Users`           | `/admin/users`             |

## Customer Navigation

| Group      | Item            | Icon              | URL                        |
|------------|-----------------|-------------------|----------------------------|
| **Obecné** | Dashboard       | `LayoutDashboard` | `/muj-ucet`                |
| **Nákupy** | Knihovna         | `Library`         | `/muj-ucet/knihovna`       |
|            | Objednávky      | `ShoppingCart`     | `/muj-ucet/objednavky`     |
| **Účet**   | Profil           | `UserCog`         | `/muj-ucet/profile`        |
|            | Aktivní sezení  | `Monitor`         | `/muj-ucet/sessions`       |
|            | Smazat účet     | `Trash2`          | `/muj-ucet/delete-account` |

## Sidebar Behavior

- **Expanded** (default): ~256px, icons + labels + group headers
- **Collapsed**: ~48px icon-only rail, sub-items as dropdown on hover
- **Mobile** (<768px): Sheet overlay from left, hamburger trigger in header
- **Persistence**: `sidebar_state` cookie remembers expanded/collapsed

## Sidebar Brand

Top of sidebar shows the Samo Fujera logo + "Samo Fujera" text.
In collapsed mode, shows only the logo icon.

## Header

Minimal top bar (h-16):
- Left: Sidebar trigger button + vertical separator
- Right: Theme switch (sun/moon icon toggle)

## Theme (Light/Dark)

- `next-themes` ThemeProvider wrapping dashboard layout
- `ThemeSwitch` component: sun/moon icon toggle
- System preference respected by default
- Existing OKLCH CSS variables support both modes — add `dark:` variants as needed

## What Gets Replaced

| Current                  | New                                |
|--------------------------|-----------------------------------|
| `Sidebar.tsx` (custom)   | `app-sidebar.tsx` + shadcn Sidebar |
| `DashboardHeader.tsx`    | `header.tsx`                       |
| Path-based if/else nav   | Data-driven config files           |

## Porting Notes (TanStack Router → Next.js)

| shadcn-admin                    | Our codebase                        |
|---------------------------------|-------------------------------------|
| `<Link to={url}>`              | `<Link href={url}>` (next/link)     |
| `useLocation()`                | `usePathname()` (next/navigation)   |
| `<Outlet />`                   | `{children}` (layout prop)          |
| `getCookie('sidebar_state')`   | `cookies()` or client-side cookie   |
| Vite env vars                  | `NEXT_PUBLIC_*` env vars            |

## Dependencies to Add

- `next-themes` — theme provider for Next.js
- `lucide-react` — already in use (verify version)
- No new shadcn/ui CLI installs needed — Sidebar is ported manually
