# Admin & Customer Content Migration to shadcn-admin Patterns

## Goal

Migrate all admin and customer page content from raw HTML/Tailwind styling to
proper shadcn/ui components, matching the shadcn-admin template patterns. The
sidebar/header layout was already migrated — this covers the **page content**:
tables, forms, filters, badges, cards, creation flows, and the header bar.

## Architecture

Component-first approach: build reusable shared components (DataTable,
SearchCommand, Breadcrumbs, PageHeader, Settings Layout), then migrate each
page using the appropriate pattern. All forms use react-hook-form + zod for
validation. All strings through Lingui i18n.

## Reference

- Template: [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)
- Screenshots saved by user showing target UI patterns

---

## 4 Page Layout Patterns

### Pattern A: Settings Layout

**Used for:** Customer settings (profile, account, sessions, delete account)

Left sidebar with section navigation + right content area with form fields.
The sidebar lists settings sections with icons. Clicking a section loads its
content in the right panel. Uses URL-based navigation (each section is a
separate route).

```
+------------+------------------------------+
| > Profile  |  Profile                     |
|   Account  |  This is how others see you  |
|   Sessions |                              |
|   Delete   |  [Form fields...]            |
+------------+------------------------------+
```

### Pattern B: DataTable + Drawer (Sheet)

**Used for:** Pages, Articles (future) — content that uses the visual editor

DataTable list with faceted filters, sorting, checkboxes, row actions. The
"Create" button opens a right-side Sheet (shadcn Sheet component) with a
creation form. After creation, navigates to the visual editor for full editing.

```
+------------------------------------------+-----------+
| Pages                        [Create +]  | Create    |
| Filter... [+ Status]          [View]     | Page      |
|                                          |           |
| [x] Title     Status   Updated   ...    | Title:    |
| [ ] Homepage  Published 2h ago   ...    | [______]  |
| [ ] About     Draft    1d ago    ...    | Status:   |
|                                          | [Select]  |
+------------------------------------------+-----------+
```

### Pattern C: DataTable + Dialog (Popup)

**Used for:** Products, Users, Categories, Orders (view only)

DataTable list with same features. The "Create" / "Add" button opens a
centered Dialog with a creation form. For products, the dialog first shows
type selection, then fields. Edit navigates to a full edit page.

```
+------------------------------------------+
| Products                    [New Product] |
| Filter... [+ Status] [+ Type]  [View]    |
|                                           |
| [x] Title    Type   Status  Price  ...   |
|     +-------------------------------+    |
|     | Create Product                |    |
|     | Select type, fill fields...   |    |
|     | [Save] [Cancel]               |    |
|     +-------------------------------+    |
+------------------------------------------+
```

### Pattern D: Panel Grid + Table Toggle

**Used for:** Media library

Default view: card grid with thumbnails (like Apps in shadcn-admin). Toggle
button switches to table view. Filters: text search + type select. Bulk
selection with group actions toolbar (appears when items are selected).

```
+------------------------------------------+
| Media                        [Upload]    |
| Filter... [All Types v]    [Grid|Table]  |
|                                           |
| +--------+ +--------+ +--------+        |
| | [img]  | | [img]  | | [img]  |        |
| | file.  | | photo. | | doc.   |        |
| +--------+ +--------+ +--------+        |
+------------------------------------------+
```

---

## Page Assignments

### Admin Pages

| Route | Pattern | Create Method | Key Columns / Content |
|-------|---------|---------------|-----------------------|
| `/admin` | Custom dashboard | — | Stats cards, welcome, overview (future charts) |
| `/admin/produkty` | C: DataTable + Dialog | Dialog: type select + fields | title, type badge, status badge, price, actions |
| `/admin/produkty/[id]` | Full form page | — | react-hook-form + zod, all product fields |
| `/admin/produkty/kategorie` | C: DataTable + Dialog | Dialog: name, slug, desc | name, slug, product count, actions, drag-drop ordering |
| `/admin/stranky` | B: DataTable + Drawer | Drawer: title, slug, status | title, status badge, last updated, actions |
| `/admin/objednavky` | C: DataTable (read-only) | — (not created in admin) | order#, customer, status badge, total, date, actions |
| `/admin/objednavky/[id]` | Detail page with Cards | — | Order info cards + items table |
| `/admin/media` | D: Panel Grid + Table | Upload button | Grid: thumbnail + name; Table: name, type, size, date |
| `/admin/users` | C: DataTable + Dialog | Dialog: name, email, role, password | name, email, role icon, status badge, actions |

