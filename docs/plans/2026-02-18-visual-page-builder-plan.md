# Visual Page Builder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a visual inline WYSIWYG page builder using Lexical, allowing the admin to create/edit pages that render at `/pages/{slug}`.

**Architecture:** New `page` Spring Modulith module stores Lexical editor JSON in PostgreSQL JSONB. Frontend uses Lexical (Meta) for inline WYSIWYG editing in a fullscreen admin editor. Public pages render Lexical JSON to React components with identical styling.

**Tech Stack:** Java 25, Spring Boot 4, JOOQ, Flyway, Lexical (Meta), React 19, Next.js 16, TanStack Query, Tailwind CSS 4, shadcn/ui

**Design doc:** `docs/plans/2026-02-18-visual-page-builder-design.md`

---

## Task 1: Database Migration

Create the `pages` table.

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V20__pages.sql`

**Step 1: Write migration**

```sql
CREATE TABLE pages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(255) NOT NULL UNIQUE,
    title            VARCHAR(500) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    page_type        VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
    content          JSONB NOT NULL DEFAULT '{}',
    meta_title       VARCHAR(200),
    meta_description VARCHAR(500),
    og_image_id      UUID REFERENCES media_items(id) ON DELETE SET NULL,
    sort_order       INT NOT NULL DEFAULT 0,
    show_in_nav      BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at     TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_page_type ON pages(page_type);
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && ./mvnw compile -pl . -Djooq.skip=false`

Verify: `apps/backend/target/generated-sources/jooq/cz/samofujera/generated/jooq/tables/Pages.java` exists.

**Step 3: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V20__pages.sql
git commit -m "feat(backend): add pages table migration"
```

---

## Task 2: Backend Page Module — Repository

Create the `page` module with JOOQ repository.

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/page/internal/package-info.java`
- Create: `apps/backend/src/main/java/cz/samofujera/page/internal/PageRepository.java`

**Step 1: Create internal package marker**

```java
@org.springframework.modulith.ApplicationModule
package cz.samofujera.page.internal;
```

**Step 2: Create PageRepository**

Follow the pattern from `ProductRepository` — inner `PageRow` record, JOOQ queries with explicit column selection, `DSLContext` injection.

```java
package cz.samofujera.page.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PAGES;

@Repository
class PageRepository {

    private final DSLContext dsl;

    PageRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record PageRow(
        UUID id, String slug, String title, String status, String pageType,
        JSONB content, String metaTitle, String metaDescription,
        UUID ogImageId, int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt,
        OffsetDateTime publishedAt, UUID createdBy
    ) {}

    public record PageListRow(
        UUID id, String slug, String title, String status, String pageType,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt
    ) {}

