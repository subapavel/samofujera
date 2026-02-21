# Webnode Layout Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replicate the exact Webnode layout system (section containers, text block sizing, responsive typography with Allura font) on samofujera public pages.

**Architecture:** Add CSS classes `.section-container` (80rem/1280px max-width) and `.text-block` (60.8125rem/973px max-width) to global.css. Update PageRenderer to wrap sections and text blocks accordingly. Add Allura font for h3. Make all typography responsive at 600px and 900px breakpoints.

**Tech Stack:** Next.js 16, next/font/google (Allura), CSS media queries (37.5em/56.25em), React

---

### Task 1: Add Allura font and `--font-decorative` CSS variable

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `packages/config/tailwind.css`

**Step 1: Add Allura to layout.tsx**

In `apps/web/src/app/layout.tsx`, add the Allura import and font instance.

Change line 2 from:
```tsx
import { Inter, Josefin_Sans, Merriweather, Open_Sans } from "next/font/google";
```
to:
```tsx
import { Allura, Inter, Josefin_Sans, Merriweather, Open_Sans } from "next/font/google";
```

After `const openSans = ...` (after line 32), add:
```tsx
const allura = Allura({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  variable: "--font-decorative",
  display: "swap",
});
```

Change line 52 from:
```tsx
className={`${inter.variable} ${josefinSans.variable} ${merriweather.variable} ${openSans.variable}`}
```
to:
```tsx
className={`${inter.variable} ${josefinSans.variable} ${merriweather.variable} ${openSans.variable} ${allura.variable}`}
```

**Step 2: Add `--font-decorative` to Tailwind config**

In `packages/config/tailwind.css`, after line 24 (`--font-ui: "Open Sans", sans-serif;`), add:
```css
  --font-decorative: "Allura", cursive;
```

**Step 3: Verify build**

Run: `cd apps/web && pnpm dev`
Expected: Dev server starts without errors. Allura font loads (visible in browser Network tab as a Google Fonts request).

**Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx packages/config/tailwind.css
git commit -m "feat(web): add allura font for decorative h3 headings"
```

---

### Task 2: Add section container and text block CSS

**Files:**
- Modify: `apps/web/src/styles/global.css`

**Step 1: Add `.section-container` class**

In `apps/web/src/styles/global.css`, after the nav-separator rules (after line 30, before the page-content comment), add:

```css
/* ========================================
   Webnode layout replication (wnd-w-wider, wnd-s-high)
   Section container: 80rem (1280px) max-width
   Text block: 60.8125rem (973px) max-width
   Breakpoints: 37.5em (600px), 56.25em (900px)
   ======================================== */

.section-container {
  position: relative;
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding-left: 0;
  padding-right: 0;
  padding-top: 1.875rem;
  padding-bottom: 1.875rem;
}

@media screen and (min-width: 37.5em) {
  .section-container {
    padding-left: 0.625rem;
    padding-right: 0.625rem;
    padding-top: 4.375rem;
    padding-bottom: 4.375rem;
  }
}

@media screen and (min-width: 56.25em) {
  .section-container {
    padding-left: 0.9375rem;
    padding-right: 0.9375rem;
    padding-top: 5.625rem;
    padding-bottom: 5.625rem;
  }
}

.text-block {
  max-width: 60.8125rem;
  margin-left: auto;
  margin-right: auto;
  padding: 0.625rem;
}

@media screen and (min-width: 37.5em) {
  .text-block {
    padding: 0.9375rem;
  }
}

