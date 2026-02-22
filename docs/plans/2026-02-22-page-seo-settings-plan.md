# Page SEO Settings — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend CMS page settings with SEO fields (keywords, OG tags, robots), organize drawer into tabs (Obecné/SEO) with live Google and social card previews, and fix image block delete confirmation bug.

**Architecture:** Add 5 new DB columns via Flyway migration. Extend backend DTOs, repository, and service to pass through new fields. Rewrite SettingsDrawer as tabbed UI with live previews. Update public pages to render full SEO metadata. Fix ImageBlockEditor delete to use confirmation pattern.

**Tech Stack:** Java/Spring Boot/JOOQ (backend), Next.js/React/TanStack Query (frontend), shadcn/ui Tabs + Sheet components, Radix UI primitives

---

### Task 1: Flyway migration — add SEO columns

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V22__add_seo_fields_to_pages.sql`

**Step 1: Write the migration**

```sql
ALTER TABLE pages ADD COLUMN meta_keywords VARCHAR(300);
ALTER TABLE pages ADD COLUMN og_title VARCHAR(200);
ALTER TABLE pages ADD COLUMN og_description VARCHAR(500);
ALTER TABLE pages ADD COLUMN noindex BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pages ADD COLUMN nofollow BOOLEAN NOT NULL DEFAULT false;
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && ./mvnw compile -pl . -Djooq.codegen.skip=false`

Verify: `PAGES.META_KEYWORDS`, `PAGES.OG_TITLE`, `PAGES.OG_DESCRIPTION`, `PAGES.NOINDEX`, `PAGES.NOFOLLOW` exist in generated code.

**Step 3: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V22__add_seo_fields_to_pages.sql
git add apps/backend/src/main/java/cz/samofujera/generated/
git commit -m "feat(backend): add seo fields to pages table"
```

---

### Task 2: Backend DTOs — add new fields

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageDtos.java`

**Step 1: Update `UpdatePageRequest` record**

Add these fields after `ogImageId`:

```java
public record UpdatePageRequest(
    @NotBlank @Size(max = 255) String slug,
    @NotBlank @Size(max = 500) String title,
    Object content,
    @Size(max = 200) String metaTitle,
    @Size(max = 500) String metaDescription,
    UUID ogImageId,
    boolean showInNav,
    @Size(max = 300) String metaKeywords,
    @Size(max = 200) String ogTitle,
    @Size(max = 500) String ogDescription,
    boolean noindex,
    boolean nofollow
) {}
```

**Step 2: Update `PageDetailResponse` record**

Add new fields after `ogImageId`:

```java
public record PageDetailResponse(
    UUID id, String slug, String title, String status, String pageType,
    @JsonRawValue String content, String metaTitle, String metaDescription, UUID ogImageId,
    String metaKeywords, String ogTitle, String ogDescription,
    boolean noindex, boolean nofollow,
    int sortOrder, boolean showInNav,
    OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt,
    OffsetDateTime scheduledPublishAt
) {}
```

**Step 3: Update `PublicPageResponse` record**

Add SEO fields needed for frontend `generateMetadata()`:

```java
public record PublicPageResponse(
    String slug, String title, @JsonRawValue String content,
    String metaTitle, String metaDescription,
    String metaKeywords, String ogTitle, String ogDescription,
    String ogImageUrl, boolean noindex, boolean nofollow
) {}
```

Note: `ogImageUrl` is a resolved URL (not the UUID). The service will look up the media item to get the URL.

**Step 4: Verify it compiles**

Run: `cd apps/backend && ./mvnw compile -pl .`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/page/PageDtos.java
git commit -m "feat(backend): extend page dtos with seo fields"
```

---

