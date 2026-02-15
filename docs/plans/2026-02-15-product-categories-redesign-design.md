# Product Categories Redesign

**Date:** 2026-02-15
**Status:** Approved

## Summary

Redesign the category system to support:
- Flat product categories (no hierarchy) with M:N relationship to products
- Separation from future article categories (own table)
- Extended category fields: description, image, SEO metadata
- SEO fields on products (meta_title, meta_description)
- New "SEO" tab in admin product form

## Current State

- Single `categories` table with hierarchical `parent_id`
- Products have `category_id` FK (N:1 — one category per product)
- No SEO fields on categories or products
- No article system yet (planned for later phase)

## Design

### Database

**`product_categories`** (replaces `categories`, flat — no `parent_id`):

| Column | Type | Description |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(255) NOT NULL | Category name |
| slug | VARCHAR(255) NOT NULL UNIQUE | URL slug |
| description | TEXT | Description for category page |
| image_url | TEXT | Category image (R2) |
| meta_title | VARCHAR(255) | SEO title |
| meta_description | VARCHAR(500) | SEO description |
| sort_order | INT NOT NULL DEFAULT 0 | Display order |
| created_at | TIMESTAMPTZ NOT NULL | |
| updated_at | TIMESTAMPTZ NOT NULL | |

**`product_category_assignments`** (M:N join table):

| Column | Type |
|---|---|
| product_id | UUID FK → products ON DELETE CASCADE |
| category_id | UUID FK → product_categories ON DELETE CASCADE |
| PK | (product_id, category_id) |

**`products` table additions:**

| Column | Type | Description |
|---|---|---|
| meta_title | VARCHAR(255) | SEO title |
| meta_description | VARCHAR(500) | SEO description |

### Migration V17

1. Create `product_categories` (flat, no parent_id)
2. Migrate data from `categories` → `product_categories` (ignore parent_id)
3. Create `product_category_assignments`, populate from `products.category_id`
4. Add `meta_title` + `meta_description` to `products`
5. Drop `products.category_id` column
6. Drop old `categories` table

### Backend

**CategoryRepository:**
- CRUD over `product_categories`
- `findAll()` ordered by `sort_order` (no tree-building)
- Extended `CategoryRow` with description, imageUrl, metaTitle, metaDescription

**New `ProductCategoryAssignmentRepository`:**
- `findCategoryIdsByProductId(UUID)` → `List<UUID>`
- `assignCategories(UUID productId, List<UUID> categoryIds)` — delete old, insert new
- `removeAllForProduct(UUID productId)`

**DTOs:**
- `CategoryResponse` — no parentId/children, add description, imageUrl, metaTitle, metaDescription
- `CreateCategoryRequest` / `UpdateCategoryRequest` — extended with new fields
- `ProductResponse` — replace `categoryId`/`categoryName` with `categories: List<CategorySummary>` (id, name, slug), add metaTitle, metaDescription
- `CreateProductRequest` / `UpdateProductRequest` — `categoryIds: List<UUID>` + SEO fields

**Product filtering:**
- `GET /api/catalog/products?category=slug` — JOIN on `product_category_assignments`

### Admin UI

**Category management:**
- Flat list (sortable)
- Form: name, slug (auto-generated), description (textarea), image upload (R2), meta_title, meta_description

**Product form:**
- Category selection: multi-select (checkboxes or tag picker) instead of single dropdown
- New "SEO" tab with meta_title and meta_description fields

### Public Catalog

**Category filter:**
- Flat list instead of tree
- Active filter shows category header (name, description, image)

**ProductCard:**
- Display categories as clickable badges (instead of single category name)

**Product detail:**
- Clickable category badges
- SEO: meta_title → `<title>`, meta_description → `<meta name="description">`
- Fallback to product title / short_description if SEO fields empty

## Decisions

- **Approach B chosen:** Separate tables per entity type (product_categories now, article_categories later)
- **Flat categories:** No hierarchy (no parent_id) — simpler for current needs
- **Product URLs:** `/katalog/slug-produktu` — categories not in URL, used only for filtering
- **Article categories:** Deferred to article phase