    public Optional<PageRow> findById(UUID id) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY)
            .from(PAGES)
            .where(PAGES.ID.eq(id))
            .fetchOptional(r -> new PageRow(
                r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
                r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
                r.get(PAGES.CONTENT), r.get(PAGES.META_TITLE), r.get(PAGES.META_DESCRIPTION),
                r.get(PAGES.OG_IMAGE_ID), r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
                r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT),
                r.get(PAGES.PUBLISHED_AT), r.get(PAGES.CREATED_BY)
            ));
    }

    public Optional<PageRow> findBySlug(String slug) {
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.CONTENT, PAGES.META_TITLE, PAGES.META_DESCRIPTION,
                PAGES.OG_IMAGE_ID, PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT, PAGES.CREATED_BY)
            .from(PAGES)
            .where(PAGES.SLUG.eq(slug))
            .fetchOptional(r -> new PageRow(
                r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
                r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
                r.get(PAGES.CONTENT), r.get(PAGES.META_TITLE), r.get(PAGES.META_DESCRIPTION),
                r.get(PAGES.OG_IMAGE_ID), r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
                r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT),
                r.get(PAGES.PUBLISHED_AT), r.get(PAGES.CREATED_BY)
            ));
    }

    public List<PageListRow> findAll(String status, String type, String search, int page, int limit) {
        var condition = buildCondition(status, type, search);
        return dsl.select(
                PAGES.ID, PAGES.SLUG, PAGES.TITLE, PAGES.STATUS, PAGES.PAGE_TYPE,
                PAGES.SORT_ORDER, PAGES.SHOW_IN_NAV,
                PAGES.CREATED_AT, PAGES.UPDATED_AT, PAGES.PUBLISHED_AT)
            .from(PAGES)
            .where(condition)
            .orderBy(PAGES.UPDATED_AT.desc())
            .limit(limit)
            .offset((page - 1) * limit)
            .fetch(r -> new PageListRow(
                r.get(PAGES.ID), r.get(PAGES.SLUG), r.get(PAGES.TITLE),
                r.get(PAGES.STATUS), r.get(PAGES.PAGE_TYPE),
                r.get(PAGES.SORT_ORDER), r.get(PAGES.SHOW_IN_NAV),
                r.get(PAGES.CREATED_AT), r.get(PAGES.UPDATED_AT), r.get(PAGES.PUBLISHED_AT)
            ));
    }

    public int count(String status, String type, String search) {
        var condition = buildCondition(status, type, search);
        return dsl.selectCount().from(PAGES).where(condition).fetchOne(0, int.class);
    }

    public UUID create(String slug, String title, String pageType, JSONB content,
                       String metaTitle, String metaDescription, UUID ogImageId, UUID createdBy) {
        return dsl.insertInto(PAGES)
            .set(PAGES.SLUG, slug)
            .set(PAGES.TITLE, title)
            .set(PAGES.PAGE_TYPE, pageType)
            .set(PAGES.CONTENT, content)
            .set(PAGES.META_TITLE, metaTitle)
            .set(PAGES.META_DESCRIPTION, metaDescription)
            .set(PAGES.OG_IMAGE_ID, ogImageId)
            .set(PAGES.CREATED_BY, createdBy)
            .returning(PAGES.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String slug, String title, JSONB content,
                       String metaTitle, String metaDescription, UUID ogImageId) {
        dsl.update(PAGES)
            .set(PAGES.SLUG, slug)
            .set(PAGES.TITLE, title)
            .set(PAGES.CONTENT, content)
            .set(PAGES.META_TITLE, metaTitle)
            .set(PAGES.META_DESCRIPTION, metaDescription)
            .set(PAGES.OG_IMAGE_ID, ogImageId)
            .set(PAGES.UPDATED_AT, OffsetDateTime.now())
            .where(PAGES.ID.eq(id))
            .execute();
    }

    public void updateStatus(UUID id, String status) {
        var update = dsl.update(PAGES)
            .set(PAGES.STATUS, status)
            .set(PAGES.UPDATED_AT, OffsetDateTime.now());
        if ("PUBLISHED".equals(status)) {
            update = update.set(PAGES.PUBLISHED_AT, OffsetDateTime.now());
        }
        update.where(PAGES.ID.eq(id)).execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PAGES).where(PAGES.ID.eq(id)).execute();
    }

    private Condition buildCondition(String status, String type, String search) {
        Condition condition = DSL.trueCondition();
        if (status != null && !status.isBlank()) {
            condition = condition.and(PAGES.STATUS.eq(status));
        }
        if (type != null && !type.isBlank()) {
            condition = condition.and(PAGES.PAGE_TYPE.eq(type));
        }
        if (search != null && !search.isBlank()) {
            condition = condition.and(
                PAGES.TITLE.containsIgnoreCase(search)
                    .or(PAGES.SLUG.containsIgnoreCase(search))
            );
        }
        return condition;
    }
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/page/
git commit -m "feat(backend): add page repository with jooq queries"
```

---

## Task 3: Backend Page Module — DTOs, Service, Controllers

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/page/PageDtos.java`
- Create: `apps/backend/src/main/java/cz/samofujera/page/PageService.java`
- Create: `apps/backend/src/main/java/cz/samofujera/page/internal/PageAdminController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/page/internal/PagePublicController.java`

**Step 1: Create PageDtos**

```java
package cz.samofujera.page;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class PageDtos {
    private PageDtos() {}

    public record PageResponse(
        UUID id, String slug, String title, String status, String pageType,
        String metaTitle, String metaDescription, UUID ogImageId,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt
    ) {}

    public record PageDetailResponse(
        UUID id, String slug, String title, String status, String pageType,
        Object content, String metaTitle, String metaDescription, UUID ogImageId,
        int sortOrder, boolean showInNav,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, OffsetDateTime publishedAt
    ) {}

    public record PageListResponse(
        java.util.List<PageResponse> items,
        int page, int limit, int totalItems, int totalPages
    ) {}

    public record CreatePageRequest(
        @NotBlank @Size(max = 255) String slug,
        @NotBlank @Size(max = 500) String title,
        String pageType
    ) {}

    public record UpdatePageRequest(
        @NotBlank @Size(max = 255) String slug,
        @NotBlank @Size(max = 500) String title,
        Object content,
        @Size(max = 200) String metaTitle,
        @Size(max = 500) String metaDescription,
        UUID ogImageId
    ) {}

    public record PublicPageResponse(
        String slug, String title, Object content,
        String metaTitle, String metaDescription
    ) {}
}
```

