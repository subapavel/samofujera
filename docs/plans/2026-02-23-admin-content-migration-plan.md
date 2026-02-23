# Admin & Customer Content Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all admin and customer page content from raw HTML/Tailwind to shadcn/ui components matching the shadcn-admin template patterns (DataTable, Settings Layout, Drawer/Dialog creation, Panel Grid, SearchCommand, Breadcrumbs).

**Architecture:** Component-first approach — build shared reusable components (DataTable, SearchCommand, Breadcrumbs, PageHeader, SettingsLayout), then migrate each page. All forms use react-hook-form + zod. All tables use @tanstack/react-table. All strings through Lingui i18n.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query, TanStack Table, shadcn/ui, react-hook-form, zod, Lingui, Tailwind 4

**Reference template:** [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) — study `src/components/data-table/`, `src/features/users/`, `src/features/tasks/`, `src/features/settings/`, `src/components/search.tsx`

---

## Phase 1: Dependencies & Missing shadcn/ui Primitives

### Task 1: Install npm dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install @tanstack/react-table and zod in apps/web**

```bash
cd apps/web && pnpm add @tanstack/react-table zod
```

**Step 2: Verify installation**

```bash
cd apps/web && pnpm list @tanstack/react-table zod
```
Expected: Both packages listed with versions.

**Step 3: Verify build still works**

```bash
pnpm turbo typecheck --filter=web
```
Expected: PASS (no new errors — just adding deps).

**Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(deps): add @tanstack/react-table and zod"
```

---

### Task 2: Add missing shadcn/ui primitive components

We need: `table`, `command`, `breadcrumb`, `textarea`, `select`, `checkbox`, `radio-group`, `pagination`.

Already have: `badge`, `sheet`, `form`, `tabs`, `dialog`, `card`, `popover`, `separator`.

**Files:**
- Create: `packages/ui/src/components/table.tsx`
- Create: `packages/ui/src/components/command.tsx`
- Create: `packages/ui/src/components/breadcrumb.tsx`
- Create: `packages/ui/src/components/textarea.tsx`
- Create: `packages/ui/src/components/select.tsx`
- Create: `packages/ui/src/components/checkbox.tsx`
- Create: `packages/ui/src/components/radio-group.tsx`
- Create: `packages/ui/src/components/pagination.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/package.json` (new Radix deps)

**Step 1: Install required Radix primitives**

```bash
cd packages/ui && pnpm add @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-select cmdk
```

Note: `@radix-ui/react-popover` (for command) and `@radix-ui/react-separator` already installed.

**Step 2: Add each component**

Use the shadcn/ui source from Context7 (or shadcn CLI if available) to create each component file. Each component follows the standard shadcn/ui pattern:
- Wraps Radix primitive
- Applies Tailwind classes via `cn()`
- Exports named components with `React.forwardRef` (or React 19 ref prop)

The specific components to add:

**table.tsx** — Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption. Pure HTML elements with Tailwind classes (no Radix needed).

**command.tsx** — Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator. Built on `cmdk` library.

**breadcrumb.tsx** — Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis. Pure HTML with Tailwind + Slot pattern.

**textarea.tsx** — Single Textarea component. Pure HTML textarea with Tailwind classes.

**select.tsx** — Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton. Built on `@radix-ui/react-select`.

**checkbox.tsx** — Checkbox component. Built on `@radix-ui/react-checkbox`.

**radio-group.tsx** — RadioGroup, RadioGroupItem. Built on `@radix-ui/react-radio-group`.

**pagination.tsx** — Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious. Pure HTML with Tailwind.

**Step 3: Export all new components from packages/ui/src/index.ts**

Add export lines for each new component file.

**Step 4: Verify typecheck**

```bash
pnpm turbo typecheck
```
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): add table, command, breadcrumb, textarea, select, checkbox, radio-group, pagination components"
```

---

## Phase 2: Shared Layout & Infrastructure Components

### Task 3: Create Main content wrapper component