### Task 3: Backend repository — update queries

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/page/internal/PageRepository.java`

**Step 1: Update `PageRow` record**

Add new fields:

```java
public record PageRow(
    UUID id, String slug, String title, String status, String pageType,
    JSONB content, String metaTitle, String metaDescription,
    UUID ogImageId, String metaKeywords, String ogTitle, String ogDescription,
    boolean noindex, boolean nofollow,
    int sortOrder, boolean showInNav,
    OffsetDateTime createdAt, OffsetDateTime updatedAt,
    OffsetDateTime publishedAt, UUID createdBy,
    OffsetDateTime scheduledPublishAt
) {}
```

**Step 2: Update all SELECT queries**

In `findById()`, `findBySlug()`, and `findDueForPublish()` — add to the select list:

```java
PAGES.META_KEYWORDS, PAGES.OG_TITLE, PAGES.OG_DESCRIPTION,
PAGES.NOINDEX, PAGES.NOFOLLOW,
```

And update the `PageRow` constructor mapping accordingly (add these after `r.get(PAGES.OG_IMAGE_ID)`):

```java
r.get(PAGES.META_KEYWORDS), r.get(PAGES.OG_TITLE), r.get(PAGES.OG_DESCRIPTION),
r.get(PAGES.NOINDEX), r.get(PAGES.NOFOLLOW),
```

**Step 3: Update `update()` method**

Add new columns to the update statement:

```java
public void update(UUID id, String slug, String title, JSONB content,
                   String metaTitle, String metaDescription, UUID ogImageId,
                   boolean showInNav, String metaKeywords, String ogTitle,
                   String ogDescription, boolean noindex, boolean nofollow) {
    dsl.update(PAGES)
        .set(PAGES.SLUG, slug)
        .set(PAGES.TITLE, title)
        .set(PAGES.CONTENT, content)
        .set(PAGES.META_TITLE, metaTitle)
        .set(PAGES.META_DESCRIPTION, metaDescription)
        .set(PAGES.OG_IMAGE_ID, ogImageId)
        .set(PAGES.SHOW_IN_NAV, showInNav)
        .set(PAGES.META_KEYWORDS, metaKeywords)
        .set(PAGES.OG_TITLE, ogTitle)
        .set(PAGES.OG_DESCRIPTION, ogDescription)
        .set(PAGES.NOINDEX, noindex)
        .set(PAGES.NOFOLLOW, nofollow)
        .set(PAGES.UPDATED_AT, OffsetDateTime.now())
        .where(PAGES.ID.eq(id))
        .execute();
}
```

**Step 4: Verify it compiles**

Run: `cd apps/backend && ./mvnw compile -pl .`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/page/internal/PageRepository.java
git commit -m "feat(backend): update page repository with seo fields"
```

---

### Task 4: Backend service — pass through new fields + resolve OG image URL

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageService.java`

**Step 1: Add MediaService dependency for OG image URL resolution**

Add import and constructor injection:

```java
import cz.samofujera.media.MediaService;

// In constructor:
private final PageRepository pageRepository;
private final MediaService mediaService;

PageService(PageRepository pageRepository, MediaService mediaService) {
    this.pageRepository = pageRepository;
    this.mediaService = mediaService;
}
```

**Step 2: Update `updatePage()` method**

Pass through the new fields to the repository:

```java
pageRepository.update(id, request.slug(), request.title(), contentJsonb,
    request.metaTitle(), request.metaDescription(), request.ogImageId(),
    request.showInNav(), request.metaKeywords(), request.ogTitle(),
    request.ogDescription(), request.noindex(), request.nofollow());
```

**Step 3: Update `toDetailResponse()` mapping**

Add new fields from the row:

```java
private PageDtos.PageDetailResponse toDetailResponse(PageRepository.PageRow row) {
    return new PageDtos.PageDetailResponse(
        row.id(), row.slug(), row.title(), row.status(), row.pageType(),
        rawContent(row.content()), row.metaTitle(), row.metaDescription(),
        row.ogImageId(), row.metaKeywords(), row.ogTitle(), row.ogDescription(),
        row.noindex(), row.nofollow(),
        row.sortOrder(), row.showInNav(),
        row.createdAt(), row.updatedAt(), row.publishedAt(),
        row.scheduledPublishAt()
    );
}
```

**Step 4: Update `getPublishedPageBySlug()` and `getPageBySlug()` to resolve OG image URL**

Create a helper method to resolve the OG image URL:

```java
private String resolveOgImageUrl(UUID ogImageId) {
    if (ogImageId == null) return null;
    try {
        var item = mediaService.getItemById(ogImageId);
        return item.originalUrl();
    } catch (Exception e) {
        return null;
    }
}
```

Update both public methods to include the new fields:

```java
return new PageDtos.PublicPageResponse(
    row.slug(), row.title(), rawContent(row.content()),
    row.metaTitle(), row.metaDescription(),
    row.metaKeywords(), row.ogTitle(), row.ogDescription(),
    resolveOgImageUrl(row.ogImageId()), row.noindex(), row.nofollow()
);
```

**Step 5: Check if `MediaService.getItemById()` exists**

Search for this method. If it doesn't exist, check what media API method returns a single item and use that. The goal is to get the `originalUrl` for a media item by ID.

**Step 6: Verify it compiles**

Run: `cd apps/backend && ./mvnw compile -pl .`
Expected: BUILD SUCCESS

**Step 7: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/page/PageService.java
git commit -m "feat(backend): wire seo fields through page service"
```

