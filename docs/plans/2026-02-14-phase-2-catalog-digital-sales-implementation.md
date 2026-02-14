# Phase 2: Catalog & Digital Sales — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete digital product sales system — catalog, checkout via Stripe, entitlement-based access, file delivery via R2 signed URLs, admin product management, and customer library.

**Architecture:** Spring Modulith backend with 5 new modules (catalog, order, payment, entitlement, delivery) communicating via domain events. Single Astro app with React client-side fetching for catalog pages. Stripe Checkout for payments, Cloudflare R2 for file storage.

**Tech Stack:** Spring Boot 4, JOOQ, Stripe Java SDK, AWS S3 SDK (R2-compatible), TanStack Query/Router (frontend).

**Design Doc:** `docs/plans/2026-02-14-phase-2-catalog-digital-sales-design.md`

---

## Task 1: Database Migrations (V6–V13)

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V6__create_categories_table.sql`
- Create: `apps/backend/src/main/resources/db/migration/V7__create_products_table.sql`
- Create: `apps/backend/src/main/resources/db/migration/V8__create_digital_assets_table.sql`
- Create: `apps/backend/src/main/resources/db/migration/V9__create_orders_table.sql`
- Create: `apps/backend/src/main/resources/db/migration/V10__create_order_items_table.sql`
- Create: `apps/backend/src/main/resources/db/migration/V11__create_entitlements_table.sql`
- Create: `apps/backend/src/main/resources/db/migration/V12__create_download_logs_table.sql`
- Create: `apps/backend/src/main/resources/db/migration/V13__create_shipping_records_table.sql`

**Step 1: Create V6 — Categories**

```sql
-- V6__create_categories_table.sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Step 2: Create V7 — Products**

```sql
-- V7__create_products_table.sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description VARCHAR(500),
    product_type VARCHAR(20) NOT NULL,
    price_amount NUMERIC(10,2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'CZK',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    thumbnail_url TEXT,
    category_id UUID REFERENCES categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
```

**Step 3: Create V8 — Digital Assets**

```sql
-- V8__create_digital_assets_table.sql
CREATE TABLE digital_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    asset_type VARCHAR(50) NOT NULL,
    file_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    stream_uid TEXT,
    duration_seconds INT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_digital_assets_product ON digital_assets(product_id);
```

**Step 4: Create V9 — Orders**

```sql
-- V9__create_orders_table.sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CZK',
    voucher_id UUID,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    stripe_payment_id TEXT,
    stripe_invoice_id TEXT,
    billing_address JSONB,
    shipping_address JSONB,
    locale VARCHAR(5) NOT NULL DEFAULT 'cs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
```

**Step 5: Create V10 — Order Items**

```sql
-- V10__create_order_items_table.sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    product_snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

**Step 6: Create V11 — Entitlements**

```sql
-- V11__create_entitlements_table.sql
CREATE TABLE entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    source_type VARCHAR(20) NOT NULL,
    source_id UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_entitlements_access
    ON entitlements(user_id, product_id)
    WHERE revoked_at IS NULL;
```

**Step 7: Create V12 — Download Logs**

```sql
-- V12__create_download_logs_table.sql
CREATE TABLE download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset_id UUID NOT NULL REFERENCES digital_assets(id),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_download_logs_user_asset ON download_logs(user_id, asset_id);
```

**Step 8: Create V13 — Shipping Records**

```sql
-- V13__create_shipping_records_table.sql
CREATE TABLE shipping_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    carrier VARCHAR(100),
    tracking_number VARCHAR(255),
    tracking_url TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipping_records_order ON shipping_records(order_id);
```

**Step 9: Regenerate JOOQ classes**

Run: `cd apps/backend && mvn generate-sources -pl .`

Verify: `target/generated-sources/jooq/cz/samofujera/generated/jooq/Tables.java` contains all new tables (CATEGORIES, PRODUCTS, DIGITAL_ASSETS, ORDERS, ORDER_ITEMS, ENTITLEMENTS, DOWNLOAD_LOGS, SHIPPING_RECORDS).

**Step 10: Run existing tests to verify migrations don't break anything**

Run: `cd apps/backend && mvn test`
Expected: All existing tests PASS.

**Step 11: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V6__create_categories_table.sql apps/backend/src/main/resources/db/migration/V7__create_products_table.sql apps/backend/src/main/resources/db/migration/V8__create_digital_assets_table.sql apps/backend/src/main/resources/db/migration/V9__create_orders_table.sql apps/backend/src/main/resources/db/migration/V10__create_order_items_table.sql apps/backend/src/main/resources/db/migration/V11__create_entitlements_table.sql apps/backend/src/main/resources/db/migration/V12__create_download_logs_table.sql apps/backend/src/main/resources/db/migration/V13__create_shipping_records_table.sql
git commit -m "feat(backend): add V6-V13 migrations for catalog, orders, entitlements, delivery"
```

---

## Task 2: Add Stripe and R2 Dependencies

**Files:**
- Modify: `apps/backend/pom.xml`
- Modify: `apps/backend/src/main/resources/application.yml`
- Modify: `apps/backend/src/main/resources/application-dev.yml`

**Step 1: Add Stripe SDK and AWS S3 SDK (R2-compatible) to pom.xml**

Add inside `<dependencies>`:

```xml
<!-- Stripe -->
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>29.2.0</version>
</dependency>

<!-- Cloudflare R2 (S3-compatible) -->
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.31.54</version>
</dependency>
```

> **Note:** Check Context7 for latest Stripe Java SDK and AWS S3 SDK versions before implementation.

**Step 2: Add configuration properties to application.yml**

```yaml
# Add under existing config
stripe:
  secret-key: ${STRIPE_SECRET_KEY:sk_test_placeholder}
  webhook-secret: ${STRIPE_WEBHOOK_SECRET:whsec_placeholder}

r2:
  endpoint: ${R2_ENDPOINT:http://localhost:9000}
  access-key: ${R2_ACCESS_KEY:minioadmin}
  secret-key: ${R2_SECRET_KEY:minioadmin}
  bucket: ${R2_BUCKET:samofujera-assets}
  public-url: ${R2_PUBLIC_URL:}
```

**Step 3: Add MinIO to docker-compose.yml for local R2 development**

```yaml
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
```

Add `minio_data:` to volumes section.

**Step 4: Verify build compiles**

Run: `cd apps/backend && mvn compile -DskipTests`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add apps/backend/pom.xml apps/backend/src/main/resources/application.yml apps/backend/src/main/resources/application-dev.yml docker-compose.yml
git commit -m "feat(backend): add Stripe SDK, AWS S3 SDK, and R2/MinIO config"
```

---

## Task 3: Catalog Module — Category CRUD

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogAdminController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/CategoryRepository.java`
- Create: `apps/backend/src/test/java/cz/samofujera/catalog/CatalogCategoryIntegrationTest.java`

**Step 1: Create CatalogDtos with category records**

```java
package cz.samofujera.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class CatalogDtos {
    private CatalogDtos() {}

    // --- Category ---

    public record CategoryResponse(
        UUID id,
        String name,
        String slug,
        UUID parentId,
        int sortOrder,
        List<CategoryResponse> children
    ) {}

    public record CreateCategoryRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        UUID parentId,
        int sortOrder
    ) {}

    public record UpdateCategoryRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        UUID parentId,
        int sortOrder
    ) {}
}
```

**Step 2: Create CategoryRepository**

```java
package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.CATEGORIES;

@Repository
class CategoryRepository {

    private final DSLContext dsl;

    CategoryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record CategoryRow(UUID id, String name, String slug, UUID parentId, int sortOrder,
                               OffsetDateTime createdAt, OffsetDateTime updatedAt) {}

    List<CategoryRow> findAll() {
        return dsl.selectFrom(CATEGORIES)
            .orderBy(CATEGORIES.SORT_ORDER.asc(), CATEGORIES.NAME.asc())
            .fetch(r -> new CategoryRow(
                r.getId(), r.getName(), r.getSlug(), r.getParentId(),
                r.getSortOrder(), r.getCreatedAt(), r.getUpdatedAt()
            ));
    }

    Optional<CategoryRow> findById(UUID id) {
        return dsl.selectFrom(CATEGORIES)
            .where(CATEGORIES.ID.eq(id))
            .fetchOptional(r -> new CategoryRow(
                r.getId(), r.getName(), r.getSlug(), r.getParentId(),
                r.getSortOrder(), r.getCreatedAt(), r.getUpdatedAt()
            ));
    }

    UUID create(String name, String slug, UUID parentId, int sortOrder) {
        return dsl.insertInto(CATEGORIES)
            .set(CATEGORIES.NAME, name)
            .set(CATEGORIES.SLUG, slug)
            .set(CATEGORIES.PARENT_ID, parentId)
            .set(CATEGORIES.SORT_ORDER, sortOrder)
            .returning(CATEGORIES.ID)
            .fetchOne(CATEGORIES.ID);
    }

    void update(UUID id, String name, String slug, UUID parentId, int sortOrder) {
        dsl.update(CATEGORIES)
            .set(CATEGORIES.NAME, name)
            .set(CATEGORIES.SLUG, slug)
            .set(CATEGORIES.PARENT_ID, parentId)
            .set(CATEGORIES.SORT_ORDER, sortOrder)
            .set(CATEGORIES.UPDATED_AT, OffsetDateTime.now())
            .where(CATEGORIES.ID.eq(id))
            .execute();
    }

    void delete(UUID id) {
        dsl.deleteFrom(CATEGORIES)
            .where(CATEGORIES.ID.eq(id))
            .execute();
    }

    boolean existsBySlug(String slug) {
        return dsl.fetchExists(
            dsl.selectFrom(CATEGORIES).where(CATEGORIES.SLUG.eq(slug))
        );
    }
}
```

