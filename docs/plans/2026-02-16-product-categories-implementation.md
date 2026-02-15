# Product Categories Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hierarchical single-category system with flat M:N product categories, add SEO fields to categories and products.

**Architecture:** New `product_categories` table (flat, no parent_id) with description, image, SEO fields. Join table `product_category_assignments` for M:N. SEO fields added to `products`. Old `categories` table dropped. Frontend updated for flat multi-select categories and SEO tab.

**Tech Stack:** Flyway, JOOQ, Spring Boot 4, React 19, TanStack Query, shadcn/ui, Tailwind 4

---

### Task 1: Flyway migration V17

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V17__product_categories_redesign.sql`

**Step 1: Write the migration**

```sql
-- 1. Create new product_categories table (flat, no parent_id)
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Migrate existing categories (ignore parent_id)
INSERT INTO product_categories (id, name, slug, sort_order, created_at, updated_at)
SELECT id, name, slug, sort_order, created_at, updated_at
FROM categories;

-- 3. Create M:N join table
CREATE TABLE product_category_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_pca_product ON product_category_assignments(product_id);
CREATE INDEX idx_pca_category ON product_category_assignments(category_id);

-- 4. Migrate existing product->category relationships
INSERT INTO product_category_assignments (product_id, category_id)
SELECT id, category_id FROM products WHERE category_id IS NOT NULL;

-- 5. Add SEO fields to products
ALTER TABLE products ADD COLUMN meta_title VARCHAR(255);
ALTER TABLE products ADD COLUMN meta_description VARCHAR(500);

-- 6. Drop old category_id from products
ALTER TABLE products DROP COLUMN category_id;
DROP INDEX IF EXISTS idx_products_category;

-- 7. Drop old categories table
DROP TABLE categories;
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && ./mvnw compile -pl . -Pjooq-codegen` (or however JOOQ codegen is configured — check `pom.xml` for the exact profile/plugin execution)

Expected: New JOOQ classes for `product_categories` and `product_category_assignments`, updated `products` (no `category_id`, has `meta_title`/`meta_description`), no `categories` table.

**Step 3: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V17__product_categories_redesign.sql
git add apps/backend/target/generated-sources/
git commit -m "feat(backend): add migration v17 for flat m:n product categories with seo fields"
```

---

### Task 2: Update CategoryRepository for new table

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/CategoryRepository.java`

**Step 1: Write the failing test**

Add test to `CatalogCategoryIntegrationTest.java`:

```java
@Test
void createCategory_withDescriptionAndSeo_returns201() throws Exception {
    mockMvc.perform(post("/api/admin/categories")
            .with(user(adminPrincipal()))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Meditace", "slug": "meditace-seo-test", "sortOrder": 1,
                 "description": "Meditační produkty", "metaTitle": "Meditace | Samo Fujera",
                 "metaDescription": "Nejlepší meditační produkty"}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.description").value("Meditační produkty"))
        .andExpect(jsonPath("$.data.metaTitle").value("Meditace | Samo Fujera"))
        .andExpect(jsonPath("$.data.metaDescription").value("Nejlepší meditační produkty"));
}
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && ./mvnw test -Dtest=CatalogCategoryIntegrationTest#createCategory_withDescriptionAndSeo_returns201 -pl .`

Expected: FAIL — DTOs don't have new fields yet.

**Step 3: Update CategoryRepository**

Replace the entire `CategoryRepository.java` to use `PRODUCT_CATEGORIES` table with new fields:

