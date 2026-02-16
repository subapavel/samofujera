---
name: tailwind4-conventions
description: "Tailwind CSS 4 configuration patterns and conventions. Use when writing any CSS, styling, or theme configuration. Activates on Tailwind classes, @theme directives, or design token work."
user-invocable: false
---

# Tailwind CSS 4 Conventions

## MANDATORY: Check Context7 First
Before writing ANY Tailwind 4 configuration or using Tailwind features, use the
Context7 MCP tool to look up the current Tailwind CSS 4 documentation. Never assume
syntax — Tailwind 4 differs significantly from Tailwind 3.

## Key Differences from Tailwind 3

### Configuration is CSS-based, NOT JavaScript
- There is NO `tailwind.config.js` in Tailwind 4
- All configuration happens in CSS using `@theme` directive
- Import Tailwind with `@import "tailwindcss"` in your main CSS file

### Theme Customization
```css
@import "tailwindcss";

@theme {
  --color-earth: oklch(0.55 0.08 60);
  --color-earth-light: oklch(0.65 0.07 60);
  --color-earth-dark: oklch(0.45 0.08 60);
  --color-cream: oklch(0.97 0.01 80);
  --color-sage: oklch(0.65 0.08 145);
  --color-sage-light: oklch(0.75 0.06 145);
  --color-stone: oklch(0.91 0.02 70);
  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Lora", Georgia, serif;
}
```

### Color Space
- Use OKLCH color space (not HSL) — this is the shadcn/ui v4 standard
- Brand colors from `architektura.md` must be converted to OKLCH

## Project Theme
The brand design is: calm, meditative, personal, authentic.
- Warm earth tones, lots of white space
- Clean readable typography (Inter for UI, Lora for articles/quotes)
- Rounded corners (0.5rem radius), soft shadows
- See `architektura.md` section 2 for full brand identity

## Gotchas

### Hover with arbitrary RGB values doesn't work reliably
`hover:text-[rgb(230,188,145)]` and `hover:!text-[rgb(230,188,145)]` may silently
fail in Tailwind 4 — the hover state never applies. This affects arbitrary color
values with `rgb()`, `rgba()`, and possibly `oklch()` in hover/focus variants.

**Workaround:** Use plain CSS classes in `global.css` instead:
```css
.my-link {
  color: rgba(255, 255, 255, 0.8);
}
.my-link:hover {
  color: rgb(230, 188, 145);
}
```
This is more reliable than fighting Tailwind's arbitrary value specificity.

## Rules
- Always use the shared theme preset from `packages/config/tailwind/`
- Never hardcode color values — use theme tokens (`bg-earth`, `text-sage`)
- When hover/focus with arbitrary color values fails, fall back to plain CSS classes
- Verify all Tailwind 4 syntax against Context7 before writing