Matches shadcn-admin's `Main` component — wrapper for page content with padding, optional max-width, optional fixed layout.

**Files:**
- Create: `apps/web/src/components/dashboard/main-content.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`

**Step 1: Create MainContent component**

```tsx
// apps/web/src/components/dashboard/main-content.tsx
import { cn } from "@samofujera/ui/lib/utils";

type MainContentProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean;
};

export function MainContent({
  fixed,
  className,
  ...props
}: MainContentProps) {
  return (
    <main
      className={cn(
        "px-4 py-6",
        fixed && "flex flex-1 flex-col overflow-hidden",
        !fixed && "max-w-7xl mx-auto w-full",
        className
      )}
      {...props}
    />
  );
}
```

**Step 2: Update dashboard layout to use MainContent**

Replace the inline `<main>` tag in `apps/web/src/app/(dashboard)/layout.tsx` with `<MainContent>`.

```tsx
// Replace:
<main className="flex-1 overflow-auto p-4 md:p-6">
  {children}
</main>

// With:
<MainContent>{children}</MainContent>
```

**Step 3: Verify pages still render**

```bash
curl -s http://localhost:3000/admin | head -20
```
Expected: HTML with no errors.

**Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/main-content.tsx apps/web/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(web): add main-content layout wrapper component"
```

---

### Task 4: Create PageHeader component

Reusable page title + subtitle + action buttons area, used by every page.

**Files:**
- Create: `apps/web/src/components/dashboard/page-header.tsx`

**Step 1: Create PageHeader**

```tsx
// apps/web/src/components/dashboard/page-header.tsx
"use client";

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode; // Action buttons
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/dashboard/page-header.tsx
git commit -m "feat(web): add page-header component for consistent page titles"
```

---

### Task 5: Create Breadcrumbs component

Auto-generates breadcrumbs from the current URL pathname with Czech i18n labels.

**Files:**
- Create: `apps/web/src/components/dashboard/dashboard-breadcrumbs.tsx`
- Modify: `apps/web/src/components/dashboard/header.tsx`

**Step 1: Create DashboardBreadcrumbs**

```tsx
// apps/web/src/components/dashboard/dashboard-breadcrumbs.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { t } from "@lingui/core/macro";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@samofujera/ui";
import { Fragment } from "react";

