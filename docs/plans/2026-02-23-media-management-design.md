# Media Management, Access Control & Lead Funnels — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date:** 2026-02-23
**Status:** Approved
**Scope:** Image system overhaul, protected content unification, entitlement system,
membership plans, lead magnets, article paywall, admin UI redesign

---

## 1. Goal

Rebuild the media and access control architecture to cleanly separate **public
presentational images** from **protected paid content**, introduce a universal
entitlement system supporting purchases + subscriptions + lead magnets, and
redesign the admin image library for a modern, intuitive experience.

---

## 2. Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Two separate systems: `images` + `product_content` | Different access patterns, metadata, and lifecycle |
| 2 | No server-side variants | Next.js `<Image>` handles all resize/WebP dynamically |
| 3 | Pan offset on relationships, not on image | Same image needs different panning in different contexts |
| 4 | Pan interaction: sliders (0–100) | Matches existing page editor ImageNode pattern |
| 5 | No default pan on image table | Pan only exists in context (ImagePicker). Library shows centered. |
| 6 | OG images via `next/og` | Dynamic generation with pan offset, no stored variants |
| 7 | Resize to max 2400px on upload (new uploads only) | Protect `next/og` from huge files. Existing images stay as-is. |
| 8 | No WebP conversion on upload | Next.js converts automatically when serving |
| 9 | Polymorphic entitlements (`entity_type` + `entity_id`) | Unified access for products, articles, events. App-level integrity. |
| 10 | Membership features as JSONB | New features = new JSONB key, no DB migration |
| 11 | Lead magnets create entitlements, not orders | Keep orders table clean for financial transactions |
| 12 | Articles not sold individually | Access via subscription or lead magnet only |
| 13 | `product_content.is_preview` flag | Previews share same table/upload flow, just toggle visibility |
| 14 | Video embeds as URL columns on entities | YouTube/Vimeo URLs don't need a library — just a field |
| 15 | Image library = images only | Videos, PDFs, and other files managed contextually where used |
| 16 | Admin route: `/admin/obrazky` | Czech, consistent with other admin routes |
| 17 | Grid-only view (no table toggle) | Images are visual content — grid is the natural view |
| 18 | Title + Alt text as separate fields | Title for admin orientation, alt text for SEO/accessibility |
| 19 | Side panel for image detail (not dialog) | Better for browsing/editing many images quickly |
| 20 | Recently used: server-side via `updated_at` | Touch `updated_at` when image is picked. Sort desc for "recent". |
| 21 | SVG sanitization on upload | Security-critical: remove embedded scripts (XSS prevention) |
| 22 | `download_logs` FK updated to `product_content` | Part of unified content migration |

---

## 3. Context & Current State

### What exists now

| Table | Purpose | Issues |
|-------|---------|--------|
| `media_items` | Images with folder system | Name too generic; variant generation code unused; folders removed but naming stuck |
| `media_folders` | Physical folder hierarchy | Already dropped in V19 |
| `product_gallery` | Product-to-image join table | Works, but missing pan offset columns |
| `product_files` | Ebook PDFs (EBOOK products) | Separate from audio/video — should be unified |
| `product_media` | Audio/video (AUDIO_VIDEO products) | Separate from files — should be unified |
| `digital_assets` | Legacy table from V8 | Data migrated in V15 to product_files/product_media, may still exist |
| `entitlements` | Access control | Only supports `product_id` — cannot grant access to articles or other entity types |
| `ImageVariantService` | Generates thumb/medium/large/og WebP variants on upload | Unnecessary — Next.js `<Image>` handles all resize/format conversion dynamically |

### Key problems

1. **Naming confusion** — `media_items` suggests generic media, but only stores images
2. **Unused variant generation** — Backend generates 4 WebP variants per image, but
   Next.js `<Image>` already handles resize + WebP conversion on the fly
3. **Split content tables** — `product_files` and `product_media` serve the same purpose
   (protected content attached to a product) but are separate tables
4. **Entitlement limitations** — Cannot grant access to articles (for paywall or
   lead magnets), only to products
5. **No membership plans** — Architecture mentions subscriptions but no plan/feature model
6. **No lead magnet support** — No way to exchange content for email addresses
7. **No image panning** — Images always crop from center, no way to specify which part to show
8. **No image title** — Only `alt_text` exists, no separate human-friendly title
9. **No upload optimization** — 20MB DSLR photos stored as-is, wasteful for `next/og`
10. **Admin UI outdated** — Media page lacks modern UX (no drag-drop, no usage tracking)