**Step 3: Create CatalogService (category methods)**

```java
package cz.samofujera.catalog;

import cz.samofujera.catalog.internal.CategoryRepository;
import cz.samofujera.catalog.internal.CategoryRepository.CategoryRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CatalogService {

    private final CategoryRepository categoryRepository;

    CatalogService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    // --- Categories ---

    public List<CatalogDtos.CategoryResponse> getCategoryTree() {
        var all = categoryRepository.findAll();
        return buildTree(all, null);
    }

    @Transactional
    public CatalogDtos.CategoryResponse createCategory(CatalogDtos.CreateCategoryRequest req) {
        if (categoryRepository.existsBySlug(req.slug())) {
            throw new IllegalArgumentException("Category slug already exists: " + req.slug());
        }
        var id = categoryRepository.create(req.name(), req.slug(), req.parentId(), req.sortOrder());
        return categoryRepository.findById(id)
            .map(r -> new CatalogDtos.CategoryResponse(r.id(), r.name(), r.slug(), r.parentId(), r.sortOrder(), List.of()))
            .orElseThrow();
    }

    @Transactional
    public CatalogDtos.CategoryResponse updateCategory(UUID id, CatalogDtos.UpdateCategoryRequest req) {
        categoryRepository.findById(id)
            .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Category not found"));
        categoryRepository.update(id, req.name(), req.slug(), req.parentId(), req.sortOrder());
        return categoryRepository.findById(id)
            .map(r -> new CatalogDtos.CategoryResponse(r.id(), r.name(), r.slug(), r.parentId(), r.sortOrder(), List.of()))
            .orElseThrow();
    }

    @Transactional
    public void deleteCategory(UUID id) {
        categoryRepository.findById(id)
            .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Category not found"));
        categoryRepository.delete(id);
    }

    private List<CatalogDtos.CategoryResponse> buildTree(List<CategoryRow> all, UUID parentId) {
        return all.stream()
            .filter(c -> Objects.equals(c.parentId(), parentId))
            .map(c -> new CatalogDtos.CategoryResponse(
                c.id(), c.name(), c.slug(), c.parentId(), c.sortOrder(),
                buildTree(all, c.id())
            ))
            .collect(Collectors.toList());
    }
}
```

**Step 4: Create CatalogController (public)**

```java
package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalogService;

    CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CatalogDtos.CategoryResponse>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getCategoryTree()));
    }
}
```

**Step 5: Create CatalogAdminController (admin)**

