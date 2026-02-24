# Page Versioning, Roles, Autosave & Impersonation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-role auth, page versioning with autosave, review workflow foundation, and read-only impersonation.

**Architecture:** Separate `user_roles` join table replaces single `role` column. Page revisions created on publish (snapshots), draft lives in `pages.content`. Autosave uses debounce 3s + fallback 30s. Impersonation via session flag with read-only enforcement.

**Tech Stack:** Spring Boot 4, Spring Security, JOOQ, Flyway, React 19, TanStack Query, Next.js 16

**Design doc:** `docs/plans/2026-02-24-page-versioning-design.md`

---

## Phase 1: Role Refactor (Backend)

### Task 1: Flyway migration — user_roles table

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V28__user_roles.sql`

**Step 1: Write migration**

```sql
-- Create user_roles join table
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- Migrate existing roles
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users;

-- Existing ADMINs also get SUPERADMIN
INSERT INTO user_roles (user_id, role)
SELECT id, 'SUPERADMIN' FROM users WHERE role = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Drop old column
ALTER TABLE users DROP COLUMN role;
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && mvn clean compile -DskipTests`
Expected: JOOQ generates `UserRoles` table class, `Users` table no longer has `ROLE` column.

**Step 3: Commit**

```
feat(backend): add user_roles table and migrate from single role column
```

---

### Task 2: Update UserPrincipal for multi-role

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/auth/UserPrincipal.java`

**Step 1: Write the failing test**

Create: `apps/backend/src/test/java/cz/samofujera/auth/UserPrincipalTest.java`

```java
package cz.samofujera.auth;

import org.junit.jupiter.api.Test;
import java.util.Set;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class UserPrincipalTest {

    @Test
    void getAuthorities_returnsAllRolesWithPrefix() {
        var principal = new UserPrincipal(
            UUID.randomUUID(), "test@test.com", "Test", "hash",
            Set.of("ADMIN", "EDITOR"), false, false
        );
        var authorities = principal.getAuthorities().stream()
            .map(a -> a.getAuthority()).toList();
        assertThat(authorities).containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_EDITOR");
    }

    @Test
    void getRoles_returnsRoleSet() {
        var principal = new UserPrincipal(
            UUID.randomUUID(), "test@test.com", "Test", "hash",
            Set.of("SUPERADMIN", "ADMIN"), false, false
        );
        assertThat(principal.getRoles()).containsExactlyInAnyOrder("SUPERADMIN", "ADMIN");
    }

    @Test
    void hasRole_checksCorrectly() {
        var principal = new UserPrincipal(
            UUID.randomUUID(), "test@test.com", "Test", "hash",
            Set.of("ADMIN"), false, false
        );
        assertThat(principal.hasRole("ADMIN")).isTrue();
        assertThat(principal.hasRole("SUPERADMIN")).isFalse();
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && mvn test -pl . -Dtest=UserPrincipalTest -DfailIfNoTests=false`
Expected: FAIL — constructor signature mismatch

**Step 3: Update UserPrincipal**

```java
package cz.samofujera.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String name;
    private final String passwordHash;
    private final Set<String> roles;
    private final boolean blocked;
    private final boolean deleted;

    public UserPrincipal(UUID id, String email, String name, String passwordHash,
                         Set<String> roles, boolean blocked, boolean deleted) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.roles = roles;
        this.blocked = blocked;
        this.deleted = deleted;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public Set<String> getRoles() { return roles; }
    public boolean hasRole(String role) { return roles.contains(role); }

    @Override
    public String getUsername() { return email; }

    @Override
    public String getPassword() { return passwordHash; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toSet());
    }

    @Override
    public boolean isAccountNonLocked() { return !blocked; }

    @Override
    public boolean isEnabled() { return !deleted; }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && mvn test -pl . -Dtest=UserPrincipalTest`
Expected: PASS

**Step 5: Commit**

```
feat(backend): update userprincipal for multi-role support
```

---