---

### Task 5: Frontend types — extend interfaces

**Files:**
- Modify: `packages/api-client/src/types.ts`

**Step 1: Update `PageDetailResponse`**

Add after `ogImageId`:

```typescript
export interface PageDetailResponse extends PageResponse {
  content: Record<string, unknown> | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  noindex: boolean;
  nofollow: boolean;
}
```

Note: `PageDetailResponse` currently extends `PageResponse` and only adds `content`. The new fields come from the backend `PageDetailResponse` record, not `PageResponse`.

**Step 2: Update `UpdatePageRequest`**

Add new fields:

```typescript
export interface UpdatePageRequest {
  slug: string;
  title: string;
  content: Record<string, unknown> | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageId?: string | null;
  showInNav?: boolean;
  metaKeywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
}
```

**Step 3: Update `PublicPageResponse`**

Add SEO fields:

```typescript
export interface PublicPageResponse {
  slug: string;
  title: string;
  content: Record<string, unknown> | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
}
```

**Step 4: Verify types**

Run: `pnpm turbo typecheck --filter=@samofujera/api-client`
Expected: no errors

**Step 5: Commit**

```bash
git add packages/api-client/src/types.ts
git commit -m "feat(api-client): extend page types with seo fields"
```

---

### Task 6: FullPageEditor — manage new state fields

**Files:**
- Modify: `apps/web/src/components/admin/editor/FullPageEditor.tsx`

**Step 1: Add new state variables**

After the existing `metaDescription` state:

```typescript
const [showInNav, setShowInNav] = useState(false);
const [ogImageId, setOgImageId] = useState<string | null>(null);
const [metaKeywords, setMetaKeywords] = useState("");
const [ogTitle, setOgTitle] = useState("");
const [ogDescription, setOgDescription] = useState("");
const [noindex, setNoindex] = useState(false);
const [nofollow, setNofollow] = useState(false);
```

**Step 2: Initialize from query data**

In the initialization block (after `setMetaDescription`):

```typescript
setShowInNav(pageData.showInNav ?? false);
setOgImageId(pageData.ogImageId ?? null);
setMetaKeywords(pageData.metaKeywords ?? "");
setOgTitle(pageData.ogTitle ?? "");
setOgDescription(pageData.ogDescription ?? "");
setNoindex(pageData.noindex ?? false);
setNofollow(pageData.nofollow ?? false);
```

**Step 3: Update save mutation**

Pass all new fields to `updatePage`:

```typescript
const saveMutation = useMutation({
  mutationFn: () =>
    pageAdminApi.updatePage(pageId, {
      slug,
      title,
      content: serializeContent(sections) as unknown as Record<string, unknown>,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      ogImageId: ogImageId || null,
      showInNav,
      metaKeywords: metaKeywords || null,
      ogTitle: ogTitle || null,
      ogDescription: ogDescription || null,
      noindex,
      nofollow,
    }),
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "pages"] }),
});
```

**Step 4: Update SettingsDrawer props**

Pass all new fields (the SettingsDrawer itself will be rewritten in Task 7):