---

## 4. Architecture Overview

### Two fundamentally different media types

| Aspect | Images (presentational) | Product Content (protected) |
|--------|------------------------|-----------------------------|
| Purpose | Decorate entities (gallery, covers, OG backgrounds) | The actual product customer pays for |
| Access | Always public, CDN-cacheable | Conditional (entitlement-based), tracked |
| Storage | R2 `public/images/{id}/original.{ext}` | R2 `assets/{productId}/{contentId}/` or Cloudflare Stream |
| Optimization | Next.js `<Image>` handles resize/WebP dynamically | N/A (serve as-is via presigned URL) |
| Lifecycle | Independent, reusable across entities | Bound to product, cascade-deleted |
| Admin UI | Image Library standalone page + ImagePicker dialog | Product edit page → "Content" tab |

These do NOT share a table or API — completely different access patterns,
metadata, and business logic.

### What lives where — complete inventory

| Content type | Example | Where managed | Storage |
|---|---|---|---|
| Public images | Product photos, covers, OG backgrounds | Image Library + ImagePicker | `images` table + R2 `public/` |
| Protected files | Ebook PDF, audio meditation MP3 | Product edit → Content tab | `product_content` table + R2 `assets/` |
| Protected video | Video course, lecture recording | Product edit → Content tab | `product_content` table + Cloudflare Stream |
| Content previews | 2-min audio clip, video trailer | Product edit → Content tab (checkbox) | `product_content` with `is_preview=true` |
| Video embeds | YouTube promo on product page | Input field on entity | `promo_video_url` column on entity |
| Inline editor images | Photos in page/article body | Page/article Lexical editor | URL in Lexical JSON → `images` table |
| Public downloads | PDF price list on a page | Page editor file block | R2 `public/`, URL in Lexical JSON |
| OG images | Social sharing previews | Dynamically generated | `next/og` ImageResponse (no file in R2) |

---

## 5. Database Schema Changes

### 5.1 Rename `media_items` → `images`

The table stores only images. Name it what it is.

```sql
ALTER TABLE media_items RENAME TO images;
ALTER TABLE images ADD COLUMN title VARCHAR(500);
ALTER TABLE product_gallery RENAME COLUMN media_item_id TO image_id;
ALTER TABLE product_categories RENAME COLUMN image_media_id TO image_id;
ALTER INDEX idx_media_items_mime RENAME TO idx_images_mime;
```

**Final `images` table:**

```sql
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INT,
    height INT,
    title VARCHAR(500),
    alt_text VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Module rename:** `media` module becomes `image` module.

| Old | New |
|-----|-----|
| `MediaService` | `ImageService` |
| `MediaAdminController` | `ImageAdminController` |
| `MediaDtos` | `ImageDtos` |
| `MediaItemRepository` | `ImageRepository` |
| `ImageVariantService` | **Delete entirely** |
| `/api/admin/media` | `/api/admin/images` |
| `mediaApi` (frontend) | `imageApi` (frontend) |
| `/admin/media` route | `/admin/obrazky` route |

### 5.2 Add pan offset columns to relationship tables

Pan offset is a property of the **relationship between image and entity in a
specific context**, not of the image itself.

```sql
ALTER TABLE product_gallery ADD COLUMN pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE product_gallery ADD COLUMN pan_y INT NOT NULL DEFAULT 50;
ALTER TABLE product_categories ADD COLUMN image_pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE product_categories ADD COLUMN image_pan_y INT NOT NULL DEFAULT 50;
```

Future tables follow the same pattern:

```sql
-- articles (future)
ALTER TABLE articles ADD COLUMN cover_image_id UUID REFERENCES images(id) ON DELETE SET NULL;
ALTER TABLE articles ADD COLUMN cover_pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE articles ADD COLUMN cover_pan_y INT NOT NULL DEFAULT 50;