Note: `content` is typed as `Object` in DTOs because Jackson serializes JSONB as a raw JSON tree. The frontend sends/receives it as a plain JS object (the Lexical editor state).

**Step 2: Create PageService**

```java
package cz.samofujera.page;

import cz.samofujera.page.internal.PageRepository;
import cz.samofujera.shared.exception.NotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jooq.JSONB;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PageService {

    private final PageRepository pageRepository;
    private final ObjectMapper objectMapper;

    PageService(PageRepository pageRepository, ObjectMapper objectMapper) {
        this.pageRepository = pageRepository;
        this.objectMapper = objectMapper;
    }

    public PageDtos.PageListResponse getPages(String status, String type, String search, int page, int limit) {
        var items = pageRepository.findAll(status, type, search, page, limit);
        int total = pageRepository.count(status, type, search);
        var responses = items.stream().map(this::toPageResponse).toList();
        return new PageDtos.PageListResponse(responses, page, limit, total, (int) Math.ceil((double) total / limit));
    }

    public PageDtos.PageDetailResponse getPageById(UUID id) {
        var row = pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        return toDetailResponse(row);
    }

    public PageDtos.PublicPageResponse getPublishedPageBySlug(String slug) {
        var row = pageRepository.findBySlug(slug)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        if (!"PUBLISHED".equals(row.status())) {
            throw new NotFoundException("Page not found");
        }
        return new PageDtos.PublicPageResponse(
            row.slug(), row.title(), parseContent(row.content()),
            row.metaTitle(), row.metaDescription()
        );
    }

    @Transactional
    public PageDtos.PageDetailResponse createPage(PageDtos.CreatePageRequest request, UUID createdBy) {
        var pageType = request.pageType() != null ? request.pageType() : "CUSTOM";
        var id = pageRepository.create(
            request.slug(), request.title(), pageType,
            JSONB.valueOf("{}"), null, null, null, createdBy
        );
        return getPageById(id);
    }

    @Transactional
    public PageDtos.PageDetailResponse updatePage(UUID id, PageDtos.UpdatePageRequest request) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        var contentJsonb = request.content() != null
            ? JSONB.valueOf(toJsonString(request.content()))
            : JSONB.valueOf("{}");
        pageRepository.update(id, request.slug(), request.title(), contentJsonb,
            request.metaTitle(), request.metaDescription(), request.ogImageId());
        return getPageById(id);
    }

    @Transactional
    public void publishPage(UUID id) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        pageRepository.updateStatus(id, "PUBLISHED");
    }

    @Transactional
    public void unpublishPage(UUID id) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        pageRepository.updateStatus(id, "DRAFT");
    }

    @Transactional
    public void deletePage(UUID id) {
        var page = pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        if ("SYSTEM".equals(page.pageType())) {
            throw new IllegalArgumentException("System pages cannot be deleted");
        }
        pageRepository.delete(id);
    }

    private PageDtos.PageResponse toPageResponse(PageRepository.PageListRow row) {
        return new PageDtos.PageResponse(
            row.id(), row.slug(), row.title(), row.status(), row.pageType(),
            null, null, null, row.sortOrder(), row.showInNav(),
            row.createdAt(), row.updatedAt(), row.publishedAt()
        );
    }

    private PageDtos.PageDetailResponse toDetailResponse(PageRepository.PageRow row) {
        return new PageDtos.PageDetailResponse(
            row.id(), row.slug(), row.title(), row.status(), row.pageType(),
            parseContent(row.content()), row.metaTitle(), row.metaDescription(),
            row.ogImageId(), row.sortOrder(), row.showInNav(),
            row.createdAt(), row.updatedAt(), row.publishedAt()
        );
    }

    private Object parseContent(JSONB jsonb) {
        if (jsonb == null || jsonb.data() == null) return null;
        try {
            return objectMapper.readTree(jsonb.data());
        } catch (Exception e) {
            return null;
        }
    }

    private String toJsonString(Object content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid content JSON");
        }
    }
}
```