### Task 3: Update CustomUserDetailsService to load roles from user_roles

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/auth/internal/CustomUserDetailsService.java`

**Step 1: Write the failing test**

Create: `apps/backend/src/test/java/cz/samofujera/auth/UserRolesIntegrationTest.java`

```java
package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static cz.samofujera.jooq.Tables.USERS;
import static cz.samofujera.jooq.Tables.USER_ROLES;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class UserRolesIntegrationTest {

    @Autowired DSLContext dsl;
    @Autowired UserDetailsService userDetailsService;
    @Autowired PasswordEncoder passwordEncoder;

    private UUID userId;

    @BeforeEach
    void setUp() {
        // Clean up test data
        dsl.deleteFrom(USER_ROLES).where(USER_ROLES.USER_ID.in(
            dsl.select(USERS.ID).from(USERS).where(USERS.EMAIL.eq("roles-test@test.com"))
        )).execute();
        dsl.deleteFrom(USERS).where(USERS.EMAIL.eq("roles-test@test.com")).execute();

        // Create test user
        userId = UUID.randomUUID();
        dsl.insertInto(USERS)
            .set(USERS.ID, userId)
            .set(USERS.EMAIL, "roles-test@test.com")
            .set(USERS.PASSWORD_HASH, passwordEncoder.encode("password"))
            .set(USERS.NAME, "Role Test User")
            .execute();

        // Assign multiple roles
        dsl.insertInto(USER_ROLES).set(USER_ROLES.USER_ID, userId).set(USER_ROLES.ROLE, "ADMIN").execute();
        dsl.insertInto(USER_ROLES).set(USER_ROLES.USER_ID, userId).set(USER_ROLES.ROLE, "EDITOR").execute();
    }

    @Test
    void loadUserByUsername_returnsMultipleRoles() {
        var userDetails = (UserPrincipal) userDetailsService.loadUserByUsername("roles-test@test.com");
        assertThat(userDetails.getRoles()).containsExactlyInAnyOrder("ADMIN", "EDITOR");
    }

    @Test
    void loadUserByUsername_returnsAuthoritiesWithPrefix() {
        var userDetails = (UserPrincipal) userDetailsService.loadUserByUsername("roles-test@test.com");
        var authorities = userDetails.getAuthorities().stream()
            .map(a -> a.getAuthority()).toList();
        assertThat(authorities).containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_EDITOR");
    }
}
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && mvn test -pl . -Dtest=UserRolesIntegrationTest`
Expected: FAIL — `CustomUserDetailsService` still queries `users.role`

**Step 3: Update CustomUserDetailsService**

Modify to query `user_roles` table instead of `users.role`:

```java
// In CustomUserDetailsService.loadUserByUsername():
// 1. Fetch user from USERS table (without role)
// 2. Fetch roles from USER_ROLES where user_id = user.id
// 3. Construct UserPrincipal with Set<String> roles
```

Key changes:
- Remove `USERS.ROLE` from the user query
- Add separate query: `dsl.select(USER_ROLES.ROLE).from(USER_ROLES).where(USER_ROLES.USER_ID.eq(userId))`
- Pass `Set<String>` to `UserPrincipal` constructor

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && mvn test -pl . -Dtest=UserRolesIntegrationTest`
Expected: PASS

**Step 5: Commit**

```
feat(backend): load user roles from user_roles table
```

---

### Task 4: Update AuthService, AuthController, UserService DTOs

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/auth/AuthService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/auth/AuthDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/auth/AuthController.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/user/UserDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/user/UserService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/user/UserController.java`

**Step 1: Update DTOs**

Change `String role` → `Set<String> roles` in:
- `AuthDtos.UserResponse` — `Set<String> roles` instead of `String role`
- `UserDtos.ProfileResponse` — `Set<String> roles` instead of `String role`

**Step 2: Update AuthService.login()**

Currently extracts single role from authorities. Change to:
```java
// Old: String role = principal.getAuthorities().stream().findFirst()...
// New: Set<String> roles = principal.getRoles();
```

**Step 3: Update AuthService.register()**

Currently inserts `role = "USER"` into users table. Change to:
- Insert user without role column
- Insert `("USER")` into `user_roles` table

**Step 4: Update UserService.getProfile()**

Currently reads `users.role`. Change to:
- Query `user_roles` for the user's roles
- Return `Set<String> roles` in ProfileResponse

**Step 5: Run existing auth tests**

Run: `cd apps/backend && mvn test -pl . -Dtest="Auth*Test,User*Test,Login*Test,Session*Test,Account*Test"`
Expected: Some tests FAIL due to `role` → `roles` change in JSON responses

**Step 6: Fix failing tests**

Update test assertions:
- `jsonPath("$.data.role").value("USER")` → `jsonPath("$.data.roles[0]").value("USER")` or `jsonPath("$.data.roles").isArray()`

**Step 7: Run all tests**

Run: `cd apps/backend && mvn test`
Expected: PASS

**Step 8: Commit**

```
feat(backend): update auth and user services for multi-role
```

---

### Task 5: Update SecurityConfig for role hierarchy

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/auth/internal/SecurityConfig.java`

