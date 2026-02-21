# Image Block Resize & Crop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add resize handles, crop-and-pan sliders, manual size input, and a dark floating toolbar to the image block editor.

**Architecture:** Extend `ImageBlock` with `width`, `height`, `panX`, `panY` fields. Rewrite `ImageBlockEditor` with drag-resize handles, conditional pan sliders, and a dark floating toolbar matching the existing button/separator block pattern. Update `PageRenderer` to render cropped images with `object-fit: cover` + `object-position`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, pointer events for drag resize

---

### Task 1: Extend ImageBlock type and factory

**Files:**
- Modify: `apps/web/src/components/admin/editor/types.ts:20-26` (ImageBlock interface)
- Modify: `apps/web/src/components/admin/editor/types.ts:63-72` (createImageBlock factory)

**Step 1: Add new fields to ImageBlock interface**

Change the `ImageBlock` interface from:

```typescript
export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  altText: string;
  alignment: ImageAlignment;
  mediaItemId: string | null;
}
```

To:

```typescript
export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  altText: string;
  alignment: ImageAlignment;
  mediaItemId: string | null;
  width: number | null;
  height: number | null;
  panX: number;
  panY: number;
}
```

**Step 2: Update createImageBlock factory**

Change from:

```typescript
export function createImageBlock(): ImageBlock {
  return {
    id: crypto.randomUUID(),
    type: "image",
    src: "",
    altText: "",
    alignment: "center",
    mediaItemId: null,
  };
}
```

To:

```typescript
export function createImageBlock(): ImageBlock {
  return {
    id: crypto.randomUUID(),
    type: "image",
    src: "",
    altText: "",
    alignment: "center",
    mediaItemId: null,
    width: null,
    height: null,
    panX: 50,
    panY: 50,
  };
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/editor/types.ts
git commit -m "feat(web): extend image block type with width, height, panx, pany fields"
```

---

### Task 2: Wire ImageBlockEditor with onDelete, onCopy, onActiveChange in SectionList

**Files:**
- Modify: `apps/web/src/components/admin/editor/SectionList.tsx:274-278`

**Step 1: Update ImageBlockEditor usage**

Change from:

```tsx
{block.type === "image" && (
  <ImageBlockEditor
    block={block}
    onChange={(updated) => handleBlockChange(sectionIndex, blockIndex, updated)}
  />
)}
```

To (matching the button/separator pattern):

```tsx
{block.type === "image" && (
  <ImageBlockEditor
    block={block}
    onChange={(updated) => handleBlockChange(sectionIndex, blockIndex, updated)}
    onDelete={requestDelete}
    onCopy={() => handleCopyBlock(sectionIndex, blockIndex)}
    onActiveChange={(active) => {
      if (active) setActiveBlockId(block.id);
      else if (activeBlockId === block.id) setActiveBlockId(null);
    }}
  />
)}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/admin/editor/SectionList.tsx
git commit -m "feat(web): wire image block editor with delete, copy, and active change props"
```

---

### Task 3: Rewrite ImageBlockEditor — core structure and toolbar

This is the main task. Rewrite `apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx`.

**Files:**
- Modify: `apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx` (full rewrite)

**Step 1: Update props interface and imports**

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { mediaApi } from "@samofujera/api-client";
import type { MediaItemResponse } from "@samofujera/api-client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@samofujera/ui";
import { MediaGrid } from "../../media/MediaGrid";
import { UploadProgress } from "../../media/UploadProgress";
import { useMultiUpload } from "../../media/useMultiUpload";
import type { ImageBlock, ImageAlignment } from "../types";
import {
  ChevronDown,
  Trash2,
  MoreVertical,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  RotateCcw,
  Pencil,
} from "lucide-react";

