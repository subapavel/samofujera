# Physical Product Form Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the PHYSICAL product create/edit form into Webnode-style tabbed layout (Produkt, Galerie, Sklad, Podpora prodeje, Varianty, Pokročilé) with new DB fields for inventory, promotions, shipping, and enhanced variant management.

**Architecture:** Add new columns to `products` and `product_variants` via Flyway migration, regenerate JOOQ, extend backend DTOs and service, update TypeScript types in api-client, then restructure frontend form with new tab components. PHYSICAL type only — other types unchanged.

**Tech Stack:** Flyway, JOOQ, Spring Boot 4, Java records, React 19, React Hook Form + Zod, TanStack Query, Lexical editor, shadcn/ui, Lingui i18n

**Design doc:** `docs/plans/2026-02-24-physical-product-form-design.md`

---

### Task 1: Database Migration — New Product & Variant Columns

Add physical product fields (inventory, shipping, promotions) to `products` table and enhance `product_variants`.

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V30__physical_product_fields.sql`

**Step 1: Write migration**

```sql
-- Physical product fields on products table
ALTER TABLE products ADD COLUMN sku VARCHAR(100);
ALTER TABLE products ADD COLUMN badge VARCHAR(100);
ALTER TABLE products ADD COLUMN compare_price_czk NUMERIC(10,2);
ALTER TABLE products ADD COLUMN compare_price_eur NUMERIC(10,2);
ALTER TABLE products ADD COLUMN availability VARCHAR(20) DEFAULT 'hidden';
ALTER TABLE products ADD COLUMN stock_limit INTEGER;
ALTER TABLE products ADD COLUMN weight_kg NUMERIC(8,3);
ALTER TABLE products ADD COLUMN dimension_width_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN dimension_length_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN dimension_height_cm NUMERIC(8,2);
ALTER TABLE products ADD COLUMN unit_price_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN og_image_url TEXT;
ALTER TABLE products ADD COLUMN variant_category_name VARCHAR(255);

-- Enhanced variant fields
ALTER TABLE product_variants ADD COLUMN availability VARCHAR(20) DEFAULT 'hidden';
ALTER TABLE product_variants ADD COLUMN weight_kg NUMERIC(8,3);
ALTER TABLE product_variants ADD COLUMN hidden BOOLEAN DEFAULT false;
```

**Step 2: Run migration and regenerate JOOQ**

```bash
cd apps/backend
mvn clean compile -DskipTests
```

This runs Flyway migration (via Testcontainers) then JOOQ codegen. Verify new columns appear in generated classes.

**Step 3: Verify**

Check that `apps/backend/target/generated-sources/jooq/` contains the new columns in `Products` and `ProductVariants` table classes.

**Step 4: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V30__physical_product_fields.sql
git commit -m "feat(backend): add physical product fields migration"
```

---

### Task 2: Backend DTOs — Extend Product & Variant Records

Add new fields to Java record DTOs for request/response. Located in `CatalogDtos.java`.

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`

**Step 1: Update `CreateProductRequest` record**

Add these fields after the existing ones:

```java
String sku,
String badge,
BigDecimal comparePriceCzk,
BigDecimal comparePriceEur,
String availability,
Integer stockLimit,
BigDecimal weightKg,
BigDecimal dimensionWidthCm,
BigDecimal dimensionLengthCm,
BigDecimal dimensionHeightCm,
Boolean unitPriceEnabled,
String ogImageUrl,
String variantCategoryName
```

**Step 2: Update `ProductResponse` record**

Add the same fields to the response record so the frontend can read them back:

```java
String sku,
String badge,
BigDecimal comparePriceCzk,
BigDecimal comparePriceEur,
String availability,
Integer stockLimit,
BigDecimal weightKg,
BigDecimal dimensionWidthCm,
BigDecimal dimensionLengthCm,
BigDecimal dimensionHeightCm,
Boolean unitPriceEnabled,
String ogImageUrl,
String variantCategoryName
```

**Step 3: Update `CreateVariantRequest` record**

Add after existing fields:

```java
String availability,
BigDecimal weightKg,
Boolean hidden
```

**Step 4: Update `VariantResponse` record**

Add matching fields:

```java
String availability,
BigDecimal weightKg,
Boolean hidden
```

**Step 5: Run tests**

```bash
cd apps/backend && mvn test -pl .
```

Fix any compilation errors from the record changes (callers of these records will need updating).

**Step 6: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java
git commit -m "feat(backend): extend product and variant dtos with physical fields"
```

