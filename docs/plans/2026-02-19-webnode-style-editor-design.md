# Webnode-style Editor Redesign

**Goal:** Redesign the page editor to use a Webnode-style block insertion popup with a grid of cards, wrap each block in `<section>` for styling, serve page images via public bucket prefix, fix Czech diacritics across the entire admin, and remove unused block types.

## Block Insertion — "Přidat obsah" Popup

Between every two blocks in the editor, a thin horizontal line with a circular `+` button appears on hover. Clicking it opens a **Popover** (positioned at the button) with a 2x2 grid of cards:

```
┌─────────────────────────────────┐
│  Přidat obsah                   │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │  ≡       │  │  🖼      │      │
│  │  Text    │  │ Obrázek │      │
│  └─────────┘  └─────────┘      │
│  ┌─────────┐  ┌─────────┐      │
│  │  ──      │  │  □       │      │
│  │ Dělicí   │  │ Tlačítko │      │
│  │  čára    │  │          │      │
│  └─────────┘  └─────────┘      │
└─────────────────────────────────┘
```

- **Grid 2x2** (expandable to 4 columns as more blocks are added later)
- Each card: Lucide icon + label
- Click card → insert block at `+` position → close popup
- Icons: `Type` (Text), `Image` (Obrázek), `Minus` (Dělicí čára), `MousePointerClick` (Tlačítko)

## Block Types (4)

| Block | Lexical Node | Behavior |
|-------|-------------|----------|
| Text | Built-in ParagraphNode | Inserts empty paragraph, cursor moves inside |
| Obrázek | ImageNode (existing) | Inserts placeholder → click opens MediaPicker |
| Dělicí čára | SeparatorNode (existing) | Inserts separator, double-click toggles style |
| Tlačítko | ButtonNode (renamed from CTAButtonNode) | Inserts button, click opens inline edit |

## Removed Blocks

Delete completely: `ColumnsNode`, `GalleryNode`, `ContactFormNode` — including registration in PageEditor, entries in InsertBlockPlugin, and renderers in PageRenderer.

## Section Wrapping in Renderer

Every block in `PageRenderer` is wrapped in a `<section>` with a CSS class based on block type:

```html
<section class="page-block page-block--text">
  <p>...</p>
</section>
<section class="page-block page-block--image">
  <img src="..." alt="..." />
</section>
<section class="page-block page-block--separator">
  <hr />
</section>
<section class="page-block page-block--button">
  <a href="..." class="...">Text</a>
</section>
```

Dělicí čára is its own `<section>`, just like any other block — it is not a boundary between sections.

## Public Images

Page images are served publicly, without presigned URLs:

- Images uploaded for pages are stored under a **public prefix** in MinIO/R2: `public/media/{id}/original.ext` + variants
- Bucket policy grants public read access on the `public/` prefix
- Editor stores the direct public URL in the Lexical JSON (not a presigned URL)
- Example: `https://{bucket-domain}/public/media/{uuid}/large.webp`
- No backend proxy endpoint needed for page images
- Presigned URLs remain only for protected content (ebooks, downloads)

## Czech Diacritics Fix

Fix all Czech strings missing diacritics across the entire admin:

- Editor: `InsertBlockPlugin.tsx`, `ToolbarPlugin.tsx`, all node files
- Routes: `page-editor.tsx`, `pages-list.tsx`, `dashboard.tsx`, `media.tsx`, `products.tsx`
- Renderer: `PageRenderer.tsx`
- Navigation and other admin UI components

## Backend Changes

- Add public read bucket policy for `public/` prefix in StorageService/MinIO config
- Modify `MediaService.uploadAndCreate()` to accept a `public` flag — when true, store under `public/media/` prefix and return direct URL instead of presigned
- Remove the partially-created `MediaPublicController.java` (no longer needed)
- SecurityConfig: no new public endpoints needed for images

## Not In Scope

- Gallery, Columns, Contact Form blocks (removed)
- Video blocks, maps, product listings (future)
- Drag-and-drop block reordering (future)
- Section background color/image customization (future)
