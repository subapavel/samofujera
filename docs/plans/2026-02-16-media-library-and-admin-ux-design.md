# Media Library & Admin Categories UX Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a centralized media library module, replace category dialog CRUD with full-page routes, and add drag-to-reorder for categories.

**Architecture:** New Spring Modulith `media` module with R2 storage, folder-based organization, and a reusable frontend MediaPicker dialog. Categories move under `/produkty/kategorie/` routes with dnd-kit sortable list.

**Tech Stack:** Spring Boot 4, JOOQ, Cloudflare R2, React 19, dnd-kit, TanStack Router/Query, shadcn/ui

---

## 1. Media Library Module (Backend)

### New module: `cz.samofujera.media`

**DB Schema:**

```sql
CREATE TABLE media_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(parent_folder_id, slug)
);

CREATE TABLE media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
    original_filename VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INT,
    height INT,
    alt_text VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**R2 storage keys:** `media/{mediaItemId}.{ext}` — flat in R2, folders are logical in DB only.

**Temp upload flow:**
1. `POST /api/admin/media/upload-temp` — upload file to R2 `temp/{uuid}.{ext}`, return `{ tempKey, previewUrl }`
2. On entity save, backend calls `MediaService.createFromTemp(tempKey, folderId?, altText?)` which moves file from `temp/` to `media/` and creates `media_items` record
3. Orphan cleanup: `@Scheduled` daily task deletes `temp/` files older than 24 hours

### Public API (for other modules)

```java
// At module root: cz.samofujera.media
public record MediaItemResponse(UUID id, String originalFilename, String url,
    String mimeType, long fileSizeBytes, Integer width, Integer height, String altText);

public record TempUploadResponse(String tempKey, String previewUrl);

public interface MediaService {
    TempUploadResponse uploadTemp(InputStream data, String filename, String contentType, long size);
    MediaItemResponse createFromTemp(String tempKey, UUID folderId, String altText);
    MediaItemResponse getById(UUID id);
    String getUrl(UUID id);
    void delete(UUID id);
}
```

### Admin REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/media/folders` | List folder tree |
| POST | `/api/admin/media/folders` | Create folder |
| PUT | `/api/admin/media/folders/{id}` | Rename folder |
| DELETE | `/api/admin/media/folders/{id}` | Delete empty folder |
| GET | `/api/admin/media?folderId=&type=&search=&page=` | List media items (paginated) |
| POST | `/api/admin/media/upload-temp` | Upload to temp |
| POST | `/api/admin/media` | Create media item (from temp key + folder + alt text) |
| PATCH | `/api/admin/media/{id}` | Update alt text, move to folder |
| DELETE | `/api/admin/media/{id}` | Delete item + R2 file |

---

## 2. Media Library Frontend

### Standalone Page: `/admin/media`

Full media management page for housekeeping:
- Left sidebar: folder tree (collapsible, create/rename/delete folders)
- Main area: grid of media items in selected folder (or root)
- Filter by type (image/video/document), search by filename
- Upload button (uploads to temp, then creates item in current folder)
- Bulk select + delete
- Click item to edit alt text, see details, move to folder

### Media Picker Dialog (reusable component)

Used from any entity form (categories, products, articles):
- Triggered by "Select image" button in forms
- Opens Dialog with same layout as standalone page (folder tree + grid)
- Additional "Upload" action to upload + select in one step
- Click image to select it, dialog closes and returns `mediaItemId`
- Form shows thumbnail preview + "Change" / "Remove" buttons

**Component API:**
```tsx
<MediaPicker
  value={mediaItemId}           // current selection (UUID or null)
  onChange={(id) => setMediaId(id)}  // called on select/remove
  accept="image/*"              // mime type filter
/>
```

---

## 3. Category Routes Overhaul

### Route Changes

Replace dialog-based CRUD with full-page routes:

| Old | New |
|-----|-----|
| `/admin/kategorie` (with dialogs) | `/admin/produkty/kategorie` (list with drag reorder) |
| Dialog create | `/admin/produkty/kategorie/nova` (full page form) |
| Dialog edit | `/admin/produkty/kategorie/$categoryId` (full page form) |

### Category List (`/admin/produkty/kategorie`)

- Table columns: Grip handle | Image thumbnail | Name | Slug | Actions (Edit link, Delete button)
- **dnd-kit/sortable** for drag reorder via grip handle
- On drop: `PUT /api/admin/categories/reorder` with `{ categoryIds: [...] }` (ordered array)
- Backend updates `sort_order` for all rows in one transaction
- `sortOrder` field is invisible — managed entirely by drag position
- Delete with `window.confirm()` (consistent with products)

### Category Create/Edit Forms

Fields:
- Name (required)
- Slug (auto-generated from name, manual override)
- Description (textarea)
- Image (MediaPicker component)
- SEO section: Meta title, Meta description

On create:
- If image selected via MediaPicker, send `imageMediaId` in request
- Backend stores FK reference to `media_items`

### Backend Changes

- `product_categories.image_url` → `product_categories.image_media_id UUID REFERENCES media_items(id)`
- New endpoint: `PUT /api/admin/categories/reorder` — accepts ordered list of category IDs
- `CatalogService` uses `MediaService` to resolve image URLs when building responses

---

## 4. Entity References to Media

Entities reference media items by FK instead of storing URLs:

- `product_categories.image_media_id` (replaces `image_url`)
- `CategoryResponse` includes resolved `imageUrl` from `MediaService.getUrl()`

Product gallery migration to media library is **out of scope** — existing `product_images` table continues to work as-is. The pattern is established for future migration.

---

## 5. Dependencies

| Package | Purpose | Where |
|---------|---------|-------|
| `@dnd-kit/core` | Drag & drop foundation | `apps/web` |
| `@dnd-kit/sortable` | Sortable list for categories | `apps/web` |
| `@dnd-kit/utilities` | CSS transform utilities | `apps/web` |

No new backend dependencies — uses existing AWS SDK v2 for R2.

---

## 6. Migration Strategy

1. Create `media_folders` and `media_items` tables
2. Add `image_media_id` column to `product_categories` (nullable)
3. Migrate existing `image_url` values: for each category with `image_url`, create a `media_items` record and set `image_media_id`
4. Drop `image_url` column from `product_categories`
5. Remove `meta_title` and `meta_description` from `product_categories` if not yet populated (keep if data exists)

---

## 7. Phases

**This implementation:**
- Media library module (backend + frontend)
- Media picker dialog component
- Category routes overhaul (list with drag reorder, full-page create/edit)
- Category image via media picker

**Future (separate tasks):**
- Image editing before upload (crop, resize)
- Product gallery migration to media library
- Article categories with media
- Bulk upload