```tsx
<SettingsDrawer
  open={showSettings}
  onOpenChange={setShowSettings}
  title={title}
  slug={slug}
  onSlugChange={setSlug}
  showInNav={showInNav}
  onShowInNavChange={setShowInNav}
  metaTitle={metaTitle}
  onMetaTitleChange={setMetaTitle}
  metaDescription={metaDescription}
  onMetaDescriptionChange={setMetaDescription}
  metaKeywords={metaKeywords}
  onMetaKeywordsChange={setMetaKeywords}
  ogTitle={ogTitle}
  onOgTitleChange={setOgTitle}
  ogDescription={ogDescription}
  onOgDescriptionChange={setOgDescription}
  ogImageId={ogImageId}
  onOgImageIdChange={setOgImageId}
  noindex={noindex}
  onNoindexChange={setNoindex}
  nofollow={nofollow}
  onNofollowChange={setNofollow}
/>
```

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/editor/FullPageEditor.tsx
git commit -m "feat(admin): manage seo state fields in full page editor"
```

---

### Task 7: SettingsDrawer — full rewrite with tabs

**Files:**
- Modify: `apps/web/src/components/admin/editor/SettingsDrawer.tsx`

This is the largest task. The drawer gets two tabs: Obecné (General) and SEO.

**Step 1: Update the props interface**

```typescript
interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Obecné tab
  title: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  showInNav: boolean;
  onShowInNavChange: (showInNav: boolean) => void;
  // SEO tab — Meta
  metaTitle: string;
  onMetaTitleChange: (title: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (desc: string) => void;
  metaKeywords: string;
  onMetaKeywordsChange: (keywords: string) => void;
  // SEO tab — OG
  ogTitle: string;
  onOgTitleChange: (title: string) => void;
  ogDescription: string;
  onOgDescriptionChange: (desc: string) => void;
  ogImageId: string | null;
  onOgImageIdChange: (id: string | null) => void;
  // SEO tab — Robots
  noindex: boolean;
  onNoindexChange: (noindex: boolean) => void;
  nofollow: boolean;
  onNofollowChange: (nofollow: boolean) => void;
}
```

**Step 2: Build the Google preview component**

Inline function or component inside the drawer:

```tsx
function GooglePreview({ title, slug, metaTitle, metaDescription }: {
  title: string; slug: string; metaTitle: string; metaDescription: string;
}) {
  const displayTitle = metaTitle || (title ? `${title} | Samo Fujera` : "Samo Fujera");
  const displayUrl = `samofujera.cz/${slug}`;
  const displayDesc = metaDescription || "Popis není nastaven";
  const truncTitle = displayTitle.length > 60 ? displayTitle.slice(0, 57) + "..." : displayTitle;
  const truncDesc = displayDesc.length > 160 ? displayDesc.slice(0, 157) + "..." : displayDesc;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <p className="text-sm font-medium text-[#1a0dab] line-clamp-1">{truncTitle}</p>
      <p className="text-xs text-[#006621]">{displayUrl}</p>
      <p className={`mt-1 text-xs ${metaDescription ? "text-[#545454]" : "italic text-[var(--muted-foreground)]"} line-clamp-2`}>
        {truncDesc}
      </p>
    </div>
  );
}
```

**Step 3: Build the social card preview component**

```tsx
function SocialPreview({ title, metaTitle, metaDescription, ogTitle, ogDescription, ogImageId }: {
  title: string; metaTitle: string; metaDescription: string;
  ogTitle: string; ogDescription: string; ogImageId: string | null;
}) {
  const effectiveTitle = ogTitle || metaTitle || title || "Samo Fujera";
  const effectiveDesc = ogDescription || metaDescription || "";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      {/* Image placeholder */}
      <div className="flex h-[158px] items-center justify-center bg-[var(--muted)]">
        {ogImageId ? (
          <OgImagePreview mediaId={ogImageId} />
        ) : (
          <span className="text-xs text-[var(--muted-foreground)]">1200 × 630</span>
        )}
      </div>
      <div className="border-t border-[var(--border)] bg-[#f2f3f5] p-3">
        <p className="text-[10px] uppercase text-[#606770]">samofujera.cz</p>
        <p className="mt-0.5 text-sm font-semibold text-[#1d2129] line-clamp-1">{effectiveTitle}</p>
        {effectiveDesc && (
          <p className="mt-0.5 text-xs text-[#606770] line-clamp-2">{effectiveDesc}</p>
        )}
      </div>
    </div>
  );
}
```

The `OgImagePreview` is a small sub-component that uses `useQuery` to fetch the media item by ID and display the image. Use the existing `mediaApi.getItem(id)` if available, or just `mediaApi.getItems()` filtered — check what API exists.

**Step 4: Build the full drawer with tabs**

Use `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@samofujera/ui`.

```tsx
import {
  Input,
  Sheet, SheetContent, SheetHeader, SheetTitle,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@samofujera/ui";
import { MediaPicker } from "../../media/MediaPicker";
```

Layout structure:

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="right" className="w-[400px] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Nastavení stránky</SheetTitle>
    </SheetHeader>
    <Tabs defaultValue="obecne" className="mt-4">
      <TabsList className="w-full">
        <TabsTrigger value="obecne" className="flex-1">Obecné</TabsTrigger>
        <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
      </TabsList>

      {/* ── Obecné tab ── */}
      <TabsContent value="obecne" className="space-y-6 pt-4">
        {/* URL adresa */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">URL adresa</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-[var(--muted-foreground)]">/</span>
            <Input value={slug} onChange={(e) => onSlugChange(e.target.value)} placeholder="url-stranky" />
          </div>
        </div>
        {/* Titulek stránky (read-only display) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Titulek stránky</label>
          <p className="text-sm text-[var(--muted-foreground)]">{title || "–"}</p>
        </div>
        {/* Zobrazit v navigaci */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInNav}
            onChange={(e) => onShowInNavChange(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          Zobrazit v navigaci
        </label>
      </TabsContent>

      {/* ── SEO tab ── */}
      <TabsContent value="seo" className="space-y-6 pt-4">
        {/* Google preview */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Náhled ve vyhledávači</label>
          <GooglePreview title={title} slug={slug} metaTitle={metaTitle} metaDescription={metaDescription} />
        </div>

        {/* Meta nastavení */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Meta titulek</label>
          <Input value={metaTitle} onChange={(e) => onMetaTitleChange(e.target.value)} placeholder="Titulek pro vyhledávače" />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{metaTitle.length}/200</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Meta popis</label>
          <textarea
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="Krátký popis pro vyhledávače"
            rows={3}
            className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{metaDescription.length}/500</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Klíčová slova</label>
          <Input value={metaKeywords} onChange={(e) => onMetaKeywordsChange(e.target.value)} placeholder="klíč1, klíč2, klíč3" />
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{metaKeywords.length}/300</p>
        </div>

        {/* OG nastavení */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">OG titulek</label>
          <Input value={ogTitle} onChange={(e) => onOgTitleChange(e.target.value)} placeholder="Automaticky z meta titulku" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">OG popis</label>
          <textarea
            value={ogDescription}
            onChange={(e) => onOgDescriptionChange(e.target.value)}
            placeholder="Automaticky z meta popisu"
            rows={2}
            className="flex w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">OG obrázek</label>
          <MediaPicker value={ogImageId} onChange={onOgImageIdChange} accept="image/*" />
        </div>

        {/* Social preview */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Náhled sociální karty</label>
          <SocialPreview
            title={title} metaTitle={metaTitle} metaDescription={metaDescription}
            ogTitle={ogTitle} ogDescription={ogDescription} ogImageId={ogImageId}
          />
        </div>

        {/* Pokročilé — Robots */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Pokročilé</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={noindex} onChange={(e) => onNoindexChange(e.target.checked)} className="h-4 w-4 rounded border-[var(--border)]" />
              noindex — nezobrazovat ve vyhledávačích
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={nofollow} onChange={(e) => onNofollowChange(e.target.checked)} className="h-4 w-4 rounded border-[var(--border)]" />
              nofollow — nesledovat odkazy na stránce
            </label>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </SheetContent>
</Sheet>
```

**Step 5: Verify types and lint**

Run: `pnpm turbo typecheck --filter=@samofujera/web`
Run: `pnpm turbo lint --filter=@samofujera/web`
Expected: no errors

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/editor/SettingsDrawer.tsx
git commit -m "feat(admin): rewrite settings drawer with tabs and seo fields"
```

---

### Task 8: Public pages — render full SEO metadata

**Files:**
- Modify: `apps/web/src/app/(public)/page.tsx`
- Modify: `apps/web/src/app/(public)/[slug]/page.tsx`

**Step 1: Update `page.tsx` (homepage) `generateMetadata()`**

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  if (!page) {
    return {
      title: "Sámo Fujera – pohled na život, zdraví a souvislosti",
    };
  }
  return {
    title: page.metaTitle || `${page.title} | Samo Fujera`,
    description: page.metaDescription || undefined,
    keywords: page.metaKeywords || undefined,
    openGraph: {
      title: page.ogTitle || page.metaTitle || page.title,
      description: page.ogDescription || page.metaDescription || undefined,
      images: page.ogImageUrl ? [{ url: page.ogImageUrl }] : undefined,
    },
    robots: {
      index: !page.noindex,
      follow: !page.nofollow,
    },
  };
}
```

**Step 2: Update `[slug]/page.tsx` `generateMetadata()`**

Same pattern as Step 1, but using the `slug` param version.

**Step 3: Verify it compiles**

Run: `pnpm turbo typecheck --filter=@samofujera/web`
Expected: no errors

**Step 4: Commit**

```bash
git add apps/web/src/app/(public)/page.tsx apps/web/src/app/(public)/\\[slug\\]/page.tsx
git commit -m "feat(web): render full seo metadata on public pages"
```

---

### Task 9: Fix image block delete confirmation

**Files:**
- Modify: `apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx`

**Current problem:** The delete button (line 446-457) in ImageBlockEditor's floating toolbar calls `onDelete()` (which is BlockWrapper's `requestDelete`) but simultaneously calls `setIsSelected(false)` + `onActiveChange?.(false)`. This hides the toolbar and triggers BlockWrapper's `onMouseLeave` which resets `confirmingDelete = false` before the confirmation popup can appear.

