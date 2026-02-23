# Media Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild media and access control architecture across 7 independently deployable steps.

**Architecture:** Two separate systems (public images + protected product content), polymorphic entitlements, membership plans with JSONB features, lead magnets, article paywall, OG image generation.

**Tech Stack:** Java 25 / Spring Boot 4 / Spring Modulith 2 / JOOQ / Flyway / Next.js 16 / React 19 / TanStack Query / shadcn/ui / Tailwind 4 / Lingui

**Design doc:** `docs/plans/2026-02-23-media-management-design.md`

---

## Step 1: Clean Up Image System

Rename `media` → `image`, remove unused variant generation, add `title` column,
add pan offset columns, redesign admin Image Library page, update ImagePicker.

### Task 1.1: Database Migration — Rename & Extend

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V23__rename_media_to_images.sql`

**Step 1: Write the migration**

```sql
-- Rename table
ALTER TABLE media_items RENAME TO images;

-- Add title column
ALTER TABLE images ADD COLUMN title VARCHAR(500);

-- Rename FK columns
ALTER TABLE product_gallery RENAME COLUMN media_item_id TO image_id;
ALTER TABLE product_categories RENAME COLUMN image_media_id TO image_id;

-- Rename index
ALTER INDEX idx_media_items_mime RENAME TO idx_images_mime;

-- Add pan offset columns to product_gallery
ALTER TABLE product_gallery ADD COLUMN pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE product_gallery ADD COLUMN pan_y INT NOT NULL DEFAULT 50;

-- Add pan offset columns to product_categories
ALTER TABLE product_categories ADD COLUMN image_pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE product_categories ADD COLUMN image_pan_y INT NOT NULL DEFAULT 50;
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && mvn clean compile -pl . -Pjooq-codegen`

Expected: JOOQ classes regenerated with `Images` table, `image_id` column names, `pan_x`/`pan_y` columns.

**Step 3: Verify migration works**

Run: `cd apps/backend && mvn clean test -Dtest=*ModuleTest* -pl .`

Expected: Tests should fail (code still references old column names). This confirms migration is correct.

**Step 4: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V23__rename_media_to_images.sql
git add apps/backend/src/main/java/cz/samofujera/jooq/
git commit -m "feat(backend): add migration to rename media_items to images with pan offsets"
```

---

### Task 1.2: Backend — Rename Media Module to Image Module

**Files:**
- Rename: `apps/backend/src/main/java/cz/samofujera/media/` → `apps/backend/src/main/java/cz/samofujera/image/`
- Rename: `MediaService.java` → `ImageService.java`
- Rename: `MediaDtos.java` → `ImageDtos.java`
- Rename: `MediaAdminController.java` → `ImageAdminController.java`
- Rename: `media/internal/MediaItemRepository.java` → `image/internal/ImageRepository.java`
- Delete: `media/internal/ImageVariantService.java`
- Rename: `media/internal/package-info.java` → `image/internal/package-info.java`
- Modify: `apps/backend/pom.xml` (remove `webp-imageio` dependency, line ~141-145)

**Step 1: Rename the package directory**

Rename `cz.samofujera.media` → `cz.samofujera.image`. Update all class names:
- `MediaService` → `ImageService`
- `MediaDtos` → `ImageDtos` (rename inner records too)
- `MediaAdminController` → `ImageAdminController`
- `MediaItemRepository` → `ImageRepository`
- Update `MediaItemRow` → `ImageRow`
- Update `MediaItemResponse` → `ImageResponse` (add `title` and `usedIn` fields)
- Update `UpdateMediaItemRequest` → `UpdateImageRequest` (add `title` field)

**Step 2: Delete ImageVariantService**

Delete `apps/backend/src/main/java/cz/samofujera/media/internal/ImageVariantService.java` entirely.

**Step 3: Remove webp-imageio dependency from pom.xml**

