# Unified Media System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify all image storage through `media_items` with auto-generated WebP variants, replace physical folders with virtual filters, convert product gallery to reference media items, and implement auto-draft product creation.

**Architecture:** All images become `media_items` in the media module. On upload, 4 WebP variants (thumb 300x300, medium 600x600, large 1200x1200, og 1200x630) are generated and stored alongside the original in R2 under `media/{id}/`. Entities reference media items by FK. Product creation auto-creates a DRAFT so images can be uploaded immediately.

**Tech Stack:** Java 25, Spring Boot 4, JOOQ, Thumbnailator (image processing), WebP ImageIO (WebP output), Cloudflare R2 (S3-compatible), React 19, TanStack Query/Router

---

### Task 1: Add image processing dependencies

**Files:**
- Modify: `apps/backend/pom.xml`

**Step 1: Add Thumbnailator and WebP ImageIO dependencies**

Add to the `<dependencies>` section of pom.xml:

```xml
<!-- Image processing -->
<dependency>
    <groupId>net.coobird</groupId>
    <artifactId>thumbnailator</artifactId>
    <version>0.4.20</version>
</dependency>
<dependency>
    <groupId>org.sejda.imageio</groupId>
    <artifactId>webp-imageio</artifactId>
    <version>0.1.6</version>
</dependency>
```

**Step 2: Verify dependencies resolve**

Run: `cd apps/backend && ./mvnw dependency:resolve -q`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add apps/backend/pom.xml
git commit -m "build(backend): add thumbnailator and webp-imageio for image variant generation"
```

---

### Task 2: Create ImageVariantService

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/media/internal/ImageVariantService.java`
- Create: `apps/backend/src/test/java/cz/samofujera/media/internal/ImageVariantServiceTest.java`

**Step 1: Write the failing test**

```java
package cz.samofujera.media.internal;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ImageVariantServiceTest {

    private final ImageVariantService service = new ImageVariantService();

    @Test
    void shouldGenerateAllFourVariants() throws Exception {
        var original = createTestImage(2000, 1500);
        var result = service.generateVariants(original, "image/jpeg");

        assertThat(result).containsKeys("thumb", "medium", "large", "og");
    }

    @Test
    void shouldGenerateThumbAt300x300() throws Exception {
        var original = createTestImage(2000, 1500);
        var result = service.generateVariants(original, "image/jpeg");

        var thumb = ImageIO.read(new ByteArrayInputStream(result.get("thumb").data()));
        assertThat(thumb.getWidth()).isEqualTo(300);
        assertThat(thumb.getHeight()).isEqualTo(300);
    }

    @Test
    void shouldGenerateMediumAt600x600() throws Exception {
        var original = createTestImage(2000, 1500);
        var result = service.generateVariants(original, "image/jpeg");

        var medium = ImageIO.read(new ByteArrayInputStream(result.get("medium").data()));
        assertThat(medium.getWidth()).isEqualTo(600);
        assertThat(medium.getHeight()).isEqualTo(600);
    }

    @Test
    void shouldGenerateLargeAt1200x1200() throws Exception {
        var original = createTestImage(2000, 1500);
        var result = service.generateVariants(original, "image/jpeg");

        var large = ImageIO.read(new ByteArrayInputStream(result.get("large").data()));
        assertThat(large.getWidth()).isEqualTo(1200);
        assertThat(large.getHeight()).isEqualTo(1200);
    }

    @Test
    void shouldGenerateOgAt1200x630() throws Exception {
        var original = createTestImage(2000, 1500);
        var result = service.generateVariants(original, "image/jpeg");

        var og = ImageIO.read(new ByteArrayInputStream(result.get("og").data()));
        assertThat(og.getWidth()).isEqualTo(1200);
        assertThat(og.getHeight()).isEqualTo(630);
    }

    @Test
    void shouldReturnWebpFormat() throws Exception {
        var original = createTestImage(2000, 1500);
        var result = service.generateVariants(original, "image/jpeg");

        for (var entry : result.values()) {
            assertThat(entry.contentType()).isEqualTo("image/webp");
        }
    }

    @Test
    void shouldHandleSmallImageWithoutUpscaling() throws Exception {
        var original = createTestImage(200, 150);
        var result = service.generateVariants(original, "image/jpeg");

        // Thumb should be cropped to 200x200 max (smaller dimension)
        // or the image should be scaled to fit
        var thumb = ImageIO.read(new ByteArrayInputStream(result.get("thumb").data()));
        assertThat(thumb.getWidth()).isLessThanOrEqualTo(300);
        assertThat(thumb.getHeight()).isLessThanOrEqualTo(300);
    }

    @Test
    void shouldSkipNonImageMimeTypes() throws Exception {
        var pdfBytes = "not an image".getBytes();
        var result = service.generateVariants(pdfBytes, "application/pdf");
        assertThat(result).isEmpty();
    }

    private byte[] createTestImage(int width, int height) throws Exception {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        var g = image.createGraphics();
        g.fillRect(0, 0, width, height);
        g.dispose();
        var baos = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", baos);
        return baos.toByteArray();
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && ./mvnw test -pl . -Dtest="ImageVariantServiceTest" -Dsurefire.failIfNoSpecifiedTests=false`
Expected: FAIL (class not found)

