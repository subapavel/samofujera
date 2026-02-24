# Page Versioning, Autosave, Roles & Impersonation

**Date:** 2026-02-24
**Status:** Approved

## Overview

Add page versioning with autosave, refactor user roles to a multi-role model,
prepare review workflow foundation, and implement read-only impersonation for
admin support.

## 1. Roles (refactor)

Migrate from `users.role` VARCHAR column to `user_roles` join table.
A user can have multiple roles simultaneously.

| Role | Permissions |
|------|-------------|
| `SUPERADMIN` | Everything, no restrictions |
| `ADMIN` | System management + force publish + impersonation |
| `EDITOR` | Content management, submits for review |
| `REVIEWER` | Approves/rejects pages |
| `USER` | Customer (default) |

### Migration

```sql
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- Migrate existing data
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users;

-- Existing ADMINs get SUPERADMIN
INSERT INTO user_roles (user_id, role)
SELECT id, 'SUPERADMIN' FROM users WHERE role = 'ADMIN';

ALTER TABLE users DROP COLUMN role;
```

### Auth changes

- `UserDetails` returns `Set<String> roles` instead of single `String role`
- Security checks use `hasRole('ADMIN')` / `hasRole('SUPERADMIN')` etc.
- `SUPERADMIN` bypasses all permission checks
- Frontend `AuthGuard` and `PublicAuthProvider` updated to work with role set

## 2. Page versioning

### New table: `page_revisions`

```sql
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
```

### Changes to `pages` table

```sql
ALTER TABLE pages ADD COLUMN published_revision_id UUID REFERENCES page_revisions(id);
```

### Semantics

- `pages.content` = current draft (autosave overwrites this)
- `pages.published_revision_id` = pointer to the published revision
- Public endpoint reads from `page_revisions` via `published_revision_id`
- Preview mode (admin) reads from `pages.content` (draft)

### Publish flow

1. Save current draft
2. Create snapshot in `page_revisions` (new version number)
3. Set `pages.published_revision_id` to new revision
4. Set `pages.status = 'PUBLISHED'`

### Rollback

- `GET /api/admin/pages/{id}/revisions` — list revisions
- `POST /api/admin/pages/{id}/revisions/{revisionId}/restore` — copy revision content into `pages.content` as new draft

## 3. Autosave

### Trigger logic

- **Debounce 3s** after last change (primary trigger)
- **Fallback 30s** if user edits continuously without pause
- Saves everything: content + title + metadata

### Dirty tracking

- Compare current state with last saved state
- Skip autosave if no changes detected
- `beforeunload` warning when unsaved changes exist

### UI states

- "Uloženo" (saved) — with timestamp
- "Ukládání..." (saving) — during save request
- "Neuložené změny" (unsaved changes) — when dirty

### Manual save

- "Uložit" button remains for immediate save
- Resets autosave timer on manual save

## 4. Review workflow (foundation)

### New table: `page_reviews`

```sql
CREATE TABLE page_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Flow

- Editor submits draft for review
- Reviewers approve/reject with optional comment
- At least 1 approval required to publish
- `ADMIN` / `SUPERADMIN` can force publish without review

### API endpoints

```
POST /api/admin/pages/{id}/request-review    — submit for review
POST /api/admin/pages/{id}/reviews           — approve/reject (reviewer)
```

## 5. Impersonation (read-only)

### Mechanism

- `POST /api/admin/impersonate/{userId}` — start impersonation, stores `impersonating_user_id` in session
- `POST /api/admin/impersonate/stop` — end impersonation
- All GET requests return impersonated user's data
- All mutating requests (POST/PUT/DELETE) blocked → 403 "Read-only impersonation mode"
- Allowed for: `SUPERADMIN`, `ADMIN`

### UI (admin bar)

- Normal state: "Upravit stránku" + "Administrace" + chevron toggle
- Impersonation state: orange background, "Prohlížíte jako: {name}" + "Ukončit" button
- Edit buttons hidden in impersonation mode

### Audit

- Log impersonation events: who, whom, start time, end time

## 6. New API endpoints summary

```
GET    /api/admin/pages/{id}/revisions                  — list page revisions
POST   /api/admin/pages/{id}/revisions/{revId}/restore  — restore revision as draft
POST   /api/admin/impersonate/{userId}                  — start impersonation
POST   /api/admin/impersonate/stop                      — stop impersonation
POST   /api/admin/pages/{id}/request-review             — submit for review
POST   /api/admin/pages/{id}/reviews                    — approve/reject
```