In `apps/backend/pom.xml`, remove:
```xml
<dependency>
    <groupId>org.sejda.imageio</groupId>
    <artifactId>webp-imageio</artifactId>
    <version>0.1.6</version>
</dependency>
```

Keep `thumbnailator` (will be used for resize in next task).

**Step 4: Update ImageAdminController endpoints**

Change all paths from `/api/admin/media` → `/api/admin/images`.

**Step 5: Update ImageRepository to use new JOOQ table/column names**

All references to `MEDIA_ITEMS` → `IMAGES`, `MEDIA_ITEM_ID` → `IMAGE_ID`, etc.
Add `title` to insert/update/select operations.

**Step 6: Update ImageDtos**

```java
public record ImageResponse(
    UUID id,
    String url,
    String originalFilename,
    String mimeType,
    long fileSizeBytes,
    Integer width,
    Integer height,
    String title,
    String altText,
    OffsetDateTime createdAt,
    List<UsageInfo> usedIn
) {}

public record UsageInfo(
    String entityType,
    UUID entityId,
    String entityName
) {}

public record UpdateImageRequest(
    String title,
    String altText
) {}
```

Remove all variant URL fields (`thumbUrl`, `mediumUrl`, `largeUrl`, `ogUrl`).

**Step 7: Update ImageService**

- Remove any variant generation references
- Update `updateItem()` to also update `title`
- Update `toImageResponse()` to include `title` field
- Touch `updated_at` when image metadata changes

**Step 8: Update all references in catalog module**

`CatalogService.java` imports `MediaService` — update to `ImageService`.
Update all method calls and imports across the codebase.

**Step 9: Run tests**

Run: `cd apps/backend && mvn clean test -pl .`

Expected: PASS (after updating all references)

**Step 10: Commit**

```bash
git add -A
git commit -m "refactor(backend): rename media module to image, remove variant generation"
```

---

### Task 1.3: Backend — Add ImageProcessingService (2400px Resize)

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/image/internal/ImageProcessingService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/image/ImageService.java`

**Step 1: Write failing test**

Create test that uploads a large image (>2400px) and verifies it's resized.

```java
@Test
void uploadShouldResizeLargeImage() {
    // Create a 4000x3000 test image
    // Upload via ImageService
    // Verify stored dimensions <= 2400 on longest side
}
```

**Step 2: Implement ImageProcessingService**

```java
@Service
class ImageProcessingService {

    /**
     * Resize image if longest side exceeds maxDimension.
     * Preserves original format (JPEG→JPEG, PNG→PNG).
     * Returns null if no resize needed.
     */
    public byte[] optimizeIfNeeded(byte[] imageData, String mimeType, int maxDimension) {
        // Skip SVG and GIF
        if (mimeType.contains("svg") || mimeType.contains("gif")) return null;

        // Read dimensions
        // If longest side <= maxDimension, return null
        // Otherwise resize proportionally using Thumbnailator
        // Return resized bytes in original format
    }
}
```

**Step 3: Integrate into ImageService.uploadAndCreate()**

Before storing in R2, call `imageProcessingService.optimizeIfNeeded(data, mimeType, 2400)`.
If result is non-null, use resized data. Read final dimensions from resized image.

**Step 4: Run tests**

Run: `cd apps/backend && mvn clean test -pl .`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(backend): add image resize to max 2400px on upload"
```

---

### Task 1.4: Backend — Add ImageUsageResolver

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/image/internal/ImageUsageResolver.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/image/ImageService.java`

**Step 1: Implement ImageUsageResolver**

```java
@Service
class ImageUsageResolver {

    /**
     * Query all entity tables to find where an image is used.
     * Returns list of UsageInfo records.
     */
    public List<ImageDtos.UsageInfo> findUsages(UUID imageId) {
        // Query product_gallery for products using this image
        // Query product_categories for categories using this image
        // (Future: query articles, pages when those tables exist)
        // Return combined list
    }

