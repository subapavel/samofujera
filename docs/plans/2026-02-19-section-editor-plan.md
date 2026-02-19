# Section-Based Page Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the page editor to use a two-level section/element hierarchy with full-width WYSIWYG editing, admin toolbar, undo/redo, scheduled publishing, and Webnode-style block insertion UX.

**Architecture:** The editor renders at full width (covering dashboard sidebar via fixed overlay). Pages store an array of sections, each containing an independent Lexical editor state. Two visually distinct + buttons handle section insertion (bold line + big circle) and element insertion (dashed border + small + on edge).

**Tech Stack:** Next.js 16 App Router, Lexical, React 19, TanStack Query, shadcn/ui, Lucide icons, Spring Boot 4 (backend for scheduled publish)

**Design doc:** `docs/plans/2026-02-19-section-editor-design.md`

---

## Task 1: Add Sheet component to shared UI package

We need a Sheet (slide-out drawer) component from shadcn/ui for the settings drawer.

**Files:**
- Create: `packages/ui/src/components/sheet.tsx`
- Modify: `packages/ui/src/index.ts`

**Step 1: Install Radix Dialog dependency (Sheet uses it)**

Run: `cd packages/ui && pnpm add @radix-ui/react-dialog`

Check if already installed — if so, skip.

**Step 2: Create the Sheet component**

Use Context7 to look up the latest shadcn/ui Sheet component code for the current Radix version. Create `packages/ui/src/components/sheet.tsx` following the exact same pattern as the existing `dialog.tsx` in the package.

The Sheet needs these exports: `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`.

**Step 3: Export from index.ts**

Add all Sheet exports to `packages/ui/src/index.ts`.

**Step 4: Verify build**

Run: `pnpm turbo build --filter=@samofujera/ui`

Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add packages/ui/src/components/sheet.tsx packages/ui/src/index.ts packages/ui/package.json
git commit -m "feat(ui): add sheet component for slide-out drawers"
```

---

## Task 2: Backend — Add scheduled publishing support

Add `scheduled_publish_at` column to pages table and a mechanism to auto-publish at the scheduled time.

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V22__page_scheduled_publish.sql` (use next available version number — check existing migrations first!)
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/page/internal/PageRepository.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/page/internal/PageAdminController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/page/internal/PageSchedulerJob.java`

**Step 1: Create Flyway migration**

Check the latest migration version number in `apps/backend/src/main/resources/db/migration/` and create the next one. The migration adds:

```sql
ALTER TABLE pages ADD COLUMN scheduled_publish_at TIMESTAMPTZ;
CREATE INDEX idx_pages_scheduled_publish ON pages(scheduled_publish_at)
    WHERE scheduled_publish_at IS NOT NULL AND status = 'DRAFT';
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && ./mvnw compile -Pjooq-codegen`

Verify the `Pages` table class now has the `SCHEDULED_PUBLISH_AT` column.

**Step 3: Update PageDtos.java**

Add to `PageDetailResponse`:
- `Instant scheduledPublishAt`

Add new DTO:
```java
public record SchedulePublishRequest(
    @NotNull Instant scheduledPublishAt
) {}
```

Add `scheduledPublishAt` field to `PageResponse` record as well (so the list view can show scheduled status).

**Step 4: Update PageRepository.java**

Add methods:
- `updateScheduledPublishAt(UUID id, Instant scheduledAt)` — sets the column
- `clearScheduledPublishAt(UUID id)` — sets to null
- `findDueForPublish(Instant now)` — finds pages where `scheduled_publish_at <= now AND status = 'DRAFT'`

Update the `toPageResponse` / `toPageDetailResponse` mapping to include `scheduledPublishAt`.

**Step 5: Update PageService.java**

Add methods:
- `schedulePublish(UUID id, Instant scheduledAt)` — validates page exists, sets scheduled time, keeps status DRAFT
- `cancelScheduledPublish(UUID id)` — clears scheduled time

Update `publishPage` to also clear `scheduledPublishAt` when manually publishing.

**Step 6: Update PageAdminController.java**

Add endpoints:
- `PUT /api/admin/pages/{id}/schedule` with `SchedulePublishRequest` body — calls `schedulePublish`
- `PUT /api/admin/pages/{id}/schedule/cancel` — calls `cancelScheduledPublish`

**Step 7: Create PageSchedulerJob.java**

A `@Scheduled` job that runs every minute:

```java
@Component
public class PageSchedulerJob {
    private final PageService pageService;

