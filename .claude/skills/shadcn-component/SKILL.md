---
name: shadcn-component
description: "Customize or extend a shadcn/ui component for the project's brand theme. Uses Tailwind 4 @theme and OKLCH colors."
argument-hint: "[component-name]"
disable-model-invocation: true
---

# Customize shadcn/ui Component

## MANDATORY: Check Context7 First
Use Context7 to verify the current shadcn/ui component API and Tailwind 4
theming approach (OKLCH colors, CSS variables).

## Steps

1. **Add the base component** (if not already added):
   ```bash
   cd packages/ui && pnpm dlx shadcn@latest add $ARGUMENTS
   ```

2. **Review the generated component** in `packages/ui/src/components/`

3. **Customize for brand:**
   - Replace default colors with brand theme tokens
   - Adjust border-radius to 0.5rem (project standard)
   - Use warm tones (earth, sage, cream, stone) instead of defaults
   - Ensure OKLCH color variables are used

4. **Export from package barrel:**
   Add export to `packages/ui/src/index.ts`

5. **Test in Storybook or visual check**

## Brand Theme Tokens (reference)
```css
@theme {
  --color-earth: oklch(...);        /* Primary warm brown */
  --color-sage: oklch(...);         /* CTA green */
  --color-cream: oklch(...);        /* Light background */
  --color-stone: oklch(...);        /* Borders */
  --color-text: oklch(...);         /* Main text warm dark */
  --radius: 0.5rem;                 /* Standard radius */
}
```

## Customization Pattern
Modify CSS variables in the component, not hardcoded values:
```tsx
// Use theme-aware classes
<Button className="bg-earth text-warm-white hover:bg-earth-dark">
```

## Rules
- Always install via shadcn CLI first, then customize
- Never hardcode colors — use theme tokens
- Keep customizations minimal — brand alignment only
- Export all shared components from `packages/ui/src/index.ts`
- Verify the component renders correctly with the project theme