    /**
     * Bulk resolve usages for multiple images (for list view).
     */
    public Map<UUID, List<ImageDtos.UsageInfo>> findUsagesBulk(List<UUID> imageIds) {
        // Efficient batch query
    }
}
```

**Step 2: Integrate into ImageService**

- `getById()` includes `usedIn` from ImageUsageResolver
- `getItems()` uses bulk resolver for list view

**Step 3: Run tests**

Run: `cd apps/backend && mvn clean test -pl .`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(backend): add image usage resolver for tracking where images are used"
```

---

### Task 1.5: Backend — Update Catalog Module References

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductGalleryRepository.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductCategoryAssignmentRepository.java`

**Step 1: Update ProductGalleryRepository**

- JOOQ column references: `MEDIA_ITEM_ID` → `IMAGE_ID`
- `GalleryEntry` record: `mediaItemId` → `imageId`
- Add `panX`, `panY` to `GalleryEntry` record

**Step 2: Update CatalogDtos.ImageResponse**

Add `panX`, `panY` fields. Remove variant URL fields if present.

**Step 3: Update CatalogService gallery methods**

Update `addImageToProduct`, `getImagesForProduct` etc. to use new column names.
Accept and store `panX`/`panY` when adding images to gallery.

**Step 4: Update category image references**

ProductCategoryAssignment: `image_media_id` → `image_id`, add `image_pan_x`/`image_pan_y`.

**Step 5: Run tests**

Run: `cd apps/backend && mvn clean test -pl .`

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(backend): update catalog module to use renamed image columns with pan offsets"
```

---

### Task 1.6: Frontend — Rename API Client (media → image)

**Files:**
- Rename: `packages/api-client/src/media.ts` → `packages/api-client/src/images.ts`
- Modify: `packages/api-client/src/types.ts`
- Modify: `packages/api-client/src/index.ts`

**Step 1: Rename media.ts to images.ts**

- `mediaApi` → `imageApi`
- All endpoint paths: `/api/admin/media` → `/api/admin/images`
- Method names: `getItems` → `getImages`, etc.

**Step 2: Update types.ts**

- `MediaItemResponse` → `ImageResponse`
- Remove variant URL fields (`thumbUrl`, `mediumUrl`, `largeUrl`, `ogUrl`)
- Add: `title: string | null`, `usedIn: UsageInfo[]`
- Add `UsageInfo` type: `{ entityType: string, entityId: string, entityName: string }`
- `MediaItemListResponse` → `ImageListResponse`
- `UpdateMediaItemRequest` → `UpdateImageRequest` (add `title` field)

**Step 3: Update api-client index.ts exports**

**Step 4: Run typecheck**

Run: `pnpm turbo typecheck`

Expected: Failures in frontend components still importing `mediaApi`. That's expected — fixed in next task.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(api-client): rename media api to image api, remove variant fields"
```

---

### Task 1.7: Frontend — Add Slider Component to UI Package

**Files:**
- Create: `packages/ui/src/components/slider.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Add shadcn Slider component**

Use Context7 to get the latest shadcn/ui Slider component code. Install `@radix-ui/react-slider` if needed.

```bash
cd packages/ui && pnpm add @radix-ui/react-slider
```

**Step 2: Create slider.tsx with shadcn pattern**

**Step 3: Export from index.ts**

**Step 4: Run typecheck**