@media screen and (min-width: 56.25em) {
  .text-block {
    padding: 1.25rem;
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/styles/global.css
git commit -m "style(web): add section container and text block layout classes"
```

---

### Task 3: Update responsive typography in global.css

**Files:**
- Modify: `apps/web/src/styles/global.css`

**Step 1: Replace fixed typography with responsive rules**

In `apps/web/src/styles/global.css`, replace the existing `.page-content` typography rules.

Replace the body text rule (lines 39-52):
```css
.page-content,
.page-content p,
.page-content li,
.page-content blockquote,
.page-content span {
  font-family: var(--font-body);
  font-size: 1.075rem;
  font-weight: 200;
  line-height: 1.8;
  letter-spacing: 0.02em;
  text-rendering: optimizeLegibility;
  font-kerning: normal;
  color: #000;
}
```
with:
```css
.page-content,
.page-content p,
.page-content li,
.page-content blockquote,
.page-content span {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 200;
  line-height: 1.8;
  letter-spacing: 0.02em;
  text-rendering: optimizeLegibility;
  font-kerning: normal;
  color: #000;
}
```

Replace the heading base rule (lines 54-63):
```css
.page-content h1,
.page-content h2,
.page-content h3,
.page-content h4,
.page-content h5,
.page-content h6 {
  font-family: var(--font-heading);
  font-weight: 300;
  color: #065d4d;
}
```
with:
```css
.page-content h1,
.page-content h2,
.page-content h4,
.page-content h5,
.page-content h6 {
  font-family: var(--font-heading);
  font-weight: 300;
  color: #065d4d;
}

.page-content h3 {
  font-family: var(--font-decorative);
  font-weight: 400;
  color: #065d4d;
}
```

Replace h1 rule (lines 65-70):
```css
.page-content h1 {
  font-size: 3.4375rem;
  line-height: 1.2;
  letter-spacing: -0.015em;
  padding-bottom: 1.875rem;
}
```
with:
```css
.page-content h1 {
  font-size: 3.25rem;
  line-height: 1.3;
  letter-spacing: -0.015em;
  padding-bottom: 1.25rem;
}
```

Replace h2 rule (lines 72-77):
```css
.page-content h2 {
  font-size: 2.8125rem;
  line-height: 1.35;
  letter-spacing: -0.015em;
  padding-bottom: 0.875rem;
}
```
with:
```css
.page-content h2 {
  font-size: 2.5rem;
  line-height: 1.35;
  letter-spacing: -0.015em;
  padding-bottom: 0.75rem;
}
```

Replace h3 rule (lines 80-83):
```css
.page-content h3 {
  font-size: 1.25rem;
  line-height: 1.55;
}
```
with:
```css
.page-content h3 {
  font-size: 2.125rem;
  line-height: 1.3;
  padding-bottom: 0.625rem;
}
```

Replace paragraph padding (lines 120-122):
```css
.page-content p {
  padding-bottom: 1rem;
}
```
with:
```css
.page-content p {
  padding-bottom: 0.9375rem;
}
```

Replace the hr rule (lines 137-143):
```css
.page-content hr {
  display: block;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.2);
  width: calc(100% + 10rem);
  margin-left: -5rem;
}
```
with:
```css
.page-content hr {
  display: block;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.2);
  width: 100%;
  margin: 0;
}
```

Replace the ul rules (lines 145-157):
```css
.page-content ul {
  list-style: none;
  padding-left: 2.5rem;
  margin-left: 20px;
}

.page-content ul li::before {
  content: "›";
  display: inline-block;
  width: 2.5rem;
  margin-left: -2.5rem;
  color: rgba(0, 0, 0, 0.6);
}
```
with:
```css
.page-content ul {
  list-style: none;
  padding-bottom: 0.875rem;
  padding-left: 2.1875rem;
  margin-left: 0.9375rem;
}

.page-content ul li::before {
  content: "›";
  display: inline-block;
  width: 2.1875rem;
  margin-left: -2.1875rem;
  color: rgba(0, 0, 0, 0.6);
}

.page-content ol {
  padding-bottom: 0.875rem;
  margin-left: 0.9375rem;
}

.page-content ol li {
  padding-left: 2.1875rem;
}
```

**Step 2: Add responsive media queries and element+heading spacing**

At the end of the page-content typography section (before the button styles comment), add:

```css
/* Element + heading spacing */
.page-content p + h1,
.page-content p + h2,
.page-content p + h3,
.page-content ul + h1,
.page-content ul + h2,
.page-content ul + h3,
.page-content ol + h1,
.page-content ol + h2,
.page-content ol + h3,
.page-content blockquote + h1,
.page-content blockquote + h2,
.page-content blockquote + h3 {
  margin-top: 1rem;
}

/* Heading inherit rules already exist — add h3 decorative inherits */
.page-content h3 span,
.page-content h3 strong,
.page-content h3 em {
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  letter-spacing: inherit;
  color: inherit;
}

/* ── Responsive typography (600px) ── */
@media screen and (min-width: 37.5em) {
  .page-content h1 {
    font-size: 3rem;
    line-height: 1.2;
  }
}

/* ── Responsive typography (900px) ── */
@media screen and (min-width: 56.25em) {
  .page-content,
  .page-content p,
  .page-content li,
  .page-content blockquote,
  .page-content span {
    font-size: 1.075rem;
  }

  .page-content h1 {
    font-size: 3.4375rem;
    line-height: 1.2;
    padding-bottom: 1.875rem;
  }

  .page-content h2 {
    font-size: 2.8125rem;
    padding-bottom: 0.875rem;
  }

  .page-content h3 {
    font-size: 2.25rem;
    padding-bottom: 0.75rem;
  }

  .page-content p {
    padding-bottom: 1rem;
  }

  .page-content ul {
    padding-bottom: 1rem;
    padding-left: 2.5rem;
    margin-left: 1.25rem;
  }

  .page-content ul li::before {
    width: 2.5rem;
    margin-left: -2.5rem;
  }

  .page-content ol {
    padding-bottom: 1rem;
    margin-left: 1.25rem;
  }

  .page-content ol li {
    padding-left: 2.5rem;
  }
}
```

**Step 3: Verify CSS compiles**

Run: `cd apps/web && pnpm dev`
Expected: No CSS errors, dev server starts.

**Step 4: Commit**

```bash
git add apps/web/src/styles/global.css
git commit -m "style(web): responsive typography matching webnode breakpoints"
```

---

### Task 4: Update PageRenderer — section container and text block wrappers

**Files:**
- Modify: `apps/web/src/components/page-renderer/PageRenderer.tsx`

**Step 1: Update V3 section rendering**

In `PageRenderer.tsx`, replace lines 209-222 (the V3 rendering block):
```tsx
  if (c?.version === 3 && Array.isArray(c?.sections)) {
    const sections = c.sections as SectionData[];
    return (
      <div className="page-content">
        {sections.map((section) => (
          <section key={section.id} className="py-8">
            {section.blocks?.map((block) => (
              <div key={block.id}>{renderBlock(block)}</div>
            ))}
          </section>
        ))}
      </div>
    );
  }