**Step 3: Implement ImageVariantService**

```java
package cz.samofujera.media.internal;

import net.coobird.thumbnailator.Thumbnails;
import net.coobird.thumbnailator.geometry.Positions;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
class ImageVariantService {

    public record VariantResult(byte[] data, String contentType, int width, int height) {}

    private record VariantSpec(String name, int width, int height) {}

    private static final VariantSpec[] SPECS = {
        new VariantSpec("thumb", 300, 300),
        new VariantSpec("medium", 600, 600),
        new VariantSpec("large", 1200, 1200),
        new VariantSpec("og", 1200, 630),
    };

    public Map<String, VariantResult> generateVariants(byte[] originalData, String mimeType) throws IOException {
        if (mimeType == null || !mimeType.startsWith("image/")) {
            return Map.of();
        }

        var original = ImageIO.read(new ByteArrayInputStream(originalData));
        if (original == null) {
            return Map.of();
        }

        var results = new LinkedHashMap<String, VariantResult>();
        for (var spec : SPECS) {
            var variant = generateVariant(original, spec.width, spec.height);
            results.put(spec.name, variant);
        }
        return results;
    }

    private VariantResult generateVariant(BufferedImage original, int targetWidth, int targetHeight) throws IOException {
        var baos = new ByteArrayOutputStream();

        // If original is smaller than target in both dimensions, scale to fit without upscaling
        int srcW = original.getWidth();
        int srcH = original.getHeight();

        if (srcW <= targetWidth && srcH <= targetHeight) {
            // Crop to target aspect ratio without upscaling
            double targetRatio = (double) targetWidth / targetHeight;
            double srcRatio = (double) srcW / srcH;
            int cropW, cropH;
            if (srcRatio > targetRatio) {
                cropH = srcH;
                cropW = (int) (srcH * targetRatio);
            } else {
                cropW = srcW;
                cropH = (int) (srcW / targetRatio);
            }
            Thumbnails.of(original)
                .sourceRegion(Positions.CENTER, cropW, cropH)
                .size(cropW, cropH)
                .outputFormat("webp")
                .toOutputStream(baos);
            var resultImage = ImageIO.read(new ByteArrayInputStream(baos.toByteArray()));
            return new VariantResult(baos.toByteArray(), "image/webp",
                resultImage != null ? resultImage.getWidth() : cropW,
                resultImage != null ? resultImage.getHeight() : cropH);
        }

        // Normal case: crop to aspect ratio, then resize
        Thumbnails.of(original)
            .size(targetWidth, targetHeight)
            .crop(Positions.CENTER)
            .outputFormat("webp")
            .toOutputStream(baos);

        return new VariantResult(baos.toByteArray(), "image/webp", targetWidth, targetHeight);
    }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && ./mvnw test -pl . -Dtest="ImageVariantServiceTest"`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/media/internal/ImageVariantService.java
