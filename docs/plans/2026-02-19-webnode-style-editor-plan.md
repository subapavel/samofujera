# Webnode-style Editor Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the page editor with Webnode-style block insertion (hover `+` between blocks, grid popup), public images via bucket prefix, section wrapping in renderer, diacritics fix, and removal of unused blocks.

**Architecture:** The editor uses Lexical with custom DecoratorNodes. The InsertBlockPlugin will be rewritten as a Lexical plugin that renders `+` affordances between top-level nodes using DOM observation. The backend StorageService gets a `getPublicUrl()` method and MediaService gets an `uploadPublic()` flow. The PageRenderer wraps each block in `<section>`.

**Tech Stack:** Lexical, React 19, Next.js App Router, shadcn/ui Popover, Spring Boot 4, MinIO/R2 (S3-compatible)

---

### Task 1: Add shadcn/ui Popover component to packages/ui

The `Popover` component doesn't exist yet in `packages/ui`. It's needed for the block insertion popup.

**Files:**
- Create: `packages/ui/src/popover.tsx`
- Modify: `packages/ui/src/index.ts` (add export)

**Step 1: Install Radix Popover dependency**

```bash
cd packages/ui && pnpm add @radix-ui/react-popover
```

**Step 2: Create the Popover component**

Create `packages/ui/src/popover.tsx`:

```tsx
"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={`z-50 w-72 rounded-lg border border-[var(--border)] bg-[var(--popover)] p-4 text-[var(--popover-foreground)] shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className ?? ""}`}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

**Step 3: Export from index.ts**

Add to `packages/ui/src/index.ts`:

```ts
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./popover";
```

**Step 4: Verify build**

```bash
pnpm turbo build --filter=@samofujera/ui
```

Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add packages/ui/src/popover.tsx packages/ui/src/index.ts packages/ui/package.json
git commit -m "feat(ui): add popover component"
```

---

### Task 2: Rewrite InsertBlockPlugin — hover `+` between blocks with grid popup

Replace the current bottom-of-editor `+` dropdown with Webnode-style `+` affordances that appear between blocks on hover. When clicked, open a Popover with a 2x2 grid of block type cards.

**Files:**
- Rewrite: `apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx`

**Context:** The current plugin renders a single centered `+` button at the bottom of the editor using a DropdownMenu. The new version needs to:

1. Use a Lexical plugin (`useLexicalComposerContext`) to observe the editor's top-level children
2. Render `+` affordances **between** top-level nodes using a React portal/overlay approach
3. Each `+` opens a Popover with a grid of 4 block cards

**Approach:** Use a custom Lexical plugin that listens for mutations on the root node. For each gap between top-level children, render an `InsertHandle` component. The handles are positioned using a container `div` that wraps the editor (not absolute positioning — they flow inline between the rendered blocks).

Actually, the simpler approach: Use Lexical's `NodeEventPlugin` or a `MutationListener` on root to track children, then render the `+` handles as React components **inside the editor DOM** using `COMMAND`s. But this is complex.

**Simplest correct approach:** Instead of rendering handles between Lexical DOM nodes, use a **Lexical DecoratorNode** approach where we add a thin "insert handle" React component rendered by a plugin that observes the editor state and creates an overlay div with absolute-positioned handles at the Y position of each gap between blocks.

**Recommended approach (pragmatic):** Keep it as a Lexical plugin, but instead of placing in the editor content flow, overlay the `+` buttons using `position: absolute` based on the bounding rects of top-level block elements. This avoids fighting Lexical's DOM ownership.

Here is the full rewrite:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $createParagraphNode,
  $getNodeByKey,
  type NodeKey,
} from "lexical";
import { $createImageNode } from "../nodes/ImageNode";
import { $createButtonNode } from "../nodes/ButtonNode";
import { $createSeparatorNode } from "../nodes/SeparatorNode";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@samofujera/ui";
import { Type, ImageIcon, Minus, MousePointerClick } from "lucide-react";

interface BlockOption {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  insert: (afterKey: NodeKey | null) => void;
}