// Route segment -> Czech label mapping
function getSegmentLabel(segment: string): string {
  const labels: Record<string, () => string> = {
    admin: () => t`Administrace`,
    "muj-ucet": () => t`Můj účet`,
    produkty: () => t`Produkty`,
    kategorie: () => t`Kategorie`,
    stranky: () => t`Stránky`,
    objednavky: () => t`Objednávky`,
    media: () => t`Média`,
    users: () => t`Uživatelé`,
    profil: () => t`Profil`,
    knihovna: () => t`Knihovna`,
    sezeni: () => t`Sezení`,
    novy: () => t`Nový`,
    nova: () => t`Nová`,
    edit: () => t`Upravit`,
    nastaveni: () => t`Nastavení`,
  };
  return labels[segment]?.() ?? segment;
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          // Skip UUID-like segments in display (show "Upravit" instead)
          const isUuid = /^[a-f0-9-]{36}$/.test(segment);
          const label = isUuid ? t`Detail` : getSegmentLabel(segment);

          return (
            <Fragment key={href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
```

**Step 2: Add breadcrumbs to Header**

Update `apps/web/src/components/dashboard/header.tsx` to include breadcrumbs after the separator:

```tsx
"use client";

import { Separator, SidebarTrigger } from "@samofujera/ui";
import { ThemeSwitch } from "./theme-switch";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <DashboardBreadcrumbs />
      <div className="flex-1" />
      <ThemeSwitch />
    </header>
  );
}
```

**Step 3: Verify breadcrumbs render on admin pages**

Navigate to `/admin/produkty` — should show "Administrace > Produkty".

**Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/dashboard-breadcrumbs.tsx apps/web/src/components/dashboard/header.tsx
git commit -m "feat(web): add dynamic breadcrumbs to dashboard header"
```

---

### Task 6: Create SearchCommand (Cmd+K / Ctrl+K)

Global search command palette using shadcn Command (cmdk).

**Files:**
- Create: `apps/web/src/components/dashboard/search-command.tsx`
- Create: `apps/web/src/components/dashboard/search-provider.tsx`
- Create: `apps/web/src/components/dashboard/search-trigger.tsx`
- Modify: `apps/web/src/components/dashboard/header.tsx`
- Modify: `apps/web/src/components/dashboard/Providers.tsx`

**Step 1: Create SearchProvider context**

```tsx
// apps/web/src/components/dashboard/search-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface SearchContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <SearchContext value={{ open, setOpen }}>
      {children}
    </SearchContext>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
```

**Step 2: Create SearchCommand dialog**

```tsx
// apps/web/src/components/dashboard/search-command.tsx
"use client";

import { useRouter } from "next/navigation";
import { t } from "@lingui/core/macro";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@samofujera/ui";
import {
  LayoutDashboard, Package, FileText, ShoppingCart,
  Users, Image, Settings,
} from "lucide-react";
import { useSearch } from "./search-provider";

const adminNavItems = [
  { title: () => t`Nástěnka`, href: "/admin", icon: LayoutDashboard },
  { title: () => t`Produkty`, href: "/admin/produkty", icon: Package },
  { title: () => t`Stránky`, href: "/admin/stranky", icon: FileText },
  { title: () => t`Objednávky`, href: "/admin/objednavky", icon: ShoppingCart },
  { title: () => t`Média`, href: "/admin/media", icon: Image },
  { title: () => t`Uživatelé`, href: "/admin/users", icon: Users },
];

const customerNavItems = [
  { title: () => t`Nástěnka`, href: "/muj-ucet", icon: LayoutDashboard },
  { title: () => t`Knihovna`, href: "/muj-ucet/knihovna", icon: Package },
  { title: () => t`Objednávky`, href: "/muj-ucet/objednavky", icon: ShoppingCart },
  { title: () => t`Profil`, href: "/muj-ucet/profil", icon: Settings },
];

export function SearchCommand() {
  const { open, setOpen } = useSearch();
  const router = useRouter();

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t`Hledat...`} />
      <CommandList>
        <CommandEmpty>{t`Žádné výsledky.`}</CommandEmpty>
        <CommandGroup heading={t`Administrace`}>
          {adminNavItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => navigate(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title()}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t`Můj účet`}>
          {customerNavItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => navigate(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title()}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

**Step 3: Create SearchTrigger button**

```tsx
// apps/web/src/components/dashboard/search-trigger.tsx
"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@samofujera/ui";
import { t } from "@lingui/core/macro";
import { useSearch } from "./search-provider";

export function SearchTrigger() {
  const { setOpen } = useSearch();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  return (
    <Button
      variant="outline"
      className="relative h-8 w-40 justify-start rounded-md bg-muted/25 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent sm:pr-12 lg:w-52"
      onClick={() => setOpen(true)}
    >
      <Search className="mr-2 h-4 w-4" />
      <span>{t`Hledat...`}</span>
      <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium select-none sm:flex">
        <span className="text-xs">{isMac ? "⌘" : "Ctrl"}</span>K
      </kbd>
    </Button>
  );
}
```

**Step 4: Wire into Providers and Header**

Add `SearchProvider` to `apps/web/src/components/dashboard/Providers.tsx` and add `SearchCommand` + `SearchTrigger` to Header.

In `Providers.tsx`, wrap children with `<SearchProvider>`.

In `header.tsx`, add `<SearchTrigger />` after breadcrumbs and before the flex spacer.

**Step 5: Verify search opens with Cmd+K/Ctrl+K and navigates**

**Step 6: Commit**

```bash
git add apps/web/src/components/dashboard/search-*.tsx apps/web/src/components/dashboard/Providers.tsx apps/web/src/components/dashboard/header.tsx
git commit -m "feat(web): add cmd+k search command palette with navigation"
```

---

## Phase 3: DataTable Infrastructure

### Task 7: Create shared DataTable components

Port the shadcn-admin data-table pattern into our project. These are generic, reusable components.

**Files:**
- Create: `apps/web/src/components/data-table/data-table.tsx`
- Create: `apps/web/src/components/data-table/data-table-toolbar.tsx`
- Create: `apps/web/src/components/data-table/data-table-faceted-filter.tsx`
- Create: `apps/web/src/components/data-table/data-table-pagination.tsx`
- Create: `apps/web/src/components/data-table/data-table-column-header.tsx`
- Create: `apps/web/src/components/data-table/data-table-view-options.tsx`
- Create: `apps/web/src/components/data-table/index.ts`

**Step 1: Create DataTableColumnHeader**

Sortable column header with dropdown (Asc/Desc/Hide). See reference: `satnaing/shadcn-admin src/components/data-table/column-header.tsx`.

Key points:
- Generic `<TData, TValue>` typing
- If column can't sort, renders plain text
- Dropdown with sort asc, sort desc, hide column options
- Icons: `ArrowUp`, `ArrowDown`, `ChevronsUpDown`, `EyeOff` from lucide-react
- All dropdown labels through `t()` macro

**Step 2: Create DataTableFacetedFilter**

Multi-select faceted filter popover. See reference: `satnaing/shadcn-admin src/components/data-table/faceted-filter.tsx`.

Key points:
- Pill-style button with `⊕ {title}` showing selected count badges
- Popover with Command (cmdk) for searching options
- Multi-select with checkbox-style items
- Facet counts from `getFacetedUniqueValues()`
- "Clear filters" option at bottom
- All labels through `t()` macro

**Step 3: Create DataTableToolbar**

Toolbar with search input + faceted filters + view options. See reference: `satnaing/shadcn-admin src/components/data-table/toolbar.tsx`.

Key points:
- Props: `table`, `searchPlaceholder`, `searchKey` (column filter) or global filter, `filters` array
- Reset button when filters active
- Responsive: column-reverse on mobile

**Step 4: Create DataTablePagination**

Pagination with page numbers, rows-per-page selector. See reference: `satnaing/shadcn-admin src/components/data-table/pagination.tsx`.

Key points:
- Page number buttons with ellipsis
- Rows per page select (10, 20, 30, 40, 50)
- First/previous/next/last buttons
- "Page X of Y" text
- All labels through `t()` macro

Utility function needed: `getPageNumbers(currentPage, totalPages)` — returns array like `[1, 2, '...', 5, 6, 7, '...', 10]`.

**Step 5: Create DataTableViewOptions**

Column visibility toggle dropdown. See reference: `satnaing/shadcn-admin src/components/data-table/view-options.tsx`.

Key points:
- Hidden on mobile (`hidden lg:flex`)
- Dropdown with checkbox items for each hideable column
- Labels through `t()` macro

**Step 6: Create DataTable component**

The main generic DataTable that combines Table rendering with all the sub-components.

```tsx
// apps/web/src/components/data-table/data-table.tsx
"use client";

import { useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { t } from "@lingui/core/macro";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@samofujera/ui";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar, type FilterConfig } from "./data-table-toolbar";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  enableRowSelection?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  filters = [],
  enableRowSelection = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t`Žádné výsledky.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
```

**Step 7: Create barrel export**

```tsx
// apps/web/src/components/data-table/index.ts
export { DataTable } from "./data-table";
export { DataTableColumnHeader } from "./data-table-column-header";
export { DataTableToolbar, type FilterConfig } from "./data-table-toolbar";
export { DataTableFacetedFilter } from "./data-table-faceted-filter";
export { DataTablePagination } from "./data-table-pagination";
export { DataTableViewOptions } from "./data-table-view-options";
```

**Step 8: Verify typecheck**

```bash
pnpm turbo typecheck --filter=web
```

**Step 9: Commit**

```bash
git add apps/web/src/components/data-table/
git commit -m "feat(web): add generic data-table components with sorting, filtering, pagination"
```

---

## Phase 4: Admin Page Migrations

### Task 8: Migrate Products list page

Convert products list from raw `<table>` + `<select>` to DataTable + Dialog creation.

**Files:**
- Modify: `apps/web/src/components/admin/routes/products.tsx`
- Create: `apps/web/src/components/admin/products/products-columns.tsx`
- Create: `apps/web/src/components/admin/products/product-create-dialog.tsx`

**Step 1: Define column definitions**

Create `products-columns.tsx` with `ColumnDef<Product>[]`:
- Select column (checkbox)
- Title column (sortable, link to edit page)
- Type column (badge, faceted filter)
- Status column (badge with color variants, faceted filter)
- Price column
- Actions column (dropdown: edit, delete)

Use `DataTableColumnHeader` for sortable headers. Use `Badge` component for status/type. Use `DropdownMenu` for row actions.

**Step 2: Create ProductCreateDialog**

Dialog with react-hook-form + zod:
- Step 1: Select product type (radio group with product type cards)
- Step 2: Fill basic fields (title)
- On submit: calls `adminApi.createDraft(type)` and navigates to edit page

**Step 3: Rewrite ProductsPage**

Replace the entire component to use:
- `<PageHeader>` with title, subtitle, action buttons
- `<DataTable>` with columns, data from TanStack Query, faceted filters for status and type
- `<ProductCreateDialog>` triggered by "Nový produkt" button

The component should:
- Fetch products with `useQuery` (keep existing TanStack Query hook)
- Pass data to `<DataTable>` for client-side sorting/filtering
- Handle pagination (client-side via DataTable, since API already returns all items)

**Step 4: Verify products page renders correctly**

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/routes/products.tsx apps/web/src/components/admin/products/
git commit -m "feat(admin): migrate products list to data-table with dialog creation"
```

---

### Task 9: Migrate Product edit form

Convert product edit from raw inputs to react-hook-form + zod + shadcn Form components.

**Files:**
- Modify: `apps/web/src/components/admin/routes/product-edit.tsx`

**Step 1: Define zod schema for product form**

```tsx
const productSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  productType: z.enum(["PHYSICAL", "EBOOK", "AUDIO_VIDEO", ...]),
  prices: z.record(z.number().min(0)),
  // ... other fields based on current form
});
```

**Step 2: Rewrite form using shadcn Form components**

Replace raw inputs with:
- `<Form>` wrapper with `useForm({ resolver: zodResolver(productSchema) })`
- `<FormField>` + `<FormItem>` + `<FormLabel>` + `<FormControl>` + `<FormMessage>` for each field
- `<Select>` for status, type
- `<Textarea>` for description
- `<Input>` for title, slug, prices
- `<Checkbox>` for category selection

Keep existing TanStack Query mutations for save/publish.

**Step 3: Verify the form works (create, edit, save as draft, publish)**

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/routes/product-edit.tsx
git commit -m "feat(admin): migrate product edit form to react-hook-form + zod"
```