    @Scheduled(fixedRate = 60_000)
    public void publishScheduledPages() {
        pageService.publishDuePages();
    }
}
```

Add `publishDuePages()` to `PageService` — finds all pages due for publish and publishes them.

**Step 8: Update API client types**

Modify `packages/api-client/src/types.ts`:
- Add `scheduledPublishAt: string | null` to `PageResponse` and `PageDetailResponse`
- Add `SchedulePublishRequest` interface: `{ scheduledPublishAt: string }`

Modify `packages/api-client/src/pages.ts`:
- Add `schedulePage(id, data)` method
- Add `cancelSchedule(id)` method

**Step 9: Run backend tests**

Run: `cd apps/backend && ./mvnw test`

Expected: All tests pass (existing tests should still work, new column has no NOT NULL constraint).

**Step 10: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/ apps/backend/src/main/java/cz/samofujera/page/ packages/api-client/src/
git commit -m "feat(backend): add scheduled publishing for pages"
```

---

## Task 3: Create the full-width editor route and admin toolbar

Create the new `/admin/stranky/[pageId]/edit` route that renders a full-screen overlay with admin toolbar.

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/stranky/[pageId]/edit/page.tsx`
- Create: `apps/web/src/components/admin/editor/EditorToolbar.tsx`
- Create: `apps/web/src/components/admin/editor/PublishSplitButton.tsx`
- Create: `apps/web/src/components/admin/editor/SettingsDrawer.tsx`

**Step 1: Create the edit route page**

Create `apps/web/src/app/(dashboard)/admin/stranky/[pageId]/edit/page.tsx`:

```tsx
import { FullPageEditor } from "@/components/admin/editor/FullPageEditor";
export default function EditPageRoute() {
  return <FullPageEditor />;
}
```

This is a thin wrapper. The actual component will be created in Task 4.

**Step 2: Create EditorToolbar component**

Create `apps/web/src/components/admin/editor/EditorToolbar.tsx`.

This is the admin bar pinned at the top of the full-screen overlay. It contains:

- **Back button** (`ArrowLeft` icon from lucide-react) — navigates to `/admin/stranky`
- **Page title** — inline `<Input>` component, editable
- **PublishSplitButton** — split button with dropdown (separate component)
- **Undo** (`Undo2` icon) + **Redo** (`Redo2` icon) buttons
- **Settings** (`Settings` icon) — toggles SettingsDrawer
- **Save** (`Save` icon) — save button with loading state

Props:
```tsx
interface EditorToolbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  status: string;
  scheduledPublishAt: string | null;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onSchedule: (date: Date) => void;
  onCancelSchedule: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  onSettingsToggle: () => void;
}
```

Layout: fixed bar at top, `z-50`, white background, border-bottom, height ~48px. Use `flex items-center gap-2 px-4`.

All buttons use Lucide icons. Use the `Button` component from `@samofujera/ui` with `variant="ghost"` and `size="sm"` for toolbar buttons.

**Step 3: Create PublishSplitButton component**

Create `apps/web/src/components/admin/editor/PublishSplitButton.tsx`.

Uses `DropdownMenu` from `@samofujera/ui`. The button has two visual parts:
- Left: main action text ("Publikovat" / "Publikováno" / "Naplánováno: DD.MM. HH:MM")
- Right: `ChevronDown` icon that opens the dropdown

Dropdown items based on state:
- **DRAFT** (no schedule): "Publikovat" + "Naplánovat publikování"
- **DRAFT** (scheduled): "Publikovat nyní" + "Změnit datum" + "Zrušit naplánování"
- **PUBLISHED**: "Zrušit publikaci" + "Naplánovat změnu"

When "Naplánovat publikování" is selected, show a small popover/dialog with a date input (`<input type="datetime-local">`) and a confirm button. Use the browser's native datetime-local picker — no need for a custom date picker in v1.

**Step 4: Create SettingsDrawer component**

Create `apps/web/src/components/admin/editor/SettingsDrawer.tsx`.

Uses the `Sheet` component from Task 1. Slides from the right side.

Contents:
- **Slug** — `<Input>` with `/pages/` prefix label
- **Meta title** — `<Input>` with character count (`{length}/200 znaků`)
- **Meta description** — `<textarea>` with character count (`{length}/500 znaků`)

Props:
```tsx
interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  metaTitle: string;
  onMetaTitleChange: (title: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (desc: string) => void;
}
```

**Step 5: Verify TypeScript compiles**

Run: `pnpm turbo typecheck --filter=@samofujera/web`

Expected: No errors (FullPageEditor doesn't exist yet, but the route page can be a placeholder).

**Step 6: Commit**

```bash
git add apps/web/src/app/(dashboard)/admin/stranky/[pageId]/edit/ apps/web/src/components/admin/editor/EditorToolbar.tsx apps/web/src/components/admin/editor/PublishSplitButton.tsx apps/web/src/components/admin/editor/SettingsDrawer.tsx
git commit -m "feat(admin): add editor toolbar, publish split button, and settings drawer"
```

---

## Task 4: Create SectionList and SectionWrapper components

The core section management layer that sits between the admin toolbar and individual Lexical editors.

**Files:**
- Create: `apps/web/src/components/admin/editor/SectionList.tsx`
- Create: `apps/web/src/components/admin/editor/SectionWrapper.tsx`
- Create: `apps/web/src/components/admin/editor/SectionAddButton.tsx`
- Create: `apps/web/src/components/admin/editor/types.ts`

**Step 1: Create shared types**

Create `apps/web/src/components/admin/editor/types.ts`:

```tsx
import type { SerializedEditorState } from "lexical";