**Desired behavior:** Same as other block types — the original toolbar is replaced by BlockWrapper's "Opravdu smazat?" / "Odstranit" confirmation popup.

**Step 1: Fix the delete button handler**

In ImageBlockEditor's floating toolbar, change the delete button `onClick` from:

```typescript
onClick={() => {
  setIsSelected(false);
  closeAllDropdowns();
  onActiveChange?.(false);
  onDelete();
}}
```

To:

```typescript
onClick={() => {
  setIsSelected(false);
  closeAllDropdowns();
  onActiveChange?.(false);
  onDelete();
}}
```

Wait — the issue is that hiding the toolbar (`setIsSelected(false)`) causes the mouse to "leave" the BlockWrapper area, which resets the confirmation. The fix: **don't deselect** — just call `onDelete()` to trigger BlockWrapper's confirmation, and close the dropdowns:

```typescript
onClick={() => {
  closeAllDropdowns();
  onDelete();
}}
```

When the user confirms deletion in BlockWrapper's popup, the block is removed entirely. When they don't (3s timeout or mouse leave), `confirmingDelete` resets and the normal toolbar reappears since `isSelected` is still true.

**Step 2: Verify visually**

1. Open editor, click on an image block → floating toolbar appears
2. Click trash icon → toolbar stays, BlockWrapper's "Opravdu smazat?" / "Odstranit" popup appears above the block
3. Click "Odstranit" → block is deleted
4. Alternative: wait 3s or move mouse away → confirmation disappears, toolbar returns to normal

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx
git commit -m "fix(admin): add delete confirmation to image block editor"
```

---

### Task 10: Final verification

**Step 1: Run backend tests**

Run: `cd apps/backend && ./mvnw test`
Expected: All tests pass (or at least no regressions — new fields are nullable/have defaults)

**Step 2: Run frontend lint + typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: no errors

**Step 3: Manual E2E test**

1. Start backend + frontend
2. Open page editor → Settings → verify two tabs appear
3. Fill in SEO fields → Save → reload → verify fields persist
4. Check Google preview updates live as you type
5. Check social card preview with and without OG image
6. Toggle noindex/nofollow checkboxes → Save → verify
7. Visit public page → view source → verify meta tags render correctly
8. Test image block delete → verify confirmation appears

**Step 4: Commit any fixes, then final commit if needed**