---

### Task 3: Backend Service & Repository — Persist New Fields

Update `CatalogService` and `ProductRepository` to read/write the new columns.

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductRepository.java`

**Step 1: Update ProductRepository**

In the repository's insert and update methods, add the new columns to the JOOQ query. Map:
- `request.sku()` → `PRODUCTS.SKU`
- `request.badge()` → `PRODUCTS.BADGE`
- `request.comparePriceCzk()` → `PRODUCTS.COMPARE_PRICE_CZK`
- `request.comparePriceEur()` → `PRODUCTS.COMPARE_PRICE_EUR`
- `request.availability()` → `PRODUCTS.AVAILABILITY`
- `request.stockLimit()` → `PRODUCTS.STOCK_LIMIT`
- `request.weightKg()` → `PRODUCTS.WEIGHT_KG`
- `request.dimensionWidthCm()` → `PRODUCTS.DIMENSION_WIDTH_CM`
- `request.dimensionLengthCm()` → `PRODUCTS.DIMENSION_LENGTH_CM`
- `request.dimensionHeightCm()` → `PRODUCTS.DIMENSION_HEIGHT_CM`
- `request.unitPriceEnabled()` → `PRODUCTS.UNIT_PRICE_ENABLED`
- `request.ogImageUrl()` → `PRODUCTS.OG_IMAGE_URL`
- `request.variantCategoryName()` → `PRODUCTS.VARIANT_CATEGORY_NAME`

Also update the response mapping to include these fields.

**Step 2: Update VariantRepository (or inline variant handling in CatalogService)**

Add variant columns:
- `request.availability()` → `PRODUCT_VARIANTS.AVAILABILITY`
- `request.weightKg()` → `PRODUCT_VARIANTS.WEIGHT_KG`
- `request.hidden()` → `PRODUCT_VARIANTS.HIDDEN`

Update variant response mapping to include new fields.

**Step 3: Update CatalogService**

Ensure `createProduct()`, `updateProduct()`, `createVariant()`, `updateVariant()` pass through the new fields. The service delegates to repository, so main changes are in the repository.

**Step 4: Run tests**

```bash
cd apps/backend && mvn test -pl .
```

All 128+ existing tests should pass. Fix any issues.

**Step 5: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/
git commit -m "feat(backend): persist physical product fields in repository and service"
```

---

### Task 4: Backend Integration Test — New Fields

Write a test that creates a product with the new fields and reads them back.

**Files:**
- Create: `apps/backend/src/test/java/cz/samofujera/catalog/PhysicalProductFieldsTest.java`

**Step 1: Write test**

```java
@SpringBootTest
@AutoConfigureMockMvc
class PhysicalProductFieldsTest extends BaseIntegrationTest {

    @Test
    void createPhysicalProduct_withNewFields_returnsAllFields() {
        // Create product with all new fields populated
        // Verify response contains: sku, badge, comparePriceCzk, availability,
        //   stockLimit, weightKg, dimensions, unitPriceEnabled, ogImageUrl, variantCategoryName
    }

    @Test
    void updatePhysicalProduct_setsNewFields() {
        // Create draft, then update with new fields
        // GET and verify all fields persisted
    }

    @Test
    void createVariant_withNewFields_returnsEnhancedVariant() {
        // Create product, then create variant with availability, weightKg, hidden
        // Verify variant response includes new fields
    }
}
```