Run: `pnpm turbo typecheck --filter=@samofujera/ui`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): add shadcn slider component"
```

---

### Task 1.8: Frontend — Redesign Image Library Page

**Files:**
- Rewrite: `apps/web/src/components/admin/routes/media.tsx` → `apps/web/src/components/admin/routes/images.tsx`
- Rewrite: `apps/web/src/components/admin/media/` → `apps/web/src/components/admin/images/`
- Move: `apps/web/src/app/(dashboard)/admin/media/page.tsx` → `apps/web/src/app/(dashboard)/admin/obrazky/page.tsx`
- Delete: `apps/web/src/components/admin/media/media-table-view.tsx` (table view removed)
- Delete: `apps/web/src/components/admin/media/media-columns.tsx` (if exists)
- Modify: `apps/web/src/components/dashboard/sidebar-data.ts` (line 25)
- Modify: `apps/web/src/components/dashboard/dashboard-breadcrumbs.tsx`
- Modify: `apps/web/src/components/dashboard/search-command.tsx`

**Step 1: Create new route directory**

Create `apps/web/src/app/(dashboard)/admin/obrazky/page.tsx` exporting `ImagesPage`.
Delete `apps/web/src/app/(dashboard)/admin/media/page.tsx`.

**Step 2: Create image components directory**

Rename `apps/web/src/components/admin/media/` → `apps/web/src/components/admin/images/`.
Keep: `format-file-size.ts`, `useMultiUpload.ts`, `UploadProgress.tsx`.
Delete: `media-table-view.tsx`, `media-grid-view.tsx`, `MediaGrid.tsx`.
Create new: `image-card.tsx`, `image-detail-panel.tsx`, `image-grid.tsx`.

**Step 3: Build ImageCard component**

Based on the JSX prototype layout:
- 4:3 aspect ratio thumbnail with object-fit: cover (centered, no pan)
- Title (or filename fallback)
- Dimensions + file size
- Usage badges (shadcn Badge component)
- Warning badge for missing alt text or title
- "Nepřiřazený" badge if unused
- Checkbox on hover for bulk selection

Use shadcn/ui Card + Badge components, Tailwind classes, Lingui i18n.

**Step 4: Build ImageDetailPanel component**

Side panel (not dialog):
- Large preview image (centered, no pan — pan is context-specific)
- Metadata grid (filename, type, dimensions, size, upload date)
- Title input (shadcn Input)
- Alt text textarea (shadcn Textarea) with SEO warning
- "Použito v" section with entity links
- Save + Delete buttons

**Step 5: Build ImagesPage (main route component)**

Layout: header + filter bar + grid + optional side panel.
- Header: title "Knihovna obrázků", count, warning count, upload button
- Filter pills: Vše, Produkty, Články, Kategorie, Stránky, Nepřiřazené
- Search input
- Grid of ImageCards
- When card clicked → side panel opens, grid shrinks
- Bulk selection bar when items selected
- Drag-drop upload zone (visible when dragging or when upload button clicked)
- Pagination
- TanStack Query for data fetching via `imageApi.getImages()`

**Step 6: Update sidebar navigation**

In `sidebar-data.ts` line 25:
```typescript
{ title: msg`Knihovna obrázků`, url: "/admin/obrazky", icon: Image },
```

**Step 7: Update breadcrumbs and search command**

Update `dashboard-breadcrumbs.tsx` and `search-command.tsx` to use new route.

**Step 8: Run dev server and verify**

Run: `pnpm dev` from `apps/web`

**Step 9: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`

**Step 10: Commit**

```bash
git add -A
git commit -m "feat(admin): redesign image library with grid view and detail side panel"
```

---

### Task 1.9: Frontend — Redesign ImagePicker with Pan Slider

**Files:**
- Rewrite: `apps/web/src/components/admin/images/ImagePicker.tsx` (renamed from media/)
- Modify: `apps/web/src/components/admin/products/product-edit-dialog.tsx` (GalleryTab)

**Step 1: Redesign ImagePicker**

Two-step dialog flow:

**Step 1 (Select):** Grid of images with search. "Naposledy použité" at top (sorted by `updated_at` desc). Upload new button. Click image to select.

**Step 2 (Pan offset — conditional):** Appears only when selected image aspect ratio differs from target by >10%. Shows horizontal/vertical pan sliders (shadcn Slider). Preview shows result of pan with object-position.

**Props:**
```typescript
interface ImagePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ImagePickerResult) => void;
  targetAspectRatio?: number; // e.g., 1.0 for square, 1.91 for OG
}

interface ImagePickerResult {
  imageId: string;
  panX: number; // 0–100
  panY: number; // 0–100
}
```

**Step 2: Update GalleryTab in product-edit-dialog.tsx**

