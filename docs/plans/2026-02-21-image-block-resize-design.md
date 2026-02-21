# Image Block Resize & Crop Design

## Goal

Add resize handles, crop-and-pan sliders, and manual size input to the image block editor, so users can control image dimensions and visible area without leaving the editor.

## Data Model

Extend `ImageBlock` in `types.ts`:

```typescript
export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  altText: string;
  alignment: ImageAlignment;
  mediaItemId: string | null;
  // New fields:
  width: number | null;   // visible area width in px (null = auto/full container)
  height: number | null;  // visible area height in px (null = auto/proportional)
  panX: number;           // 0-100, horizontal pan position (default 50 = centered)
  panY: number;           // 0-100, vertical pan position (default 50 = centered)
}
```

Factory default: `width: null, height: null, panX: 50, panY: 50`.

## Editor UI

### Toolbar (dark, above image)

`Upravit | Zarovnání ▼ | Velikost ▼ | Obnovit velikost | 🗑 | ⋮ (copy)`

- **Upravit** — opens media picker to change image
- **Zarovnání** — dropdown: left/center/right/full
- **Velikost** — popover with width + height inputs (always proportionally locked)
- **Obnovit velikost** — resets width/height to null (auto), panX/panY to 50

### Resize Handles

8 handles around the selected image (4 corners + 4 edge midpoints):

- **Corner handles** — proportional resize (aspect ratio preserved, both dimensions scale)
- **Top/bottom edge handles** — resize height only (creates vertical crop, vertical slider appears)
- **Left/right edge handles** — resize width only (creates horizontal crop, horizontal slider appears)

### Pan Sliders

- **Vertical slider** (right side of image) — visible only when image natural height > visible area height. Controls `panY` (0-100%).
- **Horizontal slider** (bottom of image) — visible only when image natural width > visible area width. Controls `panX` (0-100%).

Sliders allow user to choose which part of the image is visible within the cropped area.

### Size Popover

Opened from "Velikost" toolbar button:

- Width input (px) — changing recalculates height proportionally
- Height input (px) — changing recalculates width proportionally
- Aspect ratio always locked (no toggle)

## Public Page Rendering

```html
<div style="width: {width}px; height: {height}px; overflow: hidden;">
  <img
    src="..."
    alt="..."
    style="width: 100%; height: 100%; object-fit: cover; object-position: {panX}% {panY}%;"
  />
</div>
```

When `width` and `height` are null (default), image renders at natural size with current alignment behavior (no change from current).

## Behavior Summary

| State | Handles | Sliders | Description |
|-------|---------|---------|-------------|
| Default (new image) | None (not selected) | None | Full size, auto dimensions |
| Selected | 8 handles visible | None | Ready to resize |
| Proportional resize | Corner drag | None | Both dimensions scale equally |
| Vertical crop | Top/bottom edge drag | Vertical slider | Height < natural, pan up/down |
| Horizontal crop | Left/right edge drag | Horizontal slider | Width < natural, pan left/right |
| Both cropped | Any drag | Both sliders | Both dimensions < natural |
| Reset | "Obnovit velikost" | None | Back to full/auto size |

## Files to Modify

- `apps/web/src/components/admin/editor/types.ts` — extend ImageBlock
- `apps/web/src/components/admin/editor/blocks/ImageBlockEditor.tsx` — full rewrite with handles, sliders, toolbar
- `apps/web/src/components/page-renderer/PageRenderer.tsx` — update ImageBlockRenderer for width/height/pan
- `apps/web/src/components/admin/editor/SectionList.tsx` — wire new props (onDelete, onCopy, onActiveChange)