export function InsertBlockPlugin() {
  const [editor] = useLexicalComposerContext();
  const [gaps, setGaps] = useState<{ y: number; afterKey: NodeKey | null }[]>([]);
  const [openGapIndex, setOpenGapIndex] = useState<number | null>(null);
  const [hoveredGap, setHoveredGap] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the list of gaps between top-level nodes
  const updateGaps = useCallback(() => {
    const rootElement = editor.getRootElement();
    const container = containerRef.current;
    if (!rootElement || !container) return;

    const containerRect = container.getBoundingClientRect();
    const newGaps: { y: number; afterKey: NodeKey | null }[] = [];

    editor.getEditorState().read(() => {
      const root = $getRoot();
      const children = root.getChildren();

      // Gap before first child
      if (children.length > 0) {
        const firstEl = editor.getElementByKey(children[0].__key);
        if (firstEl) {
          const rect = firstEl.getBoundingClientRect();
          newGaps.push({
            y: rect.top - containerRect.top - 12,
            afterKey: null,
          });
        }
      }

      // Gaps after each child
      for (const child of children) {
        const el = editor.getElementByKey(child.__key);
        if (el) {
          const rect = el.getBoundingClientRect();
          newGaps.push({
            y: rect.bottom - containerRect.top,
            afterKey: child.__key,
          });
        }
      }
    });

    setGaps(newGaps);
  }, [editor]);

  useEffect(() => {
    // Update gaps on every editor state change
    const unregister = editor.registerUpdateListener(() => {
      // Use requestAnimationFrame to wait for DOM to settle
      requestAnimationFrame(updateGaps);
    });
    // Initial
    requestAnimationFrame(updateGaps);
    return unregister;
  }, [editor, updateGaps]);

  function insertNode(
    afterKey: NodeKey | null,
    createNode: () => import("lexical").LexicalNode,
  ) {
    editor.update(() => {
      const node = createNode();
      const paragraph = $createParagraphNode();
      const root = $getRoot();

      if (afterKey === null) {
        // Insert at beginning
        const firstChild = root.getFirstChild();
        if (firstChild) {
          firstChild.insertBefore(node);
          node.insertAfter(paragraph);
        } else {
          root.append(node, paragraph);
        }
      } else {
        const afterNode = $getNodeByKey(afterKey);
        if (afterNode) {
          afterNode.insertAfter(paragraph);
          afterNode.insertAfter(node);
        }
      }
    });
    setOpenGapIndex(null);
  }

  const blockOptions: BlockOption[] = [
    {
      label: "Text",
      icon: Type,
      insert: (afterKey) => insertNode(afterKey, $createParagraphNode),
    },
    {
      label: "Obrázek",
      icon: ImageIcon,
      insert: (afterKey) => insertNode(afterKey, $createImageNode),
    },
    {
      label: "Dělicí čára",
      icon: Minus,
      insert: (afterKey) => insertNode(afterKey, $createSeparatorNode),
    },
    {
      label: "Tlačítko",
      icon: MousePointerClick,
      insert: (afterKey) => insertNode(afterKey, $createButtonNode),
    },
  ];

  return (
    <div ref={containerRef} className="relative">
      {gaps.map((gap, i) => {
        const isVisible = hoveredGap === i || openGapIndex === i;
        return (
          <div
            key={`gap-${i}`}
            className="absolute left-0 right-0 z-10 flex items-center justify-center"
            style={{ top: gap.y, height: 24 }}
            onMouseEnter={() => setHoveredGap(i)}
            onMouseLeave={() => {
              if (openGapIndex !== i) setHoveredGap(null);
            }}
          >
            <div
              className={`absolute inset-x-4 top-1/2 h-px bg-[rgb(6,93,77)] transition-opacity ${isVisible ? "opacity-40" : "opacity-0"}`}
            />
            <Popover
              open={openGapIndex === i}
              onOpenChange={(open) => {
                setOpenGapIndex(open ? i : null);
                if (!open) setHoveredGap(null);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[rgb(6,93,77)] bg-white text-sm text-[rgb(6,93,77)] transition-opacity hover:bg-[rgb(6,93,77)] hover:text-white ${isVisible ? "opacity-100" : "opacity-0"}`}
                >
                  +
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" sideOffset={8}>
                <p className="mb-2 text-sm font-semibold">Přidat obsah</p>
                <div className="grid grid-cols-2 gap-2">
                  {blockOptions.map((opt) => (
                    <button
                      key={opt.label}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] p-3 text-xs font-medium transition-colors hover:border-[rgb(6,93,77)] hover:bg-[rgb(6,93,77)]/5"
                      onClick={() => opt.insert(gap.afterKey)}
                    >
                      <opt.icon className="h-5 w-5 text-[var(--muted-foreground)]" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
      })}
    </div>
  );
}
```

**Important:** The InsertBlockPlugin is currently placed **inside** the editor's content area in `PageEditor.tsx`:

```tsx
<div className="max-w-[935px] mx-auto px-5">
  <RichTextPlugin ... />
  <InsertBlockPlugin />   // <-- here
</div>
```

After the rewrite, it should **wrap** the editor content area instead, so its `containerRef` can position handles relative to the blocks:

```tsx
<InsertBlockPlugin>
  <div className="max-w-[935px] mx-auto px-5">
    <RichTextPlugin ... />
  </div>
</InsertBlockPlugin>
```

Alternatively, keep it simpler: the plugin renders its overlay `div` as a sibling and uses `editor.getRootElement()` for positioning. The code above uses `containerRef` — we need to wrap the content area with this ref.

**Step 1: Install lucide-react if not installed**

```bash
cd apps/web && pnpm add lucide-react
```

Check first: `grep lucide apps/web/package.json` — if already present, skip.

**Step 2: Rewrite InsertBlockPlugin.tsx with the code above**

Replace entire content of `apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx`.

**Step 3: Update PageEditor.tsx to wrap content with InsertBlockPlugin**

In `apps/web/src/components/admin/editor/PageEditor.tsx`, change the layout so InsertBlockPlugin wraps (or is positioned relative to) the editor content. The simplest approach: the plugin renders its overlay absolutely positioned within a `relative` container that also contains the editor.

Modify `PageEditor.tsx`:
- Remove `<InsertBlockPlugin />` from inside the content `div`
- Wrap the editor canvas in the plugin's container

```tsx
<div className="max-w-[935px] mx-auto px-5 relative">
  <RichTextPlugin
    contentEditable={
      <ContentEditable className="outline-none focus:outline-none" />
    }
    ErrorBoundary={LexicalErrorBoundary}
  />
  <InsertBlockPlugin />
</div>
```

The plugin's `containerRef` should wrap around both the editor and the overlay. Update InsertBlockPlugin to accept `children` and render them inside its container div, or simply have the plugin find its position from the editor root element.

**Simpler final approach:** Don't use `containerRef` at all. Instead, use `editor.getRootElement()` as the reference point and render the overlay as a portal or absolute-positioned sibling. The plugin returns a div with `position: absolute; inset: 0; pointer-events: none` that contains the handle buttons (with `pointer-events: auto`).

**Step 4: Test manually**

1. Start dev server: `cd apps/web && pnpm dev`
2. Navigate to `/admin/stranky` → edit a page
3. Verify: hovering between blocks shows a thin green line with `+`
4. Click `+` → grid popup with 4 cards: Text, Obrázek, Dělicí čára, Tlačítko
5. Click a card → block inserted at that position

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx apps/web/src/components/admin/editor/PageEditor.tsx
git commit -m "feat(web): rewrite insert block plugin with webnode-style hover popup"
```

---

### Task 3: Rename CTAButtonNode to ButtonNode

The design calls for renaming "CTA tlačítko" to just "Tlačítko". Rename the node class, exports, and file.

**Files:**
- Rename: `apps/web/src/components/admin/editor/nodes/CTAButtonNode.tsx` → keep file, rename exports
- Modify: `apps/web/src/components/admin/editor/PageEditor.tsx` (update import)
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx` (update renderer)

**Important:** The serialized `type` in Lexical JSON is `"cta-button"`. Existing pages may have this in their content. We must keep backward compatibility by keeping the same `getType()` return value `"cta-button"`, or add a migration. Simplest: keep `type: "cta-button"` in serialization but rename the class/file/exports.

**Step 1: Rename exports in CTAButtonNode.tsx**

In `apps/web/src/components/admin/editor/nodes/CTAButtonNode.tsx`:
- Rename class `CTAButtonNode` → `ButtonNode`
- Rename `$createCTAButtonNode` → `$createButtonNode`
- Rename `$isCTAButtonNode` → `$isButtonNode`
- Rename `CTAButtonComponent` → `ButtonComponent`
- Rename types: `SerializedCTAButtonNode` → `SerializedButtonNode`, `CTAVariant` → `ButtonVariant`
- **Keep** `static getType()` returning `"cta-button"` for serialization backward compat
- **Keep** `exportJSON()` returning `type: "cta-button"` for same reason
- Fix diacritics in Czech strings while at it (see Task 6)

**Step 2: Rename the file**

```bash
cd apps/web && git mv src/components/admin/editor/nodes/CTAButtonNode.tsx src/components/admin/editor/nodes/ButtonNode.tsx
```

**Step 3: Update imports in PageEditor.tsx**

Change:
```ts
import { CTAButtonNode } from "./nodes/CTAButtonNode";
```
To:
```ts
import { ButtonNode } from "./nodes/ButtonNode";
```

And in the `nodes` array: `CTAButtonNode` → `ButtonNode`

**Step 4: Update imports in InsertBlockPlugin.tsx**

Already handled in Task 2 — the rewritten plugin imports `$createButtonNode` from `"../nodes/ButtonNode"`.

**Step 5: Update PageRenderer.tsx**

The renderer matches on `case "cta-button":` — this stays the same (matches serialized type). Just rename the component function from `CTARenderer` to `ButtonRenderer` for consistency.

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/editor/nodes/ButtonNode.tsx apps/web/src/components/admin/editor/PageEditor.tsx apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx apps/web/src/components/page-renderer/PageRenderer.tsx
git commit -m "refactor(web): rename cta button node to button node"
```

---

### Task 4: Remove ColumnsNode, GalleryNode, ContactFormNode

Delete the three unused block types completely.

**Files:**
- Delete: `apps/web/src/components/admin/editor/nodes/ColumnsNode.tsx`
- Delete: `apps/web/src/components/admin/editor/nodes/GalleryNode.tsx`
- Delete: `apps/web/src/components/admin/editor/nodes/ContactFormNode.tsx`
- Modify: `apps/web/src/components/admin/editor/PageEditor.tsx` (remove imports + node registrations)
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx` (remove renderers)

**Step 1: Remove imports and node registrations from PageEditor.tsx**

In `apps/web/src/components/admin/editor/PageEditor.tsx`:

Remove these imports:
```ts
import { ColumnsNode } from "./nodes/ColumnsNode";
import { GalleryNode } from "./nodes/GalleryNode";
import { ContactFormNode } from "./nodes/ContactFormNode";
```

Remove from the `nodes` array: `ColumnsNode`, `GalleryNode`, `ContactFormNode`

**Step 2: Remove renderers from PageRenderer.tsx**

In `apps/web/src/components/page-renderer/PageRenderer.tsx`:

- Remove `case "columns":` from `renderNode()`
- Remove `case "gallery":` from `renderNode()`
- Remove `case "contact-form":` from `renderNode()`
- Remove `"columns"`, `"gallery"`, `"contact-form"` from `BLOCK_TYPES` set
- Delete `ColumnsRenderer`, `GalleryRenderer`, `ContactFormRenderer` functions
- Remove `columnCount`, `columnContents`, `columns`, `images`, `formTitle` from `SerializedNode` interface

**Step 3: Delete the node files**

```bash
cd apps/web
rm src/components/admin/editor/nodes/ColumnsNode.tsx
rm src/components/admin/editor/nodes/GalleryNode.tsx
rm src/components/admin/editor/nodes/ContactFormNode.tsx
```

**Step 4: Verify build**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

Expected: no errors

**Step 5: Commit**

```bash
git add -u apps/web/src/components/admin/editor/ apps/web/src/components/page-renderer/
git commit -m "refactor(web): remove columns, gallery, and contact form blocks"
```

---

### Task 5: Section wrapping in PageRenderer

Wrap each top-level block in the PageRenderer with a `<section>` element with type-based CSS classes.

**Files:**
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx`

**Step 1: Update renderNode to wrap in sections**

In the `PageRenderer` component, the top-level children of `root` are rendered via `renderNode()`. We need to wrap each top-level call in a `<section>`:

Change the `PageRenderer` function:

```tsx
export function PageRenderer({ content }: PageRendererProps) {
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

function sectionType(node: SerializedNode): string {
  switch (node.type) {
    case "paragraph":
    case "heading":
    case "list":
      return "text";
    case "image":
      return "image";
    case "cta-button":
      return "button";
    case "separator":
      return "separator";
    default:
      return "text";
  }
}
```

**Step 2: Remove the `key` prop from inside renderNode**

Since the `<section>` now has the `key`, the inner render doesn't need it on the outermost element. But since `renderNode` is also called recursively for children (inside paragraphs, lists, etc.), keep the `key` parameter — it's needed for non-top-level calls.

**Step 3: Verify by building**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 4: Commit**

```bash
git add apps/web/src/components/page-renderer/PageRenderer.tsx
git commit -m "feat(web): wrap page blocks in section elements for styling"
```

---

### Task 6: Fix Czech diacritics in all admin files

Fix every Czech string that's missing diacritics across the entire admin.

**Files to modify:**
- `apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx` (already rewritten in Task 2 with correct diacritics)
- `apps/web/src/components/admin/editor/plugins/ToolbarPlugin.tsx`
- `apps/web/src/components/admin/editor/nodes/ImageNode.tsx`
- `apps/web/src/components/admin/editor/nodes/ButtonNode.tsx` (renamed in Task 3)
- `apps/web/src/components/admin/editor/nodes/SeparatorNode.tsx`
- `apps/web/src/components/admin/routes/page-editor.tsx`
- `apps/web/src/components/admin/routes/pages-list.tsx`
- `apps/web/src/components/admin/routes/dashboard.tsx`
- `apps/web/src/components/admin/routes/media.tsx`
- `apps/web/src/components/admin/routes/products.tsx`
- `apps/web/src/components/dashboard/Sidebar.tsx`
- `apps/web/src/components/page-renderer/PageRenderer.tsx`

**Complete diacritics replacement list:**

#### ToolbarPlugin.tsx
| Wrong | Correct |
|-------|---------|
| `Cislovany seznam` | `Číslovaný seznam` |

#### ImageNode.tsx
| Wrong | Correct |
|-------|---------|
| `Klikni pro vlozeni obrazku` | `Klikni pro vložení obrázku` |
| `Vybrat obrazek` | `Vybrat obrázek` |
| `Hledat podle nazvu...` | `Hledat podle názvu...` |
| `Nacitani...` | `Načítání...` |
| `Nahravam...` | `Nahrávám...` |
| `Nahrat obrazky` | `Nahrát obrázky` |
| `Zrusit` | `Zrušit` |
| `Zmenit` | `Změnit` |

#### ButtonNode.tsx (ex-CTAButtonNode)
| Wrong | Correct |
|-------|---------|
| `Text tlacitka` | `Text tlačítka` |
| `Primarni` | `Primární` |
| `Sekundarni` | `Sekundární` |
| `Zrusit` | `Zrušit` |
| `Ulozit` | `Uložit` |
| `Klikni pro upravu tlacitka` | `Klikni pro úpravu tlačítka` |
| `Zjistit vice` | `Zjistit více` |

#### SeparatorNode.tsx
| Wrong | Correct |
|-------|---------|
| `Dvakrat klikni pro zmenu stylu` | `Dvakrát klikni pro změnu stylu` |

#### page-editor.tsx
| Wrong | Correct |
|-------|---------|
| `Nacitani stranky...` | `Načítání stránky...` |
| `Stranka nenalezena.` | `Stránka nenalezena.` |
| `Zpet` | `Zpět` |
| `Nazev stranky` | `Název stránky` |
| `Publikovano` | `Publikováno` |
| `Ukladani...` | `Ukládání...` |
| `Ulozit` | `Uložit` |
| `Zrusit publikaci` | `Zrušit publikaci` |
| `SEO nastaveni` | `SEO nastavení` |
| `Titulek stranky pro vyhledavace` | `Titulek stránky pro vyhledávače` |
| `znaku` | `znaků` |
| `Kratky popis stranky pro vyhledavace` | `Krátký popis stránky pro vyhledávače` |

#### pages-list.tsx
| Wrong | Correct |
|-------|---------|
| `Stranky` | `Stránky` |
| `Nova stranka` | `Nová stránka` |
| `Vsechny stavy` | `Všechny stavy` |
| `Archivovano` | `Archivováno` |
| `Nacitani stranek...` | `Načítání stránek...` |
| `Nepodarilo se nacist stranky. Zkuste to prosim znovu.` | `Nepodařilo se načíst stránky. Zkuste to prosím znovu.` |
| `Nazev` | `Název` |
| `Aktualizovano` | `Aktualizováno` |
| `Zadne stranky.` | `Žádné stránky.` |
| `Stranka X z Y (Z stranek)` | `Stránka X z Y (Z stránek)` |
| `Predchozi` | `Předchozí` |
| `Dalsi` | `Další` |
| `Nazev stranky` | `Název stránky` |
| `Vytvorit` | `Vytvořit` |
| `Opravdu chcete smazat stranku` | `Opravdu chcete smazat stránku` |
| `Publikovano` | `Publikováno` |

#### dashboard.tsx
| Wrong | Correct |
|-------|---------|
| `Vitejte v administraci` | `Vítejte v administraci` |
| `Vyberte sekci z navigace vlevo.` | `Vyberte sekci z navigace vlevo.` (OK) |

#### media.tsx
| Wrong | Correct |
|-------|---------|
| `Neprirazeno` | `Nepřiřazeno` |
| `Nahravam...` | `Nahrávám...` |
| `Nahrat soubory` | `Nahrát soubory` |
| `Vsechny typy` | `Všechny typy` |
| `Obrazky` | `Obrázky` |
| `Nacitani...` | `Načítání...` |
| `Nepodarilo se nacist soubory. Zkuste to prosim znovu.` | `Nepodařilo se načíst soubory. Zkuste to prosím znovu.` |
| `Stranka X z Y (Z souboru)` | `Stránka X z Y (Z souborů)` |
| `Predchozi` / `Dalsi` | `Předchozí` / `Další` |
| `Ukladam...` | `Ukládám...` |
| `Ulozit alt text` | `Uložit alt text` |
| `Mazani...` | `Mazání...` |
| `Smazat soubor` | `Smazat soubor` (OK) |

#### products.tsx
| Wrong | Correct |
|-------|---------|
| `Fyzicky` | `Fyzický` |
| `Online udalost` | `Online událost` |
| `Opakovana udalost` | `Opakovaná událost` |
| `Archivovano` | `Archivováno` |
| `Fyzicky produkt` | `Fyzický produkt` |
| `Vsechny stavy` / `Vsechny typy` | `Všechny stavy` / `Všechny typy` |
| `Offline udalost` | `Offline událost` |
| `Nacitani produktu...` | `Načítání produktů...` |
| `Nepodarilo se nacist produkty...` | `Nepodařilo se načíst produkty...` |
| `Zadne produkty.` | `Žádné produkty.` |
| `Stranka X z Y (Z produktu)` | `Stránka X z Y (Z produktů)` |
| `Predchozi` / `Dalsi` | `Předchozí` / `Další` |
| `Opravdu chcete smazat produkt` | `Opravdu chcete smazat produkt` (OK) |
| `Novy produkt` | `Nový produkt` |

#### Sidebar.tsx
| Wrong | Correct |
|-------|---------|
| `Stranky` | `Stránky` |
| `Objednavky` | `Objednávky` |
| `Muj ucet` | `Můj účet` |
| `Aktivni sezeni` | `Aktivní sezení` |
| `Smazat ucet` | `Smazat účet` |

#### PageRenderer.tsx
| Wrong | Correct |
|-------|---------|
| `Napiste mi` | `Napište mi` |
| `Jmeno` | `Jméno` |
| `Zprava` | `Zpráva` |
| `Zjistit vice` | `Zjistit více` |

Note: Some PageRenderer strings are in ContactFormRenderer which will be deleted in Task 4. Only fix strings that remain after Task 4.

**Step 1: Apply all replacements file by file**

Go through each file and replace every wrong string with the correct one.

**Step 2: Verify build**

```bash
pnpm turbo typecheck --filter=@samofujera/web
```

**Step 3: Commit**

```bash
git add apps/web/src/components/
git commit -m "fix(web): add missing czech diacritics across all admin ui"
```

---

### Task 7: Public image storage — MinIO bucket policy + backend changes

Make page images publicly accessible via a `public/` prefix in the storage bucket.

**Files:**
- Modify: `docker-compose.yml` (add public policy in minio-init)
- Modify: `apps/backend/src/main/java/cz/samofujera/shared/storage/StorageService.java` (add `getPublicUrl` method)
- Modify: `apps/backend/src/main/java/cz/samofujera/media/MediaService.java` (add `uploadPublic` method)
- Modify: `apps/backend/src/main/java/cz/samofujera/media/MediaDtos.java` (add `publicUrl` field)
- Modify: `apps/backend/src/main/java/cz/samofujera/media/MediaAdminController.java` (add `?public=true` param)
- Modify: `apps/backend/src/main/resources/application.yml` (add `r2.public-url` property)
- Delete: `apps/backend/src/main/java/cz/samofujera/media/MediaPublicController.java` (no longer needed)
- Modify: `apps/backend/src/main/java/cz/samofujera/auth/internal/SecurityConfig.java` (remove `/api/media/*/file` rule)

**Step 1: Add public bucket policy in docker-compose.yml**

Update the `minio-init` service entrypoint:

```yaml
  minio-init:
    image: minio/mc:latest
    container_name: samofujera-minio-init
    depends_on:
      - minio
    entrypoint: >
      /bin/sh -c "
      until mc alias set local http://minio:9000 minioadmin minioadmin; do sleep 1; done;
      mc mb --ignore-existing local/samofujera-assets;
      mc anonymous set download local/samofujera-assets/public;
      "
```

The `mc anonymous set download` command makes everything under the `public/` prefix publicly readable.

**Step 2: Add `r2.public-url` to application.yml**

Add after the `r2.bucket` line:

```yaml
r2:
  endpoint: ${R2_ENDPOINT:http://localhost:9000}
  access-key: ${R2_ACCESS_KEY:minioadmin}
  secret-key: ${R2_SECRET_KEY:minioadmin}
  bucket: ${R2_BUCKET:samofujera-assets}
  public-url: ${R2_PUBLIC_URL:http://localhost:9000/samofujera-assets}
```

For production (Cloudflare R2), `R2_PUBLIC_URL` would be the custom domain or R2 public bucket URL.

**Step 3: Add `getPublicUrl` to StorageService**

Add a new field and method to `StorageService.java`:

```java
@Value("${r2.public-url}")
private String publicUrl;

public String getPublicUrl(String key) {
    return publicUrl + "/" + key;
}
```

**Step 4: Add `uploadPublic` to MediaService**

Add a new method that stores under `public/media/` prefix:

```java
@Transactional
public MediaDtos.MediaItemResponse uploadPublicAndCreate(InputStream inputStream, String filename,
                                                          String contentType, long size,
                                                          String altText) throws IOException {
    var newId = UUID.randomUUID();
    var ext = extractExtension(filename);
    var prefix = "public/media/" + newId + "/";
    var originalKey = prefix + "original" + ext;

    var originalData = inputStream.readAllBytes();

    storageService.upload(originalKey, originalData, contentType);

    // Generate and upload image variants
    var variants = imageVariantService.generateVariants(originalData, contentType);
    for (var entry : variants.entrySet()) {
        var variantKey = prefix + entry.getKey() + ".webp";
        storageService.upload(variantKey, entry.getValue().data(), entry.getValue().contentType());
    }

    // Read original image dimensions
    Integer width = null;
    Integer height = null;
    if (contentType != null && contentType.startsWith("image/")) {
        var image = ImageIO.read(new ByteArrayInputStream(originalData));
        if (image != null) {
            width = image.getWidth();
            height = image.getHeight();
        }
    }

    var id = itemRepository.create(filename, originalKey, contentType, size, width, height, altText);

    var created = itemRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Media item not found"));
    return toMediaItemResponse(created);
}
```

**Step 5: Update `toMediaItemResponse` to use public URLs for public/ prefix items**

In `MediaService.java`, update `toMediaItemResponse`:

```java
private MediaDtos.MediaItemResponse toMediaItemResponse(MediaItemRepository.MediaItemRow row) {
    var storageKey = row.storageKey();
    var prefix = storageKey.substring(0, storageKey.lastIndexOf('/') + 1);
    var isPublic = storageKey.startsWith("public/");

    var originalUrl = isPublic
        ? storageService.getPublicUrl(storageKey)
        : storageService.generatePresignedUrl(storageKey, Duration.ofHours(1));

    String thumbUrl = null, mediumUrl = null, largeUrl = null, ogUrl = null;
    if (row.mimeType() != null && row.mimeType().startsWith("image/")) {
        if (isPublic) {
            thumbUrl = storageService.getPublicUrl(prefix + "thumb.webp");
            mediumUrl = storageService.getPublicUrl(prefix + "medium.webp");
            largeUrl = storageService.getPublicUrl(prefix + "large.webp");
            ogUrl = storageService.getPublicUrl(prefix + "og.webp");
        } else {
            thumbUrl = storageService.generatePresignedUrl(prefix + "thumb.webp", Duration.ofHours(1));
            mediumUrl = storageService.generatePresignedUrl(prefix + "medium.webp", Duration.ofHours(1));
            largeUrl = storageService.generatePresignedUrl(prefix + "large.webp", Duration.ofHours(1));
            ogUrl = storageService.generatePresignedUrl(prefix + "og.webp", Duration.ofHours(1));
        }
    }

    return new MediaDtos.MediaItemResponse(
        row.id(), row.originalFilename(), originalUrl, thumbUrl, mediumUrl, largeUrl, ogUrl,
        row.mimeType(), row.fileSizeBytes(), row.width(), row.height(),
        row.altText(), row.createdAt());
}
```

**Step 6: Add `?public=true` parameter to upload endpoint**

In `MediaAdminController.java`, add a `public` query parameter to the upload endpoint:

```java
@PostMapping("/upload")
ResponseEntity<MediaDtos.MediaItemResponse> upload(
    @RequestParam("file") MultipartFile file,
    @RequestParam(value = "altText", required = false, defaultValue = "") String altText,
    @RequestParam(value = "public", required = false, defaultValue = "false") boolean isPublic
) throws IOException {
    MediaDtos.MediaItemResponse response;
    if (isPublic) {
        response = mediaService.uploadPublicAndCreate(
            file.getInputStream(), file.getOriginalFilename(),
            file.getContentType(), file.getSize(), altText);
    } else {
        response = mediaService.uploadAndCreate(
            file.getInputStream(), file.getOriginalFilename(),
            file.getContentType(), file.getSize(), altText);
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

**Step 7: Delete MediaPublicController.java**

```bash
rm apps/backend/src/main/java/cz/samofujera/media/MediaPublicController.java
```

**Step 8: Remove the `/api/media/*/file` permitAll from SecurityConfig**

In `SecurityConfig.java`, remove the line:
```java
.requestMatchers("/api/media/*/file").permitAll()
```

**Step 9: Update frontend ImageNode to pass `public=true` when uploading**

In `apps/web/src/components/admin/editor/nodes/ImageNode.tsx`, when uploading images from the page editor's media picker, append `?public=true` to the upload. This requires the `useMultiUpload` hook or the `mediaApi.upload()` call to support a `public` parameter.

Check what `mediaApi.upload()` looks like in `packages/api-client` and add the `public` param.

**Step 10: Update ImageNode to store `originalUrl` (public) instead of presigned URL**

When user selects an image from the media picker, store the `originalUrl` (or `largeUrl`) from the response directly — these are now permanent public URLs for public/ prefix items.

In the ImageNode's `handleSelectImage`:
```ts
editor.update(() => {
  const node = $getNodeByKey(nodeKey);
  if ($isImageNode(node)) {
    node.setSrc(selectedItem.largeUrl ?? selectedItem.originalUrl);
    node.setAltText(selectedItem.altText ?? "");
    node.setMediaItemId(selectedItem.id);
  }
});
```

**Step 11: Update PageRenderer ImageRenderer**

In `PageRenderer.tsx`, simplify `ImageRenderer` — since public images have permanent URLs stored in `src`, just use `node.src` directly. Remove the `mediaItemId` → API URL fallback:

```tsx
function ImageRenderer({ node }: { node: SerializedNode }) {
  if (!node.src) return null;
  const alignClasses: Record<string, string> = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
    full: "w-full",
  };
  const alignment = node.alignment ?? "center";
  return (
    <img
      src={node.src}
      alt={node.altText ?? ""}
      className={`max-w-full rounded ${alignClasses[alignment] ?? "mx-auto"}`}
      style={{ display: "block" }}
    />
  );
}
```

Note: No wrapping `<div>` needed — the `<section class="page-block page-block--image">` from Task 5 handles that.

**Step 12: Run backend tests**

```bash
cd apps/backend && ./mvnw test
```

Expected: all tests pass

**Step 13: Commit**

```bash
git add docker-compose.yml apps/backend/ apps/web/src/components/admin/editor/nodes/ImageNode.tsx apps/web/src/components/page-renderer/PageRenderer.tsx
git commit -m "feat: serve page images via public bucket prefix instead of presigned urls"
```

---

### Task 8: Final verification — lint, typecheck, manual test

**Step 1: Run lint and typecheck**

```bash
pnpm turbo lint
pnpm turbo typecheck
```

Fix any errors.

**Step 2: Run backend tests**

```bash
cd apps/backend && ./mvnw test
```

**Step 3: Manual test**

1. `docker compose up -d` (restart to pick up minio-init policy change)
2. Start backend and frontend
3. Navigate to `/admin/stranky` → edit a page
4. Verify hover `+` appears between blocks
5. Click `+` → verify 2x2 grid popup with correct Czech labels
6. Insert each block type and verify it works
7. Upload an image via the image picker → verify public URL is stored
8. View the public page → verify image loads without auth
9. Check all admin pages for correct Czech diacritics

**Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix(web): address lint and typecheck issues from editor redesign"
```
