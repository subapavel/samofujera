---
name: api-client-endpoint
description: "Add a typed API endpoint to the shared packages/api-client/ package. Creates TypeScript types mirroring backend DTOs and fetch wrapper."
argument-hint: "[resource-name]"
disable-model-invocation: true
---

# Add Typed API Client Endpoint

## MANDATORY: Check Context7 First
Use Context7 to verify the fetch API patterns and TypeScript best practices.

## Steps

1. **Add TypeScript types** mirroring the backend DTOs:
   File: `packages/api-client/src/types.ts`
   ```typescript
   export interface $ARGUMENTSRecord {
     id: string;
     // Fields matching the backend Java record
   }

   export interface Create$ARGUMENTSRequest {
     // Fields for creation
   }
   ```

2. **Create endpoint module:**
   File: `packages/api-client/src/endpoints/$ARGUMENTS.ts`
   ```typescript
   import { client } from "../client";
   import type { $ARGUMENTSRecord, Create$ARGUMENTSRequest } from "../types";
   import type { ApiResponse, PagedResponse } from "../types";

   export const $ARGUMENTS = {
     list: (params?: { page?: number; size?: number }) =>
       client.get<PagedResponse<$ARGUMENTSRecord>>(`/api/${resource}`, { params }),

     getById: (id: string) =>
       client.get<ApiResponse<$ARGUMENTSRecord>>(`/api/${resource}/${id}`),

     getBySlug: (slug: string) =>
       client.get<ApiResponse<$ARGUMENTSRecord>>(`/api/${resource}/${slug}`),

     create: (data: Create$ARGUMENTSRequest) =>
       client.post<ApiResponse<$ARGUMENTSRecord>>(`/api/admin/${resource}`, data),

     update: (id: string, data: Partial<Create$ARGUMENTSRequest>) =>
       client.put<ApiResponse<$ARGUMENTSRecord>>(`/api/admin/${resource}/${id}`, data),

     delete: (id: string) =>
       client.delete<void>(`/api/admin/${resource}/${id}`),
   };
   ```

3. **Register in the main client:**
   File: `packages/api-client/src/client.ts`
   - Import and add to the API object

4. **Export from barrel:**
   `packages/api-client/src/index.ts`

## Shared Client
The `client` is a thin fetch wrapper that:
- Automatically includes the session cookie
- Sets `Content-Type: application/json`
- Handles error responses consistently
- Returns typed responses

## API Response Types
```typescript
export interface ApiResponse<T> {
  data: T;
  message: string | null;
}

export interface PagedResponse<T> {
  data: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

## Rules
- Types MUST mirror backend Java records exactly
- Use strict TypeScript — no `any`
- All endpoints return typed `ApiResponse<T>` or `PagedResponse<T>`
- Admin endpoints use `/api/admin/` prefix
- Public endpoints use `/api/` prefix
