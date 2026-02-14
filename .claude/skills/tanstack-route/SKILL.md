---
name: tanstack-route
description: "Create a TanStack Router file-based route with type-safe params, data loader, and code splitting."
argument-hint: "[app] [route-path]"
disable-model-invocation: true
---

# Create TanStack Router Route

## MANDATORY: Check Context7 First
Use Context7 to verify the current TanStack Router API — file-based routing
conventions, loader patterns, and search params validation.

## Arguments
- `$0`: App name — `admin` or `customer`
- `$1`: Route path (e.g., `produkty/$id`, `objednavky/index`)

## Steps

1. Determine the file location: `apps/$0/src/routes/$1.tsx`
2. Create the route file following TanStack Router file-based naming:
   - `index.tsx` — index route
   - `$id.tsx` — dynamic param
   - `__root.tsx` — root layout
   - `_layout.tsx` — pathless layout
3. Add data loader with TanStack Query integration
4. Add the route component
5. If the route has a `.lazy.tsx` split, create both files

## Route Template (with loader)
```tsx
import { createFileRoute } from "@tanstack/react-router";
import { queryClient } from "../lib/query-client";
import { ${entity}QueryOptions } from "../lib/queries/use${Entity}";

export const Route = createFileRoute("/${path}")({
  loader: () => queryClient.ensureQueryData(${entity}QueryOptions()),
  component: ${Component}Page,
});

function ${Component}Page() {
  const data = Route.useLoaderData();

  return (
    <div>
      {/* Page content using loaded data */}
    </div>
  );
}
```

## Route with Dynamic Params
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/${path}/$id")({
  loader: ({ params }) =>
    queryClient.ensureQueryData(${entity}QueryOptions(params.id)),
  component: ${Component}DetailPage,
});

function ${Component}DetailPage() {
  const { id } = Route.useParams();
  const data = Route.useLoaderData();
  // ...
}
```

## Rules
- Always use file-based routing (TanStack Router convention)
- Always integrate with TanStack Query for data loading
- Use `queryClient.ensureQueryData()` in loaders for SSR-safe data fetching
- Code-split large route components with `.lazy.tsx`
- Type-safe params — never use `as` casts on route params
