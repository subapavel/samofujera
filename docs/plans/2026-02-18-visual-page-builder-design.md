# Visual Page Builder — Design

## Goal

Add a visual inline WYSIWYG page builder to the admin section, allowing the admin to create and edit pages directly as they appear on the public site. New pages are served at `/pages/{slug}`. Existing hardcoded pages remain unchanged and will be migrated gradually in a later phase.

## Architecture

Full-stack custom solution: new `page` Spring Modulith module on the backend storing page content as Lexical editor JSON in PostgreSQL JSONB. Frontend uses Lexical (Meta) for inline editing with custom block nodes, rendered in a fullscreen editor that mirrors the public site's styling.

## Tech Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Editor engine | Lexical (Meta) | Modern, performant, extensible with custom nodes. Used by Payload CMS. |
| Content storage | JSONB (Lexical serialized state) | Single column holds entire editor tree. No relational block tables needed. |
| Backend module | Spring Modulith `page` | Follows existing module conventions. JOOQ for queries. |
| Frontend rendering | Lexical JSON → React components | Shared node definitions between editor and public renderer. |

## Database Schema

```sql
CREATE TABLE pages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(255) NOT NULL UNIQUE,
    title            VARCHAR(500) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT, PUBLISHED, ARCHIVED
    page_type        VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',  -- SYSTEM, CUSTOM, LANDING
    content          JSONB NOT NULL DEFAULT '{}',
    meta_title       VARCHAR(200),
    meta_description VARCHAR(500),
    og_image_id      UUID REFERENCES media_items(id),
    sort_order       INT NOT NULL DEFAULT 0,
    show_in_nav      BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at     TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id)
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
```

### Field Notes

- **content**: Lexical editor state serialized as JSON. The entire page content tree lives here.
- **page_type**: `SYSTEM` pages (homepage, contact) cannot be deleted, only edited. `CUSTOM` pages are user-created. `LANDING` pages are for product sales (future A/B testing).
- **slug**: URL path segment. Public URL is `/pages/{slug}`.
- **show_in_nav / sort_order**: For future dynamic navigation integration.

## Backend API

### Admin Endpoints (`/api/admin/pages` — ADMIN role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/pages` | List pages (filters: status, type, search) |
| GET | `/api/admin/pages/{id}` | Page detail with content JSON |
| POST | `/api/admin/pages` | Create new page |
| PUT | `/api/admin/pages/{id}` | Save page (content, metadata, SEO) |
| PUT | `/api/admin/pages/{id}/publish` | Publish (DRAFT → PUBLISHED) |
| PUT | `/api/admin/pages/{id}/unpublish` | Unpublish (PUBLISHED → DRAFT) |
| DELETE | `/api/admin/pages/{id}` | Delete (CUSTOM only, not SYSTEM) |

### Public Endpoints (`/api/pages` — public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pages/{slug}` | Page content for rendering (PUBLISHED only) |

### Module Structure

```
cz.samofujera.page/
├── PageService.java
├── PageDtos.java
├── event/
│   └── PagePublishedEvent.java
└── internal/
    ├── PageRepository.java
    └── PageAdminController.java
```

## Lexical Editor — Block Types

### Built-in Nodes (Lexical provides)

- **HeadingNode** — H2, H3
- **ParagraphNode** — Body text
- **ListNode** — Bulleted and numbered lists
- **LinkNode** — Inline links
- **HorizontalRuleNode** — Basic horizontal rule

### Custom Nodes (to implement)

| Node | Description | Integration |
|------|-------------|-------------|
| ImageNode | Image from media library | MediaPicker, alt text, alignment (left/center/right/full) |
| CTAButtonNode | Call-to-action button | Text, URL, style (primary/secondary) |
| ColumnsNode | 2-3 column layout | Each column is a nested Lexical editor |
| GalleryNode | Image gallery grid | MediaPicker multi-select, configurable columns |
| ContactFormNode | Contact form embed | Sends email via backend |
| SeparatorNode | Decorative separator | Styled divider matching site design |

### Editor Toolbar

- **Floating toolbar** on text selection: Format dropdown (H2/H3/paragraph), Bold, Italic, alignment, lists, link, delete
- **Side "+" menu** for inserting new blocks (shows palette of all block types)
- **Drag handle** on each block for reordering

## Frontend Architecture

### Admin Routes (new)

```
/admin/stranky              — Page list (table: title, slug, status, date)
/admin/stranky/nova         — New page (fullscreen Lexical editor)
/admin/stranky/{pageId}     — Edit page (fullscreen Lexical editor)
```

### Editor Layout

The editor is fullscreen and mirrors the public site appearance:

- **Top bar**: Page title (editable), slug, SEO settings (dialog), status badge, Save/Publish buttons, back arrow
- **Editor area**: Lexical inline editor styled identically to the public site — same max-width (935px), background texture (`bg-body-texture.png`), fonts (Merriweather for headings, Open Sans for body), Tailwind classes
- **No sidebar** — the editor IS the page

Reference: Webnode's inline editor approach — click on content to edit, floating toolbar appears above the focused block.

### Public Rendering

- **Route**: `apps/web/src/app/(public)/pages/[slug]/page.tsx`
- **Server component**: Fetches `/api/pages/{slug}`, returns 404 if not found or not published
- **Renderer**: Lexical JSON → React components using shared node definitions
- **Styling**: Same Tailwind classes as editor (consistent WYSIWYG)

### Existing Pages

All current hardcoded pages in `(public)/` remain untouched. No changes to homepage, o-samovi, kontakt, etc. Future migration to DB will happen in a separate phase.

## SEO

Each page has:
- `meta_title` → `<title>` and `og:title`
- `meta_description` → `<meta name="description">` and `og:description`
- `og_image_id` → OG image from media library
- Next.js `generateMetadata()` in the `[slug]/page.tsx` server component

## Phasing

### Phase 1 (this design)
- Backend `page` module with full CRUD API
- Lexical editor with all listed block types
- Admin pages list + editor
- Public rendering at `/pages/{slug}`
- SEO metadata

### Future phases
- Migrate existing hardcoded pages to SYSTEM pages in DB
- Dynamic navigation from DB
- Landing page templates for product sales
- A/B testing for landing pages
- Revision history / versioning
- Editor role (non-admin page editors)
- AI assistant in toolbar