-- pages (future, for OG image)
ALTER TABLE pages ADD COLUMN og_image_id UUID REFERENCES images(id) ON DELETE SET NULL;
ALTER TABLE pages ADD COLUMN og_pan_x INT NOT NULL DEFAULT 50;
ALTER TABLE pages ADD COLUMN og_pan_y INT NOT NULL DEFAULT 50;
```

**Values:** 0–100 (percentage). 50 = center (default).

**Pan slider logic — which slider(s) to show:**

| Image vs target aspect ratio | Slider shown |
|------------------------------|-------------|
| Image wider than target | Horizontal slider (pan left/right) |
| Image taller than target | Vertical slider (pan up/down) |
| Both differ | Both sliders (rare) |
| Ratios match (±10%) | No slider needed |

### 5.3 Create `product_content` (replaces `product_files` + `product_media`)

Unified table for all protected content attached to a product.

```sql
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
```

**Data migration:** Migrate from `product_files` + `product_media` → `product_content`.
Update `download_logs.file_id` FK to reference `product_content`.
Drop old tables: `product_files`, `product_media`, `digital_assets`.

### 5.4 Polymorphic entitlements

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

`source_type` supports: `'PURCHASE'`, `'SUBSCRIPTION'`, `'VOUCHER'`, `'ADMIN'`, `'LEAD_MAGNET'`.

### 5.5 Membership plans

```sql
CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    stripe_price_id_czk VARCHAR(255),
    stripe_price_id_eur VARCHAR(255),
    features JSONB NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID NOT NULL REFERENCES membership_plans(id),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**`features` JSONB example:** `{"articles": "all", "online_events": "all", "video_library": true, "discount_percentage": 15}`

### 5.6 Lead captures

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
```

### 5.7 Products — add promo video + UNLISTED status

```sql
ALTER TABLE products ADD COLUMN promo_video_url VARCHAR(2000);
-- Update status CHECK to include 'UNLISTED'
```

---

## 6. Image Upload & Optimization

### Upload flow

```
1. Admin uploads file (via Image Library or ImagePicker)
2. Backend validates:
   - File size ≤ 20 MB
   - MIME type ∈ {image/jpeg, image/png, image/webp, image/svg+xml, image/gif}
   - Dimensions ≥ 200×200 px (except SVG)
3. Backend optimizes (new uploads only, not SVG/GIF):
   - If longer side > 2400px → proportional resize to max 2400px
   - Preserve original format (JPEG stays JPEG, PNG stays PNG)
   - NO WebP conversion (Next.js handles this)
4. SVG: Sanitize to remove embedded scripts (XSS prevention)
   - Use OWASP Java HTML Sanitizer or dedicated SVG sanitizer