**Step 3: Create PageAdminController**

```java
package cz.samofujera.page.internal;

import cz.samofujera.page.PageDtos;
import cz.samofujera.page.PageService;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/pages")
class PageAdminController {

    private final PageService pageService;

    PageAdminController(PageService pageService) {
        this.pageService = pageService;
    }

    @GetMapping
    ResponseEntity<ApiResponse<PageDtos.PageListResponse>> getPages(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        var result = pageService.getPages(status, type, search, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    ResponseEntity<ApiResponse<PageDtos.PageDetailResponse>> getPage(@PathVariable UUID id) {
        var detail = pageService.getPageById(id);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping
    ResponseEntity<ApiResponse<PageDtos.PageDetailResponse>> createPage(
            @Valid @RequestBody PageDtos.CreatePageRequest request) {
        // TODO: extract user ID from security context when needed
        var page = pageService.createPage(request, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(page));
    }

    @PutMapping("/{id}")
    ResponseEntity<ApiResponse<PageDtos.PageDetailResponse>> updatePage(
            @PathVariable UUID id,
            @Valid @RequestBody PageDtos.UpdatePageRequest request) {
        var page = pageService.updatePage(id, request);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }

    @PutMapping("/{id}/publish")
    ResponseEntity<Void> publishPage(@PathVariable UUID id) {
        pageService.publishPage(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/unpublish")
    ResponseEntity<Void> unpublishPage(@PathVariable UUID id) {
        pageService.unpublishPage(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> deletePage(@PathVariable UUID id) {
        pageService.deletePage(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Step 4: Create PagePublicController**

```java
package cz.samofujera.page.internal;

import cz.samofujera.page.PageDtos;
import cz.samofujera.page.PageService;
import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pages")
class PagePublicController {

    private final PageService pageService;

    PagePublicController(PageService pageService) {
        this.pageService = pageService;
    }

