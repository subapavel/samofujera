# Page SEO Settings — Design

## Goal
Extend CMS page settings with full SEO capabilities. Organize into tabs (Obecné / SEO) with live previews for Google search results and social media cards.

## Current State
- DB: `meta_title`, `meta_description`, `og_image_id` columns exist
- UI: SettingsDrawer shows slug, meta title, meta description only
- og_image_id not exposed in UI
- No keywords, OG title/description, robots fields

## New Fields

### Database (Flyway migration)
| Column | Type | Default |
|--------|------|---------|
| `meta_keywords` | `VARCHAR(300)` | `NULL` |
| `og_title` | `VARCHAR(200)` | `NULL` |
| `og_description` | `VARCHAR(500)` | `NULL` |
| `noindex` | `BOOLEAN` | `false` |
| `nofollow` | `BOOLEAN` | `false` |

Note: `og_image_id` already exists. No canonical URL field needed (Next.js handles it).

## UI Layout

### Tab: Obecné
- URL adresa (slug)
- Titulek stránky (page title)
- Zobrazit v navigaci (showInNav checkbox)

### Tab: SEO
**Náhled ve vyhledávači (Google preview)**
- Live preview showing: blue title, green URL, gray description
- Reflects meta title (fallback: page title), slug, meta description
- Truncated to Google's display limits (~60 chars title, ~160 chars desc)

**Meta nastavení**
- Meta titulek (0/200)
- Meta popis (0/500)
- Klíčová slova (0/300)

**OG nastavení**
- OG titulek — placeholder "Automaticky z meta titulku" (falls back to metaTitle → title)
- OG popis — placeholder "Automaticky z meta popisu" (falls back to metaDescription)
- OG obrázek — MediaPicker using existing `og_image_id`

**Náhled sociální karty (Facebook/Twitter preview)**
- Live preview showing: OG image (1200x630 placeholder if none), domain, OG title, OG description
- Uses effective values (OG fields if set, otherwise falls back to meta fields)

**Pokročilé**
- Robots: noindex checkbox, nofollow checkbox

## Auto-generation Logic
- OG title: use `og_title` if set, else `meta_title`, else `title`
- OG description: use `og_description` if set, else `meta_description`
- Google preview title: `meta_title` if set, else `title + " | Samo Fujera"`
- Google preview description: `meta_description` if set, else italic "Popis není nastaven"

## Frontend Head Rendering (public pages)
```tsx
// In [slug]/page.tsx and page.tsx generateMetadata():
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: page.metaTitle || `${page.title} | Samo Fujera`,
    description: page.metaDescription,
    keywords: page.metaKeywords,
    openGraph: {
      title: page.ogTitle || page.metaTitle || page.title,
      description: page.ogDescription || page.metaDescription,
      images: page.ogImageUrl ? [{ url: page.ogImageUrl }] : undefined,
    },
    robots: {
      index: !page.noindex,
      follow: !page.nofollow,
    },
  };
}
```

## Bug Fix: Image Block Delete Button

The delete button in ImageBlockEditor's floating toolbar doesn't work properly.
It should show a confirmation dialog before deleting, same as other block types.

**Current behavior:** Clicking trash icon in image toolbar calls `onDelete()` (which is
BlockWrapper's `requestDelete`), but simultaneously sets `isSelected = false` and fires
`onActiveChange(false)`. This hides the toolbar and triggers BlockWrapper's `onMouseLeave`,
which resets `confirmingDelete = false` before the confirmation popup appears.

**Desired behavior:** Same as other blocks — clicking delete shows "Opravdu smazat?" +
"Odstranit" confirmation, then deletes on confirm.

**Approach:** Replace the trash icon area in ImageBlockEditor's floating toolbar with the
same two-step confirmation pattern used by BlockWrapper — first click shows confirmation
inline in the toolbar, second click (Odstranit) actually deletes.

**Files:**
- `apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx`

## Files to Modify

### Backend
- New Flyway migration V22
- `PageDtos.java` — add new fields to request/response records
- `PageRepository.java` — update CRUD queries
- `PageController.java` — pass through new fields

### Frontend
- `packages/api-client/src/types.ts` — extend interfaces
- `apps/web/src/components/admin/editor/SettingsDrawer.tsx` — full rewrite with tabs
- `apps/web/src/components/admin/editor/FullPageEditor.tsx` — pass new fields
- `apps/web/src/app/(public)/page.tsx` — render SEO metadata
- `apps/web/src/app/(public)/[slug]/page.tsx` — render SEO metadata
