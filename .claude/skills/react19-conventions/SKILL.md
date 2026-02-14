---
name: react19-conventions
description: "React 19 patterns, hooks rules, and strict TypeScript conventions. Use when writing React components, hooks, or any frontend interactive code."
user-invocable: false
---

# React 19 Conventions

## MANDATORY: Check Context7 First
Before using ANY React 19 API, use the Context7 MCP tool to verify the current
React 19 documentation. React 19 introduced breaking changes and new patterns.

## Component Rules
- Functional components ONLY — no class components
- Strict TypeScript — no `any`, no `// @ts-ignore`, no `as` casts without justification
- Props defined as TypeScript interfaces (not inline types for non-trivial components)
- Named exports only (no default exports)
- One component per file (except small helper components)

## React 19 Features to Use
- `use()` hook for reading promises and context (verify with Context7)
- React Actions for form handling and mutations
- Automatic batching of state updates
- Ref as prop (no forwardRef needed in React 19)

## Project Patterns
- **Server state**: TanStack Query (useQuery, useMutation) — never useState for API data
- **Routing**: TanStack Router (file-based routes in admin/customer SPAs)
- **UI components**: shadcn/ui from `packages/ui/`
- **i18n**: Every user-facing string through Lingui `t()` or `<Trans>`
- **Styling**: Tailwind CSS 4 utility classes

## Component Template
```tsx
import { t } from "@lingui/core/macro";
import { Button } from "@samofujera/ui";

interface ProductCardProps {
  title: string;
  price: number;
  currency: string;
  onBuy: () => void;
}

export function ProductCard({ title, price, currency, onBuy }: ProductCardProps) {
  return (
    <div className="rounded-lg border border-stone bg-warm-white p-6">
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="text-earth">{formatPrice(price, currency)}</p>
      <Button onClick={onBuy}>{t`Buy now`}</Button>
    </div>
  );
}
```

## Rules
- Never use `any` — find the correct type or use `unknown` with type guards
- Never suppress TypeScript errors — fix the underlying issue
- Always destructure props in function signature
- Always handle loading and error states (TanStack Query provides these)