```java
package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/categories")
public class CatalogAdminController {

    private final CatalogService catalogService;

    CatalogAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CatalogDtos.CategoryResponse>> create(
            @Valid @RequestBody CatalogDtos.CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(catalogService.createCategory(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CatalogDtos.CategoryResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CatalogDtos.UpdateCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.updateCategory(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        catalogService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Step 6: Create package-info.java for internal package**

```java
// apps/backend/src/main/java/cz/samofujera/catalog/internal/package-info.java
package cz.samofujera.catalog.internal;
```

**Step 7: Update SecurityConfig to permit public catalog endpoints**

In `SecurityConfig.java`, add before `.requestMatchers("/api/admin/**").hasRole("ADMIN")`:

```java
.requestMatchers("/api/catalog/**").permitAll()
.requestMatchers("/api/stripe/webhook").permitAll()
```

**Step 8: Write integration test for categories**

```java
package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CatalogCategoryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getCategories_returnsEmptyList_whenNoCategories() throws Exception {
        mockMvc.perform(get("/api/catalog/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createCategory_returns201_withValidData() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Digitální produkty", "slug": "digitalni-produkty", "sortOrder": 1}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Digitální produkty"))
            .andExpect(jsonPath("$.data.slug").value("digitalni-produkty"));
    }

    @Test
    void createCategory_returns401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Test", "slug": "test", "sortOrder": 0}
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void createCategory_returns403_whenNotAdmin() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Test", "slug": "test", "sortOrder": 0}
                    """))
            .andExpect(status().isForbidden());
    }
}
```

**Step 9: Run tests**

Run: `cd apps/backend && mvn test -pl . -Dtest=CatalogCategoryIntegrationTest`
Expected: All tests PASS.

**Step 10: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/ apps/backend/src/test/java/cz/samofujera/catalog/
git commit -m "feat(backend): add catalog module with category CRUD"
```

---

## Task 4: Catalog Module — Product CRUD

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogController.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogAdminController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductRepository.java`
- Create: `apps/backend/src/test/java/cz/samofujera/catalog/CatalogProductIntegrationTest.java`

**Step 1: Add product DTOs to CatalogDtos.java**

Add inside `CatalogDtos`:

```java
    // --- Product ---

    public record ProductResponse(
        UUID id,
        String title,
        String slug,
        String description,
        String shortDescription,
        String productType,
        java.math.BigDecimal priceAmount,
        String priceCurrency,
        String status,
        String thumbnailUrl,
        UUID categoryId,
        String categoryName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public record ProductListResponse(
        List<ProductResponse> items,
        int page,
        int limit,
        long totalItems,
        int totalPages
    ) {}

    public record CreateProductRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String description,
        @Size(max = 500) String shortDescription,
        @NotBlank String productType,
        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.DecimalMin("0.01") java.math.BigDecimal priceAmount,
        String priceCurrency,
        String thumbnailUrl,
        UUID categoryId
    ) {}

    public record UpdateProductRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String description,
        @Size(max = 500) String shortDescription,
        @NotBlank String productType,
        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.DecimalMin("0.01") java.math.BigDecimal priceAmount,
        String priceCurrency,
        String status,
        String thumbnailUrl,
        UUID categoryId
    ) {}

    public record ProductDetailResponse(
        UUID id,
        String title,
        String slug,
        String description,
        String shortDescription,
        String productType,
        java.math.BigDecimal priceAmount,
        String priceCurrency,
        String status,
        String thumbnailUrl,
        UUID categoryId,
        String categoryName,
        List<AssetResponse> assets,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public record AssetResponse(
        UUID id,
        String assetType,
        String fileName,
        long fileSizeBytes,
        String mimeType,
        Integer durationSeconds,
        int sortOrder
    ) {}
```

**Step 2: Create ProductRepository**

```java
package cz.samofujera.catalog.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCTS;
import static cz.samofujera.generated.jooq.Tables.CATEGORIES;

@Repository
class ProductRepository {

    private final DSLContext dsl;

    ProductRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record ProductRow(UUID id, String title, String slug, String description,
                              String shortDescription, String productType, BigDecimal priceAmount,
                              String priceCurrency, String status, String thumbnailUrl,
                              UUID categoryId, String categoryName,
                              OffsetDateTime createdAt, OffsetDateTime updatedAt) {}

    List<ProductRow> findAll(String status, UUID categoryId, String productType,
                             String search, int offset, int limit) {
        Condition condition = DSL.trueCondition();
        if (status != null) condition = condition.and(PRODUCTS.STATUS.eq(status));
        if (categoryId != null) condition = condition.and(PRODUCTS.CATEGORY_ID.eq(categoryId));
        if (productType != null) condition = condition.and(PRODUCTS.PRODUCT_TYPE.eq(productType));
        if (search != null && !search.isBlank()) {
            condition = condition.and(
                PRODUCTS.TITLE.containsIgnoreCase(search)
                    .or(PRODUCTS.SHORT_DESCRIPTION.containsIgnoreCase(search))
            );
        }

        return dsl.select(PRODUCTS.asterisk(), CATEGORIES.NAME.as("category_name"))
            .from(PRODUCTS)
            .leftJoin(CATEGORIES).on(PRODUCTS.CATEGORY_ID.eq(CATEGORIES.ID))
            .where(condition)
            .orderBy(PRODUCTS.CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(r -> new ProductRow(
                r.get(PRODUCTS.ID), r.get(PRODUCTS.TITLE), r.get(PRODUCTS.SLUG),
                r.get(PRODUCTS.DESCRIPTION), r.get(PRODUCTS.SHORT_DESCRIPTION),
                r.get(PRODUCTS.PRODUCT_TYPE), r.get(PRODUCTS.PRICE_AMOUNT),
                r.get(PRODUCTS.PRICE_CURRENCY), r.get(PRODUCTS.STATUS),
                r.get(PRODUCTS.THUMBNAIL_URL), r.get(PRODUCTS.CATEGORY_ID),
                r.get("category_name", String.class),
                r.get(PRODUCTS.CREATED_AT), r.get(PRODUCTS.UPDATED_AT)
            ));
    }

    long count(String status, UUID categoryId, String productType, String search) {
        Condition condition = DSL.trueCondition();
        if (status != null) condition = condition.and(PRODUCTS.STATUS.eq(status));
        if (categoryId != null) condition = condition.and(PRODUCTS.CATEGORY_ID.eq(categoryId));
        if (productType != null) condition = condition.and(PRODUCTS.PRODUCT_TYPE.eq(productType));
        if (search != null && !search.isBlank()) {
            condition = condition.and(
                PRODUCTS.TITLE.containsIgnoreCase(search)
                    .or(PRODUCTS.SHORT_DESCRIPTION.containsIgnoreCase(search))
            );
        }
        return dsl.selectCount().from(PRODUCTS).where(condition).fetchOne(0, long.class);
    }

    Optional<ProductRow> findById(UUID id) {
        return dsl.select(PRODUCTS.asterisk(), CATEGORIES.NAME.as("category_name"))
            .from(PRODUCTS)
            .leftJoin(CATEGORIES).on(PRODUCTS.CATEGORY_ID.eq(CATEGORIES.ID))
            .where(PRODUCTS.ID.eq(id))
            .fetchOptional(r -> new ProductRow(
                r.get(PRODUCTS.ID), r.get(PRODUCTS.TITLE), r.get(PRODUCTS.SLUG),
                r.get(PRODUCTS.DESCRIPTION), r.get(PRODUCTS.SHORT_DESCRIPTION),
                r.get(PRODUCTS.PRODUCT_TYPE), r.get(PRODUCTS.PRICE_AMOUNT),
                r.get(PRODUCTS.PRICE_CURRENCY), r.get(PRODUCTS.STATUS),
                r.get(PRODUCTS.THUMBNAIL_URL), r.get(PRODUCTS.CATEGORY_ID),
                r.get("category_name", String.class),
                r.get(PRODUCTS.CREATED_AT), r.get(PRODUCTS.UPDATED_AT)
            ));
    }

    Optional<ProductRow> findBySlug(String slug) {
        return dsl.select(PRODUCTS.asterisk(), CATEGORIES.NAME.as("category_name"))
            .from(PRODUCTS)
            .leftJoin(CATEGORIES).on(PRODUCTS.CATEGORY_ID.eq(CATEGORIES.ID))
            .where(PRODUCTS.SLUG.eq(slug))
            .fetchOptional(r -> new ProductRow(
                r.get(PRODUCTS.ID), r.get(PRODUCTS.TITLE), r.get(PRODUCTS.SLUG),
                r.get(PRODUCTS.DESCRIPTION), r.get(PRODUCTS.SHORT_DESCRIPTION),
                r.get(PRODUCTS.PRODUCT_TYPE), r.get(PRODUCTS.PRICE_AMOUNT),
                r.get(PRODUCTS.PRICE_CURRENCY), r.get(PRODUCTS.STATUS),
                r.get(PRODUCTS.THUMBNAIL_URL), r.get(PRODUCTS.CATEGORY_ID),
                r.get("category_name", String.class),
                r.get(PRODUCTS.CREATED_AT), r.get(PRODUCTS.UPDATED_AT)
            ));
    }

    UUID create(String title, String slug, String description, String shortDescription,
                String productType, BigDecimal priceAmount, String priceCurrency,
                String thumbnailUrl, UUID categoryId) {
        return dsl.insertInto(PRODUCTS)
            .set(PRODUCTS.TITLE, title)
            .set(PRODUCTS.SLUG, slug)
            .set(PRODUCTS.DESCRIPTION, description)
            .set(PRODUCTS.SHORT_DESCRIPTION, shortDescription)
            .set(PRODUCTS.PRODUCT_TYPE, productType)
            .set(PRODUCTS.PRICE_AMOUNT, priceAmount)
            .set(PRODUCTS.PRICE_CURRENCY, priceCurrency != null ? priceCurrency : "CZK")
            .set(PRODUCTS.THUMBNAIL_URL, thumbnailUrl)
            .set(PRODUCTS.CATEGORY_ID, categoryId)
            .returning(PRODUCTS.ID)
            .fetchOne(PRODUCTS.ID);
    }

    void update(UUID id, String title, String slug, String description, String shortDescription,
                String productType, BigDecimal priceAmount, String priceCurrency,
                String status, String thumbnailUrl, UUID categoryId) {
        dsl.update(PRODUCTS)
            .set(PRODUCTS.TITLE, title)
            .set(PRODUCTS.SLUG, slug)
            .set(PRODUCTS.DESCRIPTION, description)
            .set(PRODUCTS.SHORT_DESCRIPTION, shortDescription)
            .set(PRODUCTS.PRODUCT_TYPE, productType)
            .set(PRODUCTS.PRICE_AMOUNT, priceAmount)
            .set(PRODUCTS.PRICE_CURRENCY, priceCurrency != null ? priceCurrency : "CZK")
            .set(PRODUCTS.STATUS, status)
            .set(PRODUCTS.THUMBNAIL_URL, thumbnailUrl)
            .set(PRODUCTS.CATEGORY_ID, categoryId)
            .set(PRODUCTS.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCTS.ID.eq(id))
            .execute();
    }

    void updateStatus(UUID id, String status) {
        dsl.update(PRODUCTS)
            .set(PRODUCTS.STATUS, status)
            .set(PRODUCTS.UPDATED_AT, OffsetDateTime.now())
            .where(PRODUCTS.ID.eq(id))
            .execute();
    }

    boolean existsBySlug(String slug) {
        return dsl.fetchExists(
            dsl.selectFrom(PRODUCTS).where(PRODUCTS.SLUG.eq(slug))
        );
    }
}
```

**Step 3: Add product methods to CatalogService**

```java
    // Inject ProductRepository in constructor alongside CategoryRepository

    // --- Products ---

    public CatalogDtos.ProductListResponse getProducts(String status, UUID categoryId,
                                                        String productType, String search,
                                                        int page, int limit) {
        int offset = (page - 1) * limit;
        var items = productRepository.findAll(status, categoryId, productType, search, offset, limit);
        long total = productRepository.count(status, categoryId, productType, search);
        int totalPages = (int) Math.ceil((double) total / limit);

        var responses = items.stream()
            .map(this::toProductResponse)
            .toList();

        return new CatalogDtos.ProductListResponse(responses, page, limit, total, totalPages);
    }

    public CatalogDtos.ProductDetailResponse getProductBySlug(String slug) {
        var product = productRepository.findBySlug(slug)
            .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Product not found"));
        var assets = digitalAssetRepository.findByProductId(product.id()).stream()
            .map(a -> new CatalogDtos.AssetResponse(a.id(), a.assetType(), a.fileName(),
                a.fileSizeBytes(), a.mimeType(), a.durationSeconds(), a.sortOrder()))
            .toList();
        return toProductDetailResponse(product, assets);
    }

    @Transactional
    public CatalogDtos.ProductResponse createProduct(CatalogDtos.CreateProductRequest req) {
        if (productRepository.existsBySlug(req.slug())) {
            throw new IllegalArgumentException("Product slug already exists: " + req.slug());
        }
        var id = productRepository.create(req.title(), req.slug(), req.description(),
            req.shortDescription(), req.productType(), req.priceAmount(),
            req.priceCurrency(), req.thumbnailUrl(), req.categoryId());
        return productRepository.findById(id).map(this::toProductResponse).orElseThrow();
    }

    @Transactional
    public CatalogDtos.ProductResponse updateProduct(UUID id, CatalogDtos.UpdateProductRequest req) {
        productRepository.findById(id)
            .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Product not found"));
        productRepository.update(id, req.title(), req.slug(), req.description(),
            req.shortDescription(), req.productType(), req.priceAmount(),
            req.priceCurrency(), req.status(), req.thumbnailUrl(), req.categoryId());
        return productRepository.findById(id).map(this::toProductResponse).orElseThrow();
    }

    @Transactional
    public void archiveProduct(UUID id) {
        productRepository.findById(id)
            .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Product not found"));
        productRepository.updateStatus(id, "ARCHIVED");
    }

    private CatalogDtos.ProductResponse toProductResponse(ProductRepository.ProductRow r) {
        return new CatalogDtos.ProductResponse(
            r.id(), r.title(), r.slug(), r.description(), r.shortDescription(),
            r.productType(), r.priceAmount(), r.priceCurrency(), r.status(),
            r.thumbnailUrl(), r.categoryId(), r.categoryName(),
            r.createdAt(), r.updatedAt()
        );
    }

    private CatalogDtos.ProductDetailResponse toProductDetailResponse(
            ProductRepository.ProductRow r, List<CatalogDtos.AssetResponse> assets) {
        return new CatalogDtos.ProductDetailResponse(
            r.id(), r.title(), r.slug(), r.description(), r.shortDescription(),
            r.productType(), r.priceAmount(), r.priceCurrency(), r.status(),
            r.thumbnailUrl(), r.categoryId(), r.categoryName(), assets,
            r.createdAt(), r.updatedAt()
        );
    }
```

**Step 4: Add product endpoints to CatalogController and CatalogAdminController**

CatalogController additions:

```java
    @GetMapping("/products")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductListResponse>> getProducts(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) UUID category,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        // Public: only show ACTIVE products
        return ResponseEntity.ok(ApiResponse.ok(
            catalogService.getProducts("ACTIVE", category, type, search, page, limit)));
    }

    @GetMapping("/products/{slug}")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductDetailResponse>> getProduct(
            @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.getProductBySlug(slug)));
    }
```

CatalogAdminController — create new `ProductAdminController.java`:

```java
package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/products")
public class ProductAdminController {

    private final CatalogService catalogService;

    ProductAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CatalogDtos.ProductListResponse>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID category,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.ok(
            catalogService.getProducts(status, category, type, search, page, limit)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CatalogDtos.ProductResponse>> create(
            @Valid @RequestBody CatalogDtos.CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(catalogService.createProduct(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CatalogDtos.ProductResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody CatalogDtos.UpdateProductRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(catalogService.updateProduct(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        catalogService.archiveProduct(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Step 5: Write integration test**

```java
package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CatalogProductIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "ADMIN")
    void createAndListProduct() throws Exception {
        // Create product
        mockMvc.perform(post("/api/admin/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "E-book: Zdraví",
                        "slug": "ebook-zdravi",
                        "shortDescription": "Průvodce zdravým životem",
                        "productType": "DIGITAL",
                        "priceAmount": 299.00
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.title").value("E-book: Zdraví"))
            .andExpect(jsonPath("$.data.status").value("DRAFT"));

        // Public listing: should NOT show DRAFT products
        mockMvc.perform(get("/api/catalog/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.items.length()").value(0));

        // Admin listing: should show DRAFT products
        mockMvc.perform(get("/api/admin/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(1));
    }
}
```

**Step 6: Run tests**

Run: `cd apps/backend && mvn test`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/ apps/backend/src/test/java/cz/samofujera/catalog/
git commit -m "feat(backend): add product CRUD to catalog module"
```

---

## Task 5: Catalog Module — Digital Asset Management & R2 Upload

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/DigitalAssetRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/R2StorageService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/AssetAdminController.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Create: `apps/backend/src/test/java/cz/samofujera/catalog/AssetUploadIntegrationTest.java`

**Step 1: Create R2StorageService (S3-compatible)**

```java
package cz.samofujera.catalog.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

@Service
class R2StorageService {

    @Value("${r2.endpoint}")
    private String endpoint;

    @Value("${r2.access-key}")
    private String accessKey;

    @Value("${r2.secret-key}")
    private String secretKey;

    @Value("${r2.bucket}")
    private String bucket;

    private S3Client s3Client;
    private S3Presigner presigner;

    @PostConstruct
    void init() {
        var credentials = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey, secretKey));

        this.s3Client = S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(credentials)
            .region(Region.of("auto"))
            .forcePathStyle(true)
            .build();

        this.presigner = S3Presigner.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(credentials)
            .region(Region.of("auto"))
            .build();
    }

    void upload(String key, InputStream inputStream, long contentLength, String contentType) {
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .contentLength(contentLength)
                .build(),
            RequestBody.fromInputStream(inputStream, contentLength)
        );
    }

    void delete(String key) {
        s3Client.deleteObject(
            DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build()
        );
    }

    String generatePresignedUrl(String key, Duration ttl) {
        var presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(ttl)
            .getObjectRequest(b -> b.bucket(bucket).key(key))
            .build();
        return presigner.presignGetObject(presignRequest).url().toString();
    }
}
```

**Step 2: Create DigitalAssetRepository**

```java
package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.DIGITAL_ASSETS;

@Repository
class DigitalAssetRepository {

    private final DSLContext dsl;

    DigitalAssetRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record AssetRow(UUID id, UUID productId, String assetType, String fileKey,
                            String fileName, long fileSizeBytes, String mimeType,
                            String streamUid, Integer durationSeconds, int sortOrder,
                            OffsetDateTime createdAt) {}

    List<AssetRow> findByProductId(UUID productId) {
        return dsl.selectFrom(DIGITAL_ASSETS)
            .where(DIGITAL_ASSETS.PRODUCT_ID.eq(productId))
            .orderBy(DIGITAL_ASSETS.SORT_ORDER.asc())
            .fetch(r -> new AssetRow(
                r.getId(), r.getProductId(), r.getAssetType(), r.getFileKey(),
                r.getFileName(), r.getFileSizeBytes(), r.getMimeType(),
                r.getStreamUid(), r.getDurationSeconds(), r.getSortOrder(),
                r.getCreatedAt()
            ));
    }

    Optional<AssetRow> findById(UUID id) {
        return dsl.selectFrom(DIGITAL_ASSETS)
            .where(DIGITAL_ASSETS.ID.eq(id))
            .fetchOptional(r -> new AssetRow(
                r.getId(), r.getProductId(), r.getAssetType(), r.getFileKey(),
                r.getFileName(), r.getFileSizeBytes(), r.getMimeType(),
                r.getStreamUid(), r.getDurationSeconds(), r.getSortOrder(),
                r.getCreatedAt()
            ));
    }

    UUID create(UUID productId, String assetType, String fileKey, String fileName,
                long fileSizeBytes, String mimeType, int sortOrder) {
        return dsl.insertInto(DIGITAL_ASSETS)
            .set(DIGITAL_ASSETS.PRODUCT_ID, productId)
            .set(DIGITAL_ASSETS.ASSET_TYPE, assetType)
            .set(DIGITAL_ASSETS.FILE_KEY, fileKey)
            .set(DIGITAL_ASSETS.FILE_NAME, fileName)
            .set(DIGITAL_ASSETS.FILE_SIZE_BYTES, fileSizeBytes)
            .set(DIGITAL_ASSETS.MIME_TYPE, mimeType)
            .set(DIGITAL_ASSETS.SORT_ORDER, sortOrder)
            .returning(DIGITAL_ASSETS.ID)
            .fetchOne(DIGITAL_ASSETS.ID);
    }

    void delete(UUID id) {
        dsl.deleteFrom(DIGITAL_ASSETS)
            .where(DIGITAL_ASSETS.ID.eq(id))
            .execute();
    }
}
```

**Step 3: Add asset management methods to CatalogService**

```java
    // Inject DigitalAssetRepository and R2StorageService in constructor

    @Transactional
    public CatalogDtos.AssetResponse uploadAsset(UUID productId, String fileName,
                                                   String mimeType, long fileSize,
                                                   InputStream inputStream) {
        productRepository.findById(productId)
            .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Product not found"));

        String assetType = resolveAssetType(mimeType);
        String fileKey = "products/" + productId + "/" + UUID.randomUUID() + "/" + fileName;
        int sortOrder = digitalAssetRepository.findByProductId(productId).size();

        r2StorageService.upload(fileKey, inputStream, fileSize, mimeType);

        var id = digitalAssetRepository.create(productId, assetType, fileKey, fileName,
            fileSize, mimeType, sortOrder);

        return digitalAssetRepository.findById(id)
            .map(a -> new CatalogDtos.AssetResponse(a.id(), a.assetType(), a.fileName(),
                a.fileSizeBytes(), a.mimeType(), a.durationSeconds(), a.sortOrder()))
            .orElseThrow();
    }

    @Transactional
    public void deleteAsset(UUID productId, UUID assetId) {
        var asset = digitalAssetRepository.findById(assetId)
            .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Asset not found"));
        if (!asset.productId().equals(productId)) {
            throw new IllegalArgumentException("Asset does not belong to this product");
        }
        r2StorageService.delete(asset.fileKey());
        digitalAssetRepository.delete(assetId);
    }

    private String resolveAssetType(String mimeType) {
        if (mimeType.startsWith("application/pdf")) return "PDF";
        if (mimeType.startsWith("audio/")) return "MP3";
        if (mimeType.startsWith("video/")) return "VIDEO";
        if (mimeType.startsWith("application/zip")) return "ZIP";
        return "OTHER";
    }
```

**Step 4: Create AssetAdminController**

```java
package cz.samofujera.catalog;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/products/{productId}/assets")
public class AssetAdminController {

    private final CatalogService catalogService;

    AssetAdminController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CatalogDtos.AssetResponse>> upload(
            @PathVariable UUID productId,
            @RequestParam("file") MultipartFile file) throws IOException {
        var asset = catalogService.uploadAsset(
            productId, file.getOriginalFilename(), file.getContentType(),
            file.getSize(), file.getInputStream());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(asset));
    }

    @DeleteMapping("/{assetId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID productId,
            @PathVariable UUID assetId) {
        catalogService.deleteAsset(productId, assetId);
        return ResponseEntity.noContent().build();
    }
}
```

**Step 5: Write integration test (mock R2)**

```java
package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AssetUploadIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // Note: R2StorageService needs to be mocked or MinIO container used for tests.
    // For now, integration test focuses on HTTP layer validation.
    // Full upload test requires MinIO Testcontainer or mock.

    @Test
    @WithMockUser(roles = "ADMIN")
    void uploadAsset_returns404_whenProductNotFound() throws Exception {
        var file = new MockMultipartFile("file", "test.pdf",
            "application/pdf", "test content".getBytes());

        mockMvc.perform(multipart("/api/admin/products/00000000-0000-0000-0000-000000000001/assets")
                .file(file))
            .andExpect(status().isNotFound());
    }
}
```

**Step 6: Run tests**

Run: `cd apps/backend && mvn test`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/ apps/backend/src/test/java/cz/samofujera/catalog/
git commit -m "feat(backend): add digital asset management with R2 storage"
```

---

## Task 6: Order Module

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/order/OrderService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/OrderDtos.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/OrderController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/OrderAdminController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/event/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/event/OrderPaidEvent.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/internal/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/internal/OrderRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/internal/OrderItemRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/order/internal/ShippingRepository.java`
- Create: `apps/backend/src/test/java/cz/samofujera/order/OrderIntegrationTest.java`

**Step 1: Create domain events**

```java
// event/package-info.java
@org.springframework.modulith.NamedInterface("events")
package cz.samofujera.order.event;
```

```java
// event/OrderPaidEvent.java
package cz.samofujera.order.event;

import java.util.List;
import java.util.UUID;

public record OrderPaidEvent(
    UUID orderId,
    UUID userId,
    String userEmail,
    String userName,
    List<OrderItem> items
) {
    public record OrderItem(UUID productId, String productTitle, String productType, int quantity) {}
}
```

**Step 2: Create OrderDtos**

```java
package cz.samofujera.order;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {
    private OrderDtos() {}

    public record CheckoutRequest(
        @NotEmpty List<CheckoutItem> items,
        String voucherCode
    ) {}

    public record CheckoutItem(
        @NotNull UUID productId,
        @Min(1) int quantity
    ) {}

    public record CheckoutResponse(
        String checkoutUrl,
        UUID orderId
    ) {}

    public record OrderResponse(
        UUID id,
        String status,
        BigDecimal totalAmount,
        String currency,
        BigDecimal discountAmount,
        List<OrderItemResponse> items,
        ShippingResponse shipping,
        OffsetDateTime createdAt
    ) {}

    public record OrderItemResponse(
        UUID id,
        UUID productId,
        String productTitle,
        String productType,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        String thumbnailUrl
    ) {}

    public record OrderListResponse(
        List<OrderResponse> items,
        int page,
        int limit,
        long totalItems,
        int totalPages
    ) {}

    public record ShippingResponse(
        String carrier,
        String trackingNumber,
        String trackingUrl,
        OffsetDateTime shippedAt,
        OffsetDateTime deliveredAt
    ) {}

    public record UpdateShippingRequest(
        String carrier,
        String trackingNumber,
        String trackingUrl
    ) {}
}
```

**Step 3: Create repositories (OrderRepository, OrderItemRepository, ShippingRepository)**

Follow the same patterns as CategoryRepository/ProductRepository with JOOQ. Key methods:

- `OrderRepository`: `create(userId, totalAmount, currency, locale)`, `findById(id)`, `findByUserId(userId, offset, limit)`, `countByUserId(userId)`, `updateStatus(id, status, stripePaymentId)`, `findAll(status, offset, limit)`, `count(status)`
- `OrderItemRepository`: `create(orderId, productId, quantity, unitPrice, totalPrice, productSnapshot)`, `findByOrderId(orderId)`
- `ShippingRepository`: `findByOrderId(orderId)`, `upsert(orderId, carrier, trackingNumber, trackingUrl)`

**Step 4: Create OrderService**

Key methods:
- `createOrder(userId, items)` — creates order + order items, returns Order
- `markAsPaid(orderId, stripePaymentId)` — updates status, publishes `OrderPaidEvent`
- `getMyOrders(userId, page, limit)` — paginated customer orders
- `getOrder(userId, orderId)` — single order with items + shipping
- `getAllOrders(status, page, limit)` — admin: all orders
- `updateShipping(orderId, request)` — admin: add/update shipping

**Step 5: Create OrderController (customer endpoints)**

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    // GET /api/orders — my orders (paginated)
    // GET /api/orders/{id} — order detail (verify userId matches)
}
```

**Step 6: Create OrderAdminController**

```java
@RestController
@RequestMapping("/api/admin/orders")
public class OrderAdminController {
    // GET /api/admin/orders — all orders (paginated, filterable)
    // GET /api/admin/orders/{id} — order detail
    // PUT /api/admin/orders/{id}/shipping — update shipping
}
```

**Step 7: Write integration test**

Test: create order, verify status is PENDING, mark as PAID, verify event published.

**Step 8: Run tests**

Run: `cd apps/backend && mvn test`
Expected: All tests PASS.

**Step 9: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/order/ apps/backend/src/test/java/cz/samofujera/order/
git commit -m "feat(backend): add order module with lifecycle management"
```

---

## Task 7: Payment Module — Stripe Integration

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/payment/PaymentService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/payment/CheckoutController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/payment/StripeWebhookController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/payment/internal/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/payment/internal/StripeConfig.java`
- Create: `apps/backend/src/test/java/cz/samofujera/payment/StripeWebhookIntegrationTest.java`

**Step 1: Create StripeConfig**

```java
package cz.samofujera.payment.internal;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
class StripeConfig {

    @Value("${stripe.secret-key}")
    private String secretKey;

    @PostConstruct
    void init() {
        Stripe.apiKey = secretKey;
    }
}
```

**Step 2: Create PaymentService**

```java
package cz.samofujera.payment;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import cz.samofujera.catalog.CatalogService;
import cz.samofujera.order.OrderDtos;
import cz.samofujera.order.OrderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PaymentService {

    private final OrderService orderService;
    private final CatalogService catalogService;

    @Value("${app.frontend.url:http://localhost:4321}")
    private String frontendUrl;

    PaymentService(OrderService orderService, CatalogService catalogService) {
        this.orderService = orderService;
        this.catalogService = catalogService;
    }

    @Transactional
    public OrderDtos.CheckoutResponse createCheckout(UUID userId, OrderDtos.CheckoutRequest request)
            throws StripeException {
        // 1. Validate products exist and are ACTIVE
        // 2. Create order via OrderService
        // 3. Build Stripe Checkout Session with line items
        // 4. Return checkoutUrl + orderId

        var order = orderService.createOrder(userId, request.items());

        var sessionBuilder = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setClientReferenceId(order.id().toString())
            .setSuccessUrl(frontendUrl + "/pokladna/uspech?session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl(frontendUrl + "/pokladna/zruseno");

        for (var item : order.items()) {
            sessionBuilder.addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setQuantity((long) item.quantity())
                    .setPriceData(
                        SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency(order.currency().toLowerCase())
                            .setUnitAmount(item.unitPrice().movePointRight(2).longValue())
                            .setProductData(
                                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                    .setName(item.productTitle())
                                    .build()
                            )
                            .build()
                    )
                    .build()
            );
        }

        var session = Session.create(sessionBuilder.build());
        return new OrderDtos.CheckoutResponse(session.getUrl(), order.id());
    }

    @Transactional
    public void handleCheckoutCompleted(String orderId, String paymentIntentId) {
        orderService.markAsPaid(UUID.fromString(orderId), paymentIntentId);
    }
}
```

**Step 3: Create CheckoutController**

```java
package cz.samofujera.payment;

import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.order.OrderDtos;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final PaymentService paymentService;

    CheckoutController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderDtos.CheckoutResponse>> checkout(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody OrderDtos.CheckoutRequest request) throws Exception {
        return ResponseEntity.ok(ApiResponse.ok(
            paymentService.createCheckout(principal.getId(), request)));
    }
}
```

**Step 4: Create StripeWebhookController**

```java
package cz.samofujera.payment;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stripe")
public class StripeWebhookController {

    private final PaymentService paymentService;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    StripeWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        }

        if ("checkout.session.completed".equals(event.getType())) {
            var session = (Session) event.getDataObjectDeserializer()
                .getObject().orElse(null);
            if (session != null) {
                paymentService.handleCheckoutCompleted(
                    session.getClientReferenceId(),
                    session.getPaymentIntent()
                );
            }
        }

        return ResponseEntity.ok("OK");
    }
}
```

**Step 5: Write integration test with mock Stripe webhook**

Test: send mock webhook payload, verify order status changes to PAID.

**Step 6: Run tests**

Run: `cd apps/backend && mvn test`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/payment/ apps/backend/src/test/java/cz/samofujera/payment/
git commit -m "feat(backend): add payment module with Stripe checkout and webhook"
```

---

## Task 8: Entitlement Module

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/EntitlementService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/EntitlementDtos.java`
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/event/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/event/EntitlementGrantedEvent.java`
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/internal/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/internal/EntitlementRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/internal/EntitlementListener.java`
- Create: `apps/backend/src/test/java/cz/samofujera/entitlement/EntitlementIntegrationTest.java`

**Step 1: Create domain events**

```java
// event/package-info.java
@org.springframework.modulith.NamedInterface("events")
package cz.samofujera.entitlement.event;
```

```java
// event/EntitlementGrantedEvent.java
package cz.samofujera.entitlement.event;

import java.util.UUID;

public record EntitlementGrantedEvent(
    UUID userId,
    String userEmail,
    UUID productId,
    String productTitle,
    String productType
) {}
```

**Step 2: Create EntitlementRepository**

Key methods:
- `grant(userId, productId, sourceType, sourceId)` — insert entitlement
- `hasAccess(userId, productId)` — check active entitlement exists (revoked_at IS NULL, not expired)
- `findByUserId(userId)` — list all active entitlements for user
- `revoke(userId, productId)` — set revoked_at

**Step 3: Create EntitlementService**

```java
@Service
public class EntitlementService {

    // Public API methods (accessible from other modules):

    public void grantAccess(UUID userId, UUID productId, String sourceType, UUID sourceId) {
        // Create entitlement, publish EntitlementGrantedEvent
    }

    public boolean hasAccess(UUID userId, UUID productId) {
        // Check entitlement exists and is active
    }

    public List<EntitlementDtos.LibraryItem> getLibrary(UUID userId) {
        // Get all products the user has access to
    }

    public void revokeAccess(UUID userId, UUID productId) {
        // Soft revoke entitlement
    }
}
```

**Step 4: Create EntitlementListener (listens to OrderPaidEvent)**

```java
package cz.samofujera.entitlement.internal;

import cz.samofujera.entitlement.EntitlementService;
import cz.samofujera.order.event.OrderPaidEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
class EntitlementListener {

    private final EntitlementService entitlementService;

    EntitlementListener(EntitlementService entitlementService) {
        this.entitlementService = entitlementService;
    }

    @ApplicationModuleListener
    void on(OrderPaidEvent event) {
        for (var item : event.items()) {
            entitlementService.grantAccess(
                event.userId(), item.productId(), "PURCHASE", event.orderId());
        }
    }
}
```

**Step 5: Write integration test**

Test: grant entitlement, verify `hasAccess` returns true, revoke, verify `hasAccess` returns false.

**Step 6: Run tests**

Run: `cd apps/backend && mvn test`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/entitlement/ apps/backend/src/test/java/cz/samofujera/entitlement/
git commit -m "feat(backend): add entitlement module with access control"
```

---

## Task 9: Delivery Module — Download with Presigned URLs

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/delivery/DeliveryService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/delivery/DeliveryDtos.java`
- Create: `apps/backend/src/main/java/cz/samofujera/delivery/DeliveryController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/delivery/internal/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/delivery/internal/DownloadLogRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/delivery/internal/RateLimitService.java`
- Create: `apps/backend/src/test/java/cz/samofujera/delivery/DeliveryIntegrationTest.java`

**Step 1: Create RateLimitService (Redis-based)**

```java
package cz.samofujera.delivery.internal;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    RateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    boolean isRateLimited(UUID userId, int maxPerHour) {
        String key = "download:rate:" + userId;
        var count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, Duration.ofHours(1));
        }
        return count != null && count > maxPerHour;
    }
}
```

**Step 2: Create DownloadLogRepository**

```java
package cz.samofujera.delivery.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.DOWNLOAD_LOGS;

@Repository
class DownloadLogRepository {

    private final DSLContext dsl;

    DownloadLogRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    void log(UUID userId, UUID assetId, String ipAddress, String userAgent) {
        dsl.insertInto(DOWNLOAD_LOGS)
            .set(DOWNLOAD_LOGS.USER_ID, userId)
            .set(DOWNLOAD_LOGS.ASSET_ID, assetId)
            .set(DOWNLOAD_LOGS.IP_ADDRESS, ipAddress)
            .set(DOWNLOAD_LOGS.USER_AGENT, userAgent)
            .execute();
    }
}
```

**Step 3: Create DeliveryService**

```java
@Service
public class DeliveryService {

    // Injects: EntitlementService, CatalogService (for asset lookup),
    //          R2StorageService, DownloadLogRepository, RateLimitService

    public DeliveryDtos.DownloadResponse generateDownload(UUID userId, UUID assetId,
                                                           String ipAddress, String userAgent) {
        // 1. Get asset → get productId
        // 2. Check entitlement via EntitlementService.hasAccess(userId, productId)
        // 3. Check rate limit (5/hour/user)
        // 4. Generate presigned URL (15 min TTL) via R2StorageService
        // 5. Log download
        // 6. Return { downloadUrl, fileName, fileSize }
    }
}
```

**Step 4: Create DeliveryController**

```java
@RestController
@RequestMapping("/api/delivery")
public class DeliveryController {

    @GetMapping("/download/{assetId}")
    public ResponseEntity<ApiResponse<DeliveryDtos.DownloadResponse>> download(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID assetId,
            HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
            deliveryService.generateDownload(
                principal.getId(), assetId,
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
            )));
    }
}
```

**Step 5: Create Library endpoints (customer)**

Create `LibraryController.java`:

```java
@RestController
@RequestMapping("/api/library")
public class LibraryController {

    @GetMapping
    public ResponseEntity<ApiResponse<List<EntitlementDtos.LibraryItem>>> getLibrary(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(
            entitlementService.getLibrary(principal.getId())));
    }

    @GetMapping("/{productId}/assets")
    public ResponseEntity<ApiResponse<List<CatalogDtos.AssetResponse>>> getAssets(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID productId) {
        // Verify entitlement, then return assets (no download URLs)
    }
}
```

**Step 6: Write integration test**

Test: verify rate limiting works, verify download URL generation (mock R2).

**Step 7: Run tests**

Run: `cd apps/backend && mvn test`
Expected: All tests PASS.

**Step 8: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/delivery/ apps/backend/src/test/java/cz/samofujera/delivery/
git commit -m "feat(backend): add delivery module with presigned URLs and rate limiting"
```

---

## Task 10: Email Templates — Order Confirmation & Digital Delivery

**Files:**
- Create: `packages/emails/src/OrderConfirmation.tsx`
- Create: `packages/emails/src/DigitalDelivery.tsx`
- Modify: `packages/emails/build.ts`
- Modify: `apps/backend/src/main/java/cz/samofujera/email/internal/EmailListener.java`

**Step 1: Create OrderConfirmation email template**

```tsx
// packages/emails/src/OrderConfirmation.tsx
import { Heading, Text, Section, Row, Column, Hr } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const OrderConfirmation = () => (
  <Layout preview="Potvrzení objednávky">
    <Heading as="h2" style={heading}>
      {"Děkujeme za objednávku, {{name}}!"}
    </Heading>
    <Text style={paragraph}>
      {"Vaše objednávka č. {{orderId}} byla úspěšně zaplacena."}
    </Text>
    <Hr style={divider} />
    <Text style={label}>Položky:</Text>
    <Text style={paragraph}>{"{{items}}"}</Text>
    <Hr style={divider} />
    <Text style={total}>{"Celkem: {{totalAmount}} {{currency}}"}</Text>
  </Layout>
);

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#18181b", fontSize: "22px" };
const paragraph: React.CSSProperties = { margin: "0 0 12px", color: "#3f3f46", fontSize: "14px", lineHeight: "24px" };
const label: React.CSSProperties = { margin: "0 0 8px", color: "#71717a", fontSize: "12px", textTransform: "uppercase" as const };
const total: React.CSSProperties = { margin: "0", color: "#18181b", fontSize: "18px", fontWeight: "bold" };
const divider: React.CSSProperties = { margin: "16px 0", borderColor: "#e4e4e7" };
```

**Step 2: Create DigitalDelivery email template**

```tsx
// packages/emails/src/DigitalDelivery.tsx
import { Heading, Text, Button } from "@react-email/components";
import * as React from "react";
import { Layout } from "./components/Layout";

export const DigitalDelivery = () => (
  <Layout preview="Váš digitální obsah je připraven">
    <Heading as="h2" style={heading}>
      {"Váš produkt je připraven ke stažení!"}
    </Heading>
    <Text style={paragraph}>
      {"Produkt \"{{productTitle}}\" je nyní k dispozici ve vaší knihovně."}
    </Text>
    <Button href="{{libraryUrl}}" style={button}>
      Přejít do knihovny
    </Button>
  </Layout>
);

const heading: React.CSSProperties = { margin: "0 0 16px", color: "#18181b", fontSize: "22px" };
const paragraph: React.CSSProperties = { margin: "0 0 24px", color: "#3f3f46", fontSize: "14px", lineHeight: "24px" };
const button: React.CSSProperties = {
  backgroundColor: "#18181b", color: "#fafafa", padding: "12px 24px",
  borderRadius: "6px", fontSize: "14px", textDecoration: "none",
};
```

**Step 3: Update build.ts to include new templates**

Add to templates array:

```typescript
import { OrderConfirmation } from "./src/OrderConfirmation";
import { DigitalDelivery } from "./src/DigitalDelivery";

// In templates array:
{ name: "order-confirmation", component: OrderConfirmation },
{ name: "digital-delivery", component: DigitalDelivery },
```

**Step 4: Build email templates**

Run: `cd packages/emails && pnpm build`
Verify: `apps/backend/src/main/resources/templates/email/order-confirmation.html` and `digital-delivery.html` exist.

**Step 5: Add event listeners in EmailListener**

```java
    @ApplicationModuleListener
    void on(OrderPaidEvent event) {
        var itemLines = event.items().stream()
            .map(i -> i.quantity() + "× " + i.productTitle())
            .collect(Collectors.joining("\n"));

        emailService.send(event.userEmail(), "Potvrzení objednávky", "order-confirmation",
            Map.of(
                "name", event.userName(),
                "orderId", event.orderId().toString(),
                "items", itemLines,
                "totalAmount", "computed from order",
                "currency", "CZK"
            ));
    }

    @ApplicationModuleListener
    void on(EntitlementGrantedEvent event) {
        if ("DIGITAL".equals(event.productType()) || "STREAMING".equals(event.productType())) {
            emailService.send(event.userEmail(), "Váš digitální obsah je připraven", "digital-delivery",
                Map.of(
                    "productTitle", event.productTitle(),
                    "libraryUrl", frontendUrl + "/muj-ucet/knihovna"
                ));
        }
    }
```

**Step 6: Commit**

```bash
git add packages/emails/ apps/backend/src/main/resources/templates/email/ apps/backend/src/main/java/cz/samofujera/email/
git commit -m "feat(backend): add order confirmation and digital delivery email templates"
```

---

## Task 11: Frontend — API Client Endpoints

**Files:**
- Create: `packages/api-client/src/catalog.ts`
- Create: `packages/api-client/src/orders.ts`
- Create: `packages/api-client/src/library.ts`
- Create: `packages/api-client/src/admin.ts`
- Modify: `packages/api-client/src/types.ts`
- Modify: `packages/api-client/src/index.ts`

**Step 1: Add Phase 2 types to types.ts**

```typescript
// --- Catalog ---

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  children: CategoryResponse[];
}

export interface ProductResponse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  productType: string;
  priceAmount: number;
  priceCurrency: string;
  status: string;
  thumbnailUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: ProductResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductDetailResponse extends ProductResponse {
  assets: AssetResponse[];
}

export interface AssetResponse {
  id: string;
  assetType: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  durationSeconds: number | null;
  sortOrder: number;
}

// --- Orders ---

export interface OrderResponse {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  discountAmount: number;
  items: OrderItemResponse[];
  shipping: ShippingResponse | null;
  createdAt: string;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  productTitle: string;
  productType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnailUrl: string | null;
}

export interface OrderListResponse {
  items: OrderResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ShippingResponse {
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface CheckoutRequest {
  items: { productId: string; quantity: number }[];
  voucherCode?: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  orderId: string;
}

// --- Library ---

export interface LibraryItem {
  productId: string;
  productTitle: string;
  productType: string;
  thumbnailUrl: string | null;
  grantedAt: string;
}

export interface DownloadResponse {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

// --- Admin ---

export interface CreateProductRequest {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  productType: string;
  priceAmount: number;
  priceCurrency?: string;
  thumbnailUrl?: string;
  categoryId?: string;
}

export interface UpdateProductRequest extends CreateProductRequest {
  status: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  parentId?: string;
  sortOrder: number;
}

export interface UpdateShippingRequest {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}
```

**Step 2: Create catalog.ts**

```typescript
import { apiFetch } from "./client";
import type { ApiResponse, CategoryResponse, ProductListResponse, ProductDetailResponse } from "./types";

export const catalogApi = {
  getCategories: () =>
    apiFetch<ApiResponse<CategoryResponse[]>>("/api/catalog/categories"),

  getProducts: (params?: { page?: number; limit?: number; category?: string; type?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.category) searchParams.set("category", params.category);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<ProductListResponse>>(`/api/catalog/products${qs ? `?${qs}` : ""}`);
  },

  getProduct: (slug: string) =>
    apiFetch<ApiResponse<ProductDetailResponse>>(`/api/catalog/products/${slug}`),
};
```

**Step 3: Create orders.ts, library.ts, admin.ts following same pattern**

**Step 4: Update index.ts barrel exports**

```typescript
export { catalogApi } from "./catalog";
export { ordersApi } from "./orders";
export { libraryApi } from "./library";
export { adminApi } from "./admin";
```

**Step 5: Verify TypeScript compiles**

Run: `cd packages/api-client && pnpm typecheck`
Expected: No errors.

**Step 6: Commit**

```bash
git add packages/api-client/
git commit -m "feat(api-client): add catalog, orders, library, and admin API endpoints"
```

---

## Task 12: Frontend — Catalog Pages (Public)

**Files:**
- Create: `apps/web/src/pages/katalog/index.astro`
- Create: `apps/web/src/pages/katalog/[...slug].astro`
- Create: `apps/web/src/components/catalog/CatalogPage.tsx`
- Create: `apps/web/src/components/catalog/ProductDetailPage.tsx`
- Create: `apps/web/src/components/catalog/ProductCard.tsx`
- Create: `apps/web/src/components/catalog/CategoryFilter.tsx`
- Modify: `apps/web/public/_redirects`

**Step 1: Create Astro shell for catalog listing**

```astro
---
// apps/web/src/pages/katalog/index.astro
import BaseLayout from "../../layouts/BaseLayout.astro";
---

<BaseLayout title="Katalog">
  <div id="catalog-root" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"></div>
  <script>
    import { renderCatalog } from "../../components/catalog/main";
    renderCatalog();
  </script>
</BaseLayout>
```

**Step 2: Create Astro shell for product detail**

```astro
---
// apps/web/src/pages/katalog/[...slug].astro
import "../../styles/global.css";

export function getStaticPaths() {
  return [{ params: { slug: undefined } }];
}
---

<!doctype html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>Katalog | Samo Fujera</title>
  </head>
  <body class="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans antialiased">
    <div id="catalog-root"></div>
    <script>
      import { renderCatalog } from "../../components/catalog/main";
      renderCatalog();
    </script>
  </body>
</html>
```

**Step 3: Create catalog React components**

`main.tsx` — mounts React app with QueryClient, Router (catalog-specific routes)

`CatalogPage.tsx` — uses `useQuery` with `catalogApi.getProducts()`, renders grid of `ProductCard`, includes `CategoryFilter` sidebar, search input, pagination.

`ProductCard.tsx` — card with thumbnail, title, price, product type badge, "Koupit" button.

`ProductDetailPage.tsx` — uses `useQuery` with `catalogApi.getProduct(slug)`, shows full description, asset list (names only, no download), price, "Přidat do košíku" button.

`CategoryFilter.tsx` — renders category tree from `catalogApi.getCategories()`, clickable to filter.

**Step 4: Add _redirects for catalog SPA routing**

```
/katalog/*  /katalog/index.html  200
```

**Step 5: Verify build**

Run: `cd apps/web && pnpm build`
Expected: BUILD SUCCESS.

**Step 6: Commit**

```bash
git add apps/web/src/pages/katalog/ apps/web/src/components/catalog/ apps/web/public/_redirects
git commit -m "feat(web): add public catalog pages with client-side fetching"
```

---

## Task 13: Frontend — Checkout Pages

**Files:**
- Create: `apps/web/src/pages/pokladna/uspech.astro`
- Create: `apps/web/src/pages/pokladna/zruseno.astro`
- Create: `apps/web/src/components/checkout/CheckoutSuccess.tsx`

**Step 1: Create success page**

```astro
---
// apps/web/src/pages/pokladna/uspech.astro
import BaseLayout from "../../layouts/BaseLayout.astro";
---

<BaseLayout title="Objednávka úspěšná">
  <div class="max-w-2xl mx-auto px-4 py-16 text-center">
    <div id="checkout-success"></div>
    <script>
      import { renderCheckoutSuccess } from "../../components/checkout/main";
      renderCheckoutSuccess();
    </script>
  </div>
</BaseLayout>
```

**Step 2: Create cancelled page**

```astro
---
// apps/web/src/pages/pokladna/zruseno.astro
import BaseLayout from "../../layouts/BaseLayout.astro";
---

<BaseLayout title="Objednávka zrušena">
  <div class="max-w-2xl mx-auto px-4 py-16 text-center">
    <h1 class="text-2xl font-bold mb-4">Objednávka byla zrušena</h1>
    <p class="text-[var(--muted-foreground)] mb-8">
      Platba nebyla provedena. Můžete se vrátit do katalogu a zkusit to znovu.
    </p>
    <a href="/katalog" class="text-[var(--primary)] hover:underline">
      Zpět do katalogu
    </a>
  </div>
</BaseLayout>
```

**Step 3: Create CheckoutSuccess component**

React component that reads `session_id` from URL params, shows order confirmation message, link to library.

**Step 4: Commit**

```bash
git add apps/web/src/pages/pokladna/ apps/web/src/components/checkout/
git commit -m "feat(web): add checkout success and cancelled pages"
```

---

## Task 14: Frontend — Admin Product Management

**Files:**
- Modify: `apps/web/src/components/admin/router.tsx`
- Create: `apps/web/src/components/admin/routes/products.tsx`
- Create: `apps/web/src/components/admin/routes/product-new.tsx`
- Create: `apps/web/src/components/admin/routes/product-edit.tsx`

**Step 1: Add product routes to admin router**

```typescript
import { ProductsPage } from "./routes/products";
import { ProductNewPage } from "./routes/product-new";
import { ProductEditPage } from "./routes/product-edit";

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty",
  component: ProductsPage,
});

const productNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/novy",
  component: ProductNewPage,
});

const productEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/$productId",
  component: ProductEditPage,
});

// Add to routeTree
```

**Step 2: Create ProductsPage — DataTable with filters**

Uses `useQuery` with `adminApi.getProducts()`, renders table with columns: title, type, status, price, actions. Status filter (DRAFT/ACTIVE/ARCHIVED), type filter, search. "Nový produkt" button.

**Step 3: Create ProductNewPage — Create product form**

Form with fields: title, slug (auto-generated from title), description (textarea), short description, product type (select), price, currency, category (select from `catalogApi.getCategories()`), thumbnail URL. Uses `useMutation` with `adminApi.createProduct()`. Redirects to edit page on success.

**Step 4: Create ProductEditPage — Edit product + asset management**

Uses `useQuery` to fetch product by ID, editable form, plus asset upload section. Asset upload uses `<input type="file">` + `adminApi.uploadAsset()`. Shows list of assets with delete buttons.

**Step 5: Verify build**

Run: `cd apps/web && pnpm build`
Expected: BUILD SUCCESS.

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/
git commit -m "feat(web): add admin product management pages"
```

---

## Task 15: Frontend — Admin Category & Order Management

**Files:**
- Create: `apps/web/src/components/admin/routes/categories.tsx`
- Create: `apps/web/src/components/admin/routes/orders.tsx`
- Create: `apps/web/src/components/admin/routes/order-detail.tsx`
- Modify: `apps/web/src/components/admin/router.tsx`

**Step 1: Add routes to admin router**

```typescript
const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kategorie",
  component: CategoriesPage,
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/objednavky",
  component: OrdersPage,
});

const orderDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/objednavky/$orderId",
  component: OrderDetailPage,
});
```

**Step 2: Create CategoriesPage — Tree view with CRUD**

Renders category tree from `catalogApi.getCategories()`. Inline edit/delete, "Nová kategorie" dialog with form. Uses `useMutation` for create/update/delete.

**Step 3: Create OrdersPage — DataTable**

Table with columns: order ID (truncated), customer email, status, total, date. Status filter. Click to navigate to detail.

**Step 4: Create OrderDetailPage**

Shows order items, status, totals, shipping form (for physical products). Shipping form: carrier, tracking number, tracking URL. Uses `useMutation` with `adminApi.updateShipping()`.

**Step 5: Verify build**

Run: `cd apps/web && pnpm build`
Expected: BUILD SUCCESS.

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/
git commit -m "feat(web): add admin category and order management"
```

---

## Task 16: Frontend — Customer Library & Orders

**Files:**
- Modify: `apps/web/src/components/customer/router.tsx`
- Create: `apps/web/src/components/customer/routes/library.tsx`
- Create: `apps/web/src/components/customer/routes/library-product.tsx`
- Create: `apps/web/src/components/customer/routes/orders.tsx`
- Create: `apps/web/src/components/customer/routes/order-detail.tsx`

**Step 1: Add routes to customer router**

```typescript
const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/knihovna",
  component: LibraryPage,
});

const libraryProductRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/knihovna/$productId",
  component: LibraryProductPage,
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/objednavky",
  component: OrdersPage,
});

const orderDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/objednavky/$orderId",
  component: OrderDetailPage,
});
```

**Step 2: Create LibraryPage — Grid of purchased products**

Uses `useQuery` with `libraryApi.getLibrary()`. Renders cards with thumbnail, title, product type badge. Click navigates to product detail.

**Step 3: Create LibraryProductPage — Download/stream view**

Shows product info + asset list. Download button for each asset calls `libraryApi.download(assetId)` then opens `downloadUrl` in new tab. Shows rate limit warning if 429 returned.

**Step 4: Create OrdersPage and OrderDetailPage (customer view)**

OrdersPage: table of past orders with status, total, date. OrderDetailPage: items, status, shipping tracking (if physical).

**Step 5: Verify build**

Run: `cd apps/web && pnpm build`
Expected: BUILD SUCCESS.

**Step 6: Commit**

```bash
git add apps/web/src/components/customer/
git commit -m "feat(web): add customer library and order history pages"
```

---

## Task 17: Spring Modulith Verification Test

**Files:**
- Create: `apps/backend/src/test/java/cz/samofujera/ModulithVerificationTest.java`

**Step 1: Write modulith structure verification test**

```java
package cz.samofujera;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

class ModulithVerificationTest {

    ApplicationModules modules = ApplicationModules.of(SamofujeraApplication.class);

    @Test
    void verifiesModularStructure() {
        modules.verify();
    }

    @Test
    void createModuleDocumentation() {
        new Documenter(modules).writeDocumentation();
    }
}
```

**Step 2: Run test**

Run: `cd apps/backend && mvn test -Dtest=ModulithVerificationTest`
Expected: PASS — all modules have valid boundaries, no illegal cross-module dependencies.

**Step 3: Commit**

```bash
git add apps/backend/src/test/java/cz/samofujera/ModulithVerificationTest.java
git commit -m "test(backend): add Spring Modulith structure verification test"
```

---

## Task 18: Full Integration Test — End-to-End Checkout Flow

**Files:**
- Create: `apps/backend/src/test/java/cz/samofujera/CheckoutFlowIntegrationTest.java`

**Step 1: Write end-to-end test**

```java
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CheckoutFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @Test
    @WithMockUser(username = "test@example.com", roles = "ADMIN")
    void fullCheckoutFlow() throws Exception {
        // 1. Create category
        // 2. Create product (set status ACTIVE)
        // 3. POST /api/checkout with product
        //    (mock Stripe or verify order created with PENDING status)
        // 4. Simulate Stripe webhook (checkout.session.completed)
        //    (verify signature mock)
        // 5. Verify order status is PAID
        // 6. Verify entitlement granted
        // 7. Verify library contains the product
    }
}
```

**Step 2: Run test**

Run: `cd apps/backend && mvn test -Dtest=CheckoutFlowIntegrationTest`
Expected: PASS.

**Step 3: Commit**

```bash
git add apps/backend/src/test/java/cz/samofujera/CheckoutFlowIntegrationTest.java
git commit -m "test(backend): add end-to-end checkout flow integration test"
```

---

## Task 19: Run All Tests & Final Verification

**Step 1: Run all backend tests**

Run: `cd apps/backend && mvn test`
Expected: All tests PASS.

**Step 2: Run frontend build**

Run: `cd apps/web && pnpm build`
Expected: BUILD SUCCESS.

**Step 3: Run frontend typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: No errors.

**Step 4: Run api-client typecheck**

Run: `cd packages/api-client && pnpm typecheck`
Expected: No errors.

**Step 5: Final commit if any fixups needed**

---

## Summary

| Task | Description | Estimated Commits |
|------|-------------|-------------------|
| 1 | Database migrations V6–V13 + JOOQ regen | 1 |
| 2 | Stripe + R2 dependencies | 1 |
| 3 | Catalog module — categories | 1 |
| 4 | Catalog module — products | 1 |
| 5 | Catalog module — digital assets + R2 | 1 |
| 6 | Order module | 1 |
| 7 | Payment module — Stripe | 1 |
| 8 | Entitlement module | 1 |
| 9 | Delivery module — downloads | 1 |
| 10 | Email templates | 1 |
| 11 | API client endpoints | 1 |
| 12 | Frontend — catalog pages | 1 |
| 13 | Frontend — checkout pages | 1 |
| 14 | Frontend — admin products | 1 |
| 15 | Frontend — admin categories + orders | 1 |
| 16 | Frontend — customer library + orders | 1 |
| 17 | Modulith verification test | 1 |
| 18 | E2E checkout flow test | 1 |
| 19 | Final verification | 0–1 |
| **Total** | | **~19 commits** |