Update `GalleryTab` to use new `ImagePicker` interface.
When image picked, store `imageId` + `panX` + `panY` in product gallery via API.

**Step 3: Run dev server and verify**

**Step 4: Run lint and typecheck**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): redesign image picker with pan slider support"
```

---

### Task 1.10: Update E2E Tests for Image Library

**Files:**
- Modify: `e2e/tests/admin-products.spec.ts` (if gallery interactions tested)
- Create: `e2e/tests/admin-images.spec.ts`

**Step 1: Write E2E test for image library**

```typescript
test("view image library", async ({ page }) => {
  await page.goto("/admin/obrazky");
  await expect(page.locator("h2")).toContainText(/Knihovna obrázků/);
});

test("upload and edit image", async ({ page }) => {
  // Navigate to image library
  // Upload an image via drag-drop or file picker
  // Click image to open detail panel
  // Edit title and alt text
  // Save and verify
});
```

**Step 2: Run E2E tests**

Start backend + frontend, run Playwright tests.

**Step 3: Commit**

```bash
git add -A
git commit -m "test(e2e): add image library tests"
```

---

## Step 2: Unify Protected Content

Replace `product_files` + `product_media` with single `product_content` table.

### Task 2.1: Database Migration — Create product_content

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V24__unify_product_content.sql`

**Step 1: Write migration**

```sql
-- Create unified product_content table
CREATE TABLE product_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('FILE', 'VIDEO', 'AUDIO')),
    title VARCHAR(500) NOT NULL,
    is_preview BOOLEAN NOT NULL DEFAULT false,
    storage_key VARCHAR(500),
    original_filename VARCHAR(500),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    stream_uid VARCHAR(255),
    duration_seconds INT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_content_product ON product_content(product_id);

-- Migrate product_files → product_content
INSERT INTO product_content (id, product_id, content_type, title, is_preview,
    storage_key, original_filename, mime_type, file_size_bytes, sort_order, created_at)
SELECT id, product_id, 'FILE', file_name, false,
    file_key, file_name, mime_type, file_size_bytes, sort_order, created_at
FROM product_files;

-- Migrate product_media → product_content
INSERT INTO product_content (id, product_id, content_type, title, is_preview,
    storage_key, original_filename, mime_type, file_size_bytes,
    stream_uid, duration_seconds, sort_order, created_at)
SELECT id, product_id,
    CASE WHEN media_type = 'VIDEO' THEN 'VIDEO' ELSE 'AUDIO' END,
    title, false,
    file_key, NULL, NULL, NULL,
    cf_stream_uid, duration_seconds, sort_order, created_at
FROM product_media;

-- Update download_logs FK to reference product_content
ALTER TABLE download_logs DROP CONSTRAINT IF EXISTS download_logs_file_id_fkey;
ALTER TABLE download_logs ADD CONSTRAINT download_logs_content_id_fkey
    FOREIGN KEY (file_id) REFERENCES product_content(id);
ALTER TABLE download_logs RENAME COLUMN file_id TO content_id;

-- Drop old tables
DROP TABLE IF EXISTS product_files;
DROP TABLE IF EXISTS product_media;
DROP TABLE IF EXISTS digital_assets;
```

**Step 2: Regenerate JOOQ**

Run: `cd apps/backend && mvn clean compile -pl . -Pjooq-codegen`

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): add migration to unify product_files and product_media into product_content"
```

---

### Task 2.2: Backend — Create ProductContentService

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/ProductContentService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/ProductContentDtos.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/ProductContentAdminController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductContentRepository.java`
- Delete: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductFileRepository.java`
- Delete: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductMediaRepository.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java` (remove file/media methods)

**Step 1: Create ProductContentRepository (JOOQ)**

Methods: `findByProductId`, `findById`, `create`, `update`, `delete`, `reorder`, `countByProductId`

**Step 2: Create ProductContentDtos**