---

### Task 10: Migrate Categories list page

**Files:**
- Modify: `apps/web/src/components/admin/routes/category-list.tsx`
- Create: `apps/web/src/components/admin/categories/categories-columns.tsx`
- Create: `apps/web/src/components/admin/categories/category-create-dialog.tsx`

**Step 1: Define column definitions**

Columns: name (sortable), slug, product count, actions (edit, delete).

**Step 2: Create CategoryCreateDialog**

Dialog with: name, slug (auto-generated from name), description textarea.
Uses react-hook-form + zod.

**Step 3: Rewrite CategoryListPage with DataTable + Dialog**

Use `<PageHeader>` + `<DataTable>` + `<CategoryCreateDialog>`.
Keep drag-drop ordering functionality (dnd-kit) if it exists.

**Step 4: Commit**

```bash
git commit -m "feat(admin): migrate categories list to data-table with dialog creation"
```

---

### Task 11: Migrate Pages list page

**Files:**
- Modify: `apps/web/src/components/admin/routes/pages-list.tsx`
- Create: `apps/web/src/components/admin/pages/pages-columns.tsx`
- Create: `apps/web/src/components/admin/pages/page-create-sheet.tsx`

**Step 1: Define column definitions**

Columns: title (sortable), status badge, last updated (sortable), actions (edit, delete, view).