```java
package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_CATEGORIES;

@Repository
public class CategoryRepository {

    private final DSLContext dsl;

    CategoryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record CategoryRow(
        UUID id,
        String name,
        String slug,
        String description,
        String imageUrl,
        String metaTitle,
        String metaDescription,
        int sortOrder,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public List<CategoryRow> findAll() {
        return dsl.selectFrom(PRODUCT_CATEGORIES)
            .orderBy(PRODUCT_CATEGORIES.SORT_ORDER.asc(), PRODUCT_CATEGORIES.NAME.asc())
            .fetch(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getDescription(),
                r.getImageUrl(),
                r.getMetaTitle(),
                r.getMetaDescription(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public Optional<CategoryRow> findById(UUID id) {
        return dsl.selectFrom(PRODUCT_CATEGORIES)
            .where(PRODUCT_CATEGORIES.ID.eq(id))
            .fetchOptional(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getDescription(),
                r.getImageUrl(),
                r.getMetaTitle(),
                r.getMetaDescription(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public Optional<CategoryRow> findBySlug(String slug) {
        return dsl.selectFrom(PRODUCT_CATEGORIES)
            .where(PRODUCT_CATEGORIES.SLUG.eq(slug))
            .fetchOptional(r -> new CategoryRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getDescription(),
                r.getImageUrl(),
                r.getMetaTitle(),
                r.getMetaDescription(),
                r.getSortOrder(),
                r.getCreatedAt(),
                r.getUpdatedAt()
            ));
    }

    public UUID create(String name, String slug, String description, String imageUrl,
                       String metaTitle, String metaDescription, int sortOrder) {
        return dsl.insertInto(PRODUCT_CATEGORIES)
            .set(PRODUCT_CATEGORIES.NAME, name)
            .set(PRODUCT_CATEGORIES.SLUG, slug)
            .set(PRODUCT_CATEGORIES.DESCRIPTION, description)
            .set(PRODUCT_CATEGORIES.IMAGE_URL, imageUrl)
            .set(PRODUCT_CATEGORIES.META_TITLE, metaTitle)
            .set(PRODUCT_CATEGORIES.META_DESCRIPTION, metaDescription)
            .set(PRODUCT_CATEGORIES.SORT_ORDER, sortOrder)
            .returning(PRODUCT_CATEGORIES.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String name, String slug, String description, String imageUrl,
                       String metaTitle, String metaDescription, int sortOrder) {
        dsl.update(PRODUCT_CATEGORIES)
            .set(PRODUCT_CATEGORIES.NAME, name)
            .set(PRODUCT_CATEGORIES.SLUG, slug)
            .set(PRODUCT_CATEGORIES.DESCRIPTION, description)
            .set(PRODUCT_CATEGORIES.IMAGE_URL, imageUrl)
            .set(PRODUCT_CATEGORIES.META_TITLE, metaTitle)
            .set(PRODUCT_CATEGORIES.META_DESCRIPTION, metaDescription)
            .set(PRODUCT_CATEGORIES.SORT_ORDER, sortOrder)
            .set(PRODUCT_CATEGORIES.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCT_CATEGORIES.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PRODUCT_CATEGORIES)
            .where(PRODUCT_CATEGORIES.ID.eq(id))
            .execute();
    }

    public boolean existsBySlug(String slug) {
        return dsl.fetchExists(
            dsl.selectFrom(PRODUCT_CATEGORIES)
               .where(PRODUCT_CATEGORIES.SLUG.eq(slug))
        );
    }
}
```

**Step 4: Update CatalogDtos — Category DTOs**

In `CatalogDtos.java`, replace the 3 category records:

```java
// Category DTOs

public record CategoryResponse(
    UUID id,
    String name,
    String slug,
    String description,
    String imageUrl,
    String metaTitle,
    String metaDescription,
    int sortOrder
) {}

public record CreateCategoryRequest(
    @NotBlank @Size(max = 255) String name,
    @NotBlank @Size(max = 255) String slug,
    String description,
    String imageUrl,
    @Size(max = 255) String metaTitle,
    @Size(max = 500) String metaDescription,
    int sortOrder
) {}

public record UpdateCategoryRequest(
    @NotBlank @Size(max = 255) String name,
    @NotBlank @Size(max = 255) String slug,
    String description,
    String imageUrl,
    @Size(max = 255) String metaTitle,
    @Size(max = 500) String metaDescription,
    int sortOrder
) {}
```

**Step 5: Update CatalogService — Category methods**

Replace the category methods in `CatalogService.java` (lines 51-112). Remove tree-building logic:

```java
// --- Category methods ---

public List<CatalogDtos.CategoryResponse> getCategories() {
    return categoryRepository.findAll().stream()
        .map(this::toCategoryResponse)
        .toList();
}

private CatalogDtos.CategoryResponse toCategoryResponse(CategoryRepository.CategoryRow row) {
    return new CatalogDtos.CategoryResponse(
        row.id(), row.name(), row.slug(), row.description(),
        row.imageUrl(), row.metaTitle(), row.metaDescription(), row.sortOrder()
    );
}

@Transactional
public CatalogDtos.CategoryResponse createCategory(CatalogDtos.CreateCategoryRequest request) {
    if (categoryRepository.existsBySlug(request.slug())) {
        throw new IllegalArgumentException("Category with slug '" + request.slug() + "' already exists");
    }
    var id = categoryRepository.create(
        request.name(), request.slug(), request.description(), request.imageUrl(),
        request.metaTitle(), request.metaDescription(), request.sortOrder()
    );
    var created = categoryRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Category not found"));
    return toCategoryResponse(created);
}

@Transactional
public CatalogDtos.CategoryResponse updateCategory(UUID id, CatalogDtos.UpdateCategoryRequest request) {
    categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category not found"));
    categoryRepository.update(
        id, request.name(), request.slug(), request.description(), request.imageUrl(),
        request.metaTitle(), request.metaDescription(), request.sortOrder()
    );
    var updated = categoryRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Category not found"));
    return toCategoryResponse(updated);
}

@Transactional
public void deleteCategory(UUID id) {
    categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category not found"));
    categoryRepository.delete(id);
}
```