interface ImageBlockEditorProps {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
  onDelete: () => void;
  onCopy: () => void;
  onActiveChange?: (active: boolean) => void;
}
```

**Step 2: Main component with toolbar**

The component structure:
1. If no `src` → show placeholder (click to open media picker) — same as current
2. If `src` is set → show image with click-to-select
3. When selected → show dark floating toolbar + resize handles + conditional sliders

Dark toolbar items (matching button/separator pattern):
- "Upravit" — opens media picker
- "Zarovnání ▼" — dropdown: left/center/right/full
- "Velikost ▼" — popover: width + height inputs (proportionally locked)
- "Obnovit velikost" — reset width/height/panX/panY
- Trash icon — onDelete
- MoreVertical → "Zkopírovat"

Implement the full component with:

```tsx
export function ImageBlockEditor({ block, onChange, onDelete, onCopy, onActiveChange }: ImageBlockEditorProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showSizePopover, setShowSizePopover] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MediaItemResponse | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const multiUpload = useMultiUpload({ isPublic: true });

  // ... media query same as current ...

  // Track natural image dimensions
  function handleImageLoad() {
    if (imgRef.current) {
      setNaturalSize({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      });
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!isSelected) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsSelected(false);
        closeAllDropdowns();
        onActiveChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSelected, onActiveChange]);

  // ... toolbar rendering, media picker dialog ...
}
```

The toolbar should follow the exact same dark theme pattern as ButtonBlockEditor:
- `bg-gray-800`, `rounded-lg`, `shadow-lg`
- Text buttons: `text-xs text-white/90 hover:bg-white/10`
- Arrow pointer at bottom

**Step 3: Alignment dropdown**

Options: left, center, right, full — with icons (AlignLeft, AlignCenter, AlignRight, Maximize2).

```tsx
const ALIGNMENT_OPTIONS: { value: ImageAlignment; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Vlevo", icon: AlignLeft },
  { value: "center", label: "Na střed", icon: AlignCenter },
  { value: "right", label: "Vpravo", icon: AlignRight },
  { value: "full", label: "Celá šířka", icon: Maximize2 },
];
```

**Step 4: Size popover**

A small dark popover (like LinkEditPopover in ButtonBlockEditor) with two number inputs:

```tsx
function SizePopover({ width, height, naturalSize, onSave, onClose }: {
  width: number | null;
  height: number | null;
  naturalSize: { w: number; h: number } | null;
  onSave: (w: number | null, h: number | null) => void;
  onClose: () => void;
}) {
  const currentW = width ?? naturalSize?.w ?? 0;
  const currentH = height ?? naturalSize?.h ?? 0;
  const aspectRatio = naturalSize ? naturalSize.w / naturalSize.h : 1;
  const [w, setW] = useState(currentW);
  const [h, setH] = useState(currentH);

  function handleWidthChange(newW: number) {
    setW(newW);
    setH(Math.round(newW / aspectRatio));
  }

  function handleHeightChange(newH: number) {
    setH(newH);
    setW(Math.round(newH * aspectRatio));
  }

  // Render: two labeled inputs + OK/Cancel buttons
}
```

**Step 5: Keep the media picker dialog exactly as current** (lines 135-173 of current file).

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx
git commit -m "feat(web): rewrite image block editor with dark toolbar, alignment, and size controls"
```

---

### Task 4: Add resize handles

**Files:**
- Modify: `apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx`

**Step 1: Create ResizeHandles component**

8 small squares positioned around the image container using absolute positioning:

```tsx
type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_POSITIONS: { pos: HandlePosition; style: React.CSSProperties; cursor: string }[] = [
  { pos: "nw", style: { top: -4, left: -4 }, cursor: "nwse-resize" },
  { pos: "n",  style: { top: -4, left: "50%", transform: "translateX(-50%)" }, cursor: "ns-resize" },
  { pos: "ne", style: { top: -4, right: -4 }, cursor: "nesw-resize" },
  { pos: "e",  style: { top: "50%", right: -4, transform: "translateY(-50%)" }, cursor: "ew-resize" },
  { pos: "se", style: { bottom: -4, right: -4 }, cursor: "nwse-resize" },
  { pos: "s",  style: { bottom: -4, left: "50%", transform: "translateX(-50%)" }, cursor: "ns-resize" },
  { pos: "sw", style: { bottom: -4, left: -4 }, cursor: "nesw-resize" },
  { pos: "w",  style: { top: "50%", left: -4, transform: "translateY(-50%)" }, cursor: "ew-resize" },
];
```

