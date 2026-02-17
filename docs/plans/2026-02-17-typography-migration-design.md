# Typography Migration Design

**Date:** 2026-02-17
**Goal:** Match samofujera.cz typography 1:1 for public-facing pages.

## Scope

**In scope:** Tailwind theme, Google Fonts, content typography (headings, body,
quotes, footer) on public pages (PublicLayout).

**Out of scope:** Topbar, main navigation, dropdown, mobile menu (already
migrated). Admin and customer dashboard (stay on Inter / Playfair for now).

## Font Stack

| Tailwind token    | Font           | Weights         | Role                          |
|-------------------|----------------|-----------------|-------------------------------|
| `--font-heading`  | Josefin Sans   | 300, 400, 600   | H1, H2, navigation            |
| `--font-body`     | Merriweather   | 200, 300, 400, 500 | Paragraphs, quotes, footer  |
| `--font-ui`       | Open Sans      | 400, 500, 600   | H3 (UI context), topbar, buttons |

## Typography Scale

### Headings (Josefin Sans)

| Element | Size           | Weight | Line-height | Letter-spacing | Notes                              |
|---------|----------------|--------|-------------|----------------|------------------------------------|
| H1      | 55px (3.44rem) | 300    | 1.2         | -0.015em       | `<strong>` inside: weight 600, brand green |
| H2      | 45px (2.81rem) | 300    | 1.35        | -0.015em       | May have 90-110% scale variants    |
| H3      | 18px (1.125rem)| 600    | 1.55        | normal         | Open Sans (UI context)             |

### Body Text (Merriweather)

| Element       | Size              | Weight | Line-height | Notes                        |
|---------------|-------------------|--------|-------------|------------------------------|
| Paragraph     | 17.2px (~1.075rem)| 200    | 1.8         | Color: rgba(0,0,0,0.6)      |
| Lead text     | 18.9px (~1.18rem) | 200    | 1.8         | Full opacity                 |
| Blockquote    | 22px (1.375rem)   | 300    | 1.5         | `<em>` = italic              |
| Small quote   | 17.6px (1.1rem)   | 300    | 1.5         | Italic, inside blockquote    |
| Footer text   | 14px (0.875rem)   | 200    | 1.6         |                              |

### Inline Elements

| Element            | Font         | Weight | Style           |
|--------------------|--------------|--------|-----------------|
| strong in heading  | Josefin Sans | 600    | brand green     |
| strong in body     | Merriweather | 500    | ~20.8px         |
| em in body         | Merriweather | 200    | italic          |
| link in body       | Merriweather | 500    | italic, underline |

## Changes Required

1. **`packages/config/tailwind.css`** — add `--font-body` and `--font-ui` tokens
   to `@theme` block, update `--font-heading` from Playfair Display to Josefin Sans.

2. **`apps/web/src/layouts/PublicLayout.astro`** — update Google Fonts URL to
   load Merriweather (200, 300, 400, 500) and Open Sans (400, 500, 600).

3. **`apps/web/src/styles/global.css`** — add typography utility classes for
   public content (headings, body, blockquotes, lead text).

4. **Content pages** — apply typography classes to homepage, catalog, and other
   public pages.

## What We Do NOT Change

- Topbar, main navigation, dropdown, mobile menu (already migrated 1:1)
- Admin panel typography (stays Inter / current setup)
- Customer dashboard typography (stays Inter / current setup)
- BaseLayout font loading (Inter + Playfair for non-public layouts)