```
with:
```tsx
  if (c?.version === 3 && Array.isArray(c?.sections)) {
    const sections = c.sections as SectionData[];
    return (
      <div className="page-content">
        {sections.map((section) => (
          <section key={section.id} className="section-container">
            {section.blocks?.map((block) => {
              if (block.type === "text") {
                const content = renderLexicalContent((block as TextBlockData).content);
                if (!content) return <div key={block.id} className="text-block"><p><br /></p></div>;
                return <div key={block.id} className="text-block">{content}</div>;
              }
              return <div key={block.id}>{renderBlock(block)}</div>;
            })}
          </section>
        ))}
      </div>
    );
  }
```

Note: Text blocks are now wrapped in `.text-block` directly here instead of inside `renderBlock`, because only text blocks get the width constraint. The `renderBlock` function for `"text"` type is no longer called in V3 — text rendering happens inline.

**Step 2: Verify dev server**

Run: `cd apps/web && pnpm dev`
Navigate to a public page (e.g. `http://localhost:3000/pages/some-slug`).
Expected: Sections are centered with 1280px max-width. Text blocks are narrower (973px). Images/separators/buttons span full section width.

**Step 3: Commit**

```bash
git add apps/web/src/components/page-renderer/PageRenderer.tsx
git commit -m "feat(web): section container and text block wrappers in page renderer"
```

---

### Task 5: Update page route — remove old max-width wrapper

**Files:**
- Modify: `apps/web/src/app/(public)/pages/[slug]/page.tsx`

**Step 1: Remove the max-w wrapper**

In `apps/web/src/app/(public)/pages/[slug]/page.tsx`, replace lines 64-73:
```tsx
  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        {page.content && <PageRenderer content={page.content} />}
      </div>
    </section>
  );
```
with:
```tsx
  return (
    <div
      className="bg-repeat pt-[81px] sm:pt-[97px] pb-12 sm:pb-16"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      {page.content && <PageRenderer content={page.content} />}
    </div>
  );
```

Changes:
- Removed `<section>` → `<div>` (sections are now inside PageRenderer)
- Removed `px-6 sm:px-12 lg:px-16` (horizontal padding handled by `.section-container`)
- Removed `max-w-[935px] mx-auto px-5` inner wrapper (width handled by `.text-block`)
- Kept `pt-[81px] sm:pt-[97px]` (header offset) and `pb-12 sm:pb-16` (bottom spacing)
- Kept background image

**Step 2: Verify the page**

Run: `cd apps/web && pnpm dev`
Navigate to a public page.
Expected: Page layout matches Webnode — sections centered at 1280px, text blocks at 973px, images/buttons at full section width.

**Step 3: Commit**

```bash
git add apps/web/src/app/(public)/pages/[slug]/page.tsx
git commit -m "refactor(web): remove old max-width wrapper from page route"
```

---

### Task 6: Run lint and typecheck

**Step 1: Run lint**

Run: `pnpm turbo lint`
Expected: No errors.

**Step 2: Run typecheck**

Run: `pnpm turbo typecheck`
Expected: No errors.

**Step 3: Fix any issues found**

If lint/typecheck finds issues, fix them and re-run until clean.

---

### Task 7: Visual verification

**Step 1: Restart dev server with clean state**

Kill any running dev server, then:
Run: `cd apps/web && pnpm dev`

**Step 2: Check desktop (900px+)**

Navigate to a content page. Verify:
- Section container max-width is 1280px
- Text blocks are 973px wide, centered
- Images span full section width
- Separators span full section width (no calc overflow hack)
- H1 is 3.4375rem, H2 is 2.8125rem
- H3 uses Allura font, 2.25rem
- Body text is 1.075rem

**Step 3: Check tablet (600-899px)**

Resize browser to ~700px. Verify:
- Section has 0.625rem horizontal padding
- H1 drops to 3rem
- Body text stays at 1rem

**Step 4: Check mobile (<600px)**

Resize to ~375px. Verify:
- Section has no horizontal padding
- H1 is 3.25rem with line-height 1.3
- All spacing is reduced per design spec