git add apps/backend/src/test/java/cz/samofujera/media/internal/ImageVariantServiceTest.java
git commit -m "feat(backend): add image variant generation service with webp output"
```

---

### Task 3: Database migration — drop folders, add product_gallery

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V19__unified_media_system.sql`

**Step 1: Write the migration**

```sql
-- V19: Unified media system
-- 1. Drop folder system (replaced by virtual filters)
-- 2. Create product_gallery join table (replaces product_images)
-- 3. Migrate product_images data into media_items + product_gallery
-- 4. Remove folder_id from media_items

-- Remove folder_id FK from media_items
ALTER TABLE media_items DROP CONSTRAINT IF EXISTS media_items_folder_id_fkey;
ALTER TABLE media_items DROP COLUMN IF EXISTS folder_id;
DROP INDEX IF EXISTS idx_media_items_folder;

-- Drop media_folders table
DROP TABLE IF EXISTS media_folders;

-- Create product_gallery join table
CREATE TABLE product_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, media_item_id)
);
CREATE INDEX idx_product_gallery_product ON product_gallery(product_id);

-- Migrate existing product_images into media_items + product_gallery
INSERT INTO media_items (id, original_filename, storage_key, mime_type, file_size_bytes, alt_text, created_at, updated_at)
SELECT id, file_name, file_key, content_type, file_size_bytes, alt_text, created_at, created_at
FROM product_images
WHERE file_key IS NOT NULL;

INSERT INTO product_gallery (product_id, media_item_id, sort_order, created_at)
SELECT product_id, id, sort_order, created_at
FROM product_images
WHERE file_key IS NOT NULL;

-- Drop old product_images table
DROP TABLE IF EXISTS product_images;
```

**Step 2: Verify migration runs in tests**

Run: `cd apps/backend && ./mvnw test -Dtest="*ModuleTests*" -pl .`
Expected: Tests pass (Flyway applies migration successfully)

**Step 3: Regenerate JOOQ classes**

Run: `cd apps/backend && ./mvnw jooq-codegen:generate`
Expected: Generated classes include `ProductGallery` table, no `ProductImages` or `MediaFolders`

**Step 4: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V19__unified_media_system.sql
git add apps/backend/src/main/java/cz/samofujera/jooq/
git commit -m "feat(backend): add migration for unified media system with product gallery"
```

---

### Task 4: Update StorageService — add upload from bytes and batch upload

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/shared/storage/StorageService.java`

**Step 1: Add byte array upload method**

Add to StorageService:

```java
public void upload(String key, byte[] data, String contentType) {
    var request = PutObjectRequest.builder()
        .bucket(bucket)
        .key(key)
        .contentType(contentType)
        .contentLength((long) data.length)
        .build();

    s3Client.putObject(request, RequestBody.fromBytes(data));
}
```

**Step 2: Add batch delete method**

```java
public void deleteByPrefix(String prefix) {
    var keys = listKeys(prefix);
    for (var key : keys) {
        delete(key);
    }
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/shared/storage/StorageService.java
git commit -m "feat(backend): add byte array upload and batch delete to storage service"
```

---

### Task 5: Update MediaItemRepository — remove folder references

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/media/internal/MediaItemRepository.java`

**Step 1: Update MediaItemRow to remove folderId**

Remove `folderId` from the `MediaItemRow` record. Update all methods that reference `folder_id`.

**Step 2: Update `findAll` — replace folder filtering with source/entity filtering**

Change the filtering method: remove `folderId` parameter, add `source` parameter (optional) that filters by entity association via subqueries against `product_gallery`, `product_categories`, etc.

**Step 3: Update `create` — remove folderId parameter**

**Step 4: Update `update` — remove folderId parameter**

**Step 5: Run tests**

Run: `cd apps/backend && ./mvnw test -Dtest="*ModuleTests*" -pl .`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/media/internal/MediaItemRepository.java
git commit -m "refactor(backend): remove folder references from media item repository"
```

