# Unified Media System Design

## Goal

Establish a single, unified media management system where all images are `media_items`
with auto-generated WebP variants. Entities (products, categories, articles) reference
media items by FK. Replace physical folder organization with virtual filters based on
entity associations.

## Architecture

All uploaded images become `media_items`. On upload, the backend generates 4 WebP
variants (thumb, medium, large, og) plus preserves the original. Entities reference
`media_items` by FK — products via a join table (gallery with ordering), categories
and articles via direct FK (single image).

The media library UI filters images by entity association (virtual folders) instead
of physical folder hierarchy.

## Key Decisions

1. **Unified media_items** — single source of truth for all images
2. **On-upload variant generation** — 4 standard sizes for every image
3. **Auto-draft on product creation** — eliminates need for temp upload flow
4. **Virtual filters** — no physical folders, filter by entity association
5. **Separate category systems** — product_categories and article_categories are independent
6. **Empty drafts stay** — visible in UI, user deletes manually (no cleanup jobs)

## Image Variants

| Variant  | Size       | Format | Strategy   | Use case                         |
|----------|------------|--------|------------|----------------------------------|
| original | as-is      | as-is  | preserved  | Admin reference, re-processing   |
| thumb    | 300x300    | WebP   | cover crop | Catalog grid, cards, cart        |
| medium   | 600x600    | WebP   | cover crop | Product detail page              |
| large    | 1200x1200  | WebP   | cover crop | Zoom, lightbox                   |
| og       | 1200x630   | WebP   | cover crop | OG images, banners, article covers |

All variants generated for every image. Storage cost negligible on R2.

## R2 Key Structure

```
media/
  {mediaItemId}/
    original.{ext}
    thumb.webp
    medium.webp
    large.webp
    og.webp
```

No entity-specific prefixes in R2. Entity association is database-only.

## Database Schema Changes

### media_items (extended)

Existing table with new approach to URL generation. The `storage_key` column
becomes `media/{id}/original.{ext}`. Variant URLs are derived from the media
item ID pattern: `media/{id}/thumb.webp`, etc.

Remove `folder_id` FK — no longer needed.

### media_folders (dropped)

Remove the `media_folders` table entirely. Virtual filters replace physical folders.

### product_gallery (replaces product_images)

```sql
CREATE TABLE product_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, media_item_id)
);
CREATE INDEX idx_product_gallery_product ON product_gallery(product_id);
```

### product_categories.image_media_id

Already references media_items — no change needed.

### Future: article_categories

```sql
CREATE TABLE article_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_media_id UUID REFERENCES media_items(id),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Future: articles

```sql
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    content TEXT,
    cover_media_id UUID REFERENCES media_items(id),
    category_id UUID REFERENCES article_categories(id),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Entity-Image Reference Pattern

| Entity             | Cardinality | Mechanism                          |
|--------------------|-------------|-------------------------------------|
| Product            | Many        | `product_gallery` join table        |
| Product Category   | One         | `image_media_id` FK on category     |
| Article Category   | One         | `image_media_id` FK on category     |
| Article            | One         | `cover_media_id` FK on article      |

All point to `media_items`. Frontend picks variant by context.

## Product Creation Flow (Auto-Draft)

1. User clicks "New Product", selects type
2. Backend creates DRAFT product, returns ID
3. Frontend redirects to `/admin/products/{id}` (edit page)
4. User uploads images — linked directly via `product_gallery`
5. User fills details, clicks "Publish" or "Save as draft"
6. Abandoned drafts visible in product list with "Draft" badge, deletable by user

Removes need for temp upload directory and `uploadTemp`/`createFromTemp` flow.

## Media Library Virtual Filters

Instead of physical folders, the media library UI shows filter tabs:

| Filter              | Query                                           |
|---------------------|--------------------------------------------------|
| All                 | All media_items                                  |
| Products            | media_items in product_gallery                   |
| Product Categories  | media_items referenced by product_categories     |
| Article Categories  | media_items referenced by article_categories     |
| Articles            | media_items referenced by articles               |
| Unlinked            | media_items not referenced by any entity          |

## API Response

```typescript
interface MediaItemResponse {
  id: string;
  originalUrl: string;      // presigned, 1h TTL
  thumbUrl: string;          // 300x300 webp
  mediumUrl: string;         // 600x600 webp
  largeUrl: string;          // 1200x1200 webp
  ogUrl: string;             // 1200x630 webp
  originalFilename: string;
  mimeType: string;
  width: number;             // original dimensions
  height: number;
  altText?: string;
  createdAt: string;
}
```

## Migration Strategy

1. Drop `media_folders` table and `folder_id` FK from `media_items`
2. Migrate `product_images` data into `media_items` + `product_gallery`
3. Generate variants for existing media_items (batch process)
4. Remove temp upload endpoints (no longer needed)
5. Update frontend to use variant URLs and virtual filters

## Tech Stack for Variant Generation

- Java `thumbnailator` library (lightweight, covers resize + crop + WebP output)
- WebP support via `webp-imageio` or `thumbnailator` built-in
- Process synchronously on upload (images are typically small, < 5MB)