```java
public record ContentResponse(
    UUID id, UUID productId, String contentType, String title,
    boolean isPreview, String originalFilename, String mimeType,
    Long fileSizeBytes, String streamUid, Integer durationSeconds,
    int sortOrder, OffsetDateTime createdAt
) {}

public record CreateContentRequest(String title, String contentType) {}
public record UpdateContentRequest(String title, Boolean isPreview) {}
public record ReorderContentRequest(List<UUID> contentIds) {}
```

**Step 3: Create ProductContentService**

Methods: `getContentForProduct`, `uploadFile`, `linkStream`, `updateContent`, `deleteContent`, `reorderContent`

**Step 4: Create ProductContentAdminController**

Endpoints per design doc section 12.

**Step 5: Remove old file/media methods from CatalogService**

Remove: `getFileById`, `generateFileDownloadUrl`, `uploadFile`, `deleteFile`, `getFilesForProduct`, `createMedia`, `deleteMedia`, `getMediaForProduct`.
Remove: `ProductFileRepository`, `ProductMediaRepository` imports and fields.

**Step 6: Update download log service if exists**

Update references from `product_files` to `product_content`.

**Step 7: Run tests**

Run: `cd apps/backend && mvn clean test -pl .`

**Step 8: Commit**

```bash
git add -A
git commit -m "feat(backend): create unified product content service replacing files and media"
```

---

### Task 2.3: Frontend — Unified Content Tab

**Files:**
- Create: `apps/web/src/components/admin/products/product-content-tab.tsx`
- Modify: `apps/web/src/components/admin/products/product-edit-dialog.tsx`
- Create: `packages/api-client/src/product-content.ts`
- Modify: `packages/api-client/src/types.ts`

**Step 1: Add product content API client**

New `productContentApi` with endpoints matching backend.

**Step 2: Create ProductContentTab component**

Replace separate `FilesTab` + `MediaTab` with unified `ProductContentTab`:
- Sortable list (drag handles for reorder)
- Title, Type, Preview checkbox, Duration columns
- Upload file button + Add video button
- Delete button per item

**Step 3: Update product-edit-dialog.tsx**

Replace `FilesTab` and `MediaTab` imports with `ProductContentTab`.
Show "Obsah" tab for EBOOK and AUDIO_VIDEO product types.

**Step 4: Run typecheck and lint**

Run: `pnpm turbo typecheck && pnpm turbo lint`

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): unified product content tab replacing files and media tabs"
```

---

### Task 2.4: Frontend — Customer Content Access

**Files:**
- Modify: Customer library/download components (if they exist)
- Modify: `packages/api-client/src/types.ts`

**Step 1: Update customer API types**

Update any references from `FileResponse`/`MediaResponse` to `ContentResponse`.

**Step 2: Update customer download/stream UI**

If customer library page exists, update to use unified content API.

**Step 3: Run tests**

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(customer): update content access for unified product content"
```

---

## Step 3: Polymorphic Entitlements

### Task 3.1: Database Migration — Polymorphic Entitlements

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V25__polymorphic_entitlements.sql`

**Step 1: Write migration**

```sql
ALTER TABLE entitlements ADD COLUMN entity_type VARCHAR(30);
ALTER TABLE entitlements ADD COLUMN entity_id UUID;

UPDATE entitlements SET entity_type = 'PRODUCT', entity_id = product_id;

ALTER TABLE entitlements ALTER COLUMN entity_type SET NOT NULL;
ALTER TABLE entitlements ALTER COLUMN entity_id SET NOT NULL;

DROP INDEX IF EXISTS idx_entitlements_access;
ALTER TABLE entitlements DROP COLUMN product_id;
ALTER TABLE entitlements DROP COLUMN event_occurrence_id;

CREATE INDEX idx_entitlements_access
    ON entitlements(user_id, entity_type, entity_id)
    WHERE revoked_at IS NULL;
```

**Step 2: Regenerate JOOQ**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): migrate entitlements to polymorphic entity_type + entity_id"
```

---