**Step 1: Update authorization rules**

Current: `.requestMatchers("/api/admin/**").hasRole("ADMIN")`

Change to: `.requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPERADMIN", "EDITOR", "REVIEWER")`

Or better — use a custom access check method that handles SUPERADMIN bypass:
- SUPERADMIN has access to everything
- ADMIN has access to `/api/admin/**`
- EDITOR has access to `/api/admin/pages/**`
- REVIEWER has access to `/api/admin/pages/**/reviews`

**Step 2: Write integration test**

```java
@Test
void adminEndpoint_accessibleBySuperadmin() { ... }

@Test
void adminEndpoint_accessibleByAdmin() { ... }

@Test
void adminEndpoint_forbiddenForEditor() { ... }

@Test
void adminEndpoint_forbiddenForUser() { ... }
```

**Step 3: Run tests**

Run: `cd apps/backend && mvn test`
Expected: PASS

**Step 4: Commit**

```
feat(backend): update security config for multi-role authorization
```

---

### Task 6: Update frontend types and auth checks

**Files:**
- Modify: `packages/api-client/src/types.ts`
- Modify: `apps/web/src/components/nav/PublicAuthProvider.tsx`
- Modify: `apps/web/src/components/auth/AuthGuard.tsx`
- Modify: `apps/web/src/components/nav/AdminBar.tsx`

**Step 1: Update TypeScript types**

In `packages/api-client/src/types.ts`:
```typescript
// Change in UserResponse and ProfileResponse:
// Old: role: string;
// New: roles: string[];
```

**Step 2: Update PublicAuthProvider**

```typescript
// Old: isAdmin: user?.role === "ADMIN"
// New: isAdmin: user?.roles?.some(r => ["ADMIN", "SUPERADMIN"].includes(r)) ?? false
// Add: isEditor: user?.roles?.includes("EDITOR") ?? false
// Add: hasRole: (role: string) => user?.roles?.includes(role) ?? false
```

**Step 3: Update AuthGuard**

```typescript
// Old: requiredRole check against single role
// New: Check if user has any of the required roles
// SUPERADMIN bypasses all role checks
```

**Step 4: Update AdminBar**

```typescript
// Old: isAdmin check
// New: Show admin bar for ADMIN, SUPERADMIN, EDITOR
// Edit page button: visible for ADMIN, SUPERADMIN, EDITOR
```

**Step 5: Verify in browser**

- Log in as admin → admin bar visible with all buttons
- Log in as regular user → no admin bar

**Step 6: Commit**

```
feat(web): update frontend for multi-role auth
```

---

## Phase 2: Page Versioning (Backend)

### Task 7: Flyway migration — page_revisions and page_reviews tables

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V29__page_revisions.sql`

**Step 1: Write migration**

```sql
-- Page revisions (snapshots on publish)
CREATE TABLE page_revisions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id          UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    version          INT NOT NULL,
    content          JSONB NOT NULL,
    title            VARCHAR(500) NOT NULL,
    slug             VARCHAR(255) NOT NULL,
    meta_title       VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords    VARCHAR(300),
    og_title         VARCHAR(200),
    og_description   VARCHAR(500),
    og_image_id      UUID REFERENCES media_items(id),
    noindex          BOOLEAN NOT NULL DEFAULT false,
    nofollow         BOOLEAN NOT NULL DEFAULT false,
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, version)
);