Each handle: 8x8px white square with gray border, absolute positioned.

**Step 2: Implement drag resize logic**

Use `onPointerDown` on each handle. On pointer down:
1. Capture pointer (`setPointerCapture`)
2. Record start position and current block dimensions
3. On `onPointerMove`: calculate delta, update dimensions
   - Corner handles: scale proportionally (compute new width from delta, derive height from aspect ratio)
   - Edge handles: only change one dimension (creates crop)
4. On `onPointerUp`: release pointer, call `onChange` with final dimensions

```tsx
function useResizeHandle(
  block: ImageBlock,
  naturalSize: { w: number; h: number } | null,
  onChange: (block: ImageBlock) => void,
) {
  const startRef = useRef<{
    x: number; y: number;
    w: number; h: number;
    pos: HandlePosition;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, pos: HandlePosition) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const currentW = block.width ?? naturalSize?.w ?? 300;
    const currentH = block.height ?? naturalSize?.h ?? 200;
    startRef.current = { x: e.clientX, y: e.clientY, w: currentW, h: currentH, pos };
  }, [block, naturalSize]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current || !naturalSize) return;
    const { x, y, w, h, pos } = startRef.current;
    const dx = e.clientX - x;
    const dy = e.clientY - y;
    const aspectRatio = naturalSize.w / naturalSize.h;

    let newW = w;
    let newH = h;

    if (["nw", "ne", "sw", "se"].includes(pos)) {
      // Corner = proportional
      const sign = ["ne", "se"].includes(pos) ? 1 : -1;
      newW = Math.max(50, w + dx * sign);
      newH = Math.round(newW / aspectRatio);
    } else if (["n", "s"].includes(pos)) {
      // Vertical edge = height only (crop)
      const sign = pos === "s" ? 1 : -1;
      newH = Math.max(30, h + dy * sign);
    } else if (["e", "w"].includes(pos)) {
      // Horizontal edge = width only (crop)
      const sign = pos === "e" ? 1 : -1;
      newW = Math.max(50, w + dx * sign);
    }

    onChange({ ...block, width: Math.round(newW), height: Math.round(newH) });
  }, [block, naturalSize, onChange]);

  const handlePointerUp = useCallback(() => {
    startRef.current = null;
  }, []);

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
```

**Step 3: Render handles around image when selected**

```tsx
{isSelected && naturalSize && (
  <div className="absolute inset-0">
    {HANDLE_POSITIONS.map(({ pos, style, cursor }) => (
      <div
        key={pos}
        className="absolute h-2 w-2 border border-gray-400 bg-white"
        style={{ ...style, cursor }}
        onPointerDown={(e) => resize.handlePointerDown(e, pos)}
        onPointerMove={resize.handlePointerMove}
        onPointerUp={resize.handlePointerUp}
      />
    ))}
  </div>
)}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx
git commit -m "feat(web): add drag resize handles to image block editor"
```

---

### Task 5: Add pan sliders

**Files:**
- Modify: `apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx`

**Step 1: Determine when sliders are needed**

Sliders appear when the visible area (width/height) is smaller than the image's natural dimensions:

```tsx
const showVerticalSlider = isSelected && naturalSize && block.height !== null && block.height < naturalSize.h;
const showHorizontalSlider = isSelected && naturalSize && block.width !== null && block.width < naturalSize.w;
```

**Step 2: Vertical slider (right side)**

A custom vertical range slider positioned on the right edge of the image:

```tsx
{showVerticalSlider && (
  <div className="absolute right-0 top-0 bottom-0 flex items-center" style={{ transform: "translateX(calc(100% + 4px))" }}>
    <input
      type="range"
      min={0}
      max={100}
      value={block.panY}
      onChange={(e) => onChange({ ...block, panY: Number(e.target.value) })}
      className="h-full"
      orient="vertical"
      style={{
        writingMode: "vertical-lr",
        direction: "rtl",
        appearance: "slider-vertical",
        width: "16px",
      }}
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}
```

Note: Vertical range inputs need `writing-mode: vertical-lr` and `direction: rtl` to make 0=top, 100=bottom. Alternatively use a custom slider div with pointer events for better cross-browser styling. If the native vertical range doesn't style well, create a custom slider track+thumb with pointer drag (similar to resize handles).