### Task 3.2: Backend — Rewrite EntitlementService

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/entitlement/EntitlementService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/entitlement/EntitlementDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/entitlement/internal/EntitlementRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/entitlement/internal/AccessChecker.java`

**Step 1: Update EntitlementRepository**

Replace `product_id` queries with `entity_type` + `entity_id`.

**Step 2: Rewrite EntitlementService**

```java
public void grantAccess(UUID userId, String entityType, UUID entityId,
                         String sourceType, UUID sourceId, OffsetDateTime expiresAt)
public boolean hasAccess(UUID userId, String entityType, UUID entityId)
public void revokeAccess(UUID entitlementId)
public List<LibraryItem> getLibrary(UUID userId) // Returns all entitled entities
```

**Step 3: Create AccessChecker**

Unified access check: direct entitlement → subscription features → deny.
(Subscription check will be a no-op until Step 4 implements membership.)

**Step 4: Update all callers**

Update order processing, admin entitlement management, etc.

**Step 5: Run tests**

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(backend): rewrite entitlement service with polymorphic access checks"
```

---

## Step 4: Membership Plans + Subscriptions

### Task 4.1: Database Migration — Membership Tables

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V26__membership_plans.sql`

**Step 1: Write migration**

Create `membership_plans` and `subscriptions` tables per design doc section 5.5.

**Step 2: Regenerate JOOQ**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): add membership_plans and subscriptions tables"
```

---

