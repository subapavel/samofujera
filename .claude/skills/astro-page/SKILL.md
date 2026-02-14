---
name: astro-page
description: "Create an Astro page with the correct layout, Lingui i18n, SEO metadata, and optional React island hydration."
argument-hint: "[page-path] [layout-type]"
disable-model-invocation: true
---

# Create Astro Page

## MANDATORY: Check Context7 First
Use Context7 to verify the current Astro framework API — page syntax, layout
patterns, island hydration directives, and SSR configuration.

## Arguments
- `$0`: Page path relative to `apps/web/src/pages/` (e.g., `katalog/index`)
- `$1`: Layout type — `marketing`, `article`, or `base`

## Steps

1. Determine the correct layout component:
   - `marketing` → `MarketingLayout.astro` (homepage, about, contact)
   - `article` → `ArticleLayout.astro` (blog posts, articles)
   - `base` → `BaseLayout.astro` (minimal, for SPA shells)

2. Create the `.astro` file in `apps/web/src/pages/$0.astro`

3. Include:
   - Layout wrapper with SEO props (title, description, og:image)
   - Lingui i18n setup for the page
   - Any React islands with appropriate hydration directives

4. Write a basic test or visual verification step

## Page Template
```astro
---
import { MarketingLayout } from "../layouts/MarketingLayout.astro";
// import ReactComponent from "../components/ReactComponent";

const title = "Page Title";
const description = "Page description for SEO";
---

<MarketingLayout {title} {description}>
  <section class="mx-auto max-w-4xl px-4 py-16">
    <h1 class="text-display text-text">{title}</h1>
    <!-- Page content -->
  </section>

  <!-- React island (only if interactive) -->
  <!-- <ReactComponent client:visible /> -->
</MarketingLayout>
```

## Hydration Directives
- `client:load` — Hydrate on page load (use sparingly)
- `client:visible` — Hydrate when scrolled into view (preferred)
- `client:idle` — Hydrate when browser is idle
- `client:only="react"` — Skip SSR, client-only rendering

## i18n
All user-facing text must go through Lingui. For Astro pages, import and use
the translation functions.

## SEO Checklist
- [ ] Title tag (unique, descriptive, <60 chars)
- [ ] Meta description (<160 chars)
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] Canonical URL
- [ ] Language tag (cs/sk)