---

### Task 6: Create ProductGalleryRepository

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductGalleryRepository.java`

**Step 1: Implement repository**

```java
package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import static cz.samofujera.jooq.Tables.PRODUCT_GALLERY;

@Repository
public class ProductGalleryRepository {

    public record GalleryEntry(UUID id, UUID productId, UUID mediaItemId, int sortOrder) {}

    private final DSLContext dsl;

    ProductGalleryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<GalleryEntry> findByProductId(UUID productId) {
        return dsl.selectFrom(PRODUCT_GALLERY)
            .where(PRODUCT_GALLERY.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_GALLERY.SORT_ORDER.asc())
            .fetch(r -> new GalleryEntry(
                r.getId(), r.getProductId(), r.getMediaItemId(), r.getSortOrder()));
    }

    public UUID add(UUID productId, UUID mediaItemId, int sortOrder) {
        var id = UUID.randomUUID();
        dsl.insertInto(PRODUCT_GALLERY)
            .set(PRODUCT_GALLERY.ID, id)
            .set(PRODUCT_GALLERY.PRODUCT_ID, productId)
            .set(PRODUCT_GALLERY.MEDIA_ITEM_ID, mediaItemId)
            .set(PRODUCT_GALLERY.SORT_ORDER, sortOrder)
            .execute();
        return id;
    }

    public void remove(UUID productId, UUID mediaItemId) {
        dsl.deleteFrom(PRODUCT_GALLERY)
            .where(PRODUCT_GALLERY.PRODUCT_ID.eq(productId))
            .and(PRODUCT_GALLERY.MEDIA_ITEM_ID.eq(mediaItemId))
            .execute();
    }

    public void reorder(UUID productId, List<UUID> mediaItemIds) {
        for (int i = 0; i < mediaItemIds.size(); i++) {
            dsl.update(PRODUCT_GALLERY)
                .set(PRODUCT_GALLERY.SORT_ORDER, i)
                .where(PRODUCT_GALLERY.PRODUCT_ID.eq(productId))
                .and(PRODUCT_GALLERY.MEDIA_ITEM_ID.eq(mediaItemIds.get(i)))
                .execute();
        }
    }

    public int countByProductId(UUID productId) {
        return dsl.fetchCount(PRODUCT_GALLERY, PRODUCT_GALLERY.PRODUCT_ID.eq(productId));
    }
}
```

**Step 2: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductGalleryRepository.java
git commit -m "feat(backend): add product gallery repository for media item associations"
```

---

### Task 7: Update MediaService — variant generation on upload, remove folders

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/media/MediaService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/media/MediaDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/media/MediaAdminController.java`

**Step 1: Update MediaDtos**

- Remove `FolderResponse`, `CreateFolderRequest`, `RenameFolderRequest`
- Remove `folderId` from `MediaItemResponse`, `CreateMediaItemRequest`, `UpdateMediaItemRequest`
- Add variant URLs to `MediaItemResponse`:

```java
public record MediaItemResponse(UUID id, String originalFilename,
    String originalUrl, String thumbUrl, String mediumUrl, String largeUrl, String ogUrl,
    String mimeType, long fileSizeBytes, Integer width, Integer height,
    String altText, OffsetDateTime createdAt) {}