CREATE INDEX idx_page_revisions_page_id ON page_revisions(page_id);

-- Add published revision pointer to pages
ALTER TABLE pages ADD COLUMN published_revision_id UUID REFERENCES page_revisions(id);

-- Backfill: create revision 1 for already-published pages
INSERT INTO page_revisions (page_id, version, content, title, slug,
    meta_title, meta_description, meta_keywords, og_title, og_description,
    og_image_id, noindex, nofollow, created_by, created_at)
SELECT id, 1, content, title, slug,
    meta_title, meta_description, meta_keywords, og_title, og_description,
    og_image_id, noindex, nofollow, created_by, COALESCE(published_at, now())
FROM pages
WHERE status = 'PUBLISHED';

-- Point published pages to their revision
UPDATE pages p
SET published_revision_id = pr.id
FROM page_revisions pr
WHERE pr.page_id = p.id AND pr.version = 1 AND p.status = 'PUBLISHED';

-- Page reviews (foundation for review workflow)
CREATE TABLE page_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_reviews_page_id ON page_reviews(page_id);
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && mvn clean compile -DskipTests`

**Step 3: Commit**

```
feat(backend): add page_revisions, page_reviews tables and backfill published pages
```

---

### Task 8: PageRevisionRepository

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/page/internal/PageRevisionRepository.java`

**Step 1: Write the failing test**

Create: `apps/backend/src/test/java/cz/samofujera/page/PageRevisionIntegrationTest.java`

```java
@SpringBootTest
@Import(TestcontainersConfig.class)
class PageRevisionIntegrationTest {

    @Autowired DSLContext dsl;
    @Autowired PageRevisionRepository revisionRepository;

    @Test
    void createRevision_incrementsVersion() {
        // Create a page, then two revisions
        // Assert version 1, then version 2
    }

    @Test
    void findByPageId_returnsRevisionsOrderedByVersionDesc() {
        // Create page with 3 revisions
        // Assert returned in order 3, 2, 1
    }

    @Test
    void findById_returnsRevision() {
        // Create revision, find by id, assert all fields match
    }
}
```

**Step 2: Implement PageRevisionRepository**

```java
package cz.samofujera.page.internal;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.jooq.Tables.PAGE_REVISIONS;

@Repository
class PageRevisionRepository {

    private final DSLContext dsl;

    PageRevisionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    record RevisionRow(UUID id, UUID pageId, int version, JSONB content,
                       String title, String slug, String metaTitle, String metaDescription,
                       String metaKeywords, String ogTitle, String ogDescription,
                       UUID ogImageId, boolean noindex, boolean nofollow,
                       UUID createdBy, java.time.OffsetDateTime createdAt) {}

    UUID create(UUID pageId, JSONB content, String title, String slug,
                String metaTitle, String metaDescription, String metaKeywords,
                String ogTitle, String ogDescription, UUID ogImageId,
                boolean noindex, boolean nofollow, UUID createdBy) {
        int nextVersion = dsl.select(org.jooq.impl.DSL.coalesce(
                org.jooq.impl.DSL.max(PAGE_REVISIONS.VERSION), 0).add(1))
            .from(PAGE_REVISIONS)
            .where(PAGE_REVISIONS.PAGE_ID.eq(pageId))
            .fetchOne(0, int.class);

        return dsl.insertInto(PAGE_REVISIONS)
            .set(PAGE_REVISIONS.PAGE_ID, pageId)
            .set(PAGE_REVISIONS.VERSION, nextVersion)
            .set(PAGE_REVISIONS.CONTENT, content)
            .set(PAGE_REVISIONS.TITLE, title)
            .set(PAGE_REVISIONS.SLUG, slug)
            .set(PAGE_REVISIONS.META_TITLE, metaTitle)
            .set(PAGE_REVISIONS.META_DESCRIPTION, metaDescription)
            .set(PAGE_REVISIONS.META_KEYWORDS, metaKeywords)
            .set(PAGE_REVISIONS.OG_TITLE, ogTitle)
            .set(PAGE_REVISIONS.OG_DESCRIPTION, ogDescription)
            .set(PAGE_REVISIONS.OG_IMAGE_ID, ogImageId)
            .set(PAGE_REVISIONS.NOINDEX, noindex)
            .set(PAGE_REVISIONS.NOFOLLOW, nofollow)
            .set(PAGE_REVISIONS.CREATED_BY, createdBy)
            .returning(PAGE_REVISIONS.ID)
            .fetchOne(PAGE_REVISIONS.ID);
    }

    List<RevisionRow> findByPageId(UUID pageId) {
        return dsl.selectFrom(PAGE_REVISIONS)
            .where(PAGE_REVISIONS.PAGE_ID.eq(pageId))
            .orderBy(PAGE_REVISIONS.VERSION.desc())
            .fetch(r -> new RevisionRow(
                r.getId(), r.getPageId(), r.getVersion(), r.getContent(),
                r.getTitle(), r.getSlug(), r.getMetaTitle(), r.getMetaDescription(),
                r.getMetaKeywords(), r.getOgTitle(), r.getOgDescription(),
                r.getOgImageId(), r.getNoindex(), r.getNofollow(),
                r.getCreatedBy(), r.getCreatedAt()
            ));
    }

    Optional<RevisionRow> findById(UUID id) {
        return dsl.selectFrom(PAGE_REVISIONS)
            .where(PAGE_REVISIONS.ID.eq(id))
            .fetchOptional(r -> new RevisionRow(
                r.getId(), r.getPageId(), r.getVersion(), r.getContent(),
                r.getTitle(), r.getSlug(), r.getMetaTitle(), r.getMetaDescription(),
                r.getMetaKeywords(), r.getOgTitle(), r.getOgDescription(),
                r.getOgImageId(), r.getNoindex(), r.getNofollow(),
                r.getCreatedBy(), r.getCreatedAt()
            ));
    }
}
```