### Task 4.2: Backend — Create Membership Module

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/membership/` (entire module)

**Step 1: Create module structure**

- `MembershipService.java` — plan management, subscribe, cancel
- `MembershipDtos.java` — PlanResponse, SubscriptionResponse, etc.
- `MembershipAdminController.java` — `/api/admin/membership/plans`
- `MembershipCustomerController.java` — `/api/membership/*`
- `internal/PlanRepository.java`
- `internal/SubscriptionRepository.java`
- `internal/SubscriptionLifecycleService.java` — Stripe webhook handlers

**Step 2: Implement plan CRUD (admin)**

**Step 3: Implement subscribe/cancel flow (customer)**

Integration with Stripe subscriptions API.

**Step 4: Wire AccessChecker to check subscription features**

Update `AccessChecker` in entitlement module to also check active subscription JSONB features.

**Step 5: Run tests**

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(backend): create membership module with plans and subscriptions"
```

---

### Task 4.3: Frontend — Membership Admin UI

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/membership/page.tsx`
- Create: `apps/web/src/components/admin/routes/membership.tsx`
- Create: `packages/api-client/src/membership.ts`
- Modify: `apps/web/src/components/dashboard/sidebar-data.ts`

**Step 1: Add membership API client**

**Step 2: Create admin plan management page**

List plans, create/edit plan dialog, JSONB features editor.

**Step 3: Add to sidebar nav**

**Step 4: Run tests**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(admin): membership plan management page"
```

---

### Task 4.4: Frontend — Customer Subscription UI

**Files:**
- Create: `apps/web/src/components/customer/subscription.tsx`
- Create: `apps/web/src/app/(dashboard)/muj-ucet/predplatne/page.tsx`

**Step 1: Create subscription management page**

Show current plan, billing period, cancel/reactivate buttons.

**Step 2: Create subscription checkout flow**

Subscribe button → Stripe Checkout redirect → return URL.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(customer): subscription management page"
```

---

## Step 5: Lead Magnets

### Task 5.1: Database Migration — Lead Captures + UNLISTED Status

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V27__lead_captures.sql`

**Step 1: Write migration**

```sql
CREATE TABLE lead_captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    referrer_url VARCHAR(2000),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_captures_entity ON lead_captures(entity_type, entity_id);
CREATE INDEX idx_lead_captures_email ON lead_captures(email);

-- Add UNLISTED to products status constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED', 'UNLISTED'));

-- Add promo video URL
ALTER TABLE products ADD COLUMN promo_video_url VARCHAR(2000);
```

**Step 2: Regenerate JOOQ**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(backend): add lead_captures table and UNLISTED product status"
```

---

### Task 5.2: Backend — Create Lead Module

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/lead/` (entire module)

**Step 1: Create module structure**

- `LeadService.java` — capture lead, trigger entitlement
- `LeadDtos.java`
- `LeadPublicController.java` — `POST /api/public/lead-magnet/{entityType}/{slug}`
- `internal/LeadCaptureRepository.java`
- `internal/LeadEmailService.java`

**Step 2: Implement lead capture flow**

Per design doc section 8:
1. Validate email
2. Rate limit
3. Find or create user
4. Check existing entitlement
5. Create lead_capture record
6. Grant entitlement
7. Send email

**Step 3: Create email template**

React Email template for lead magnet delivery.

**Step 4: Run tests**

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(backend): create lead module with magnet capture and entitlement flow"
```

---

### Task 5.3: Frontend — Lead Magnet Landing Page

**Files:**
- Create: `apps/web/src/app/(public)/lead/[slug]/page.tsx`

**Step 1: Create landing page**

Public page at `/lead/{product-slug}`:
- Product info (title, cover image, description)
- Email input form
- UTM params captured from query string
- Submit → POST to lead magnet API
- Success state with redirect info

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): lead magnet landing page"
```

---

## Step 6: Article Paywall

> **Depends on:** Articles module (Phase 3). This step defines what to add when articles exist.

### Task 6.1: Database Migration — Article Paywall Columns

**Files:**
- Create: Migration to add paywall columns to `articles` table (when it exists)

Add: `access_type VARCHAR(20) DEFAULT 'FREE'`, `lead_magnet_enabled BOOLEAN DEFAULT false`

---

### Task 6.2: Backend — PaywallResolver

**Files:**
- Create: `PaywallResolver` service in articles module

Implements the paywall flow per design doc section 8:
- FREE → full content
- Authenticated + hasAccess → full content
- Otherwise → first 2-3 paragraphs + paywall options

---

### Task 6.3: Frontend — Paywall Component

**Files:**
- Create: `ArticlePaywall` component

Shows:
- Lead magnet option (if enabled): "Číst zdarma — zadejte email"
- Subscription option: "Předplatné — od 99 Kč/měsíc"

---

## Step 7: OG Image Generation

### Task 7.1: Create OG Image Route

**Files:**
- Create: `apps/web/src/app/api/og-image/[entityType]/[slug]/route.tsx`

**Step 1: Implement OG image generation**

Using `next/og` (ImageResponse):
- Fetch entity data (title, image URL, pan offset)
- Render JSX template: background image with `objectPosition: ${panX}% ${panY}%`
- 1200×630 PNG output
- Cache at edge (~1h TTL)

**Step 2: Implement fallback chain**

1. Explicit OG image → use it
2. Entity primary image → use it
3. Default branded template

**Step 3: Support entity types**

`product`, `article`, `category`, `page`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): dynamic og image generation with pan offset support"
```

---

### Task 7.2: Update Metadata Across Entity Pages

**Files:**
- Modify: All public page components that define OpenGraph metadata

**Step 1: Update metadata generation**

Point OG image URLs to `/api/og-image/{entityType}/{slug}`.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): update og metadata to use dynamic og image generation"
```

---

## Summary

| Step | Tasks | Description |
|------|-------|-------------|
| 1 | 1.1–1.10 | Image system cleanup + library redesign |
| 2 | 2.1–2.4 | Unified product content table |
| 3 | 3.1–3.2 | Polymorphic entitlements |
| 4 | 4.1–4.4 | Membership plans + subscriptions |
| 5 | 5.1–5.3 | Lead magnets |
| 6 | 6.1–6.3 | Article paywall (depends on articles module) |
| 7 | 7.1–7.2 | OG image generation |

Each step is independently deployable. Steps 1-3 should be done first (foundational).
Steps 4-5 can be done in parallel. Step 6 depends on articles module. Step 7 can be done anytime.
