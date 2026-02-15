# Admin Product Form Revamp — Design

## Summary

Rebuild admin product form with tabbed layout, image gallery with drag & drop,
and inline variant management for physical products.

## Tab Layout

| Tab | Visible for | Content |
|-----|------------|---------|
| Zakladni info | All types | Title, slug, description, type, status, category, prices |
| Galerie | All types | Drag & drop image grid, upload, reorder, delete |
| Varianty | PHYSICAL | Inline editable table: name, SKU, stock, price CZK/EUR |
| Soubory | EBOOK | File upload/delete (existing) |
| Media | AUDIO_VIDEO | Media create/delete (existing) |
| Udalost | *_EVENT | Date, venue, capacity, stream URL, occurrences |

## Image Gallery

### Database

New table `product_images`:
- id UUID PK
- product_id UUID FK CASCADE
- file_key TEXT NOT NULL
- file_name TEXT NOT NULL
- file_size_bytes BIGINT
- content_type TEXT
- alt_text TEXT
- sort_order INT DEFAULT 0
- created_at TIMESTAMPTZ DEFAULT now()

### Backend API

- `POST /api/admin/products/{id}/images` — multipart upload, stores in R2
- `DELETE /api/admin/products/{id}/images/{imageId}` — deletes from R2 + DB
- `PUT /api/admin/products/{id}/images/reorder` — accepts ordered list of image IDs
- `GET /api/admin/products/{id}/images` — list images (sorted)

First image in gallery = product thumbnail (derived, not duplicated).
Remove `thumbnail_url` text input from form.

### Frontend

- Grid of 1:1 aspect-ratio thumbnails (presigned URLs)
- Drag & drop reorder (HTML native drag or lightweight lib)
- "+" button to upload new image
- Hover overlay with delete button
- Click image to edit alt text

## Variants (PHYSICAL)

### Backend API

- `POST /api/admin/products/{id}/variants` — create variant + prices
- `PUT /api/admin/products/{id}/variants/{variantId}` — update variant + prices
- `DELETE /api/admin/products/{id}/variants/{variantId}` — delete variant + prices

Repositories already exist: ProductVariantRepository, VariantPriceRepository.

### Frontend

- Inline table in "Varianty" tab
- Columns: Name | SKU | Stock | CZK | EUR | Actions (delete)
- "Add variant" button appends empty row
- Save per-row on blur or explicit save button

## What stays the same

- Files (EBOOK) and Media (AUDIO_VIDEO) sections move into tabs, logic unchanged
- Basic info form fields unchanged, just wrapped in tab
- Event tab placeholder (future implementation)

## Catalog response changes

- ProductDetailResponse gains `images: List<ImageResponse>` field
- ImageResponse: id, fileName, url (presigned), altText, sortOrder
- Public catalog uses first image as thumbnail