export interface PageSection {
  id: string;
  content: SerializedEditorState | null;
}

export interface SectionPageContent {
  version: 1;
  sections: PageSection[];
}
```

**Step 2: Create SectionAddButton component**

Create `apps/web/src/components/admin/editor/SectionAddButton.tsx`.

Visual: A full-width container that is mostly invisible. On hover, it reveals:
- A **thick solid line** (2-3px, brand color `rgb(6,93,77)`) spanning the full width
- A **big + circle** (32-40px diameter) centered on the line, with a white background and brand-color border

Use `Plus` icon from lucide-react inside the circle.

The component is ~24px tall normally (hover zone), expands to show the line + button on hover. Use `opacity` transitions for smooth appearance.

Props:
```tsx
interface SectionAddButtonProps {
  onAdd: () => void;
}
```

**Step 3: Create SectionWrapper component**

Create `apps/web/src/components/admin/editor/SectionWrapper.tsx`.

Wraps each section's Lexical editor with:
- On hover: subtle border or light background tint around the whole section
- On hover: a **delete button** (top-right, `Trash2` icon, red) to remove the section
- The section's Lexical editor renders as children

Props:
```tsx
interface SectionWrapperProps {
  sectionId: string;
  onDelete: () => void;
  children: React.ReactNode;
}
```

Implementation: A `div` with `relative` positioning. `onMouseEnter`/`onMouseLeave` toggles a `hovered` state. When hovered, show a `ring-1 ring-[rgb(6,93,77)]/30` and the delete button (absolute positioned top-right).

**Step 4: Create SectionList component**

Create `apps/web/src/components/admin/editor/SectionList.tsx`.

This is the main orchestrator. It manages the array of `PageSection` objects and renders:

```
SectionAddButton (before first section)
SectionWrapper
  └── (children — Lexical editor will be passed in by parent)
SectionAddButton (between sections)
SectionWrapper
  └── (children)
SectionAddButton (after last section)
```

Props:
```tsx
interface SectionListProps {
  sections: PageSection[];
  onSectionsChange: (sections: PageSection[]) => void;
  renderSection: (section: PageSection, index: number) => React.ReactNode;
}
```

Key logic:
- `handleAddSection(afterIndex: number)` — creates a new `PageSection` with `crypto.randomUUID()` id and null content, inserts at position
- `handleDeleteSection(index: number)` — removes section from array (with confirm if section has content)
- Passes down through `renderSection` callback so parent can create Lexical editors

**Section-level undo stack:**
- Maintain a simple `useRef<PageSection[][]>` for undo history and a separate one for redo
- `pushUndo()` before any section add/delete/reorder
- Expose `undo()` and `redo()` via a callback or imperative handle

**Step 5: Verify TypeScript compiles**

Run: `pnpm turbo typecheck --filter=@samofujera/web`

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/editor/types.ts apps/web/src/components/admin/editor/SectionList.tsx apps/web/src/components/admin/editor/SectionWrapper.tsx apps/web/src/components/admin/editor/SectionAddButton.tsx
git commit -m "feat(admin): add section list, wrapper, and add button components"
```

