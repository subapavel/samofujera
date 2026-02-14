---
name: tanstack-query-hook
description: "Create a TanStack Query hook with useQuery for fetching, useMutation for writes, optimistic updates, and cache invalidation."
argument-hint: "[entity-name]"
disable-model-invocation: true
---

# Create TanStack Query Hook

## MANDATORY: Check Context7 First
Use Context7 to verify the current TanStack Query v5 API — useQuery,
useMutation, queryOptions, and optimistic update patterns.

## Steps

1. Create hook file: `apps/{admin|customer}/src/lib/queries/use$ARGUMENTS.ts`
2. Define query options factory (for reuse in loaders)
3. Create `useQuery` hook for reading
4. Create `useMutation` hook for writes (if needed)
5. Add optimistic updates for mutations (if applicable)
6. Write tests with MSW (Mock Service Worker) for API mocking

## Query Hook Template
```typescript
import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { ${Entity}Record } from "@samofujera/api-client";

// Query options factory (reusable in route loaders)
export const ${entity}ListQueryOptions = () =>
  queryOptions({
    queryKey: ["${entity}s"],
    queryFn: () => api.${entity}s.list(),
  });

export const ${entity}DetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["${entity}s", id],
    queryFn: () => api.${entity}s.getById(id),
  });

// Read hook
export function use${Entity}s() {
  return useQuery(${entity}ListQueryOptions());
}

export function use${Entity}(id: string) {
  return useQuery(${entity}DetailQueryOptions(id));
}

// Write hook with optimistic update
export function useCreate${Entity}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create${Entity}Request) => api.${entity}s.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entity}s"] });
    },
  });
}

export function useUpdate${Entity}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update${Entity}Request }) =>
      api.${entity}s.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["${entity}s", id] });
      const previous = queryClient.getQueryData(["${entity}s", id]);
      queryClient.setQueryData(["${entity}s", id], (old: ${Entity}Record) => ({
        ...old,
        ...data,
      }));
      return { previous };
    },
    onError: (_err, { id }, context) => {
      queryClient.setQueryData(["${entity}s", id], context?.previous);
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["${entity}s", id] });
    },
  });
}
```

## Rules
- Always export `queryOptions` factories for route loader reuse
- Query keys: `["entity", id?]` convention
- Invalidate related queries after mutations
- Use optimistic updates for edits where UX benefits (admin forms, toggles)
- Never use `useState` for server-derived data — always TanStack Query