```

**Step 2: Update MediaService**

- Remove all folder methods (`getFolders`, `createFolder`, `renameFolder`, `deleteFolder`)
- Remove `uploadTemp` and `createFromTemp` methods
- Update `uploadAndCreate`: read file into byte array, call `ImageVariantService.generateVariants()`, upload original + variants to R2 under `media/{id}/original.{ext}`, `media/{id}/thumb.webp`, etc.
- Update `toMediaItemResponse`: generate presigned URLs for all 5 files (original + 4 variants)
- Update `deleteItem`: use `StorageService.deleteByPrefix("media/{id}/")` to remove all variants
- Update `getItems`: remove `folderId` parameter, add optional `source` parameter for virtual filters

New upload flow:
```java
@Transactional
public MediaDtos.MediaItemResponse uploadAndCreate(InputStream inputStream, String filename,
                                                    String contentType, long size, String altText) {
    var newId = UUID.randomUUID();
    var ext = extractExtension(filename);
    var prefix = "media/" + newId + "/";

    // Read into byte array for variant generation
    byte[] originalData = inputStream.readAllBytes();

    // Upload original
    storageService.upload(prefix + "original" + ext, originalData, contentType);

    // Generate and upload variants (images only)
    Integer width = null;
    Integer height = null;
    var variants = imageVariantService.generateVariants(originalData, contentType);
    if (!variants.isEmpty()) {
        // Read original dimensions
        var originalImage = ImageIO.read(new ByteArrayInputStream(originalData));
        if (originalImage != null) {
            width = originalImage.getWidth();
            height = originalImage.getHeight();
        }
        for (var entry : variants.entrySet()) {
            storageService.upload(prefix + entry.getKey() + ".webp",
                entry.getValue().data(), "image/webp");
        }
    }

    // Create DB record
    var storageKey = prefix + "original" + ext;
    var id = itemRepository.create(filename, storageKey, contentType, size, width, height, altText);

    var created = itemRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Media item not found"));
    return toMediaItemResponse(created);
}
```

**Step 3: Update MediaAdminController**

- Remove folder endpoints (GET/POST/PUT/DELETE folders)
- Remove temp upload endpoint
- Add optional `source` query param to GET items (values: `products`, `product_categories`, `unlinked`)
- Keep: GET items, GET by id, POST upload, PATCH update, DELETE item

**Step 4: Run tests**

Run: `cd apps/backend && ./mvnw test -Dtest="*ModuleTests*" -pl .`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/media/
git commit -m "feat(backend): integrate variant generation into media upload, remove folder system"
```

---

### Task 8: Update CatalogService — product gallery via media items

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/ImageAdminController.java`
- Delete: `apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductImageRepository.java`

**Step 1: Update CatalogDtos**

Replace `ImageResponse` to include variant URLs and reference media item ID:

```java
public record ImageResponse(UUID id, UUID mediaItemId, String originalUrl,
    String thumbUrl, String mediumUrl, String largeUrl, String ogUrl,
    String altText, int sortOrder) {}
```

**Step 2: Update CatalogService image methods**

Replace `ProductImageRepository` usage with `ProductGalleryRepository` + `MediaService`:

- `addImageToProduct(productId, mediaItemId)` — adds entry to `product_gallery`
- `removeImageFromProduct(productId, mediaItemId)` — removes from `product_gallery`
- `reorderProductImages(productId, mediaItemIds)` — reorders gallery
- `getImagesForProduct(productId)` — fetches gallery entries, resolves media items with variant URLs

**Step 3: Update ImageAdminController**

- `POST /api/admin/products/{productId}/images` — now accepts `{ mediaItemId: UUID }` body instead of multipart upload
- `DELETE /api/admin/products/{productId}/images/{mediaItemId}` — removes association
- `PUT /api/admin/products/{productId}/images/reorder` — accepts `{ mediaItemIds: UUID[] }`
- Remove alt-text endpoint (managed on media item directly)

**Step 4: Delete ProductImageRepository**

No longer needed — replaced by `ProductGalleryRepository`.

**Step 5: Run tests**

Run: `cd apps/backend && ./mvnw test -Dtest="*ModuleTests*" -pl .`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/
git rm apps/backend/src/main/java/cz/samofujera/catalog/internal/ProductImageRepository.java
git commit -m "feat(backend): refactor product gallery to use media items with variants"
```

---

### Task 9: Auto-draft product creation

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/ProductAdminController.java`

**Step 1: Add createDraft endpoint**

New endpoint: `POST /api/admin/products/draft`

Request body:
```java
public record CreateDraftRequest(
    @NotBlank String productType) {}