**Step 3: Run tests**

Run: `cd apps/backend && mvn test -pl . -Dtest=PageRevisionIntegrationTest`
Expected: PASS

**Step 4: Commit**

```
feat(backend): add page revision repository with jooq
```

---

### Task 9: Update PageService publish flow to create revisions

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/page/internal/PageRepository.java`

**Step 1: Write the failing test**

Create: `apps/backend/src/test/java/cz/samofujera/page/PagePublishRevisionTest.java`

```java
@SpringBootTest
@Import(TestcontainersConfig.class)
class PagePublishRevisionTest {

    @Test
    void publishPage_createsRevision() {
        // Create page, set content, publish
        // Assert page_revisions has 1 row with correct content
        // Assert pages.published_revision_id is set
    }

    @Test
    void publishPage_incrementsVersion() {
        // Publish page twice (unpublish between)
        // Assert version 1 and version 2 exist
    }

    @Test
    void getPublishedPageBySlug_readsFromRevision() {
        // Create page, publish, then modify draft content
        // Assert public endpoint returns published revision content, not draft
    }
}
```

**Step 2: Update PageService.publishPage()**

```java
@Transactional
public void publishPage(UUID id, UUID publishedBy) {
    var page = pageRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Page not found"));

    // Create revision snapshot
    var revisionId = revisionRepository.create(
        id, page.content(), page.title(), page.slug(),
        page.metaTitle(), page.metaDescription(), page.metaKeywords(),
        page.ogTitle(), page.ogDescription(), page.ogImageId(),
        page.noindex(), page.nofollow(), publishedBy
    );

    // Point to new revision and update status
    pageRepository.setPublishedRevisionId(id, revisionId);
    pageRepository.updateStatus(id, "PUBLISHED");
    pageRepository.clearScheduledPublishAt(id);
}
```

**Step 3: Update PageService.getPublishedPageBySlug()**

Read from `page_revisions` via `published_revision_id` instead of `pages.content`:

```java
public PageDtos.PublicPageResponse getPublishedPageBySlug(String slug) {
    var page = pageRepository.findBySlug(slug)
        .orElseThrow(() -> new NotFoundException("Page not found"));
    if (!"PUBLISHED".equals(page.status()) || page.publishedRevisionId() == null) {
        throw new NotFoundException("Page not found");
    }
    var revision = revisionRepository.findById(page.publishedRevisionId())
        .orElseThrow(() -> new NotFoundException("Page not found"));
    return new PageDtos.PublicPageResponse(
        page.id(), revision.slug(), revision.title(), rawContent(revision.content()),
        revision.metaTitle(), revision.metaDescription(),
        revision.metaKeywords(), revision.ogTitle(), revision.ogDescription(),
        resolveOgImageUrl(revision.ogImageId()), revision.noindex(), revision.nofollow()
    );
}
```

**Step 4: Add `setPublishedRevisionId` to PageRepository**

```java
void setPublishedRevisionId(UUID pageId, UUID revisionId) {
    dsl.update(PAGES)
        .set(PAGES.PUBLISHED_REVISION_ID, revisionId)
        .set(PAGES.UPDATED_AT, OffsetDateTime.now())
        .where(PAGES.ID.eq(pageId))
        .execute();
}
```

**Step 5: Add `publishedRevisionId` to `PageRow` record**

Update `PageRepository.PageRow` to include `UUID publishedRevisionId` and all queries that construct it.

**Step 6: Run tests**

Run: `cd apps/backend && mvn test`
Expected: PASS

**Step 7: Commit**

```
feat(backend): publish creates revision snapshot, public reads from revision
```

---

### Task 10: Revision list and restore endpoints

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/page/PageDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/page/internal/PageAdminController.java`

