# Typography Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Match samofujera.cz typography 1:1 for all public-facing content pages.

**Architecture:** Update Tailwind theme with three font tokens (heading, body, ui),
load correct Google Fonts in PublicLayout, create reusable typography CSS classes in
global.css, then apply them to the homepage. Navigation/topbar are already migrated
and will NOT be touched.

**Tech Stack:** Tailwind CSS 4 (@theme), Google Fonts, Astro layouts

---

### Task 1: Update Tailwind theme font tokens

**Files:**
- Modify: `packages/config/tailwind.css:20-22`

**Step 1: Update font tokens in @theme**

Replace lines 20-22:
```css
  /* Typography */
  --font-sans: "Inter", sans-serif;
  --font-heading: "Playfair Display", serif;
```

With:
```css
  /* Typography */
  --font-sans: "Inter", sans-serif;
  --font-heading: "Josefin Sans", sans-serif;
  --font-body: "Merriweather", serif;
  --font-ui: "Open Sans", sans-serif;
```

> Note: `--font-sans` stays as Inter for admin/dashboard layouts. `--font-heading`
> changes from Playfair Display to Josefin Sans globally — this is correct since
> Playfair is only used in BaseLayout's inline logo style (which has explicit
> `font-family`), not through the Tailwind `font-heading` class on any content.

**Step 2: Verify the change**

Run: `pnpm turbo typecheck` from repo root.
Expected: No errors (CSS-only change, no TS impact).

**Step 3: Commit**

```bash
git add packages/config/tailwind.css
git commit -m "style(config): update tailwind font tokens to match samofujera.cz"
```

---

### Task 2: Update Google Fonts URL in PublicLayout

**Files:**
- Modify: `apps/web/src/layouts/PublicLayout.astro:25`

**Step 1: Replace the Google Fonts link**

Replace line 25:
```html
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Josefin+Sans:wght@300;400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
```

With:
```html
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Josefin+Sans:wght@300;400;600&family=Merriweather:ital,wght@0,200;0,300;0,400;0,500;1,200;1,300&family=Open+Sans:wght@400;500;600&display=swap"
```

Changes:
- Josefin Sans: added weight 600 (for `<strong>` in headings)
- Added Merriweather: weights 200, 300, 400, 500 (regular + italic for 200, 300)
- Added Open Sans: weights 400, 500, 600
- Removed Playfair Display (not used in public pages — BaseLayout still loads it)

**Step 2: Verify fonts load**

Start dev server, open homepage in browser, check Network tab for the fonts request.
Expected: All three fonts load (Josefin Sans, Merriweather, Open Sans).

**Step 3: Commit**

```bash
git add apps/web/src/layouts/PublicLayout.astro
git commit -m "style(web): load merriweather and open sans fonts for public pages"
```

---

### Task 3: Add typography utility classes in global.css

**Files:**
- Modify: `apps/web/src/styles/global.css`

**Step 1: Add typography classes after existing nav styles**

Append to end of `global.css`:

```css
/* ========================================
   Public content typography
   Matches samofujera.cz 1:1
   DO NOT apply to nav/topbar (already migrated)
   ======================================== */

/* Headings */
.public-h1 {
  font-family: var(--font-heading);
  font-size: 3.44rem; /* 55px */
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: rgba(0, 0, 0, 0.9);
}

.public-h2 {
  font-family: var(--font-heading);
  font-size: 2.81rem; /* 45px */
  font-weight: 300;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: rgba(0, 0, 0, 0.9);
}

.public-h2-sm {
  font-family: var(--font-heading);
  font-size: 2.53rem; /* ~40.5px, 90% variant */
  font-weight: 300;
  line-height: 1.35;
  letter-spacing: -0.015em;
  color: rgba(0, 0, 0, 0.9);
}

.public-h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem; /* 20px — scaled from original 18px for content context */
  font-weight: 300;
  line-height: 1.55;
  color: rgba(0, 0, 0, 0.9);
}

/* Body text */
.public-body {
  font-family: var(--font-body);
  font-size: 1.075rem; /* 17.2px */
  font-weight: 200;
  line-height: 1.8;
  color: rgba(0, 0, 0, 0.6);
}

.public-lead {
  font-family: var(--font-body);
  font-size: 1.18rem; /* 18.9px */
  font-weight: 200;
  line-height: 1.8;
  color: rgba(0, 0, 0, 0.9);
}

/* Blockquote */
.public-blockquote {
  font-family: var(--font-body);
  font-size: 1.375rem; /* 22px */
  font-weight: 300;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

/* Footer text */
.public-footer-text {
  font-family: var(--font-body);
  font-size: 0.875rem; /* 14px */
  font-weight: 200;
  line-height: 1.6;
}

/* Inline: strong inside headings */
.public-h1 strong,
.public-h2 strong {
  font-weight: 600;
  color: rgb(44, 91, 45);
}

/* Inline: strong inside body */
.public-body strong {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.9);
}

/* Inline: em inside body */
.public-body em {
  font-weight: 200;
  font-style: italic;
}

/* Inline: links inside body */
.public-body a {
  font-weight: 500;
  font-style: italic;
  text-decoration: underline;
  color: rgba(0, 0, 0, 0.9);
}

/* CTA buttons (outline style, matches original) */
.public-cta {
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.2);
  color: rgba(0, 0, 0, 0.9);
  font-family: var(--font-heading);
  font-size: 0.75rem; /* 12px */
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.625rem 1.5rem;
  transition: background-color 0.2s;
}
.public-cta:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
```