---

## Task 5: Create ElementHoverPlugin (replaces InsertBlockPlugin)

The new element-level insertion UX: dashed border on hover, small + on edge.

**Files:**
- Create: `apps/web/src/components/admin/editor/plugins/ElementHoverPlugin.tsx`
- Create: `apps/web/src/components/admin/editor/plugins/ElementPickerPopover.tsx`
- Delete: `apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx` (will be replaced)

**Step 1: Create ElementPickerPopover component**

Create `apps/web/src/components/admin/editor/plugins/ElementPickerPopover.tsx`.

A small popup showing available element types in a 2x2 grid (same as current InsertBlockPlugin's popover but extracted as standalone component).

Uses `Popover` from `@samofujera/ui`. Each option is a button with a Lucide icon and Czech label:
- `Type` icon → "Text"
- `ImageIcon` icon → "Obrázek"
- `Minus` icon → "Dělicí čára"
- `MousePointerClick` icon → "Tlačítko"

Props:
```tsx
interface ElementPickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "paragraph" | "image" | "separator" | "button") => void;
  anchorRef: React.RefObject<HTMLElement>;
}
```

**Step 2: Create ElementHoverPlugin**

Create `apps/web/src/components/admin/editor/plugins/ElementHoverPlugin.tsx`.

This plugin replaces `InsertBlockPlugin`. It uses a **portal-based overlay** approach (not pointer-events-none — that caused issues before).

**How it works:**

1. The plugin renders **nothing inside the Lexical root**. Instead, it uses `useEffect` + `document.addEventListener('mousemove', ...)` to track mouse position relative to editor root-level elements.

2. On mouse move within the editor root:
   - Determine which root-level Lexical node the cursor is over (using `editor.getElementByKey()` for each root child)
   - If over a node: show **dashed border overlay** around that element (absolute positioned div matching the element's bounding rect)
   - Detect if cursor is in the **top 25%** or **bottom 25%** of the element
   - If near top edge: show the **dashed line + small + button** at the top edge, aligned to the left
   - If near bottom edge: show the **dashed line + small + button** at the bottom edge, aligned to the left

3. The overlay elements are rendered via React **portal** into a container div that's a sibling of the editor (not a child), avoiding pointer-events issues entirely.

4. Clicking the + button opens the `ElementPickerPopover`. Selecting an element type inserts the corresponding Lexical node before/after the hovered node (depending on which edge was active).

State:
```tsx
const [hoveredKey, setHoveredKey] = useState<NodeKey | null>(null);
const [edgePosition, setEdgePosition] = useState<"top" | "bottom" | null>(null);
const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
const [pickerOpen, setPickerOpen] = useState(false);
```

Key implementation detail: The dashed border and + button are positioned using `position: fixed` based on `getBoundingClientRect()` of the hovered element. This avoids any need for an overlay div inside the editor.

The + button is small (20-24px circle), positioned at the left edge of the dashed line, uses `Plus` icon from lucide-react.

**Step 3: Wire up node insertion logic**

Reuse the insertion logic from the current `InsertBlockPlugin.insertNode()`:

```tsx
function insertElement(type: string, position: "before" | "after", targetKey: NodeKey) {
  editor.update(() => {
    const targetNode = /* find node by key */;
    const newNode = createNodeByType(type);
    if (position === "before") {
      targetNode.insertBefore(newNode);
    } else {
      targetNode.insertAfter(newNode);
    }
    // Decorator nodes need trailing paragraph
    if (type !== "paragraph") {
      newNode.insertAfter($createParagraphNode());
    }
    // Focus new paragraph
    if (type === "paragraph") {
      newNode.selectStart();
    }
  });
}
```

**Step 4: Verify it compiles**

Run: `pnpm turbo typecheck --filter=@samofujera/web`

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/editor/plugins/ElementHoverPlugin.tsx apps/web/src/components/admin/editor/plugins/ElementPickerPopover.tsx
git commit -m "feat(admin): add element hover plugin with dashed border and edge detection"
```

---

## Task 6: Create FullPageEditor — the main orchestrator

Wire everything together into the full-width editor experience.

**Files:**
- Create: `apps/web/src/components/admin/editor/FullPageEditor.tsx`
- Modify: `apps/web/src/components/admin/editor/PageEditor.tsx` — refactor to accept sections

**Step 1: Refactor PageEditor to be a single-section editor**

Modify `apps/web/src/components/admin/editor/PageEditor.tsx` to be reusable per-section:

- Rename to `SectionEditor` (or keep as `PageEditor` but change props)
- Remove the outer wrapper div with background texture (that moves to FullPageEditor)
- Keep: LexicalComposer, RichTextPlugin, ContentEditable, HistoryPlugin, ListPlugin, LinkPlugin, OnChangePlugin, ToolbarPlugin, ElementHoverPlugin (new), DeleteBlockPlugin
- Remove: InsertBlockPlugin (replaced by ElementHoverPlugin)
- Add prop: `onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void` — so FullPageEditor can track undo/redo state for the toolbar
- Add imperative ref: expose `undo()` and `redo()` methods via `useImperativeHandle`

To expose undo/redo from Lexical, register commands:
```tsx
import { UNDO_COMMAND, REDO_COMMAND, CAN_UNDO_COMMAND, CAN_REDO_COMMAND } from "lexical";
// Listen to CAN_UNDO_COMMAND and CAN_REDO_COMMAND to track state
// Dispatch UNDO_COMMAND / REDO_COMMAND for undo/redo
```

**Step 2: Create FullPageEditor component**

Create `apps/web/src/components/admin/editor/FullPageEditor.tsx`.

This is the top-level component rendered by the edit route. It:

1. **Renders as a fixed full-screen overlay** (`fixed inset-0 z-50 bg-white`) to cover the dashboard sidebar/header
2. Fetches the page via `useQuery` using `pageId` from `useParams()`
3. Parses content into `SectionPageContent` format (with backward compat for old single-state format)
4. Renders:
   - `EditorToolbar` at the top
   - Scrollable content area below with background texture
   - `SectionList` inside the content area
   - `SettingsDrawer` (controlled by toolbar settings button)

Content area layout (mimics public page appearance):
```tsx
<div className="flex-1 overflow-auto bg-repeat" style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}>
  <div className="px-6 sm:px-12 lg:px-16 pt-8 pb-12">
    <div className="max-w-[935px] mx-auto px-5">
      <SectionList
        sections={sections}
        onSectionsChange={setSections}
        renderSection={(section, index) => (
          <SectionEditor
            key={section.id}
            initialContent={section.content}
            onChange={(state) => handleSectionChange(section.id, state)}
            onFocus={() => setFocusedSectionIndex(index)}
            ref={/* section ref for undo/redo */}
          />
        )}
      />
    </div>
  </div>
</div>
```

**State management:**
- `sections: PageSection[]` — the array of sections
- `focusedSectionIndex: number | null` — which section is focused (for undo/redo dispatch)
- `title`, `slug`, `metaTitle`, `metaDescription` — page metadata
- `showSettings: boolean` — settings drawer state
- Section refs array for imperative undo/redo

**Save logic:**
- On save, serialize sections back to `SectionPageContent` JSON and call `pageAdminApi.updatePage()`
- Title/slug/meta changes saved in the same API call

**Undo/redo logic:**
- If a section is focused, dispatch to that section's Lexical undo/redo
- If no section is focused, dispatch to section-level undo stack (add/remove/reorder)

**Backward compatibility:**
```tsx
function parseSections(content: Record<string, unknown> | null): PageSection[] {
  if (!content) return [{ id: crypto.randomUUID(), content: null }];
  // New format
  if ((content as any).version === 1 && Array.isArray((content as any).sections)) {
    return (content as any).sections;
  }
  // Old format — single Lexical state, wrap in one section
  return [{ id: crypto.randomUUID(), content: content as SerializedEditorState }];
}

function serializeContent(sections: PageSection[]): SectionPageContent {
  return { version: 1, sections };
}
```

**Step 3: Delete old InsertBlockPlugin**

Remove `apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx`.

Update any imports that reference it (should only be the old `PageEditor.tsx` which is being refactored).

**Step 4: Verify TypeScript compiles**

Run: `pnpm turbo typecheck --filter=@samofujera/web`

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/editor/
git commit -m "feat(admin): create full-page editor with section management"
```

---

## Task 7: Update pages list and routing

Update the pages list to link to the new edit route. Update the new page creation flow.

**Files:**
- Modify: `apps/web/src/components/admin/routes/pages-list.tsx`
- Modify: `apps/web/src/components/admin/routes/page-editor.tsx`

**Step 1: Update pages-list.tsx**

Change all "edit" links from `/admin/stranky/${p.id}` to `/admin/stranky/${p.id}/edit`.

Update the create mutation's `onSuccess` to redirect to `/admin/stranky/${response.data.id}/edit`.

In the "Nová stránka" dialog, after creating the page, redirect to the edit route.

**Step 2: Simplify page-editor.tsx**

The old `page-editor.tsx` component at `/admin/stranky/[pageId]` can either:
- Redirect to `/admin/stranky/[pageId]/edit` (simplest)
- Or be kept as a simpler metadata-only view

For now, make it redirect:
```tsx
"use client";
import { useParams, redirect } from "next/navigation";
export function PageEditorPage() {
  const params = useParams();
  const pageId = params?.pageId as string;
  if (pageId) redirect(`/admin/stranky/${pageId}/edit`);
  return null;
}
```

**Step 3: Verify navigation works**

Run the dev server: `pnpm dev --filter=@samofujera/web`

Test:
1. Go to `/admin/stranky` — page list loads
2. Click a page — redirects to `/admin/stranky/[id]/edit`
3. Full-screen editor appears with toolbar

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/routes/ apps/web/src/app/(dashboard)/admin/stranky/
git commit -m "feat(admin): update pages routing to use full-width editor"
```

---

## Task 8: Update PageRenderer for section format

Update the public page renderer to handle the new sections array format.

**Files:**
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx`

**Step 1: Update PageRenderer**

Modify the component to detect and handle both formats:

```tsx
export function PageRenderer({ content }: PageRendererProps) {
  // New section format
  if (content?.version === 1 && Array.isArray(content?.sections)) {
    return (
      <>
        {content.sections.map((section: { id: string; content: Record<string, unknown> }) => {
          const root = section.content?.root as { children: SerializedNode[] } | undefined;
          if (!root?.children) return null;
          return (
            <div key={section.id}>
              {root.children.map((node, i) => (
                <section key={i} className={`page-block page-block--${sectionType(node)}`}>
                  {renderNode(node, i)}
                </section>
              ))}
            </div>
          );
        })}
      </>
    );
  }

  // Old single-state format (backward compat)
  const root = content?.root as { children: SerializedNode[] } | undefined;
  if (!root?.children) return null;
  return (
    <>
      {root.children.map((node, i) => (
        <section key={i} className={`page-block page-block--${sectionType(node)}`}>
          {renderNode(node, i)}
        </section>
      ))}
    </>
  );
}
```

**Step 2: Verify public pages still render**

Start dev servers and check an existing published page renders correctly (old format).

Create a new page with sections and verify it also renders correctly (new format).

**Step 3: Commit**

```bash
git add apps/web/src/components/page-renderer/PageRenderer.tsx
git commit -m "feat(web): update page renderer to support section-based content"
```

---

## Task 9: New page creation flow — template picker + title modal

Replace the current simple "create page" dialog with the two-step flow: template picker → title modal.

**Files:**
- Modify: `apps/web/src/components/admin/routes/pages-list.tsx`

**Step 1: Redesign the create dialog**

Replace the current `showCreateDialog` with a two-step modal:

**Step 1 of dialog — Template Picker:**
```tsx
<DialogContent className="max-w-lg">
  <DialogHeader>
    <DialogTitle>Nová stránka</DialogTitle>
  </DialogHeader>
  <div className="grid grid-cols-2 gap-4 py-4">
    <button
      className="flex flex-col items-center gap-3 rounded-xl border-2 border-[var(--border)] p-6 hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5 transition-colors"
      onClick={() => setStep("title")}
    >
      <FileText className="h-10 w-10 text-[var(--muted-foreground)]" />
      <span className="font-medium">Prázdná stránka</span>
    </button>
    {/* Future templates will go here */}
  </div>
</DialogContent>
```

**Step 2 of dialog — Title Input:**
```tsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>Název stránky</DialogTitle>
  </DialogHeader>
  <div className="py-4">
    <Input
      value={newTitle}
      onChange={(e) => handleTitleChange(e.target.value)}
      placeholder="Zadejte název stránky"
      autoFocus
    />
  </div>
  <DialogFooter>
    <Button variant="outline" onClick={() => setStep("template")}>Zpět</Button>
    <Button disabled={!newTitle.trim()} onClick={handleCreate}>Vytvořit</Button>
  </DialogFooter>
</DialogContent>
```

State: `step: "template" | "title"`.

When creating, include default section content:
```tsx
const defaultContent = {
  version: 1,
  sections: [{
    id: crypto.randomUUID(),
    content: {
      root: {
        children: [
          { type: "heading", tag: "h2", children: [{ type: "text", text: newTitle, format: 0, mode: "normal", style: "", detail: 0, version: 1 }], direction: "ltr", format: "", indent: 0, version: 1 },
          { type: "paragraph", children: [{ type: "text", text: "Vložte svůj text...", format: 0, mode: "normal", style: "", detail: 0, version: 1 }], direction: "ltr", format: "", indent: 0, version: 1 },
        ],
        direction: "ltr", format: "", indent: 0, type: "root", version: 1,
      },
    },
  }],
};
```

Create the page, then immediately update with this content, then redirect to edit.

**Step 2: Use `FileText` icon from lucide-react** for the blank page template card.

**Step 3: Test the flow**

1. Click "Nová stránka"
2. Template picker appears with "Prázdná stránka"
3. Click it → title input appears
4. Enter title → click "Vytvořit"
5. Redirected to `/admin/stranky/[id]/edit`
6. Editor shows one section with heading and placeholder text

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/routes/pages-list.tsx
git commit -m "feat(admin): add template picker and title modal for new page creation"
```

---

## Task 10: End-to-end testing and polish

Verify the complete flow works, fix any issues.

**Step 1: Run lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`

Fix any errors.

**Step 2: Run backend tests**

Run: `cd apps/backend && ./mvnw test`

Fix any failures.

**Step 3: Manual testing checklist**

Start all dev servers and test:

1. **Pages list** — loads, shows pages with correct statuses
2. **New page flow** — template picker → title → edit route with default content
3. **Full-width editor** — covers sidebar, shows admin toolbar
4. **Section add** — big + between sections inserts new blank section
5. **Element hover** — dashed border appears, + on edges works
6. **Element insertion** — all 4 types insert correctly (text, image, separator, button)
7. **Element deletion** — trash button on decorator nodes, Backspace on selected nodes
8. **Rich text editing** — bold, italic, headings, lists, links still work within sections
9. **Image picker** — media library opens, images insert with public URLs
10. **Undo/redo** — toolbar buttons work for text changes and section add/remove
11. **Save** — saves all sections, reloading page shows saved content
12. **Publish/Unpublish** — status changes correctly
13. **Schedule publish** — date picker works, status shows scheduled
14. **Settings drawer** — slug, meta title, meta description save correctly
15. **Public page** — both old format and new format render correctly
16. **Back button** — returns to pages list

**Step 4: Fix any issues found**

Address bugs discovered during testing.

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix(admin): polish section editor and fix issues from testing"
```

---

## Summary

| Task | Component | Estimated Steps |
|------|-----------|----------------|
| 1 | Sheet UI component | 5 |
| 2 | Backend scheduled publishing | 10 |
| 3 | Editor toolbar + settings drawer | 6 |
| 4 | SectionList + SectionWrapper | 6 |
| 5 | ElementHoverPlugin | 5 |
| 6 | FullPageEditor orchestrator | 5 |
| 7 | Pages routing updates | 4 |
| 8 | PageRenderer sections support | 3 |
| 9 | New page creation flow | 4 |
| 10 | E2E testing and polish | 5 |

**Total: 10 tasks, ~53 steps**

## Dependencies

```
Task 1 (Sheet) ─────────────────────────┐
Task 2 (Backend scheduled publish) ─────┤
Task 5 (ElementHoverPlugin) ────────────┤
                                        ├─→ Task 6 (FullPageEditor) ─→ Task 7 (Routing) ─→ Task 10 (Testing)
Task 3 (Toolbar + Drawer) ─────────────┤
Task 4 (SectionList) ──────────────────┘
Task 8 (PageRenderer) ─── independent, can be done anytime
Task 9 (New page flow) ── depends on Task 7
```

Tasks 1-5 can be done in parallel. Task 6 depends on all of them. Tasks 7-9 depend on Task 6. Task 10 is last.