**Step 1: Add DTOs**

```java
// In PageDtos.java:
public record RevisionResponse(
    UUID id, int version, String title, String slug,
    UUID createdBy, OffsetDateTime createdAt
) {}

public record RevisionDetailResponse(
    UUID id, int version, String title, String slug,
    @JsonRawValue String content,
    String metaTitle, String metaDescription,
    UUID createdBy, OffsetDateTime createdAt
) {}
```

**Step 2: Add service methods**

```java
public List<PageDtos.RevisionResponse> getRevisions(UUID pageId) { ... }

@Transactional
public PageDtos.PageDetailResponse restoreRevision(UUID pageId, UUID revisionId) {
    // Copy revision content back into pages.content (as new draft)
    // Do NOT change status or published_revision_id
}
```

**Step 3: Add controller endpoints**

```java
@GetMapping("/{id}/revisions")
ResponseEntity<ApiResponse<List<PageDtos.RevisionResponse>>> getRevisions(@PathVariable UUID id) { ... }

@PostMapping("/{id}/revisions/{revisionId}/restore")
ResponseEntity<ApiResponse<PageDtos.PageDetailResponse>> restoreRevision(
    @PathVariable UUID id, @PathVariable UUID revisionId) { ... }
```

**Step 4: Write integration test**

**Step 5: Run tests**

Run: `cd apps/backend && mvn test`
Expected: PASS

**Step 6: Commit**

```
feat(backend): add revision list and restore endpoints
```

---

## Phase 3: Autosave (Frontend)

### Task 11: useAutosave hook

**Files:**
- Create: `apps/web/src/hooks/useAutosave.ts`

**Step 1: Implement the hook**

```typescript
import { useRef, useCallback, useEffect } from "react";

interface UseAutosaveOptions {
  onSave: () => Promise<void>;
  debounceMs?: number;   // default 3000
  fallbackMs?: number;   // default 30000
  enabled?: boolean;     // default true
}

interface UseAutosaveReturn {
  markDirty: () => void;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
}

export function useAutosave(options: UseAutosaveOptions): UseAutosaveReturn {
  // Implementation:
  // - Track dirty state
  // - Debounce timer (3s after last markDirty call)
  // - Fallback timer (30s max between saves when continuously dirty)
  // - Skip save if not dirty
  // - Track isSaving, lastSavedAt
  // - saveNow() for manual save (resets timers)
  // - Cleanup timers on unmount
}
```

Key behaviors:
- `markDirty()` — called on every content/metadata change, starts debounce timer
- Debounce: save fires 3s after last `markDirty()` call
- Fallback: if `markDirty()` keeps being called without pause, save fires every 30s
- `saveNow()` — immediate save, resets all timers
- `isSaving` — true during save request
- `lastSavedAt` — timestamp of last successful save