**Step 3: Horizontal slider (bottom)**

```tsx
{showHorizontalSlider && (
  <div className="absolute left-0 right-0 bottom-0" style={{ transform: "translateY(calc(100% + 4px))" }}>
    <input
      type="range"
      min={0}
      max={100}
      value={block.panX}
      onChange={(e) => onChange({ ...block, panX: Number(e.target.value) })}
      className="w-full"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}
```

**Step 4: Apply pan to image preview**

The image in the editor must show the crop+pan effect. Wrap the `<img>` in a container with `overflow: hidden` and use `object-fit: cover` + `object-position`:

```tsx
<div
  style={{
    width: block.width ? `${block.width}px` : undefined,
    height: block.height ? `${block.height}px` : undefined,
    overflow: "hidden",
  }}
  className={`relative rounded ${alignClasses[block.alignment]}`}
>
  <img
    ref={imgRef}
    src={block.src}
    alt={block.altText}
    onLoad={handleImageLoad}
    style={{
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: block.width || block.height ? "cover" : undefined,
      objectPosition: `${block.panX}% ${block.panY}%`,
    }}
    className={block.width || block.height ? "" : "max-w-full"}
  />
</div>
```

**Step 5: Commit**

```bash
git add apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx
git commit -m "feat(web): add pan sliders and crop preview to image block editor"
```

---

### Task 6: Update PageRenderer for cropped images

**Files:**
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx:37-42` (ImageBlockData interface)
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx:111-127` (ImageBlockRenderer)

**Step 1: Extend ImageBlockData**

Change from:

```typescript
interface ImageBlockData extends BlockBase {
  type: "image";
  src: string;
  altText: string;
  alignment: string;
}
```

To:

```typescript
interface ImageBlockData extends BlockBase {
  type: "image";
  src: string;
  altText: string;
  alignment: string;
  width?: number | null;
  height?: number | null;
  panX?: number;
  panY?: number;
}
```

**Step 2: Update ImageBlockRenderer**

Change from simple `<img>` to conditional crop container:

```tsx
function ImageBlockRenderer({ block }: { block: ImageBlockData }) {
  if (!block.src) return null;
  const alignClasses: Record<string, string> = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
    full: "w-full",
  };
  const hasCrop = block.width != null || block.height != null;

  if (hasCrop) {
    return (
      <div
        style={{
          width: block.width ? `${block.width}px` : undefined,
          height: block.height ? `${block.height}px` : undefined,
          overflow: "hidden",
        }}
        className={`rounded ${alignClasses[block.alignment] ?? "mx-auto"}`}
      >
        <img
          src={block.src}
          alt={block.altText ?? ""}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${block.panX ?? 50}% ${block.panY ?? 50}%`,
          }}
        />
      </div>
    );
  }

  // Default: no crop, render as before
  return (
    <img
      src={block.src}
      alt={block.altText ?? ""}
      className={`max-w-full rounded ${alignClasses[block.alignment] ?? "mx-auto"}`}
      style={{ display: "block" }}
    />
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/page-renderer/PageRenderer.tsx
git commit -m "feat(web): update page renderer to support cropped images with pan position"
```

---

### Task 7: Visual verification

**Step 1: Restart dev server**

```bash
npx kill-port 3000 3001; cd apps/web && pnpm dev
```

**Step 2: Test in editor**

1. Open a page with an existing image block
2. Click image → toolbar appears (dark, above image)
3. Verify toolbar buttons: Upravit, Zarovnání, Velikost, Obnovit velikost, delete, copy
4. Drag corner handle → image resizes proportionally
5. Drag edge handle → one dimension changes, slider appears
6. Move slider → image pans within crop area
7. Click "Velikost" → enter manual dimensions
8. Click "Obnovit velikost" → resets to full size
9. Delete and Copy work correctly

**Step 3: Test public preview**

1. Open page preview (`/pages/{slug}?preview=true`)
2. Verify cropped image renders with correct dimensions and pan position
3. Verify uncropped images render unchanged

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(web): polish image block resize and crop behavior"
```
