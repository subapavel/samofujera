---
name: react-component
description: "Create a React 19 component following project patterns: functional, strict TypeScript, shadcn/ui primitives, Lingui i18n, Tailwind 4."
argument-hint: "[component-name] [location]"
disable-model-invocation: true
---

# Create React Component

## MANDATORY: Check Context7 First
Use Context7 to verify React 19 API patterns and any shadcn/ui component
APIs you plan to use.

## Arguments
- `$0`: Component name (PascalCase, e.g., `ProductCard`)
- `$1`: Location — `ui` (shared), `admin`, `customer`, or `web`

## Steps

1. Determine file path:
   - `ui` → `packages/ui/src/components/$0.tsx`
   - `admin` → `apps/admin/src/components/$0.tsx`
   - `customer` → `apps/customer/src/components/$0.tsx`
   - `web` → `apps/web/src/components/$0.tsx`

2. Write the component with:
   - TypeScript interface for props
   - Lingui i18n for all user-facing strings
   - Tailwind 4 classes for styling
   - shadcn/ui primitives where applicable

3. Write a Vitest test:
   - Test rendering with required props
   - Test user interactions (if interactive)
   - Test i18n string presence

4. Run tests, verify pass

## Component Template
```tsx
import { t } from "@lingui/core/macro";
import { cn } from "@samofujera/ui/lib/utils";

interface $0Props {
  className?: string;
  // Add props
}

export function $0({ className, ...props }: $0Props) {
  return (
    <div className={cn("", className)}>
      {/* Component content */}
    </div>
  );
}
```

## Test Template
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { $0 } from "./$0";

describe("$0", () => {
  it("renders correctly", () => {
    render(<$0 /* required props */ />);
    // assertions
  });
});
```

## Rules
- Named export only (no default exports)
- Props interface (not inline type)
- `cn()` utility for className merging
- All user-facing text through Lingui
- No `any`, no `// @ts-ignore`
- One component per file
- Colocate test file: `$0.test.tsx` next to `$0.tsx`