**Step 2: Verify CSS is valid**

Run: `pnpm turbo typecheck` and `pnpm turbo lint`.
Expected: No errors.

**Step 3: Commit**

```bash
git add apps/web/src/styles/global.css
git commit -m "style(web): add public content typography classes matching samofujera.cz"
```

---

### Task 4: Apply typography to homepage

**Files:**
- Modify: `apps/web/src/pages/index.astro`

**Step 1: Update all heading and body classes on homepage**

Replace current Tailwind utility classes on content elements with the new
`public-*` typography classes. Key changes:

- All `<h2>` elements: replace `font-heading text-2xl sm:text-3xl font-medium` → `public-h2`
- All `<h3>` elements: replace `font-heading text-xl font-medium` or `text-lg font-semibold` → `public-h3`
- All `<p>` in content sections: replace `text-base leading-relaxed text-black/60` → `public-body`
- Lead/hero text: replace `text-lg sm:text-xl leading-relaxed text-black/90` → `public-lead`
- All CTA links: replace long utility classes → `public-cta`
- `<div class="space-y-4 text-base leading-relaxed text-black/60">` wrappers: replace → `space-y-4 public-body`
- Footer text: add `public-footer-text` where appropriate

Keep layout classes (margins, padding, flexbox, max-width) as-is.
Only replace typography classes (font-family, font-size, font-weight, line-height, color).

**Step 2: Visual check**

Start dev server, open homepage. Compare with samofujera.cz side by side:
- H2 headings should be light (300), ~45px, Josefin Sans
- Body text should be Merriweather, thin (200), with generous line-height
- CTAs should be small uppercase with wide tracking

**Step 3: Commit**

```bash
git add apps/web/src/pages/index.astro
git commit -m "style(web): apply matched typography to homepage content"
```

---

### Task 5: Apply typography to footer in PublicLayout

**Files:**
- Modify: `apps/web/src/layouts/PublicLayout.astro:49-64`

**Step 1: Update footer typography**

Update the footer `<p>` elements to use `public-footer-text` and proper font-body.
The footer has a green background image, so keep `text-white` and opacity classes,
but add the font-family class.

Replace:
```html
        <p class="text-sm leading-relaxed mb-6 opacity-90">
```
With:
```html
        <p class="public-footer-text mb-6 opacity-90">
```

Replace:
```html
        <p class="text-sm font-medium mb-6">
```
With:
```html
        <p class="public-footer-text font-medium mb-6">
```

Replace:
```html
        <p class="text-xs opacity-70">
```
With:
```html
        <p class="public-footer-text text-xs opacity-70">
```

Footer nav links stay as-is (uppercase/tracking-wider is correct).

**Step 2: Visual check**

Verify footer text uses Merriweather, thin weight.

**Step 3: Commit**

```bash
git add apps/web/src/layouts/PublicLayout.astro
git commit -m "style(web): apply matched typography to public footer"
```

---

### Task 6: Final verification and lint

**Step 1: Run lint and typecheck**

```bash
pnpm turbo lint
pnpm turbo typecheck
```

Expected: All green.

**Step 2: Full visual comparison**

Open homepage and samofujera.cz side by side. Verify:
- [ ] H2 headings: Josefin Sans, light (300), ~45px
- [ ] H3 headings: Josefin Sans, light (300)
- [ ] Body paragraphs: Merriweather, extralight (200), generous line-height
- [ ] Lead text: Merriweather, slightly larger, full opacity
- [ ] CTA buttons: uppercase, wide tracking, Josefin Sans
- [ ] Footer: Merriweather, thin
- [ ] Nav/topbar: UNCHANGED from current state

**Step 3: Final commit (if any tweaks needed)**

```bash
git add -A
git commit -m "style(web): fine-tune typography after visual review"
```