5. Backend stores optimized file in R2: public/images/{id}/original.{ext}
6. Backend reads final dimensions, saves to DB (width, height after resize)
7. Returns: { id, url, width, height, ... }
```

**Existing images stay as-is** — no retroactive resize job.

### What to delete from backend

- `ImageVariantService` — delete entirely
- `webp-imageio` dependency — remove from pom.xml
- All variant URL fields from DTOs (`thumbUrl`, `mediumUrl`, `largeUrl`, `ogUrl`) — remove
- Variant generation in upload flow — remove

### Backend response (simplified)

```java
public record ImageResponse(
    UUID id,
    String url,
    String originalFilename,
    String mimeType,
    long fileSizeBytes,
    int width,
    int height,
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
```

### R2 storage structure

```
public/
  images/
    {imageId}/
      original.jpg              ← public, direct CDN URL

assets/
  {productId}/
    {contentId}/
      original.pdf              ← protected, presigned URL only
```

---

## 7. OG Image Generation

Use `next/og` (Satori + resvg) to dynamically generate OG images as 1200×630 PNG
on the edge. No static OG variants stored in R2.

### Route structure

```
app/api/og-image/[entityType]/[slug]/route.tsx
```

### Fallback chain

```
1. Explicit OG image (og_image_id) → use it
2. Entity's primary image (cover_image_id, first gallery image) → use it
3. Default branded template (logo + entity title on brand background)
```

### Pan offset in OG generation

```tsx
<img
  src={imageUrl}
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${panX}% ${panY}%`
  }}
/>
```

---

## 8. Access Control Model

### Three-layer access check

```
hasAccess(userId, entityType, entityId):

  Layer 1: Direct entitlement?
    → SELECT FROM entitlements WHERE user_id = ? AND entity_type = ? AND entity_id = ?
      AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())
    → If found → GRANTED

  Layer 2: Active subscription with matching feature?
    → SELECT s.*, mp.features FROM subscriptions s
      JOIN membership_plans mp ON mp.id = s.plan_id
      WHERE s.user_id = ? AND s.status = 'ACTIVE' AND s.current_period_end > now()
    → Check features JSONB for entity type match
    → If features match → GRANTED

  Layer 3: DENIED
```

### Article paywall flow

```
1. GET /api/articles/{slug}
2. Backend (PaywallResolver):
   a) article.access_type = 'FREE' → return full content
   b) User authenticated + hasAccess → full content
   c) Otherwise → first 2-3 paragraphs + paywallOptions
```

---

## 9. Lead Magnet System

### Flow: Ebook lead magnet

```
1. Customer visits: /lead/{product-slug}?utm_source=facebook
2. Enters email → POST /api/public/lead-magnet/product/{slug}
3. Backend:
   a) Validate email
   b) Rate limit (IP + email)
   c) Find or create user (email only)
   d) Check existing entitlement → if yes, resend email
   e) Create lead_capture record (with UTM data)
   f) Grant entitlement: entity_type=PRODUCT, source_type=LEAD_MAGNET
   g) Send email with link to /muj-ucet/knihovna
4. No order created.
```

### Lead magnet products

A lead magnet product is a regular EBOOK product with:
- Price = 0
- Status = `UNLISTED` (active but not in catalog)
- Content managed in same "Content" tab

---

## 10. Admin Image Library — UI Design

### Layout: `/admin/obrazky`

Grid-only view with side panel for detail editing. Based on the JSX prototype
layout with these adjustments:

- **Pan sliders** instead of focal point click (matching page editor pattern)
- **shadcn/ui components** + Tailwind (not inline styles)
- **No default pan** on image itself — pan only in ImagePicker context
- **Recently used**: sort by `updated_at` desc (touch on pick)

### Image card shows

- Thumbnail (4:3 aspect, object-fit: cover, centered)
- Title (or filename if no title)
- Dimensions + file size
- Usage badges (products, articles, categories, pages)
- Warning badge if missing alt text or title
- "Nepřiřazený" badge if unused
- Checkbox for bulk selection (top-left on hover)

### Detail side panel shows

- Large preview (no pan slider — pan is context-specific)
- File metadata grid (filename, type, dimensions, size, upload date)
- Title input field
- Alt text textarea with SEO warning if empty
- "Použito v" section — list of entities with links to their edit pages
- Save + Delete buttons

### ImagePicker dialog (used from entity forms)

Two-step flow:

**Step 1: Select image** — grid of all images, search, upload new. "Recently used" at top (sorted by `updated_at`).

**Step 2: Pan offset (conditional)** — appears only when image aspect ratio differs from target by >10%. Shows horizontal/vertical pan sliders.

**Returns to parent form:**

```typescript
interface ImagePickerResult {
  imageId: string;
  panX: number;  // 0–100
  panY: number;  // 0–100
}
```

### Frontend rendering with pan offset

```tsx
<Image
  src={publicImageUrl}
  fill
  style={{
    objectFit: 'cover',
    objectPosition: `${panX}% ${panY}%`
  }}
/>
```

---

## 11. Product Content Admin UI

Unified "Obsah" tab replacing separate "Soubory" and "Media" tabs:

- Drag handle for reordering
- "Ukázka" checkbox for preview content
- Upload: PDF, MP3, MP4 (R2 `assets/`)
- "Přidat video" for Cloudflare Stream

---

## 12. API Endpoints

### Image Library (admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/images` | List (paginated, filterable, sorted by `updated_at` desc) |
| GET | `/api/admin/images/{id}` | Detail with usage info |
| POST | `/api/admin/images/upload` | Upload + optimize + store |
| PATCH | `/api/admin/images/{id}` | Update title, alt text |
| DELETE | `/api/admin/images/{id}` | Delete (warn if in use) |

### Product Content (admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/products/{id}/content` | List content items |
| POST | `/api/admin/products/{id}/content/upload` | Upload file |
| POST | `/api/admin/products/{id}/content/stream` | Link Cloudflare Stream video |
| PATCH | `/api/admin/products/{id}/content/{cid}` | Update title, is_preview |
| DELETE | `/api/admin/products/{id}/content/{cid}` | Delete content item |
| PUT | `/api/admin/products/{id}/content/reorder` | Reorder |

### Customer Content Access

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/customer/content/{contentId}/download` | Entitlement check → presigned URL |
| GET | `/api/customer/content/{contentId}/stream` | Entitlement check → signed Stream token |

### Lead Magnets (public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/public/lead-magnet/product/{slug}` | Email → entitlement |
| POST | `/api/public/lead-magnet/article/{slug}` | Email → entitlement |

### Membership

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/membership/plans` | List plans |
| POST | `/api/admin/membership/plans` | Create plan |
| PUT | `/api/admin/membership/plans/{id}` | Update plan |
| GET | `/api/membership` | My subscription status |
| POST | `/api/membership/subscribe` | Start → Stripe Checkout |
| POST | `/api/membership/cancel` | Cancel subscription |

### OG Image (public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/og-image/[entityType]/[slug]` | Generate 1200×630 PNG |

---

## 13. Backend Module Changes

### `image` module (renamed from `media`)

```
cz.samofujera.image/
├── ImageService.java
├── ImageDtos.java
├── ImageAdminController.java
├── internal/
│   ├── ImageRepository.java
│   ├── ImageProcessingService.java    # Resize to max 2400px
│   └── ImageUsageResolver.java        # Query entity tables for usage
```

### `catalog` module (extended)

```
cz.samofujera.catalog/
├── ProductContentService.java
├── ProductContentDtos.java
├── ProductContentAdminController.java
├── internal/
│   └── ProductContentRepository.java
```

### `entitlement` module (extended)

```
cz.samofujera.entitlement/
├── EntitlementService.java            # hasAccess(), grant(), revoke()
├── internal/
│   ├── EntitlementRepository.java
│   └── AccessChecker.java            # Unified check (entitlement + subscription)
```

### `membership` module (new)

```
cz.samofujera.membership/
├── MembershipService.java
├── MembershipDtos.java
├── MembershipAdminController.java
├── MembershipCustomerController.java
├── internal/
│   ├── PlanRepository.java
│   ├── SubscriptionRepository.java
│   └── SubscriptionLifecycleService.java
```

### `lead` module (new)

```
cz.samofujera.lead/
├── LeadService.java
├── LeadDtos.java
├── LeadPublicController.java
├── internal/
│   ├── LeadCaptureRepository.java
│   └── LeadEmailService.java
```

---

## 14. Migration Strategy

Each step is independently deployable.

### Step 1: Clean up image system

- DB: rename `media_items` → `images`, add `title`, rename FK columns
- DB: add pan offset columns to `product_gallery` + `product_categories`
- Delete `ImageVariantService`, remove variant generation code
- Add `ImageProcessingService` (resize to max 2400px, SVG sanitization)
- Rename module: `media` → `image`
- Backend returns: `url`, `width`, `height`, `title`, `altText`, `usedIn[]`
- Redesign admin Image Library page (grid + side panel)
- Redesign ImagePicker with pan slider

### Step 2: Unify protected content

- DB: create `product_content`, migrate from `product_files` + `product_media`
- Update `download_logs` FK to reference `product_content`
- Drop old tables
- Admin UI: unified "Obsah" tab with `is_preview` checkbox

### Step 3: Polymorphic entitlements

- DB: add `entity_type` + `entity_id`, migrate data, drop `product_id`
- Rewrite `EntitlementService` with `hasAccess(userId, entityType, entityId)`

### Step 4: Membership plans + subscriptions

- DB: create `membership_plans` + `subscriptions`
- Create `membership` module
- Stripe subscription webhook integration
- Admin + customer UI

### Step 5: Lead magnets

- DB: create `lead_captures`, add `UNLISTED` product status
- Create `lead` module
- Public API endpoint + email template

### Step 6: Article paywall (depends on articles module)

- Add paywall columns to `articles`
- `PaywallResolver` + paywall UI component

### Step 7: OG image generation

- `app/api/og-image/[entityType]/[slug]/route.tsx`
- `next/og` ImageResponse with pan offset
- Update metadata across entity pages

---

## 15. UI Prototype Reference

The JSX prototype at `image-library.jsx` serves as **layout and UX reference only**.
Implementation will use:
- shadcn/ui components (Card, Button, Input, Textarea, Badge, Slider, Dialog)
- Tailwind CSS 4 classes (not inline styles)
- Pan sliders (not focal point click)
- Lingui i18n for all strings
- TanStack Query for data fetching

---

## 16. Admin Navigation (updated)

```
Obecné
  📊 Nástěnka

Obsah
  📄 Stránky
  📝 Články              ← future (Phase 3)
  🖼️ Knihovna obrázků    ← renamed from "Média"

Prodej
  📦 Produkty
  🏷️ Kategorie
  📋 Objednávky
  ⭐ Membership plány    ← new (Phase 3+)

Systém
  👥 Uživatelé
```