```

Response: Full `ProductDetailResponse` with the new DRAFT product.

**Step 2: Implement createDraft in CatalogService**

Creates a minimal DRAFT product with:
- Auto-generated title: "Nový produkt" (or "Untitled product")
- Auto-generated slug from UUID
- Status: DRAFT
- Product type: from request
- Empty prices, no categories

Returns the product so frontend can redirect to edit page.

**Step 3: Update frontend product creation flow (task 12 will handle UI)**

The backend just needs the new endpoint.

**Step 4: Run tests**

Run: `cd apps/backend && ./mvnw test -Dtest="*ModuleTests*" -pl .`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/
git commit -m "feat(backend): add auto-draft product creation endpoint"
```

---

### Task 10: Update frontend API client

**Files:**
- Modify: `packages/api-client/src/types.ts`
- Modify: `packages/api-client/src/media.ts`

**Step 1: Update TypeScript types**

Update `MediaItemResponse`:
```typescript
export interface MediaItemResponse {
  id: string;
  originalFilename: string;
  originalUrl: string;
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  ogUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
}
```

Remove: `MediaFolderResponse`, `CreateMediaFolderRequest`, `RenameMediaFolderRequest`, `TempUploadResponse`, `CreateMediaItemRequest`.
Remove `folderId` from `UpdateMediaItemRequest`.

Update `ImageResponse`:
```typescript
export interface ImageResponse {
  id: string;
  mediaItemId: string;
  originalUrl: string;
  thumbUrl: string;
  mediumUrl: string;
  largeUrl: string;
  ogUrl: string;
  altText: string | null;
  sortOrder: number;
}
```

**Step 2: Update media API client**

- Remove all folder methods (`getFolders`, `createFolder`, `renameFolder`, `deleteFolder`)
- Remove `uploadTemp`, `createItem` (temp flow)
- Update `getItems` — replace `folderId` param with `source` param
- Update `uploadDirect` and `uploadWithProgress` — remove `folderId` param
- Add `createDraft` method to product API

**Step 3: Commit**

```bash
git add packages/api-client/src/types.ts packages/api-client/src/media.ts
git commit -m "feat(api-client): update types for unified media system with variant urls"
```

---

### Task 11: Update media library admin page — virtual filters

**Files:**
- Modify: `apps/web/src/components/admin/routes/media.tsx`
- Modify: `apps/web/src/components/admin/media/MediaGrid.tsx`
- Delete: `apps/web/src/components/admin/media/FolderTree.tsx`

**Step 1: Replace folder sidebar with virtual filter tabs**

Replace the `FolderTree` sidebar with a horizontal filter bar:
- All | Products | Product Categories | Unlinked
- These map to the `source` query parameter on the API

**Step 2: Update MediaGrid to show variant thumbnails**

Use `item.thumbUrl` instead of `item.url` for grid display. Show `originalUrl` only when viewing details.

**Step 3: Update detail panel**

Show all variant URLs for the selected item. Remove folder assignment UI.

**Step 4: Delete FolderTree component**

No longer needed.

**Step 5: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/routes/media.tsx
git add apps/web/src/components/admin/media/MediaGrid.tsx
git rm apps/web/src/components/admin/media/FolderTree.tsx
git commit -m "feat(admin): replace folder tree with virtual filters in media library"
```

---

### Task 12: Update MediaPicker — remove folders, use variants

**Files:**
- Modify: `apps/web/src/components/admin/media/MediaPicker.tsx`

**Step 1: Remove folder tree from picker**

Remove the folder sidebar. Keep just the media grid with search and type filtering.

**Step 2: Use thumbUrl for thumbnails**

Replace `item.url` with `item.thumbUrl` in the grid display.

**Step 3: Return full media item on selection**

The `onSelect` callback should return the full `MediaItemResponse` (with all variant URLs) so the parent component can use whichever variant it needs.

**Step 4: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/media/MediaPicker.tsx
git commit -m "feat(admin): simplify media picker with virtual filters and variant urls"
```