**Step 2: Create PageCreateSheet (right-side drawer)**

Uses shadcn `<Sheet>` component (not Dialog — this is the drawer pattern for visual-editor content):
- Title field
- Slug field (auto-generated)
- Status select
- On submit: creates page via API, navigates to visual editor

**Step 3: Rewrite PagesListPage with DataTable + Sheet**

Use `<PageHeader>` + `<DataTable>` + `<PageCreateSheet>`.
"Create" button opens the Sheet from the right side.

**Step 4: Commit**

```bash
git commit -m "feat(admin): migrate pages list to data-table with drawer creation"
```

---

### Task 12: Migrate Orders list page

**Files:**
- Modify: `apps/web/src/components/admin/routes/orders.tsx`
- Create: `apps/web/src/components/admin/orders/orders-columns.tsx`

**Step 1: Define column definitions**

Columns: order# (sortable), customer name, status badge (faceted filter), total price, date (sortable), actions (view detail).

**Step 2: Rewrite OrdersPage with DataTable**

No creation (orders aren't created in admin). Just DataTable with faceted filter on status.

**Step 3: Commit**

```bash
git commit -m "feat(admin): migrate orders list to data-table"
```

---

### Task 13: Migrate Order detail page

**Files:**
- Modify: `apps/web/src/components/admin/routes/order-detail.tsx`

**Step 1: Rewrite using Card components + Table for items**

- Order info section: `<Card>` with customer, status, dates
- Payment info section: `<Card>` with payment method, amount
- Order items section: shadcn `<Table>` (not DataTable — simple table, no sorting/filtering needed)

**Step 2: Commit**

```bash
git commit -m "feat(admin): migrate order detail to card + table components"
```

---

### Task 14: Migrate Media page

**Files:**
- Modify: `apps/web/src/components/admin/routes/media.tsx`
- Create: `apps/web/src/components/admin/media/media-grid-view.tsx`
- Create: `apps/web/src/components/admin/media/media-table-view.tsx`
- Create: `apps/web/src/components/admin/media/media-columns.tsx`

**Step 1: Create MediaGridView**

Card grid layout (like shadcn-admin Apps page):
- Responsive grid: `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Each card: thumbnail, filename, type badge, action button
- Selectable cards (checkbox overlay on hover)

**Step 2: Create MediaTableView**

DataTable view with columns: thumbnail (small), filename (sortable), type, size, date, actions.

**Step 3: Rewrite MediaPage with view toggle**

- `<PageHeader>` with upload button
- Filter bar: search input + type select
- View toggle button (grid/table icons)
- Conditional render: `<MediaGridView>` or `<MediaTableView>`
- Bulk action bar when items selected (delete, download)

**Step 4: Commit**

```bash
git commit -m "feat(admin): migrate media page to panel grid with table toggle"
```

---

### Task 15: Migrate Users list page

**Files:**
- Modify: `apps/web/src/components/admin/routes/users.tsx`
- Create: `apps/web/src/components/admin/users/users-columns.tsx`
- Create: `apps/web/src/components/admin/users/user-create-dialog.tsx`

**Step 1: Define column definitions**

Columns: name (sortable), email (sortable), role (icon + text, faceted filter), status badge (faceted filter), actions (edit, delete, block).

**Step 2: Create UserCreateDialog**

Dialog with react-hook-form + zod:
- Name, email, role select, password, confirm password
- Zod schema with password confirmation refinement

**Step 3: Rewrite UsersPage with DataTable + Dialog**

**Step 4: Commit**

```bash
git commit -m "feat(admin): migrate users list to data-table with dialog creation"
```

---

### Task 16: Migrate Admin dashboard

**Files:**
- Modify: `apps/web/src/components/admin/routes/dashboard.tsx`

**Step 1: Rewrite with Card components**

- Welcome card with admin name
- Stats cards grid (placeholder data for now — will be wired to real data later):
  - Total revenue card
  - Total orders card
  - Total products card
  - Active users card
- Each card uses `<Card>` + `<CardHeader>` + `<CardContent>` from shadcn/ui

**Step 2: Commit**

```bash
git commit -m "feat(admin): migrate dashboard to card components with stats placeholders"
```

---

## Phase 5: Customer Page Migrations

### Task 17: Create SettingsLayout component

Shared settings layout with left sidebar navigation + right content area.

**Files:**
- Create: `apps/web/src/components/customer/settings-layout.tsx`
- Create: `apps/web/src/components/customer/settings-nav.tsx`

**Step 1: Create SettingsNav sidebar**

```tsx
// apps/web/src/components/customer/settings-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@samofujera/ui/lib/utils";
import { Button } from "@samofujera/ui";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface SettingsNavProps {
  items: NavItem[];
}

export function SettingsNav({ items }: SettingsNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 lg:w-48">
      {items.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "secondary" : "ghost"}
          className="justify-start"
          asChild
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
```

**Step 2: Create SettingsLayout**

```tsx
// apps/web/src/components/customer/settings-layout.tsx
"use client";

import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Separator } from "@samofujera/ui";
import { User, Settings, Monitor, Trash2 } from "lucide-react";
import { SettingsNav } from "./settings-nav";

const settingsNavItems = [
  { title: () => t`Profil`, href: "/muj-ucet/profil", icon: User },
  { title: () => t`Nastavení účtu`, href: "/muj-ucet/nastaveni-uctu", icon: Settings },
  { title: () => t`Aktivní sezení`, href: "/muj-ucet/sezeni", icon: Monitor },
  { title: () => t`Smazat účet`, href: "/muj-ucet/smazat-ucet", icon: Trash2 },
];

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div>
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t`Nastavení`}</h2>
        <p className="text-muted-foreground">
          {t`Spravujte svůj účet a nastavení.`}
        </p>
      </div>
      <Separator className="my-4 lg:my-6" />
      <div className="flex flex-1 flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="lg:sticky lg:top-0 lg:w-48">
          <SettingsNav
            items={settingsNavItems.map((item) => ({
              ...item,
              title: item.title(),
            }))}
          />
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/customer/settings-layout.tsx apps/web/src/components/customer/settings-nav.tsx
git commit -m "feat(customer): add settings layout with sidebar navigation"
```

---

### Task 18: Migrate Customer profile page

**Files:**
- Modify: `apps/web/src/components/customer/routes/profile.tsx`

**Step 1: Wrap with SettingsLayout and use Form components**

- Wrap content in `<SettingsLayout>`
- Replace raw form with react-hook-form + zod
- Use `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>`
- Fields: name, email (readonly), bio, avatar

**Step 2: Commit**

```bash
git commit -m "feat(customer): migrate profile page to settings layout with form components"
```

---

### Task 19: Migrate Customer sessions page

**Files:**
- Modify: `apps/web/src/components/customer/routes/sessions.tsx`

**Step 1: Wrap with SettingsLayout, use Card for session items**

- Each session as a `<Card>` with device info, IP, last active, revoke button
- Current session highlighted

**Step 2: Commit**

```bash
git commit -m "feat(customer): migrate sessions page to settings layout with cards"
```

---

### Task 20: Migrate Customer delete account page

**Files:**
- Modify: `apps/web/src/components/customer/routes/delete-account.tsx`

**Step 1: Wrap with SettingsLayout**

- Keep existing AlertDialog confirmation
- Use proper Card component for the warning section

**Step 2: Commit**

```bash
git commit -m "feat(customer): migrate delete account page to settings layout"
```

---

### Task 21: Migrate Customer orders page

**Files:**
- Modify: `apps/web/src/components/customer/routes/orders.tsx`
- Create: `apps/web/src/components/customer/orders/customer-orders-columns.tsx`

**Step 1: Define column definitions**

Columns: order# (sortable), date (sortable), status badge, total, actions (view detail).

**Step 2: Rewrite with DataTable**

Read-only DataTable (no creation). Status faceted filter.

**Step 3: Commit**

```bash
git commit -m "feat(customer): migrate orders page to data-table"
```

---

### Task 22: Migrate Customer order detail page

**Files:**
- Modify: `apps/web/src/components/customer/routes/order-detail.tsx`

**Step 1: Rewrite with Card + Table**

Same pattern as admin order detail (Task 13) but read-only, simpler layout.

**Step 2: Commit**

```bash
git commit -m "feat(customer): migrate order detail to card + table components"
```

---

### Task 23: Polish Customer dashboard and library

**Files:**
- Modify: `apps/web/src/components/customer/routes/dashboard.tsx`
- Modify: `apps/web/src/components/customer/routes/library.tsx`
- Modify: `apps/web/src/components/customer/routes/library-product.tsx`

**Step 1: Dashboard — use Card components**

Welcome card, quick links section using Cards.

**Step 2: Library — verify Card grid is using shadcn Card correctly**

Polish Badge usage in library-product.

**Step 3: Commit**

```bash
git commit -m "feat(customer): polish dashboard and library with shadcn components"
```

---

## Phase 6: Update sidebar navigation and E2E tests

### Task 24: Update sidebar nav for new routes

If any routes changed (e.g., customer settings sections), update:
- `apps/web/src/components/dashboard/sidebar-data.ts`
- `apps/web/src/components/dashboard/customer-sidebar-data.ts`

**Step 1: Verify all nav items point to correct routes**

**Step 2: Update customer nav to reflect settings layout sections**

**Step 3: Commit**

```bash
git commit -m "feat(web): update sidebar navigation for new route structure"
```

---

### Task 25: Update E2E tests for new UI patterns

**Files:**
- Modify: `e2e/tests/admin-products.spec.ts`
- Modify: `e2e/tests/admin-orders.spec.ts`
- Modify: `e2e/tests/auth-flow.spec.ts`
- Modify: `e2e/tests/catalog.spec.ts`
- Modify: `e2e/tests/customer-library.spec.ts`

**Step 1: Update selectors for new components**

DataTable, Dialog, Sheet, Badge, Form components may have different DOM structure.
Update selectors to match new shadcn/ui component structure.

**Step 2: Run all E2E tests**

```bash
cd e2e && npx playwright test
```

CRITICAL: Actually run the tests against a running backend + frontend. Docker must be running. Start backend and frontend dev servers before running tests. Verify all tests pass.

**Step 3: Fix any failing tests**

**Step 4: Commit**

```bash
git commit -m "test(e2e): update e2e tests for shadcn-admin content migration"
```

---

## Phase 7: Typecheck, lint, final verification

### Task 26: Run full typecheck and lint

**Step 1: Run typecheck**

```bash
pnpm turbo typecheck
```

**Step 2: Run lint**

```bash
pnpm turbo lint
```

**Step 3: Fix any errors**

**Step 4: Extract i18n catalogs**

```bash
cd apps/web && pnpm lingui:extract
```

Verify all new strings are in catalogs.

**Step 5: Commit any fixes**

```bash
git commit -m "fix(web): fix typecheck and lint errors from content migration"
```