**Step 6: Update CatalogController**

Rename `getCategoryTree()` → `getCategories()` call:

```java
@GetMapping("/categories")
public ResponseEntity<ApiResponse<List<CatalogDtos.CategoryResponse>>> getCategories() {
    var categories = catalogService.getCategories();
    return ResponseEntity.ok(ApiResponse.ok(categories));
}
```

**Step 7: Run test to verify it passes**

Run: `cd apps/backend && ./mvnw test -Dtest=CatalogCategoryIntegrationTest -pl .`

Expected: All tests PASS (update existing tests too — remove `parentId`/`children` assertions).

**Step 8: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/
git add apps/backend/src/test/java/cz/samofujera/catalog/CatalogCategoryIntegrationTest.java
git commit -m "feat(backend): update category repository and dtos for flat product categories with seo"
```

---

### Task 3: Create ProductCategoryAssignmentRepository + update ProductRepository

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductCategoryAssignmentRepository.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductRepository.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`

**Step 1: Write the failing test**

Add to a new or existing integration test:

```java
@Test
void createProduct_withMultipleCategories_returnsCategories() throws Exception {
    var admin = adminPrincipal();

    // Create two categories
    var cat1Result = mockMvc.perform(post("/api/admin/categories")
            .with(user(admin))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Meditace", "slug": "meditace-mn-test", "sortOrder": 0}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    var cat1Id = JsonPath.read(cat1Result.getResponse().getContentAsString(), "$.data.id").toString();

    var cat2Result = mockMvc.perform(post("/api/admin/categories")
            .with(user(admin))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Jóga", "slug": "joga-mn-test", "sortOrder": 1}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    var cat2Id = JsonPath.read(cat2Result.getResponse().getContentAsString(), "$.data.id").toString();

    // Create product with both categories
    mockMvc.perform(post("/api/admin/products")
            .with(user(admin))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"title": "Meditační e-book", "slug": "meditacni-ebook-mn-test",
                 "productType": "EBOOK", "prices": {"CZK": 199},
                 "categoryIds": ["%s", "%s"]}
                """.formatted(cat1Id, cat2Id)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.categories").isArray())
        .andExpect(jsonPath("$.data.categories.length()").value(2));
}
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && ./mvnw test -Dtest=CatalogCategoryIntegrationTest#createProduct_withMultipleCategories_returnsCategories -pl .`

Expected: FAIL — `categoryIds` field doesn't exist in DTO yet.

**Step 3: Create ProductCategoryAssignmentRepository**