### Customer Pages

| Route | Pattern | Notes |
|-------|---------|-------|
| `/muj-ucet` | Custom dashboard | Welcome, quick links |
| `/muj-ucet/knihovna` | Card grid | Already mostly correct, polish with shadcn Card |
| `/muj-ucet/objednavky` | C: DataTable (read-only) | order#, date, status badge, total |
| `/muj-ucet/profil` | A: Settings Layout | Profile section |
| `/muj-ucet/nastaveni-uctu` | A: Settings Layout | Account section |
| `/muj-ucet/sezeni` | A: Settings Layout | Active sessions section |
| `/muj-ucet/smazat-ucet` | A: Settings Layout | Delete account section |

---

## Header Updates

The top header bar (all dashboard pages) will include:

```
[Sidebar Toggle] [Breadcrumbs: Admin > Products > Edit] --- [Search (Cmd+K/Ctrl+K)] [Theme Switch]
```

- **Breadcrumbs**: auto-generated from pathname, Czech labels via i18n
- **Search**: opens Command palette (cmdk) — search pages, products, orders, users
- **User avatar stays in sidebar footer** (not moved to header)
- OS-aware shortcut display: `Cmd+K` on macOS, `Ctrl+K` on Windows/Linux

---

## Shared Components to Build

### 1. PageHeader
```tsx
<PageHeader title="Produkty" subtitle="Spravujte produkty a jejich ceny.">
  <Button>Novy produkt</Button>
</PageHeader>
```
Renders consistent page title + subtitle + action buttons area.

### 2. DataTable
Built on `@tanstack/react-table` + shadcn Table:
- Generic `<DataTable columns={} data={} />` component
- `<DataTableToolbar>` — search input + faceted filter buttons + view options
- `<DataTableFacetedFilter>` — pill button that opens popover with multi-select
- `<DataTablePagination>` — page controls with rows-per-page select
- `<DataTableColumnHeader>` — sortable column headers
- `<DataTableRowActions>` — `...` dropdown per row
- `<DataTableViewOptions>` — column visibility toggle
- Server-side pagination support (API already returns paginated responses)

### 3. SearchCommand
- `<SearchCommand />` — global Cmd+K/Ctrl+K command palette
- Sections: Navigation, Products, Orders, Users
- Uses shadcn Command (cmdk)
- API-backed search with debounce

### 4. Breadcrumbs
- `<DashboardBreadcrumbs />` — auto-generates from `usePathname()`
- Translates route segments to Czech via i18n lookup table
- Links to parent routes

### 5. SettingsLayout
- `<SettingsLayout items={settingsNav}>{children}</SettingsLayout>`
- Left sidebar nav + right content area
- Active item highlighted based on current pathname

---

## Form Architecture

All forms use **react-hook-form + zod + shadcn Form**:

```tsx
const schema = z.object({
  title: z.string().min(1, t`Nazev je povinny`),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

const form = useForm({ resolver: zodResolver(schema) });

<Form {...form}>
  <FormField name="title" render={({ field }) => (
    <FormItem>
      <FormLabel>{t`Nazev`}</FormLabel>
      <FormControl><Input {...field} /></FormControl>
      <FormMessage />
    </FormItem>
  )} />
</Form>
```

---

## New Dependencies

### npm packages (pnpm add)
- `@tanstack/react-table` — table logic
- `react-hook-form` — form state
- `@hookform/resolvers` — zod resolver
- `zod` — schema validation

### shadcn/ui components to add (packages/ui)
- `table` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- `badge` — Badge with variants
- `command` — Command palette (cmdk)
- `breadcrumb` — Breadcrumb navigation
- `textarea` — Textarea input
- `select` — Select dropdown
- `sheet` — Right-side drawer
- `checkbox` — Row selection
- `radio-group` — Form radio options
- `form` — Form wrappers for react-hook-form
- `pagination` — Pagination controls

---

## What Stays the Same

- Sidebar navigation structure (already migrated)
- Brand header in sidebar
- User avatar in sidebar footer
- ThemeSwitch component
- Auth guard and session management
- Lexical page editor (entry point changes — opened from drawer)
- API client and TanStack Query hooks
- Dark mode CSS variables