**Step 2: Add beforeunload warning**

```typescript
// Inside the hook, add effect:
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirtyRef.current) {
      e.preventDefault();
    }
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, []);
```

**Step 3: Commit**

```
feat(web): add useautosave hook with debounce and fallback
```

---

### Task 12: Integrate autosave into FullPageEditor

**Files:**
- Modify: `apps/web/src/components/admin/editor/FullPageEditor.tsx`
- Modify: `apps/web/src/components/admin/editor/EditorToolbar.tsx`

**Step 1: Wire useAutosave into FullPageEditor**

```typescript
const { markDirty, isDirty, isSaving: isAutosaving, lastSavedAt, saveNow } = useAutosave({
  onSave: async () => {
    await pageAdminApi.updatePage(pageId, {
      slug, title, content: serializeContent(sections),
      metaTitle, metaDescription, ogImageId, showInNav,
      metaKeywords, ogTitle, ogDescription, noindex, nofollow,
    });
    queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
  },
  debounceMs: 3000,
  fallbackMs: 30000,
});

// Call markDirty() in all state setters:
// setTitle, setSlug, setSections, setMetaTitle, etc.
```

**Step 2: Update EditorToolbar for save status**

Add new props:
```typescript
interface EditorToolbarProps {
  // ... existing props
  isDirty: boolean;
  isAutosaving: boolean;
  lastSavedAt: Date | null;
}
```

Display save status:
- `isAutosaving` → "Ukládání..."
- `!isDirty && lastSavedAt` → "Uloženo v {time}"
- `isDirty` → "Neuložené změny"

Manual "Uložit" button calls `saveNow()` instead of old save mutation.

**Step 3: Remove old saveMutation** (replaced by autosave)

Keep publish/unpublish mutations — they call `saveNow()` first, then publish.

**Step 4: Test in browser**

- Edit title → wait 3s → see "Ukládání..." → "Uloženo"
- Edit continuously → save fires at 30s
- Click "Uložit" → immediate save
- Close tab with unsaved changes → browser warns

**Step 5: Commit**

```
feat(web): integrate autosave into page editor with status display
```

---

## Phase 4: Frontend Revisions UI

### Task 13: Revision list in editor settings panel

**Files:**
- Create: `packages/api-client/src/pages.ts` (add revision endpoints)
- Create: `apps/web/src/components/admin/editor/RevisionList.tsx`
- Modify: `apps/web/src/components/admin/editor/FullPageEditor.tsx` (settings panel)

**Step 1: Add API client endpoints**

```typescript
// In pageAdminApi:
getRevisions: (pageId: string) => api.get<RevisionResponse[]>(`/api/admin/pages/${pageId}/revisions`),
restoreRevision: (pageId: string, revisionId: string) => api.post<PageDetailResponse>(`/api/admin/pages/${pageId}/revisions/${revisionId}/restore`),
```

**Step 2: Create RevisionList component**

Shows list of published versions with:
- Version number, title, date, who published
- "Obnovit" (restore) button per revision
- Confirmation dialog before restore

**Step 3: Add to editor settings panel**

Wire into the existing settings sidebar in FullPageEditor.

**Step 4: Test in browser**

**Step 5: Commit**

```
feat(web): add revision list and restore ui in editor
```

---

## Phase 5: Impersonation

### Task 14: Impersonation backend

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/auth/internal/ImpersonationController.java`
- Create: `apps/backend/src/main/java/cz/samofujera/auth/internal/ImpersonationFilter.java`

**Step 1: Write integration test**

```java
@Test
void startImpersonation_setsSessionFlag() { ... }

@Test
void stopImpersonation_clearsSessionFlag() { ... }

@Test
void getEndpoint_returnsImpersonatedUserData() { ... }

@Test
void postEndpoint_returns403InImpersonationMode() { ... }

@Test
void impersonation_forbiddenForNonAdmin() { ... }
```

**Step 2: Implement ImpersonationController**

```java
@RestController
@RequestMapping("/api/admin/impersonate")
class ImpersonationController {

