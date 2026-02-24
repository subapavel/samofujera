# Product Listing CMS Block — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan.

**Goal:** Add a "Výpis produktů" content block type to the CMS page editor, allowing product listings to be embedded on any CMS page. Replace the fixed `/katalog` route with this flexible approach.

**Context:** The editor currently supports 4 block types: text, image, separator, button. This adds a 5th block type for product listings with configurable layout, category filtering, and two selection modes.

---

## Block Data Model

```typescript
interface ProductsBlock extends BlockBase {
  type: "products";
  // Selection mode
  mode: "category" | "manual";        // dynamic by category OR hand-picked
  categoryId: string | null;           // for mode=category (null = all products)
  productIds: string[];                // for mode=manual (ordered list)
  // Layout
  appearance: "default" | "large-photo" | "slider" | "carousel";
  columns: 3 | 4 | 5;                 // grid column count
  showCategoryFilter: boolean;         // sidebar category filter
}
```

**Defaults:** `mode: "category"`, `categoryId: null`, `appearance: "default"`, `columns: 4`, `showCategoryFilter: true`.

---

## Editor UX

### Insert Flow

1. Click "+" pin on block edge -> "Přidat obsah" picker shows "Výpis produktů" with grid icon
2. Dialog opens: "Vložit výpis produktů" with two modes:
   - **"Z kategorie"** — dropdown: Všechny produkty + list of existing categories
   - **"Ruční výběr"** — multi-select product picker with search + checkboxes
3. Click OK -> block inserted with chosen config and default layout

### Editor Toolbar

Dark floating toolbar (same pattern as image/button blocks), positioned above the block:

**Main level:**
- **"Přidat produkt"** — opens `/admin/produkty/novy` in new tab
- **"Správa produktů"** — opens `/admin/produkty` in new tab
- **"Rozložení"** — expands sub-toolbar (see below)
- Delete icon
- More menu (copy)

**"Rozložení" sub-toolbar:**
- **Vzhled** dropdown: Výchozí, Velká fotka, Slider, Karusel
- **Počet sloupců** dropdown: 3 sloupce, 4 sloupce, 5 sloupců
- **Zobrazit produkty** dropdown: Všechny produkty + list of categories (changes `categoryId` / product selection)
- **Filtr** toggle: show/hide category sidebar

### In-Editor Preview

The block fetches products from the API and renders a live preview using the same shared CSS as the public view. Shows thumbnail + title + price in the configured grid layout, with category sidebar if enabled.

---

## Public View Rendering

### Product Card

Each product card displays:
- Thumbnail image (from product gallery)
- Product title
- Price (formatted Czech locale, e.g. "1 250,00 Kč")
- Entire card links to `/produkty/[slug]`

### Layout Options

**4 appearance modes:**
- **Výchozí (default)** — standard grid with equal-size square thumbnails, title + price below
- **Velká fotka** — larger thumbnails with taller aspect ratio, title + price below
- **Slider** — horizontal scrollable single row, left/right navigation arrows
- **Karusel** — auto-rotating display with dot indicators, shows `columns` items at a time

**Category sidebar** (when `showCategoryFilter: true`):
- Left sidebar with category list
- "Všechny produkty" at the top
- Clickable to filter products client-side
- Sidebar collapses on mobile

### Responsive Behavior

- Desktop: configured column count (3/4/5)
- Tablet (~56em): max 3 columns
- Mobile (~37.5em): 1-2 columns (slider/carousel stay single-row)

### Data Fetching

- `mode: "category"` -> `GET /api/catalog/products?categoryId=X` (or all if null)
- `mode: "manual"` -> `GET /api/catalog/products?ids=a,b,c` (new query param, preserves order)
- Category sidebar: `GET /api/catalog/categories`
- Category filter in sidebar: client-side filtering (no additional API call)

---

## Backend Changes

**Minimal — one change to existing API:**

- `GET /api/catalog/products`: add optional `ids` query parameter (comma-separated UUIDs). When present, returns only those products in the specified order. Used by `mode: "manual"` blocks.

No new database tables or migrations needed.

---

## Route Changes

**Remove:**
- `/katalog` — fixed catalog listing page (replaced by CMS block)
- `/katalog/[slug]` — product detail under katalog (replaced by `/produkty/[slug]`)

**Add:**
- `/produkty/[slug]` — dedicated product detail page with:
  - Product info, gallery, pricing, description
  - Dynamic breadcrumb back to referring page (via query param `?from=slug`)
  - SEO metadata from product data

---

## File Changes

### New Files

- `apps/web/src/components/admin/editor/blocks/ProductsBlockEditor.tsx` — editor component with toolbar
- `apps/web/src/components/admin/editor/blocks/ProductsInsertDialog.tsx` — insert dialog (category/manual selection)
- `apps/web/src/components/page-renderer/ProductsBlockRenderer.tsx` — public view renderer
- `apps/web/src/app/(public)/produkty/[slug]/page.tsx` — product detail page

### Modified Files

- `apps/web/src/components/admin/editor/types.ts` — add `ProductsBlock` type to union
- `apps/web/src/components/admin/editor/plugins/ElementPickerPopover.tsx` — add "Výpis produktů" option
- `apps/web/src/components/admin/editor/SectionList.tsx` — add block creation factory case + render case
- `apps/web/src/components/page-renderer/PageRenderer.tsx` — add products block rendering case
- `apps/web/src/styles/global.css` — add shared CSS for product grid, cards, sidebar, appearances
- `apps/backend/.../CatalogController.java` — add `ids` query parameter support
- `apps/backend/.../CatalogService.java` — add `findByIds` method
- `apps/backend/.../ProductRepository.java` — add `findByIds` query

### Removed Files/Routes

- `apps/web/src/app/(public)/katalog/` — entire directory
- `apps/web/src/app/(public)/katalog/[slug]/` — entire directory

---

## CSS Strategy

All product grid styles defined as shared CSS classes in `global.css` (per CLAUDE.md rule #1 — editor and public view MUST use identical CSS):

- `.products-block` — block container with spacing
- `.products-grid` — CSS grid with responsive column count
- `.products-sidebar` — category filter sidebar
- `.product-card` — individual card styling (thumbnail + title + price)
- `.products-slider` — horizontal scroll container
- `.products-carousel` — auto-rotating container with indicators
- `.appearance-default`, `.appearance-large-photo` — appearance-specific overrides

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| CMS block instead of fixed route | Flexibility — products can appear on any page, multiple pages, with any surrounding content |
| Fixed `/produkty/[slug]` for detail | Stable SEO URLs, no dependency on CMS page slugs, avoids routing complexity |
| Two selection modes (category + manual) | Category mode for dynamic listings, manual mode for curated selections (e.g. homepage featured products) |
| Client-side category filtering | Products already fetched, avoid extra API calls for sidebar filter clicks |
| No new migrations | Product and category data already fully modeled |
| `ids` query param for manual mode | Simple addition to existing API, preserves admin-defined order |
