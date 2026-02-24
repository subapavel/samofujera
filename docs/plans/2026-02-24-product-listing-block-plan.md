# Product Listing CMS Block — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Výpis produktů" content block to the CMS page editor, replacing the fixed `/katalog` route with a flexible block embeddable in any CMS page.

**Architecture:** New `ProductsBlock` type added to the existing block system (types.ts → ElementPicker → SectionList → PageRenderer). Backend gets one new query param (`ids`) on the existing catalog endpoint. Frontend gets a new `/produkty/[slug]` route for product detail. Old `/katalog` routes removed.

**Tech Stack:** React 19, Next.js 16, TanStack Query, Tailwind 4, Spring Boot 4, JOOQ

**Design doc:** `docs/plans/2026-02-24-product-listing-block-design.md`

---

## Task 1: Add ProductsBlock type and factory

**Files:**
- Modify: `apps/web/src/components/admin/editor/types.ts`

**Step 1: Add type aliases and interface**

After the `ButtonAlignment` type alias (line 8), add:

```typescript
export type ProductsAppearance = "default" | "large-photo" | "slider" | "carousel";
export type ProductsColumns = 3 | 4 | 5;
```

After `ButtonBlock` interface (line 44), add:

```typescript
export interface ProductsBlock extends BlockBase {
  type: "products";
  mode: "category" | "manual";
  categoryId: string | null;
  productIds: string[];
  appearance: ProductsAppearance;
  columns: ProductsColumns;
  showCategoryFilter: boolean;
}
```

**Step 2: Update ContentBlock union**

Change line 46:
```typescript
export type ContentBlock = TextBlock | ImageBlock | SeparatorBlock | ButtonBlock | ProductsBlock;
```

**Step 3: Add factory function**

After `createButtonBlock()`, add:

```typescript
export function createProductsBlock(): ProductsBlock {
  return {
    id: crypto.randomUUID(),
    type: "products",
    mode: "category",
    categoryId: null,
    productIds: [],
    appearance: "default",
    columns: 4,
    showCategoryFilter: true,
  };
}
```

**Step 4: Run typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: PASS (no other files reference the new type yet)

**Step 5: Commit**

```
feat(web): add products block type and factory to editor types
```

---

## Task 2: Add "Výpis produktů" to ElementPicker and SectionList

**Files:**
- Modify: `apps/web/src/components/admin/editor/plugins/ElementPickerPopover.tsx`
- Modify: `apps/web/src/components/admin/editor/SectionList.tsx`

**Step 1: Update ElementPickerPopover**

In `ElementPickerPopover.tsx`:

Add import:
```typescript
import { LayoutGrid } from "lucide-react";
```

Update `ElementType`:
```typescript
export type ElementType = "paragraph" | "image" | "separator" | "button" | "products";
```

Add to `ELEMENT_OPTIONS` array:
```typescript
{ type: "products", label: "Výpis produktů", icon: LayoutGrid },
```

**Step 2: Update SectionList**

In `SectionList.tsx`:

Add import of `createProductsBlock`:
```typescript
import {
  createDefaultSection,
  createTextBlock,
  createImageBlock,
  createSeparatorBlock,
  createButtonBlock,
  createProductsBlock,
} from "./types";
```

Add import of `ProductsBlockEditor`:
```typescript
import {
  BlockWrapper,
  TextBlockEditor,
  ImageBlockEditor,
  SeparatorBlockEditor,
  ButtonBlockEditor,
  ProductsBlockEditor,
} from "./blocks";
```

Add case in `createBlockFromType`:
```typescript
case "products":
  return createProductsBlock();
```

Add render case in the block map (after the `button` block render, before `</>`) :
```typescript
{block.type === "products" && (
  <ProductsBlockEditor
    block={block}
    onChange={(updated) => handleBlockChange(sectionIndex, blockIndex, updated)}
    onDelete={requestDelete}
    onCopy={() => handleCopyBlock(sectionIndex, blockIndex)}
    onActiveChange={(active) => {
      if (active) setActiveBlockId(block.id);
      else if (activeBlockId === block.id) setActiveBlockId(null);
    }}
  />
)}
```

**Step 3: Create stub ProductsBlockEditor**

Create `apps/web/src/components/admin/editor/blocks/ProductsBlockEditor.tsx`:

```typescript
"use client";

import type { ProductsBlock } from "../types";

interface ProductsBlockEditorProps {
  block: ProductsBlock;
  onChange: (block: ProductsBlock) => void;
  onDelete: () => void;
  onCopy: () => void;
  onActiveChange?: (active: boolean) => void;
}

export function ProductsBlockEditor({ block }: ProductsBlockEditorProps) {
  return (
    <div className="products-block">
      <div className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
        Výpis produktů (placeholder)
      </div>
    </div>
  );
}
```

**Step 4: Update barrel export**

In `apps/web/src/components/admin/editor/blocks/index.ts`, add:

```typescript
export { ProductsBlockEditor } from "./ProductsBlockEditor";
```

**Step 5: Run typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```
feat(web): add products block to element picker and section list
```

---

## Task 3: Add `ids` query param to backend catalog API

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogController.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductRepository.java`

**Step 1: Write the failing test**

Create: `apps/backend/src/test/java/cz/samofujera/catalog/CatalogProductsByIdsTest.java`

```java
package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static cz.samofujera.jooq.Tables.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CatalogProductsByIdsTest {

    @Autowired MockMvc mockMvc;
    @Autowired DSLContext dsl;

    private UUID product1Id;
    private UUID product2Id;
    private UUID product3Id;

    @BeforeEach
    void setUp() {
        // Clean test products
        dsl.deleteFrom(PRODUCT_PRICES).execute();
        dsl.deleteFrom(PRODUCTS).where(PRODUCTS.SLUG.like("test-ids-%")).execute();

        product1Id = createProduct("test-ids-a", "Product A");
        product2Id = createProduct("test-ids-b", "Product B");
        product3Id = createProduct("test-ids-c", "Product C");
    }

    private UUID createProduct(String slug, String title) {
        var id = UUID.randomUUID();
        dsl.insertInto(PRODUCTS)
            .set(PRODUCTS.ID, id)
            .set(PRODUCTS.TITLE, title)
            .set(PRODUCTS.SLUG, slug)
            .set(PRODUCTS.PRODUCT_TYPE, "EBOOK")
            .set(PRODUCTS.STATUS, "ACTIVE")
            .execute();
        dsl.insertInto(PRODUCT_PRICES)
            .set(PRODUCT_PRICES.PRODUCT_ID, id)
            .set(PRODUCT_PRICES.CURRENCY, "CZK")
            .set(PRODUCT_PRICES.AMOUNT, java.math.BigDecimal.valueOf(100))
            .execute();
        return id;
    }

    @Test
    void getProducts_withIds_returnsOnlyRequestedProducts() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                .param("ids", product1Id + "," + product3Id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalItems").value(2))
            .andExpect(jsonPath("$.data.items.length()").value(2));
    }

    @Test
    void getProducts_withIds_preservesOrder() throws Exception {
        // Request in reverse order: C, A
        mockMvc.perform(get("/api/catalog/products")
                .param("ids", product3Id + "," + product1Id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[0].slug").value("test-ids-c"))
            .andExpect(jsonPath("$.data.items[1].slug").value("test-ids-a"));
    }

    @Test
    void getProducts_withoutIds_returnsNormally() throws Exception {
        mockMvc.perform(get("/api/catalog/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray());
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && mvn test -pl . -Dtest=CatalogProductsByIdsTest`
Expected: FAIL — no `ids` param supported

**Step 3: Add `ids` param to CatalogController**

In `CatalogController.java`, update the `getProducts` method:

```java
@GetMapping("/products")
public ResponseEntity<ApiResponse<CatalogDtos.ProductListResponse>> getProducts(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String ids) {
    if (ids != null && !ids.isBlank()) {
        var idList = java.util.Arrays.stream(ids.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(java.util.UUID::fromString)
            .toList();
        var result = catalogService.getProductsByIds(idList);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
    var result = catalogService.getProducts("ACTIVE", category, type, search, page, limit);
    return ResponseEntity.ok(ApiResponse.ok(result));
}
```

**Step 4: Add `getProductsByIds` to CatalogService**

```java
public CatalogDtos.ProductListResponse getProductsByIds(List<UUID> ids) {
    var items = productRepository.findByIds(ids);
    var productIds = items.stream().map(ProductRepository.ProductRow::id).toList();
    var pricesMap = productPriceRepository.findByProductIds(productIds);
    var categoriesMap = assignmentRepository.findCategoriesForProducts(productIds);

    // Preserve requested order
    var rowMap = new java.util.LinkedHashMap<UUID, ProductRepository.ProductRow>();
    for (var item : items) rowMap.put(item.id(), item);

    var responses = ids.stream()
        .filter(rowMap::containsKey)
        .map(id -> {
            var p = rowMap.get(id);
            var cats = categoriesMap.getOrDefault(p.id(), List.of()).stream()
                .map(c -> new CatalogDtos.CategorySummary(c.id(), c.name(), c.slug()))
                .toList();
            return toProductResponse(p, pricesMap.getOrDefault(p.id(), Map.of()), cats);
        })
        .toList();
    return new CatalogDtos.ProductListResponse(responses, 1, responses.size(), responses.size(), 1);
}
```

**Step 5: Add `findByIds` to ProductRepository**

```java
public List<ProductRow> findByIds(List<UUID> ids) {
    if (ids == null || ids.isEmpty()) return List.of();
    return dsl.selectFrom(PRODUCTS)
        .where(PRODUCTS.ID.in(ids))
        .and(PRODUCTS.STATUS.eq("ACTIVE"))
        .fetch(r -> new ProductRow(
            r.getId(), r.getTitle(), r.getSlug(), r.getDescription(),
            r.getShortDescription(), r.getProductType(), r.getStatus(),
            r.getThumbnailUrl(), r.getMetaTitle(), r.getMetaDescription(),
            r.getCreatedAt(), r.getUpdatedAt()
        ));
}
```

**Step 6: Run test to verify it passes**

Run: `cd apps/backend && mvn test -pl . -Dtest=CatalogProductsByIdsTest`
Expected: PASS

**Step 7: Run all backend tests**

Run: `cd apps/backend && mvn test`
Expected: PASS

**Step 8: Commit**

```
feat(backend): add ids query param to catalog products endpoint
```

---

## Task 4: Update frontend API client for `ids` param

**Files:**
- Modify: `packages/api-client/src/catalog.ts`

**Step 1: Add `ids` param support**

Update `getProducts` params type:

```typescript
getProducts: (params?: {
  page?: number;
  limit?: number;
  category?: string;
  type?: string;
  search?: string;
  ids?: string[];
}) => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.ids?.length) searchParams.set("ids", params.ids.join(","));
  const qs = searchParams.toString();
  return apiFetch<ApiResponse<ProductListResponse>>(
    `/api/catalog/products${qs ? `?${qs}` : ""}`,
  );
},
```

**Step 2: Run typecheck**

Run: `pnpm turbo typecheck`
Expected: PASS

**Step 3: Commit**

```
feat(api-client): add ids param to catalog products endpoint
```

---

## Task 5: Add shared CSS for product grid in global.css

**Files:**
- Modify: `apps/web/src/styles/global.css`

**Step 1: Add product block CSS**

Add at the end of global.css (before any closing brackets), following the existing breakpoint pattern (37.5em, 56.25em):

```css
/* ── Product listing block ── */

.products-block {
  padding-top: 1.25rem;
  padding-bottom: 1.25rem;
}

.products-layout {
  display: flex;
  gap: 2rem;
}

.products-sidebar {
  flex-shrink: 0;
  width: 12rem;
}

.products-sidebar-title {
  font-family: var(--font-decorative);
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 0.75rem;
  color: #000;
}

.products-sidebar-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.products-sidebar-item {
  padding: 0.25rem 0;
}

.products-sidebar-link {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 200;
  color: #000;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}

.products-sidebar-link:hover,
.products-sidebar-link-active {
  color: #065d4d;
  font-weight: 400;
}

.products-grid {
  flex: 1;
  display: grid;
  gap: 1.5rem;
}

.products-grid-3 { grid-template-columns: repeat(3, 1fr); }
.products-grid-4 { grid-template-columns: repeat(4, 1fr); }
.products-grid-5 { grid-template-columns: repeat(5, 1fr); }

.product-card {
  display: block;
  text-decoration: none;
  color: inherit;
  text-align: center;
}

.product-card-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.product-card-image-large {
  aspect-ratio: 3/4;
}

.product-card-title {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 300;
  margin-top: 0.75rem;
  line-height: 1.4;
  color: #000;
}

.product-card-price {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 200;
  margin-top: 0.25rem;
  color: #000;
}

/* Slider appearance */
.products-slider {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.products-slider::-webkit-scrollbar { display: none; }

.products-slider .product-card {
  flex-shrink: 0;
  scroll-snap-align: start;
}

.products-slider-3 .product-card { width: calc(33.333% - 1rem); }
.products-slider-4 .product-card { width: calc(25% - 1.125rem); }
.products-slider-5 .product-card { width: calc(20% - 1.2rem); }

/* Carousel appearance */
.products-carousel {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.products-carousel-track {
  display: flex;
  gap: 1.5rem;
  transition: transform 0.5s ease;
}

.products-carousel-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.products-carousel-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #d1d5db;
  border: none;
  padding: 0;
  cursor: pointer;
}

.products-carousel-dot-active {
  background: #065d4d;
}

/* Slider/Carousel nav arrows */
.products-nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  border: 1px solid #d1d5db;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.products-nav-arrow:hover { background: #fff; }
.products-nav-prev { left: -1rem; }
.products-nav-next { right: -1rem; }

/* Responsive */
@media (max-width: 56.25em) {
  .products-grid-4 { grid-template-columns: repeat(3, 1fr); }
  .products-grid-5 { grid-template-columns: repeat(3, 1fr); }
  .products-sidebar { width: 10rem; }
}

@media (max-width: 37.5em) {
  .products-layout { flex-direction: column; gap: 1rem; }
  .products-sidebar { width: 100%; }
  .products-sidebar-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .products-grid-3,
  .products-grid-4,
  .products-grid-5 { grid-template-columns: repeat(2, 1fr); }
  .products-slider-3 .product-card,
  .products-slider-4 .product-card,
  .products-slider-5 .product-card { width: calc(50% - 0.75rem); }
}
```

**Step 2: Run lint**

Run: `pnpm turbo lint`
Expected: PASS

**Step 3: Commit**

```
feat(web): add shared css for product listing block
```

---

## Task 6: Implement ProductsBlockEditor with insert dialog and toolbar

**Files:**
- Rewrite: `apps/web/src/components/admin/editor/blocks/ProductsBlockEditor.tsx`

This is the main editor component. It should:
1. Show an insert dialog on first add (when `productIds` is empty and `categoryId` is null and block was just created)
2. Show live product preview using the shared CSS
3. Show the floating toolbar when selected (Přidat produkt | Správa produktů | Rozložení)
4. The Rozložení sub-toolbar with Vzhled, Počet sloupců, Zobrazit produkty, Filtr dropdowns

**Step 1: Implement the component**

The component fetches products from the catalog API based on block config and renders a live preview. It follows the exact same toolbar pattern as `ButtonBlockEditor` (dark floating bar, dropdowns, click-outside).

Key implementation details:
- Use `catalogApi.getProducts()` and `catalogApi.getCategories()` for data
- Insert dialog: two tabs — "Z kategorie" (category dropdown) and "Ruční výběr" (product multi-select with search)
- Toolbar matches existing pattern: `absolute left-1/2 -translate-x-1/2 z-50 rounded-lg bg-gray-800 px-1 py-1.5 shadow-lg`
- Arrow pointer: `border-x-[6px] border-t-[6px] border-x-transparent border-t-gray-800`
- "Přidat produkt" → `window.open("/admin/produkty/novy", "_blank")`
- "Správa produktů" → `window.open("/admin/produkty", "_blank")`
- "Rozložení" → toggles sub-toolbar row with 4 dropdown controls
- Product cards rendered with shared CSS classes (`.product-card`, `.product-card-image`, etc.)

The insert dialog should be a modal/popover with:
- Title: "Vložit výpis produktů"
- Two selection mode tabs/radio
- "Z kategorie": dropdown with "Všechny produkty" + categories from API
- "Ruční výběr": searchable multi-select checkbox list of products from API
- OK + Zavřít buttons

**Step 2: Run typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: PASS

**Step 3: Verify in browser**

- Start frontend: `cd apps/web && pnpm dev`
- Go to admin → create/edit a page
- Click "+" to add content → see "Výpis produktů" in picker
- Click it → insert dialog opens
- Select "Všechny produkty" → OK → block appears with product grid preview
- Click block → toolbar appears

**Step 4: Commit**

```
feat(web): implement products block editor with insert dialog and toolbar
```

---

## Task 7: Implement ProductsBlockRenderer for public view

**Files:**
- Create: `apps/web/src/components/page-renderer/ProductsBlockRenderer.tsx`
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx`

**Step 1: Add products block type to PageRenderer**

In `PageRenderer.tsx`, add the block data interface:

```typescript
interface ProductsBlockData extends BlockBase {
  type: "products";
  mode: "category" | "manual";
  categoryId: string | null;
  productIds: string[];
  appearance: string;
  columns: number;
  showCategoryFilter: boolean;
}
```

Update the `BlockData` union:
```typescript
type BlockData = TextBlockData | ImageBlockData | SeparatorBlockData | ButtonBlockData | ProductsBlockData;
```

Add render case in the V3 section (after the `button` case):
```typescript
case "products":
  return <div key={block.id} className="products-block"><ProductsBlockRenderer block={block as ProductsBlockData} /></div>;
```

Add import at the top:
```typescript
import { ProductsBlockRenderer } from "./ProductsBlockRenderer";
```

**Step 2: Create ProductsBlockRenderer**

Create `apps/web/src/components/page-renderer/ProductsBlockRenderer.tsx`:

This is a client component that:
1. Fetches products based on block config (category or ids)
2. Fetches categories for the sidebar filter
3. Renders the 4 appearance modes using shared CSS classes
4. Handles client-side category filtering in the sidebar
5. Product cards link to `/produkty/[slug]`

Key features:
- `appearance: "default"` → `.products-grid` with `.products-grid-{columns}`
- `appearance: "large-photo"` → same grid but `.product-card-image-large` on images
- `appearance: "slider"` → `.products-slider` with nav arrows
- `appearance: "carousel"` → `.products-carousel` with auto-rotation and dot indicators
- Category sidebar: `.products-sidebar` with `.products-sidebar-link` items
- Price formatting: Czech locale `Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" })`

**Step 3: Run typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: PASS

**Step 4: Verify in browser**

- Go to a published CMS page that has a products block
- Products render with correct layout, category sidebar, clickable cards

**Step 5: Commit**

```
feat(web): add products block renderer for public pages
```

---

## Task 8: Create `/produkty/[slug]` product detail route

**Files:**
- Create: `apps/web/src/app/(public)/produkty/[slug]/page.tsx`

**Step 1: Create the page**

Server component (or client component with TanStack Query) that:
1. Fetches product detail via `catalogApi.getProduct(slug)`
2. Renders: gallery images, title, description, prices, variants, buy button
3. SEO metadata via `generateMetadata()`
4. Breadcrumb with dynamic back link (from `?from=` query param or default "Produkty")

This page replaces the old `/katalog/[slug]`. For now, implement a clean minimal detail page showing:
- Product images gallery (first image large, rest as thumbnails)
- Product title, short description, full description
- Price display
- Variant selector (for physical products)
- "Koupit" button (links to checkout — placeholder for now)

**Step 2: Run typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: PASS

**Step 3: Verify in browser**

- Navigate to `/produkty/some-product-slug`
- Product detail renders correctly

**Step 4: Commit**

```
feat(web): add product detail page at /produkty/[slug]
```

---

## Task 9: Remove old `/katalog` routes

**Files:**
- Delete: `apps/web/src/app/(public)/katalog/page.tsx`
- Delete: `apps/web/src/app/(public)/katalog/[slug]/page.tsx`

**Step 1: Delete old routes**

Remove the entire `katalog` directory.

**Step 2: Update any links pointing to `/katalog`**

Search the codebase for references to `/katalog` and update them:
- Navigation links → remove or point to the CMS page that has the products block
- Any hardcoded `/katalog/[slug]` links → change to `/produkty/[slug]`

**Step 3: Run typecheck and lint**

Run: `pnpm turbo typecheck && pnpm turbo lint`
Expected: PASS

**Step 4: Commit**

```
refactor(web): remove old /katalog routes, replaced by cms products block
```

---

## Task 10: Final verification

**Step 1: Run all backend tests**

Run: `cd apps/backend && mvn test`
Expected: ALL PASS

**Step 2: Run frontend lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: No errors

**Step 3: Manual smoke test**

1. Admin → create/edit CMS page
2. Add "Výpis produktů" block via "+" picker
3. Insert dialog → select "Všechny produkty" category → OK
4. Block shows product grid in editor with correct layout
5. Click block → toolbar appears (Přidat produkt / Správa produktů / Rozložení)
6. Rozložení → change Vzhled to each option, verify preview updates
7. Change Počet sloupců → grid columns update
8. Toggle Filtr → category sidebar shows/hides
9. Publish page → visit public URL
10. Public page shows identical product grid with correct CSS
11. Click a product card → navigates to `/produkty/[slug]`
12. Product detail page renders correctly
13. Category sidebar filter works (client-side filtering)

**Step 4: Restart frontend dev server and verify hot reload**

Run: `cd apps/web && pnpm dev`
Verify all pages load without errors.

**Step 5: Commit**

```
chore: verify products block implementation complete
```