    @PostMapping("/{userId}")
    ResponseEntity<Void> startImpersonation(@PathVariable UUID userId, HttpSession session) {
        // Verify caller is ADMIN or SUPERADMIN
        // Store impersonating_user_id in session
        // Audit log
        return ResponseEntity.ok().build();
    }

    @PostMapping("/stop")
    ResponseEntity<Void> stopImpersonation(HttpSession session) {
        // Remove impersonating_user_id from session
        // Audit log
        return ResponseEntity.ok().build();
    }

    @GetMapping("/status")
    ResponseEntity<ApiResponse<ImpersonationStatus>> getStatus(HttpSession session) {
        // Return current impersonation state (who is being impersonated)
    }
}
```

**Step 3: Implement ImpersonationFilter**

Servlet filter that:
- Checks session for `impersonating_user_id`
- For GET requests: swaps `SecurityContext` principal to impersonated user
- For non-GET (POST/PUT/DELETE): returns 403 with message

Register as a Spring bean, ordered after security filters.

**Step 4: Run tests**

Run: `cd apps/backend && mvn test`
Expected: PASS

**Step 5: Commit**

```
feat(backend): add impersonation endpoints and read-only filter
```

---

### Task 15: Impersonation UI in admin bar

**Files:**
- Modify: `apps/web/src/components/nav/AdminBar.tsx`
- Modify: `apps/web/src/components/nav/PublicAuthProvider.tsx`
- Modify: `packages/api-client/src/auth.ts` (add impersonation endpoints)

**Step 1: Add API client endpoints**

```typescript
// In authApi or new impersonationApi:
startImpersonation: (userId: string) => api.post(`/api/admin/impersonate/${userId}`),
stopImpersonation: () => api.post(`/api/admin/impersonate/stop`),
getImpersonationStatus: () => api.get<ImpersonationStatus>(`/api/admin/impersonate/status`),
```

**Step 2: Update PublicAuthProvider**

Add impersonation state to context:
```typescript
interface PublicAuthContextValue {
  // ... existing
  impersonating: { id: string; name: string; email: string } | null;
  stopImpersonation: () => void;
}
```

Fetch impersonation status on mount alongside profile.

**Step 3: Update AdminBar for impersonation mode**

```typescript
if (impersonating) {
  return (
    <div className="flex h-12 items-center border-b border-orange-300 bg-orange-50 px-4">
      <div className="flex flex-1 items-center gap-2 text-sm text-orange-800">
        <Eye className="h-3.5 w-3.5" />
        {t`Prohlížíte jako: ${impersonating.name}`}
      </div>
      <Button variant="ghost" size="sm" onClick={stopImpersonation}
              className="h-7 text-xs text-orange-800 hover:bg-orange-100">
        {t`Ukončit`}
      </Button>
    </div>
  );
}
```

**Step 4: Test in browser**

**Step 5: Commit**

```
feat(web): add impersonation ui in admin bar
```

---

### Task 16: Impersonation trigger in admin user management

**Files:**
- Modify relevant admin user list component (add "Prohlížet jako" button per user)

This connects the impersonation start action to the user management UI. The exact component depends on existing admin user list implementation.

**Step 1: Add impersonation button to user list**

**Step 2: Test full flow**

- Go to admin → users → click "Prohlížet jako" on a user
- Admin bar changes to orange impersonation mode
- Navigate public pages as that user
- Click "Ukončit" → back to normal admin view

**Step 3: Commit**

```
feat(web): add impersonation trigger in admin user management
```

---

## Phase 6: Final Verification

### Task 17: Run all tests and verify

**Step 1: Run backend tests**

Run: `cd apps/backend && mvn test`
Expected: ALL PASS

**Step 2: Run frontend lint and typecheck**

Run: `pnpm turbo lint && pnpm turbo typecheck`
Expected: No errors

**Step 3: Manual smoke test**

1. Login as admin → admin bar visible
2. Visit CMS page → "Upravit stránku" button works
3. Edit page → autosave fires, status shows correctly
4. Publish → revision created
5. Edit draft after publish → public page shows old published version
6. Restore old revision → draft content changes
7. Impersonation flow works end-to-end

**Step 4: Final commit and push**

```
chore: verify all tests pass for versioning and roles feature
```