    @GetMapping("/{slug}")
    ResponseEntity<ApiResponse<PageDtos.PublicPageResponse>> getPage(@PathVariable String slug) {
        var page = pageService.getPublishedPageBySlug(slug);
        return ResponseEntity.ok(ApiResponse.ok(page));
    }
}
```

**Step 5: Add `/api/pages/**` to security config as permitAll**

Modify: `apps/backend/src/main/java/cz/samofujera/auth/internal/SecurityConfig.java`

Add `.requestMatchers("/api/pages/**").permitAll()` after the existing `.requestMatchers("/api/catalog/**").permitAll()` line.

**Step 6: Run backend and test manually**

```bash
cd apps/backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Test with curl:
```bash
# Create a page
curl -s -X POST http://localhost:8080/api/admin/pages \
  -H "Content-Type: application/json" \
  -H "Cookie: SESSION=<session>" \
  -d '{"slug":"test-page","title":"Test Page"}'

# Get pages list
curl -s http://localhost:8080/api/admin/pages -H "Cookie: SESSION=<session>"
```

**Step 7: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/page/
git add apps/backend/src/main/java/cz/samofujera/auth/internal/SecurityConfig.java
git commit -m "feat(backend): add page module with crud api"
```

---

## Task 4: API Client — Page Endpoints

Add page-related API functions and types to the shared api-client package.

**Files:**
- Create: `packages/api-client/src/pages.ts`
- Modify: `packages/api-client/src/types.ts` — add page types
- Modify: `packages/api-client/src/index.ts` — add export

**Step 1: Add types to `types.ts`**

```typescript
// Page types
export interface PageResponse {
  id: string;
  slug: string;
  title: string;
  status: string;
  pageType: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageId: string | null;
  sortOrder: number;
  showInNav: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PageDetailResponse extends PageResponse {
  content: Record<string, unknown> | null;
}

export interface PageListResponse {
  items: PageResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CreatePageRequest {
  slug: string;
  title: string;
  pageType?: string;
}

export interface UpdatePageRequest {
  slug: string;
  title: string;
  content: Record<string, unknown> | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageId?: string | null;
}

export interface PublicPageResponse {
  slug: string;
  title: string;
  content: Record<string, unknown> | null;
  metaTitle: string | null;
  metaDescription: string | null;
}
```

**Step 2: Create `pages.ts`**

```typescript
import { apiFetch } from "./client";
import type {
  ApiResponse,
  PageListResponse,
  PageDetailResponse,
  CreatePageRequest,
  UpdatePageRequest,
  PublicPageResponse,
} from "./types";

export const pageAdminApi = {
  getPages: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set("page", String(params.page));
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.status) sp.set("status", params.status);
    if (params?.type) sp.set("type", params.type);
    if (params?.search) sp.set("search", params.search);
    const qs = sp.toString();
    return apiFetch<ApiResponse<PageListResponse>>(
      `/api/admin/pages${qs ? `?${qs}` : ""}`,
    );
  },

  getPage: (id: string) =>
    apiFetch<ApiResponse<PageDetailResponse>>(`/api/admin/pages/${id}`),

  createPage: (data: CreatePageRequest) =>
    apiFetch<ApiResponse<PageDetailResponse>>("/api/admin/pages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePage: (id: string, data: UpdatePageRequest) =>
    apiFetch<ApiResponse<PageDetailResponse>>(`/api/admin/pages/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  publishPage: (id: string) =>
    apiFetch<void>(`/api/admin/pages/${id}/publish`, { method: "PUT" }),

  unpublishPage: (id: string) =>
    apiFetch<void>(`/api/admin/pages/${id}/unpublish`, { method: "PUT" }),

  deletePage: (id: string) =>
    apiFetch<void>(`/api/admin/pages/${id}`, { method: "DELETE" }),
};

export const pagePublicApi = {
  getPage: (slug: string) =>
    apiFetch<ApiResponse<PublicPageResponse>>(`/api/pages/${slug}`),
};
```

**Step 3: Add export to `index.ts`**

```typescript
export { pageAdminApi, pagePublicApi } from "./pages";
```

**Step 4: Run typecheck**

```bash
pnpm turbo typecheck --filter=@samofujera/api-client
```

**Step 5: Commit**

```bash
git add packages/api-client/src/
git commit -m "feat(api-client): add page admin and public api endpoints"
```

---

## Task 5: Admin Pages List

Create the admin page list view with table, filters, and create/delete actions.

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/stranky/page.tsx`
- Create: `apps/web/src/components/admin/routes/pages-list.tsx`
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx` — add "Stranky" nav item

**Step 1: Add nav item to Sidebar**

In `Sidebar.tsx`, add to `adminNavItems` array (after "Dashboard"):

```typescript
{ label: "Stranky", href: "/admin/stranky" },
```

**Step 2: Create route file `admin/stranky/page.tsx`**

```tsx
import { PagesListPage } from "@/components/admin/routes/pages-list";

export default function AdminPagesRoute() {
  return <PagesListPage />;
}
```

**Step 3: Create `pages-list.tsx`**

Follow the exact pattern from `products.tsx` — `useQuery` for list, `useMutation` for delete, table with filters. Include:

- Search input
- Status filter dropdown (Vsechny / Draft / Published / Archived)
- "Nova stranka" button → opens a dialog to enter title + slug, then creates via `pageAdminApi.createPage()` and navigates to `/admin/stranky/{id}`
- Table columns: Title (link to edit), Slug, Status (badge), Updated date, Actions (delete)
- Pagination
- Delete confirmation dialog
- Loading/error/empty states

**Step 4: Run dev and verify**

```bash
pnpm dev --filter=@samofujera/web
```

Navigate to `http://localhost:3000/admin/stranky` — should show empty page list with create button.

**Step 5: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/admin/stranky/
git add apps/web/src/components/admin/routes/pages-list.tsx
git add apps/web/src/components/dashboard/Sidebar.tsx
git commit -m "feat(admin): add pages list with crud operations"
```

---

## Task 6: Install Lexical and Create Base Editor

Install Lexical packages and create the base editor component with built-in nodes only (no custom nodes yet).

**Files:**
- Modify: `apps/web/package.json` — add lexical dependencies
- Create: `apps/web/src/components/admin/editor/PageEditor.tsx`
- Create: `apps/web/src/components/admin/editor/plugins/ToolbarPlugin.tsx`
- Create: `apps/web/src/components/admin/editor/theme.ts`

**Step 1: Install Lexical packages**

```bash
cd apps/web && pnpm add lexical @lexical/react @lexical/rich-text @lexical/list @lexical/link @lexical/selection @lexical/utils @lexical/html
```

**Step 2: Create editor theme (`theme.ts`)**

Map Lexical CSS classes to the project's existing Tailwind classes so the editor looks identical to the public site:

```typescript
import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  paragraph: "public-body-110 mb-4",
  heading: {
    h2: "public-h2-sm pb-3.5",
    h3: "font-heading text-2xl text-[var(--primary)] pb-2",
  },
  list: {
    ul: "list-disc pl-6 mb-4 public-body-110",
    ol: "list-decimal pl-6 mb-4 public-body-110",
    listitem: "mb-1",
  },
  link: "text-[var(--primary)] underline hover:no-underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
  },
};
```

**Step 3: Create base `PageEditor.tsx`**

```tsx
"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import type { EditorState, SerializedEditorState } from "lexical";

import { editorTheme } from "./theme";
import { ToolbarPlugin } from "./plugins/ToolbarPlugin";

interface PageEditorProps {
  initialContent: SerializedEditorState | null;
  onChange: (state: SerializedEditorState) => void;
}

export function PageEditor({ initialContent, onChange }: PageEditorProps) {
  const initialConfig = {
    namespace: "PageEditor",
    theme: editorTheme,
    nodes: [HeadingNode, ListNode, ListItemNode, LinkNode, HorizontalRuleNode],
    editorState: initialContent ? JSON.stringify(initialContent) : undefined,
    onError: (error: Error) => console.error("Lexical error:", error),
  };

  function handleChange(editorState: EditorState) {
    onChange(editorState.toJSON());
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative">
        <ToolbarPlugin />
        <div
          className="bg-repeat px-6 sm:px-12 lg:px-16 pt-8 pb-12 min-h-[60vh]"
          style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
        >
          <div className="max-w-[935px] mx-auto px-5">
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="outline-none focus:outline-none" />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
      </div>
    </LexicalComposer>
  );
}
```

**Step 4: Create basic `ToolbarPlugin.tsx`**

A floating toolbar that appears on text selection with: Format (H2/H3/P), Bold, Italic, alignment, lists, link. Follow Lexical's official toolbar plugin example but style with shadcn/ui buttons.

This is a substantial component (~200-300 lines). Key features:
- Uses `useLexicalComposerContext()` to get editor instance
- Listens to `SELECTION_CHANGE_COMMAND` to show/position toolbar
- Floating div positioned via `getSelection().getRangeAt(0).getBoundingClientRect()`
- Format dropdown using shadcn `DropdownMenu`
- Toggle buttons for bold/italic using `FORMAT_TEXT_COMMAND`
- Heading toggle using `$createHeadingNode`

**Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git add apps/web/src/components/admin/editor/
git commit -m "feat(admin): add lexical base editor with toolbar"
```

---

## Task 7: Admin Page Editor Route

Create the fullscreen page editor route that loads a page from the API and saves changes.

**Files:**
- Create: `apps/web/src/app/(dashboard)/admin/stranky/[pageId]/page.tsx`
- Create: `apps/web/src/app/(dashboard)/admin/stranky/nova/page.tsx`
- Create: `apps/web/src/components/admin/routes/page-editor.tsx`

**Step 1: Create route files**

`admin/stranky/[pageId]/page.tsx`:
```tsx
import { PageEditorPage } from "@/components/admin/routes/page-editor";

export default function EditPageRoute() {
  return <PageEditorPage />;
}
```

`admin/stranky/nova/page.tsx`:
```tsx
import { PageEditorPage } from "@/components/admin/routes/page-editor";

export default function NewPageRoute() {
  return <PageEditorPage />;
}
```

**Step 2: Create `page-editor.tsx`**

Fullscreen editor layout:
- **Top bar** (fixed, z-50): Back arrow (← `/admin/stranky`), page title input, slug input, SEO button (opens dialog), status badge, Save draft / Publish buttons
- **Editor area** (below top bar): The `PageEditor` component from Task 6
- Data flow: Load page via `useQuery` → populate form state → `PageEditor` sends `onChange` with Lexical state → Save button sends `pageAdminApi.updatePage()` with all form data + content JSON

Key patterns (from `product-edit.tsx`):
- `useParams()` to get `pageId`
- `useQuery` with `enabled: Boolean(pageId)` for edit mode
- `useState` for title, slug, metaTitle, metaDescription, ogImageId, content
- `useEffect` to populate form once from query data (with `formLoaded` guard)
- `useMutation` for save/publish with `invalidateQueries`
- SEO dialog using shadcn `Dialog` with meta title, meta description, og image (MediaPicker)
- Auto-generate slug from title on create (slugify function)

**Step 3: Test flow**

1. Navigate to `/admin/stranky`
2. Click "Nova stranka" → creates page via API → redirects to `/admin/stranky/{id}`
3. Editor loads with empty content
4. Type some text, add headings
5. Click "Ulozit" → saves to API
6. Refresh → content persists

**Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/admin/stranky/
git add apps/web/src/components/admin/routes/page-editor.tsx
git commit -m "feat(admin): add fullscreen page editor with save/publish"
```

---

## Task 8: Custom Lexical Nodes — Image, CTA, Separator

Add the first batch of custom Lexical nodes.

**Files:**
- Create: `apps/web/src/components/admin/editor/nodes/ImageNode.tsx`
- Create: `apps/web/src/components/admin/editor/nodes/CTAButtonNode.tsx`
- Create: `apps/web/src/components/admin/editor/nodes/SeparatorNode.tsx`
- Create: `apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx`
- Modify: `apps/web/src/components/admin/editor/PageEditor.tsx` — register nodes

**For each custom node, implement:**

1. **Node class** extending `DecoratorNode` — defines `type`, `exportJSON()`, `importJSON()`, `createDOM()`, `decorate()` (returns React component)
2. **React component** for editing — rendered inline in the editor via `decorate()`
3. **React component** for public rendering (read-only) — shared or separate

### ImageNode

- Stores: `mediaItemId`, `altText`, `alignment` (left/center/right/full), `src` (URL for rendering)
- Edit component: Shows image with click-to-change overlay, alignment buttons, alt text input
- Uses `MediaPicker` for image selection
- Public render: `<img>` with responsive classes matching site design

### CTAButtonNode

- Stores: `text`, `url`, `variant` (primary/secondary)
- Edit component: Inline editable text, click to configure URL + variant in a popover
- Public render: Styled `<a>` matching `public-cta` class pattern

### SeparatorNode

- Stores: `style` (simple/ornamental)
- Edit component: Decorative `<hr>` with click to toggle style
- Public render: Same `<hr>` as used on existing pages

### InsertBlockPlugin

A "+" button that appears between blocks (or at the end). Opens a palette showing all available block types. Uses `$insertNodes()` from Lexical to add the selected node.

**Step: Register all nodes in PageEditor**

Update the `nodes` array in `PageEditor.tsx`:
```typescript
nodes: [HeadingNode, ListNode, ListItemNode, LinkNode, HorizontalRuleNode,
        ImageNode, CTAButtonNode, SeparatorNode],
```

**Commit:**

```bash
git add apps/web/src/components/admin/editor/
git commit -m "feat(admin): add image, cta, and separator editor nodes"
```

---

## Task 9: Custom Lexical Nodes — Columns, Gallery, ContactForm

Add the remaining custom nodes.

**Files:**
- Create: `apps/web/src/components/admin/editor/nodes/ColumnsNode.tsx`
- Create: `apps/web/src/components/admin/editor/nodes/GalleryNode.tsx`
- Create: `apps/web/src/components/admin/editor/nodes/ContactFormNode.tsx`
- Modify: `apps/web/src/components/admin/editor/PageEditor.tsx` — register nodes
- Modify: `apps/web/src/components/admin/editor/plugins/InsertBlockPlugin.tsx` — add to palette

### ColumnsNode

- Stores: `columnCount` (2 or 3), `columns` (array of nested Lexical editor states)
- Edit component: Side-by-side nested editors, column count toggle, drag to resize (optional)
- This is the most complex node — nested `LexicalNestedComposer` for each column
- Public render: CSS grid with responsive behavior

### GalleryNode

- Stores: `mediaItemIds` (array of UUIDs), `columns` (2/3/4)
- Edit component: Grid of thumbnails, "Add images" button using MediaPicker (multi-select), drag to reorder, column count selector
- Public render: Responsive image grid with lightbox (optional future)

### ContactFormNode

- Stores: `title` (optional header text), `fields` (predefined: name, email, message)
- Edit component: Preview of the form with editable title, non-interactive form fields shown as preview
- Public render: Functional `<form>` that posts to a backend endpoint (create `/api/contact` endpoint)
- Backend: Simple email sending via existing email module

**Register all nodes and update the insert palette.**

**Commit:**

```bash
git add apps/web/src/components/admin/editor/
git commit -m "feat(admin): add columns, gallery, and contact form editor nodes"
```

---

## Task 10: Public Page Rendering

Create the public page route that renders Lexical JSON to React components.

**Files:**
- Create: `apps/web/src/app/(public)/pages/[slug]/page.tsx`
- Create: `apps/web/src/components/page-renderer/PageRenderer.tsx`
- Create: `apps/web/src/components/page-renderer/nodes/` — read-only render components for each node type

**Step 1: Create `PageRenderer.tsx`**

A component that takes Lexical serialized state and renders it to React without the editor. Uses `@lexical/headless` to create a read-only editor instance, or manually walks the JSON tree and maps node types to React components.

Simpler approach (recommended): Walk the JSON tree manually:

```tsx
interface PageRendererProps {
  content: Record<string, unknown>;
}

export function PageRenderer({ content }: PageRendererProps) {
  const root = content?.root as { children: SerializedNode[] } | undefined;
  if (!root?.children) return null;
  return <>{root.children.map((node, i) => renderNode(node, i))}</>;
}

function renderNode(node: SerializedNode, key: number): React.ReactNode {
  switch (node.type) {
    case "paragraph": return <ParagraphRenderer key={key} node={node} />;
    case "heading": return <HeadingRenderer key={key} node={node} />;
    case "image": return <ImageRenderer key={key} node={node} />;
    case "cta-button": return <CTARenderer key={key} node={node} />;
    // ... etc
    default: return null;
  }
}
```

**Step 2: Create the route `pages/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/page-renderer/PageRenderer";

// Server-side data fetching
async function getPage(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/pages/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle || `${page.title} | Sámo Fujera`,
    description: page.metaDescription || undefined,
  };
}

export default async function PublicPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <section
      className="bg-repeat px-6 sm:px-12 lg:px-16 pt-[81px] sm:pt-[97px] pb-12 sm:pb-16"
      style={{ backgroundImage: "url('/images/bg-body-texture.png')" }}
    >
      <div className="max-w-[935px] mx-auto px-5">
        {page.content && <PageRenderer content={page.content} />}
      </div>
    </section>
  );
}
```

**Step 3: Test end-to-end**

1. Create a page in admin at `/admin/stranky`
2. Add content with various block types
3. Save and publish
4. Navigate to `/pages/{slug}` — should render identically to how it looked in the editor

**Step 4: Commit**

```bash
git add apps/web/src/app/\(public\)/pages/
git add apps/web/src/components/page-renderer/
git commit -m "feat(web): add public page rendering from lexical json"
```

---

## Task 11: Integration Testing and Polish

Run all tests, fix issues, verify the full flow.

**Step 1: Run lint and typecheck**

```bash
pnpm turbo lint
pnpm turbo typecheck
```

Fix any errors.

**Step 2: Run backend tests**

```bash
cd apps/backend && ./mvnw test
```

**Step 3: Full end-to-end manual test**

1. Start Docker services: `docker compose up -d`
2. Start backend: `cd apps/backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
3. Start frontend: `pnpm dev --filter=@samofujera/web`
4. Login as admin at `/prihlaseni`
5. Navigate to `/admin/stranky`
6. Create new page with title "Test Page" and slug "test-page"
7. In the editor:
   - Add a heading "Welcome"
   - Add a paragraph of text
   - Insert an image from media library
   - Add a CTA button
   - Add a separator
   - Add a 2-column layout
   - Add a gallery
8. Save as draft
9. Preview at `/pages/test-page` — should show 404 (not published)
10. Publish the page
11. View at `/pages/test-page` — should render with all blocks styled correctly
12. Edit the page — content should persist
13. Unpublish — `/pages/test-page` should return 404
14. Delete the page — removed from list

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(admin): polish page builder integration"
```

---

## Summary

| Task | Description | Scope |
|------|-------------|-------|
| 1 | Database migration (pages table) | Backend |
| 2 | Page repository (JOOQ) | Backend |
| 3 | DTOs, Service, Controllers | Backend |
| 4 | API client (TypeScript) | Shared |
| 5 | Admin pages list | Frontend |
| 6 | Lexical base editor + toolbar | Frontend |
| 7 | Admin page editor route | Frontend |
| 8 | Custom nodes: Image, CTA, Separator | Frontend |
| 9 | Custom nodes: Columns, Gallery, ContactForm | Frontend |
| 10 | Public page rendering | Frontend |
| 11 | Integration testing + polish | Full stack |