**Step 2: Run tests**

```bash
cd apps/backend && mvn test -pl . -Dtest=PhysicalProductFieldsTest
```

Expected: All 3 tests pass.

**Step 3: Run all tests**

```bash
cd apps/backend && mvn test -pl .
```

Expected: All tests green.

**Step 4: Commit**

```bash
git add apps/backend/src/test/java/cz/samofujera/catalog/PhysicalProductFieldsTest.java
git commit -m "test(backend): add integration tests for physical product fields"
```

---

### Task 5: API Client Types — Extend TypeScript Interfaces

Update the shared api-client types to include new fields.

**Files:**
- Modify: `packages/api-client/src/types.ts`

**Step 1: Update `ProductResponse` interface**

Add after existing fields:

```typescript
sku: string | null;
badge: string | null;
comparePriceCzk: number | null;
comparePriceEur: number | null;
availability: string | null;
stockLimit: number | null;
weightKg: number | null;
dimensionWidthCm: number | null;
dimensionLengthCm: number | null;
dimensionHeightCm: number | null;
unitPriceEnabled: boolean;
ogImageUrl: string | null;
variantCategoryName: string | null;
```

**Step 2: Update `CreateProductRequest` interface**

Add optional fields:

```typescript
sku?: string;
badge?: string;
comparePriceCzk?: number;
comparePriceEur?: number;
availability?: string;
stockLimit?: number;
weightKg?: number;
dimensionWidthCm?: number;
dimensionLengthCm?: number;
dimensionHeightCm?: number;
unitPriceEnabled?: boolean;
ogImageUrl?: string;
variantCategoryName?: string;
```

**Step 3: Update `VariantResponse` interface**

Add:

```typescript
availability: string | null;
weightKg: number | null;
hidden: boolean;
```

**Step 4: Update `CreateVariantRequest` interface**

Add:

```typescript
availability?: string;
weightKg?: number;
hidden?: boolean;
```

**Step 5: Verify types compile**

```bash
cd packages/api-client && pnpm tsc --noEmit
```

**Step 6: Commit**

```bash
git add packages/api-client/src/types.ts
git commit -m "feat(api-client): add physical product and variant field types"
```

---

### Task 6: Frontend — Sklad Tab Component

Create the inventory/warehouse management tab.

**Files:**
- Create: `apps/web/src/components/admin/products/sklad-tab.tsx`

**Step 1: Create component**

The component receives form control from React Hook Form and renders:

1. **Správa skladu** section header
2. **Dostupnost** — `<Select>` dropdown with options: Nezobrazovat, Skladem, Není skladem, Na objednávku
3. **Omezit dostupnost** — Checkbox + number Input with "ks" suffix (only enabled when checkbox checked)
4. **Produktové číslo** — text Input

5. **Doprava** section header
6. **Váha** — number Input with "kg" suffix, step 0.001
7. **Rozměry** — three number Inputs (Šířka, Délka, Výška) with "cm" suffix in a row with "×" separators

Use shadcn/ui components: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `Input`, `Checkbox`, `Label`.
All labels through Lingui `t` macro.
Component should accept `form` (UseFormReturn) and `disabled` props.

**Step 2: Verify it compiles**

```bash
pnpm turbo typecheck --filter=web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/products/sklad-tab.tsx
git commit -m "feat(admin): add sklad (inventory) tab component"
```

---

### Task 7: Frontend — Podpora Prodeje Tab Component

Create the promotional fields tab.

**Files:**
- Create: `apps/web/src/components/admin/products/podpora-prodeje-tab.tsx`

**Step 1: Create component**

Renders:
1. **Podpora prodeje** section header
2. **Štítek produktu** — text Input with help tooltip icon, placeholder "např. Novinka"
3. **Původní cena** — number Input with "Kč" suffix, step 0.01, help tooltip

