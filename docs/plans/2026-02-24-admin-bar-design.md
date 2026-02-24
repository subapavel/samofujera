# Admin Bar & Login Redirect Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent admin bar on public pages for logged-in admins, fix login redirect to return users where they came from.

**Architecture:** New `AdminBar` component in `(public)` layout with shared auth context. Login redirect via sessionStorage.

**Tech Stack:** React 19, Next.js App Router, Lingui i18n, shadcn/ui, localStorage, sessionStorage

---

## 1. AdminBar Component

### Location
`apps/web/src/components/nav/AdminBar.tsx` — client component

### Visibility
- Only on public pages (`(public)` route group layout)
- Only for authenticated admin users
- NOT in dashboard, NOT in page editor

### Visual Design
- White bar, height `h-10`, `border-b border-[var(--border)]`, positioned above TopBar
- Same visual style as `EditorToolbar.tsx` (white, border, clean)
- **Expanded state:**
  - Left side: "Upravit stránku" button (pencil icon + text) — only on CMS pages
  - Right side: "Administrace" link (→ `/admin`) + visibility toggle icon
- **Collapsed state:**
  - Bar disappears entirely
  - Small fixed icon button in top-right corner (`fixed top-2 right-2 z-50`) to re-show

### State Management
- `localStorage` key: `adminBarVisible` (default: `true`)
- Toggle between visible/hidden persists across page loads

### CMS Page Detection
- On routes `/(public)/[slug]` and `/(public)/` (homepage), the page has a page ID
- Pass `pageId` prop from page components to AdminBar via context or prop
- When `pageId` is present, show "Upravit stránku" button linking to `/admin/stranky/{pageId}/edit`
- When absent (catalog, static pages), hide edit button

## 2. Shared Auth Context

### Location
`apps/web/src/components/nav/PublicAuthProvider.tsx`

### Purpose
- Both TopBar and AdminBar need auth state (isAdmin, user profile)
- Currently TopBar fetches profile independently
- New context provider wraps both, single API call, shared state

### API
```tsx
interface PublicAuthContext {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
}
```

### Integration
- Wrap TopBar + AdminBar in `(public)` layout with `<PublicAuthProvider>`
- TopBar reads from context instead of fetching independently
- AdminBar reads from context to decide visibility

## 3. TopBar Changes

- Remove "ADMINISTRACE" link for admin users (redundant with admin bar)
- "MŮJ ÚČET" stays for all authenticated users
- Non-admin users see no change
- Auth state now comes from `PublicAuthProvider` context

## 4. Login Redirect

### Before Login (AuthGuard)
- When AuthGuard redirects unauthenticated user to `/prihlaseni`:
  - Save current URL to `sessionStorage.setItem("returnUrl", currentPath)`
  - Then redirect to login

### After Login (LoginForm)
Priority order:
1. `?redirect=` query param (explicit override, highest priority)
2. `sessionStorage.getItem("returnUrl")` (saved before redirect)
3. `/` (homepage — changed from `/muj-ucet`)

After using sessionStorage value, remove it: `sessionStorage.removeItem("returnUrl")`

## 5. Summary of File Changes

| File | Change |
|------|--------|
| `apps/web/src/components/nav/AdminBar.tsx` | **NEW** — Admin bar component |
| `apps/web/src/components/nav/PublicAuthProvider.tsx` | **NEW** — Shared auth context |
| `apps/web/src/components/nav/TopBar.tsx` | Remove "ADMINISTRACE" link, use context |
| `apps/web/src/app/(public)/layout.tsx` | Add AdminBar + PublicAuthProvider |
| `apps/web/src/components/auth/LoginForm.tsx` | sessionStorage redirect, default to `/` |
| `apps/web/src/components/auth/AuthGuard.tsx` | Save returnUrl to sessionStorage |
| `apps/web/src/app/(public)/[slug]/page.tsx` | Pass pageId for edit button |
| `apps/web/src/app/(public)/page.tsx` | Pass pageId for homepage edit |