```java
package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_CATEGORIES;
import static cz.samofujera.generated.jooq.Tables.PRODUCT_CATEGORY_ASSIGNMENTS;

@Repository
public class ProductCategoryAssignmentRepository {

    private final DSLContext dsl;

    ProductCategoryAssignmentRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record CategorySummaryRow(UUID id, String name, String slug) {}

    public List<CategorySummaryRow> findCategoriesForProduct(UUID productId) {
        return dsl.select(PRODUCT_CATEGORIES.ID, PRODUCT_CATEGORIES.NAME, PRODUCT_CATEGORIES.SLUG)
            .from(PRODUCT_CATEGORY_ASSIGNMENTS)
            .join(PRODUCT_CATEGORIES).on(PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID.eq(PRODUCT_CATEGORIES.ID))
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_CATEGORIES.SORT_ORDER.asc())
            .fetch(r -> new CategorySummaryRow(
                r.get(PRODUCT_CATEGORIES.ID),
                r.get(PRODUCT_CATEGORIES.NAME),
                r.get(PRODUCT_CATEGORIES.SLUG)
            ));
    }

    public Map<UUID, List<CategorySummaryRow>> findCategoriesForProducts(List<UUID> productIds) {
        if (productIds.isEmpty()) return Map.of();

        return dsl.select(
                PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID,
                PRODUCT_CATEGORIES.ID, PRODUCT_CATEGORIES.NAME, PRODUCT_CATEGORIES.SLUG)
            .from(PRODUCT_CATEGORY_ASSIGNMENTS)
            .join(PRODUCT_CATEGORIES).on(PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID.eq(PRODUCT_CATEGORIES.ID))
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.in(productIds))
            .orderBy(PRODUCT_CATEGORIES.SORT_ORDER.asc())
            .fetch()
            .stream()
            .collect(Collectors.groupingBy(
                r -> r.get(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID),
                Collectors.mapping(
                    r -> new CategorySummaryRow(
                        r.get(PRODUCT_CATEGORIES.ID),
                        r.get(PRODUCT_CATEGORIES.NAME),
                        r.get(PRODUCT_CATEGORIES.SLUG)
                    ),
                    Collectors.toList()
                )
            ));
    }

    public List<UUID> findProductIdsByCategorySlug(String categorySlug) {
        return dsl.select(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID)
            .from(PRODUCT_CATEGORY_ASSIGNMENTS)
            .join(PRODUCT_CATEGORIES).on(PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID.eq(PRODUCT_CATEGORIES.ID))
            .where(PRODUCT_CATEGORIES.SLUG.eq(categorySlug))
            .fetch(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID);
    }

    public void assignCategories(UUID productId, List<UUID> categoryIds) {
        // Delete existing
        dsl.deleteFrom(PRODUCT_CATEGORY_ASSIGNMENTS)
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.eq(productId))
            .execute();

        // Insert new
        if (categoryIds != null && !categoryIds.isEmpty()) {
            var insert = dsl.insertInto(PRODUCT_CATEGORY_ASSIGNMENTS,
                PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID,
                PRODUCT_CATEGORY_ASSIGNMENTS.CATEGORY_ID);
            for (var catId : categoryIds) {
                insert = insert.values(productId, catId);
            }
            insert.execute();
        }
    }

    public void removeAllForProduct(UUID productId) {
        dsl.deleteFrom(PRODUCT_CATEGORY_ASSIGNMENTS)
            .where(PRODUCT_CATEGORY_ASSIGNMENTS.PRODUCT_ID.eq(productId))
            .execute();
    }
}
```

**Step 4: Update ProductRepository — remove category_id**

Remove `CATEGORIES` import and LEFT JOIN. Remove `categoryId`/`categoryName` from `ProductRow`. Add `metaTitle`/`metaDescription`. Change category filtering to use a subquery or accept product IDs.

Updated `ProductRow`:
```java
public record ProductRow(
    UUID id, String title, String slug, String description,
    String shortDescription, String productType,
    String status, String thumbnailUrl,
    String metaTitle, String metaDescription,
    OffsetDateTime createdAt, OffsetDateTime updatedAt
) {}
```

All `findAll`, `findById`, `findBySlug` methods: remove the `leftJoin(CATEGORIES)`, remove `PRODUCTS.CATEGORY_ID` and `CATEGORIES.NAME` from select. Add `PRODUCTS.META_TITLE`, `PRODUCTS.META_DESCRIPTION`.

`create()` method: remove `categoryId` param, add `metaTitle`, `metaDescription`.
`update()` method: remove `categoryId` param, add `metaTitle`, `metaDescription`.

For category filtering in `buildCondition()` / `findAll()` / `count()`: change `categoryId` param to `List<UUID> productIdsInCategory` (nullable). If provided, add `PRODUCTS.ID.in(productIdsInCategory)` condition. The caller (CatalogService) resolves category slug → product IDs via `ProductCategoryAssignmentRepository`.

**Step 5: Update CatalogDtos — Product DTOs**

Add `CategorySummary` record, update product response/request records:

```java
public record CategorySummary(UUID id, String name, String slug) {}

public record ProductResponse(
    UUID id, String title, String slug, String description, String shortDescription,
    String productType, Map<String, BigDecimal> prices,
    String status, String thumbnailUrl,
    String metaTitle, String metaDescription,
    List<CategorySummary> categories,
    OffsetDateTime createdAt, OffsetDateTime updatedAt
) {}

public record ProductDetailResponse(
    UUID id, String title, String slug, String description, String shortDescription,
    String productType, Map<String, BigDecimal> prices,
    String status, String thumbnailUrl,
    String metaTitle, String metaDescription,
    List<CategorySummary> categories,
    List<ImageResponse> images,
    List<VariantResponse> variants,
    List<FileResponse> files,
    List<MediaResponse> media,
    EventResponse event,
    List<OccurrenceResponse> occurrences,
    OffsetDateTime createdAt, OffsetDateTime updatedAt
) {}

public record CreateProductRequest(
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 255) String slug,
    String description,
    @Size(max = 500) String shortDescription,
    @NotBlank String productType,
    @NotNull Map<String, @DecimalMin("0.01") BigDecimal> prices,
    String thumbnailUrl,
    List<UUID> categoryIds,
    @Size(max = 255) String metaTitle,
    @Size(max = 500) String metaDescription,
    @Valid List<CreateVariantRequest> variants,
    @Valid CreateEventRequest event,
    @Valid List<CreateOccurrenceRequest> occurrences
) {}

public record UpdateProductRequest(
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 255) String slug,
    String description,
    @Size(max = 500) String shortDescription,
    @NotBlank String productType,
    @NotNull Map<String, @DecimalMin("0.01") BigDecimal> prices,
    String status,
    String thumbnailUrl,
    List<UUID> categoryIds,
    @Size(max = 255) String metaTitle,
    @Size(max = 500) String metaDescription,
    @Valid List<CreateVariantRequest> variants,
    @Valid CreateEventRequest event,
    @Valid List<CreateOccurrenceRequest> occurrences
) {}
```

**Step 6: Update CatalogService — Product methods**

Inject `ProductCategoryAssignmentRepository`. Update:

- `createProduct()`: call `assignmentRepo.assignCategories(id, request.categoryIds())` after product creation
- `updateProduct()`: call `assignmentRepo.assignCategories(id, request.categoryIds())` after update
- `getProducts()`: resolve category filter via `assignmentRepo.findProductIdsByCategorySlug(categorySlug)`, pass product IDs to `productRepository.findAll()`; also batch-load categories via `assignmentRepo.findCategoriesForProducts(productIds)`
- `toProductResponse()`: accept `List<CatalogDtos.CategorySummary>` instead of reading from `ProductRow`
- `buildDetailResponse()`: load categories for single product

The category filter param in `getProducts()` changes from `UUID categoryId` to `String categorySlug`. Update `ProductAdminController` and `CatalogController` accordingly.

**Step 7: Update ProductAdminController**

Change `@RequestParam(required = false) UUID category` to `@RequestParam(required = false) String category` (now slug-based).

**Step 8: Run all tests**

Run: `cd apps/backend && ./mvnw test -pl .`

Expected: All tests PASS. Fix any compilation errors from the refactor.

**Step 9: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/
git add apps/backend/src/test/java/cz/samofujera/catalog/
git commit -m "feat(backend): add m:n product category assignments with seo fields on products"
```

---

### Task 4: Update integration tests

**Files:**
- Modify: `apps/backend/src/test/java/cz/samofujera/catalog/CatalogCategoryIntegrationTest.java`

**Step 1: Update existing category tests**

Remove all `parentId` and `children` assertions from existing tests. Add assertions for new fields (description, metaTitle, metaDescription). Update JSON payloads to match new DTO structure.

Key changes per test:
- `createCategory_returns201_withValidData` — remove `parentId` field from JSON, assert no `children`/`parentId` in response
- `updateCategory_works` — same cleanup
- Add the new SEO test from Task 2

**Step 2: Add product category assignment tests**

Test that products can be assigned multiple categories and the response includes `categories` array.

**Step 3: Run all tests**

Run: `cd apps/backend && ./mvnw test -pl .`

Expected: All PASS.

**Step 4: Commit**

```bash
git add apps/backend/src/test/java/cz/samofujera/catalog/
git commit -m "test(backend): update category integration tests for flat m:n categories"
```

---

### Task 5: Update API client types

**Files:**
- Modify: `packages/api-client/src/types.ts`
- Modify: `packages/api-client/src/admin.ts`
- Modify: `packages/api-client/src/catalog.ts`

**Step 1: Update types.ts**

Replace `CategoryResponse`:

```typescript
export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
}

export type UpdateCategoryRequest = CreateCategoryRequest;
```

Update product types — replace `categoryId`/`categoryName` with `categories`:

```typescript
// In ProductResponse and ProductDetailResponse:
categories: CategorySummary[];
metaTitle: string | null;
metaDescription: string | null;
// Remove: categoryId, categoryName