---

### Task 13: Update product edit page — gallery via media items

**Files:**
- Modify: `apps/web/src/components/admin/routes/product-edit.tsx`

**Step 1: Update gallery tab**

- Upload button uploads to media library (via `uploadWithProgress`), then calls `POST /api/admin/products/{id}/images` with the returned `mediaItemId`
- Display images using `thumbUrl` in grid, `mediumUrl` for detail
- Drag-to-reorder sends `mediaItemIds` array
- Delete removes association (not the media item itself)

**Step 2: Use MediaPicker for adding existing images**

Add "Choose from library" button that opens MediaPicker. On selection, links the media item to the product gallery.

**Step 3: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/routes/product-edit.tsx
git commit -m "feat(admin): update product gallery to use unified media items"
```

---

### Task 14: Update product creation — auto-draft flow

**Files:**
- Modify: `apps/web/src/components/admin/routes/product-new.tsx`
- Modify: `apps/web/src/components/admin/routes/products.tsx`

**Step 1: Change product creation flow**

When user selects a product type:
1. Call `POST /api/admin/products/draft` with the selected type
2. On success, navigate to `/admin/products/{id}` (edit page)
3. Remove the form from product-new — it's just a type selector now

**Step 2: Update products list**

Ensure DRAFT products show clearly in the list with a "Draft" badge (already implemented from previous work). Add ability to delete draft products.

**Step 3: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/routes/product-new.tsx
git add apps/web/src/components/admin/routes/products.tsx
git commit -m "feat(admin): implement auto-draft product creation flow"
```

---

### Task 15: Update category image handling

**Files:**
- Modify: `apps/web/src/components/admin/routes/categories.tsx` (or wherever categories are edited)

**Step 1: Verify category image uses variant URLs**

Categories already reference `media_items` via `imageMediaId`. Ensure the frontend uses `thumbUrl` for list display and `mediumUrl` for detail/edit views.

**Step 2: Update MediaPicker integration**

Ensure the category form's image picker returns the `mediaItemId` and the form displays the image using the appropriate variant URL.

**Step 3: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/routes/categories.tsx
git commit -m "feat(admin): update category images to use media item variant urls"
```

---

### Task 16: Delete unused code and clean up

**Files:**
- Delete: `apps/backend/src/main/java/cz/samofujera/media/internal/MediaFolderRepository.java`
- Delete: `apps/backend/src/main/java/cz/samofujera/catalog/internal/R2StorageService.java` (if now redundant)
- Clean up any remaining references to folders, temp uploads, or old product_images

**Step 1: Remove MediaFolderRepository**

No longer needed — folders are gone.

**Step 2: Check for dead code**

Search for any remaining references to:
- `folder`, `folderId`, `tempKey`, `uploadTemp`, `createFromTemp`
- `ProductImageRepository`, `product_images`

**Step 3: Run full test suite**

Run: `cd apps/backend && ./mvnw test`
Expected: All tests PASS

**Step 4: Run frontend checks**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(backend): remove unused folder repository and dead media code"
```

---

### Task 17: Integration testing

**Files:**
- Modify/Create: integration tests as needed

**Step 1: Test media upload with variants**

Upload an image via `/api/admin/media/upload`, verify:
- Response includes `originalUrl`, `thumbUrl`, `mediumUrl`, `largeUrl`, `ogUrl`
- All URLs are valid presigned URLs
- Non-image uploads return null variant URLs

**Step 2: Test product gallery flow**

1. Create draft product
2. Upload image to media library
3. Add image to product gallery
4. Verify product detail includes image with variant URLs
5. Reorder gallery
6. Remove image from gallery (media item still exists)

**Step 3: Test virtual filters**

Verify `/api/admin/media?source=products` returns only images linked to products.

**Step 4: Run full test suite**

Run: `cd apps/backend && ./mvnw test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "test(backend): add integration tests for unified media system"
```