Accept `form` and `disabled` props.
All labels via Lingui.

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/products/podpora-prodeje-tab.tsx
git commit -m "feat(admin): add podpora prodeje (promotions) tab component"
```

---

### Task 8: Frontend — Pokročilé Tab Component (SEO + OG Image + Preview)

Create the advanced/SEO tab with Google preview and OG image.

**Files:**
- Create: `apps/web/src/components/admin/products/pokrocile-tab.tsx`

**Step 1: Create component**

Reference the page editor's `SettingsDrawer.tsx` for the `GooglePreview` and `SocialPreview` pattern.

Renders:
1. **SEO nastavení stránky** section header
2. **Titulek stránky** and **URL identifikátor stránky** — side by side inputs
3. **Popisek stránky** and **Klíčová slova** — side by side textareas
4. **OG obrázek** — ImagePicker button + preview (reuse existing `ImagePicker` component from `apps/web/src/components/admin/images/ImagePicker.tsx`)
5. **Náhled ve vyhledávači** — `GooglePreview` showing: truncated title (60 chars), URL `samofujera.cz/produkty/{slug}`, description (160 chars). Updates live as user types.

Accept `form`, `disabled`, and `slug` props.
All labels via Lingui.

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/products/pokrocile-tab.tsx
git commit -m "feat(admin): add pokrocile (advanced/seo) tab with google preview"
```

---

### Task 9: Frontend — Webnode-style Variants Tab

Replace the current variant inline table with Webnode-style: empty state → category + tag input → settings table.

**Files:**
- Create: `apps/web/src/components/admin/products/variants-tab-webnode.tsx`

**Step 1: Create component**

Three states:

**Empty state** (no variants, no category):
- Centered layout with "Tvorba variant" heading
- Description: "Vytvořte varianty a prodávejte produkty v různých barvách či velikostech. Nastavte pro každou variantu vlastní cenu a skladovou dostupnost."
- "Vytvořit první variantu" button

**Creation mode** (category entered, managing tags):
- **Tvorba variant** section header
- **Kategorie variant** — text Input (e.g. "Díly")
- **Varianty produktu** — tag input component. On Enter/comma, text becomes a chip with × to remove. Chips displayed as rounded bordered tags.
- Trash icon to delete all variants

**Settings table** (variants exist):
- **Nastavení variant** section header
- Table with columns: variant name (label), Cena s DPH (number + Kč), Omezit dostupnost (number + ks), Dostupnost (Select dropdown), Produktové číslo (text Input), Váha (number + kg), Skrýt (Checkbox)
- One row per variant from the tags above

Variant CRUD:
- When a tag is added → call `adminApi.createVariant(productId, { name: tagText, ...defaults })`
- When a tag is removed → call `adminApi.deleteVariant(productId, variantId)`
- When table cell edited → debounced `adminApi.updateVariant(productId, variantId, data)`
- Uses TanStack Query mutations with `invalidateProduct` callback

Accept `productId`, `variants`, `variantCategoryName`, `onInvalidate`, `onCategoryNameChange` props.

**Step 2: Verify**

```bash
pnpm turbo typecheck --filter=web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/products/variants-tab-webnode.tsx
git commit -m "feat(admin): add webnode-style variants tab with tag input"
```

---

### Task 10: Frontend — Restructure Product Edit Dialog for PHYSICAL Type

Wire up all new tabs into the edit dialog. Only PHYSICAL products get the new layout.

**Files:**
- Modify: `apps/web/src/components/admin/products/product-edit-dialog.tsx`

**Step 1: Extend Zod schema**

Add to `productFormSchema`:

```typescript
// Sklad fields
sku: z.string().optional().default(""),
availability: z.string().optional().default("hidden"),
stockLimitEnabled: z.boolean().optional().default(false),
stockLimit: z.string().optional().default(""),
weightKg: z.string().optional().default(""),
dimensionWidthCm: z.string().optional().default(""),
dimensionLengthCm: z.string().optional().default(""),
dimensionHeightCm: z.string().optional().default(""),

// Podpora prodeje fields
badge: z.string().optional().default(""),
comparePriceCzk: z.string().optional().default(""),

// Produkt fields
unitPriceEnabled: z.boolean().optional().default(false),
description: z.string().optional().default(""), // now Lexical JSON

// Pokročilé fields
ogImageUrl: z.string().optional().default(""),
variantCategoryName: z.string().optional().default(""),
```

**Step 2: Update form reset from product data**

In the `useEffect` that calls `form.reset()`, add all new fields from `product.*`.

**Step 3: Update `updateMutation` to send new fields**

In `mutationFn`, read new form values and pass them to `adminApi.updateProduct()`.

**Step 4: Restructure tabs for PHYSICAL**

When `product.productType === "PHYSICAL"`, show tabs:
1. **Produkt** — existing info fields (title, price, short description, categories) + unit price checkbox + Lexical description editor
2. **Galerie** — existing `GalleryTab` (unchanged)
3. **Sklad** — new `SkladTab` component
4. **Podpora prodeje** — new `PodporaProdejeTab` component
5. **Varianty** — new `VariantsTabWebnode` component (replaces old `VariantsTab`)
6. **Pokročilé** — new `PokrocileTab` component (replaces old SEO tab)

When NOT PHYSICAL, keep existing tab layout (Info, Galerie, Varianty/Content, SEO).

**Step 5: Update footer buttons**

Match Webnode: "Zavřít" link on left, "Vytvořit"/"Uložit" button on right.

**Step 6: Verify**

```bash
pnpm turbo typecheck --filter=web
pnpm turbo lint --filter=web
```

**Step 7: Commit**

```bash
git add apps/web/src/components/admin/products/product-edit-dialog.tsx
git commit -m "feat(admin): restructure physical product form with webnode-style tabs"
```

---

### Task 11: Frontend — Lexical Rich Text Description Editor

Replace the plain textarea description with the Lexical editor for PHYSICAL products.

**Files:**
- Modify: `apps/web/src/components/admin/products/product-edit-dialog.tsx` (Produkt tab section)

**Step 1: Import and use Lexical editor**

Import the existing `PageEditor` component from `apps/web/src/components/admin/editor/PageEditor.tsx`.

In the Produkt tab, replace the `<Textarea>` for description with the Lexical editor:

```tsx
<PageEditor
  initialState={descriptionEditorState}
  onChange={(state) => {
    form.setValue("description", JSON.stringify(state.toJSON()), { shouldDirty: true });
  }}
/>
```

The description field now stores serialized Lexical JSON instead of plain text. The backend `description` column is already `TEXT` type, so no migration needed.

**Step 2: Handle initial state**

When loading product, parse `product.description` as Lexical JSON if it's valid JSON, otherwise create a text node from the plain string (backwards compatibility).

**Step 3: Verify**

```bash
pnpm turbo typecheck --filter=web
```

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/products/product-edit-dialog.tsx
git commit -m "feat(admin): use lexical rich text editor for product description"
```

---

### Task 12: Run All Tests & Final Verification

**Step 1: Run backend tests**

```bash
cd apps/backend && mvn test -pl .
```

Expected: All tests pass (130+).

**Step 2: Run frontend checks**

```bash
pnpm turbo lint
pnpm turbo typecheck
```

Expected: Clean (only pre-existing errors in ElementHoverPlugin.tsx allowed).

**Step 3: Verify in browser**

1. Navigate to `/admin/produkty`
2. Click "Nový produkt" → select "Fyzický produkt"
3. Verify 6 tabs appear: Produkt, Galerie, Sklad, Podpora prodeje, Varianty, Pokročilé
4. Test each tab's fields
5. Test variant creation flow: empty state → category + tags → settings table
6. Test Pokročilé tab: SEO preview, OG image
7. Save and verify data persists

**Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(admin): address review feedback on physical product form"
```