// In CreateProductRequest and UpdateProductRequest:
categoryIds?: string[];
metaTitle?: string;
metaDescription?: string;
// Remove: categoryId
```

**Step 2: Update admin.ts**

Update `createCategory`/`updateCategory` payloads to match new types (already correct, just type changes).

**Step 3: Run typecheck**

Run: `pnpm turbo typecheck --filter=@samofujera/api-client`

Expected: Type errors in consuming packages (admin, catalog components) — this is expected, we fix those in next tasks.

**Step 4: Commit**

```bash
git add packages/api-client/src/
git commit -m "feat(api-client): update types for flat m:n categories with seo fields"
```

---

### Task 6: Update admin category management page

**Files:**
- Modify: `apps/web/src/components/admin/routes/categories.tsx`

**Step 1: Rewrite categories admin page**

Replace hierarchical tree with flat sortable list. Add form fields for description, image upload, metaTitle, metaDescription. Remove all `parentId` logic, `flattenForParentSelect()`, recursive `renderCategoryTree()`.

Key changes:
- Flat list with `sortOrder` display (no tree indentation)
- Form fields: name, slug, description (textarea), imageUrl (text input for now — R2 upload can be added later), metaTitle, metaDescription
- Remove parent category selector entirely
- Update mutations to send new fields

**Step 2: Run typecheck**

Run: `pnpm turbo typecheck --filter=web`

Expected: PASS for categories page (may still have errors in product pages — next task).

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/routes/categories.tsx
git commit -m "feat(admin): update category management for flat categories with seo fields"
```

---

### Task 7: Update admin product form (multi-select categories + SEO tab)

**Files:**
- Modify: `apps/web/src/components/admin/routes/product-new.tsx`
- Modify: `apps/web/src/components/admin/routes/product-edit.tsx`

**Step 1: Update product-new.tsx**

- Replace single `<select>` for category with multi-select checkboxes
- Remove `flattenCategories()` helper (no tree to flatten)
- State: `categoryIds: string[]` instead of `categoryId: string`
- Add SEO tab content: `metaTitle` and `metaDescription` text inputs
- Send `categoryIds` and `metaTitle`/`metaDescription` in create request

**Step 2: Update product-edit.tsx**

- Same changes as product-new
- Initialize `categoryIds` from `product.categories.map(c => c.id)` instead of `product.categoryId`
- Initialize `metaTitle`/`metaDescription` from product response
- Add SEO tab to the tab list

**Step 3: Run typecheck**

Run: `pnpm turbo typecheck --filter=web`

Expected: PASS.

**Step 4: Build frontend**

Run: `cd apps/web && pnpm build`

Expected: Build succeeds.

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/routes/product-new.tsx
git add apps/web/src/components/admin/routes/product-edit.tsx
git commit -m "feat(admin): multi-select categories and seo tab in product form"
```

---

### Task 8: Update public catalog (CategoryFilter, ProductCard)

**Files:**
- Modify: `apps/web/src/components/catalog/CategoryFilter.tsx`
- Modify: `apps/web/src/components/catalog/ProductCard.tsx`

**Step 1: Simplify CategoryFilter**

Remove recursive `CategoryItem` component. Replace with flat list of buttons. Remove `depth` prop and nested children rendering.

```tsx
{categories.map((category) => (
  <li key={category.id}>
    <button
      type="button"
      onClick={() => onCategoryChange(category.slug)}
      className={/* active/inactive styles */}
    >
      {category.name}
    </button>
  </li>
))}
```

**Step 2: Update ProductCard**

Replace single `categoryName` display with category badges:

```tsx
{product.categories?.map((cat) => (
  <span key={cat.id} className="inline-block rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent-foreground)]">
    {cat.name}
  </span>
))}
```

**Step 3: Run typecheck and build**

Run: `pnpm turbo typecheck && cd apps/web && pnpm build`

Expected: All PASS.

**Step 4: Commit**

```bash
git add apps/web/src/components/catalog/
git commit -m "feat(web): flat category filter and category badges on product cards"
```

---

### Task 9: Final verification

**Step 1: Run all backend tests**

Run: `cd apps/backend && ./mvnw test -pl .`

Expected: All PASS.

**Step 2: Run frontend lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`

Expected: All PASS.

**Step 3: Build frontend**

Run: `cd apps/web && pnpm build`

Expected: Build succeeds.

**Step 4: Final commit (if any remaining changes)**

```bash
git commit -m "chore: final cleanup for product categories redesign"
```
