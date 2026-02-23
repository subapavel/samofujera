# Webnode Layout Migration Design

**Goal:** Replicate the exact Webnode layout system (section containers, text block sizing, responsive typography) on samofujera public pages — pixel-perfect match.

**Source data:** Webnode CSS from samofujera.cz CDN (wnd-w-wider, wnd-s-high, t-07_new typography scheme).

## Layout Architecture

### Section Container (replicates `.s-c` for `wnd-w-wider`)

Each section in PageRenderer gets a `.section-container` wrapper:

```css
.section-container {
  position: relative;
  width: 100%;
  max-width: 80rem;        /* 1280px — wnd-w-wider */
  margin: 0 auto;
  padding-left: 0;
  padding-right: 0;
  padding-top: 1.875rem;
  padding-bottom: 1.875rem;
}

@media screen and (min-width: 37.5em) {  /* 600px */
  .section-container {
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-top: 4.375rem;
    padding-bottom: 4.375rem;
  }
}

@media screen and (min-width: 56.25em) {  /* 900px */
  .section-container {
    padding-left: 0.9375rem;
    padding-right: 0.9375rem;
    padding-top: 5.625rem;
    padding-bottom: 5.625rem;
  }
}
```

### Text Block (replicates `.b-cs` for `wnd-w-wider`)

Only text blocks are width-constrained. Images, separators, buttons go full section width.

```css
.text-block {
  max-width: 60.8125rem;   /* 973px — wnd-w-wider .b-cs */
  margin-left: auto;
  margin-right: auto;
  padding: 0.625rem;
}

@media screen and (min-width: 37.5em) {
  .text-block { padding: 0.9375rem; }
}

@media screen and (min-width: 56.25em) {
  .text-block { padding: 1.25rem; }
}
```

### Block type → width behavior

| Block type  | Width              | Wrapper class    |
|-------------|-------------------|-----------------|
| text        | 973px (centered)  | `.text-block`   |
| image       | 973px (centered)  | `.text-block`   |
| separator   | 973px (centered)  | `.text-block`   |
| button      | 973px (centered)  | `.text-block`   |

## Responsive Typography

### Fonts

| Element    | Font               | CSS variable          |
|-----------|--------------------|-----------------------|
| Body/p    | Merriweather       | `--font-body`         |
| H1, H2    | Josefin Sans       | `--font-heading`      |
| H3        | **Allura** (NEW)   | `--font-decorative`   |
| Buttons   | Josefin Sans       | `--font-heading`      |

### H1 (t-t-fs-m)

| Breakpoint | font-size   | line-height | padding-bottom |
|-----------|-------------|-------------|----------------|
| Mobile    | 3.25rem     | 1.3         | 1.25rem        |
| 600px+    | 3rem        | 1.2         | 1.25rem        |
| 900px+    | 3.4375rem   | 1.2         | 1.875rem       |

### H2 (t-h-fs-l)

| Breakpoint | font-size   | line-height | padding-bottom |
|-----------|-------------|-------------|----------------|
| Mobile    | 2.5rem      | 1.35        | 0.75rem        |
| 600px+    | 2.5rem      | 1.35        | 0.75rem        |
| 900px+    | 2.8125rem   | 1.35        | 0.875rem       |

### H3 (t-s-fs-s — Allura decorative)

| Breakpoint | font-size   | line-height | padding-bottom |
|-----------|-------------|-------------|----------------|
| Mobile    | 2.125rem    | 1.3         | 0.625rem       |
| 600px+    | 2.125rem    | 1.3         | 0.625rem       |
| 900px+    | 2.25rem     | 1.3         | 0.75rem        |

### Body text / Paragraph (t-p-fs-m)

| Breakpoint | font-size   | padding-bottom |
|-----------|-------------|----------------|
| Mobile    | 1rem        | 0.9375rem      |
| 900px+    | 1.075rem    | 1rem           |

### Lists (ul/ol)

| Breakpoint | padding-bottom | margin-left | li padding-left |
|-----------|----------------|-------------|-----------------|
| Mobile    | 0.875rem       | 0.9375rem   | 2.1875rem       |
| 900px+    | 1rem           | 1.25rem     | 2.5rem          |

### Element + heading spacing

`p + h1, p + h2, p + h3, ul + h1, ... etc.` → `margin-top: 1rem`

## HR / Separator

Remove the current calc() hack. With text blocks constrained to 973px and separators at full section width (1280px), no overflow needed:

```css
.page-content hr {
  display: block;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.2);
  width: 100%;
  margin: 0;
}
```

## Files to Modify

1. **`apps/web/src/app/layout.tsx`** — Add Allura font from next/font/google, add `--font-decorative` CSS variable
2. **`packages/config/tailwind.css`** — Add `--font-decorative: "Allura", cursive;`
3. **`apps/web/src/styles/global.css`** — Add `.section-container`, `.text-block`, responsive typography, update hr, add h3 decorative font
4. **`apps/web/src/components/page-renderer/PageRenderer.tsx`** — Wrap sections in `.section-container`, text blocks in `.text-block`, remove `py-8`
5. **`apps/web/src/app/(public)/pages/[slug]/page.tsx`** — Remove `max-w-[935px] mx-auto px-5` wrapper
