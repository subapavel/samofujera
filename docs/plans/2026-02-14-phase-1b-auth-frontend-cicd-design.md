# Phase 1B — Auth, Frontend & CI/CD Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan.

**Goal:** Complete the foundation phase with authentication, email, frontend app shells, and CI/CD pipelines.

**Scope:** Backend auth module (Spring Security 7 + Spring Session Redis), device tracking, account blocking, GDPR deletion, email system (React Email pre-compiled), frontend foundation (Astro + admin SPA + customer SPA + shadcn/ui + i18n), GitHub Actions CI/CD, Playwright e2e.

---

## 1. Authentication Architecture

Spring Security 7 (ships with Spring Boot 4.0.2) with servlet-based `HttpSecurity`. Session-based auth using Spring Session Redis with 30-day sliding TTL.

### Module Structure

**Auth module** (`cz.samofujera.auth`):
- Public API: `AuthService`, `AuthController`, DTO records
- Internal: `UserRepository`, `SessionTrackingService`, `DeviceFingerprintService`, `PasswordResetTokenRepository`
- Events: `UserRegisteredEvent`, `PasswordResetRequestedEvent`, `UserBlockedEvent`, `UserDeletedEvent`, `UserUnblockedEvent`

**User module** (`cz.samofujera.user`):
- Public API: `UserService`, `UserController` (profile endpoints)
- Internal: `UserRepository` (JOOQ)

**Email module** (`cz.samofujera.email`):
- Internal: `EmailService`, pre-compiled HTML templates
- Listens to domain events via `@ApplicationModuleListener`

### Security Config

- Public endpoints: `/api/auth/**`
- Protected endpoints: `/api/me/**`, `/api/admin/**`
- Admin role required for `/api/admin/**`
- BCrypt password hashing
- CSRF disabled (API-only, cookie-based session)
- CORS configured for frontend origins
- Blocked user check on every authenticated request

### API Endpoints

Public:
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

Protected:
```
GET    /api/me
PUT    /api/me
PUT    /api/me/locale
DELETE /api/me                          # GDPR deletion
GET    /api/me/sessions
DELETE /api/me/sessions/{sessionId}
```

Admin:
```
POST   /api/admin/users/{id}/block
POST   /api/admin/users/{id}/unblock
```

---

## 2. Database Schema

### V3 — user_sessions table

```sql
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    device_fingerprint VARCHAR(255),
    device_name VARCHAR(255),
    ip_address VARCHAR(45),
    last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id, last_active_at DESC);
```

### V4 — password_reset_tokens table

```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_password_reset_token ON password_reset_tokens(token) WHERE used_at IS NULL;
```

Spring Session stores in Redis (`spring:session:*`), not PostgreSQL. The `user_sessions` table is our device tracking layer.

---

## 3. Device Tracking & Concurrent Sessions

Device fingerprint generated server-side from: `User-Agent` + `Accept-Language` + custom `X-Device-Fingerprint` header (frontend sends screen resolution + timezone). Hashed to stable string.

### Login Flow

1. Compute device fingerprint from request
2. Check `user_sessions` count for user
3. If at limit (3 concurrent sessions):
   - Return `409 Conflict` with existing device info
   - Frontend shows conflict dialog
   - Client retries with `?force=true` to invalidate oldest session
4. Create Spring Session in Redis + insert `user_sessions` row
5. On logout / session expiry — delete from both

### Session Sync

`SessionEventListener` listens to Spring Session `SessionDeletedEvent` / `SessionExpiredEvent` to clean up `user_sessions` rows.

`GET /api/me/sessions` returns list from `user_sessions` table.
`DELETE /api/me/sessions/{sessionId}` invalidates Spring Session + removes row.

---

## 4. Account Blocking & GDPR Deletion

### Blocking

1. Check active subscription (stub returns false — Stripe is Phase 2)
2. Set `users.blocked_at = NOW()`
3. Invalidate all user sessions (Redis + `user_sessions`)
4. Publish `UserBlockedEvent` → email notification

### Unblocking

1. Set `users.blocked_at = NULL`
2. Publish `UserUnblockedEvent` → email notification

### GDPR Deletion

1. Require password confirmation
2. Check active subscription (stub)
3. Anonymize: email → `deleted-{uuid}@anonymized.local`, name → `Smazaný uživatel`, nullify password_hash/stripe_customer_id/avatar_url
4. Set `users.deleted_at = NOW()`
5. Invalidate all sessions
6. Publish `UserDeletedEvent` → confirmation email (to original address)

Orders preserved (accounting law).

---

## 5. Email System

React Email templates pre-compiled at build time in `packages/emails/`. A Node script renders components to static HTML with `{{placeholder}}` variables. Java backend loads HTML and does string replacement.

### Templates

| Template | Trigger Event |
|----------|--------------|
| `welcome.html` | `UserRegisteredEvent` |
| `password-reset.html` | `PasswordResetRequestedEvent` |
| `account-blocked.html` | `UserBlockedEvent` |
| `account-unblocked.html` | `UserUnblockedEvent` |
| `account-deleted.html` | `UserDeletedEvent` |

### Infrastructure

- `spring-boot-starter-mail` dependency
- Dev: Mailpit SMTP (`localhost:1025`)
- Prod: Resend SMTP (`smtp.resend.com:465`)
- Email module listens to events via `@ApplicationModuleListener`

---

## 6. Frontend Foundation

### Packages

| Package | Purpose |
|---------|---------|
| `apps/web` | Astro public site (homepage, auth pages) |
| `apps/admin` | React SPA (admin panel shell) |
| `apps/customer` | React SPA (customer dashboard shell) |
| `packages/ui` | Shared shadcn/ui components, brand theme |
| `packages/config` | Shared Tailwind 4 CSS preset, ESLint, TypeScript |
| `packages/api-client` | Typed fetch wrapper for backend API |
| `packages/i18n` | Lingui setup with cs/sk catalogs |

### Astro Web (`apps/web`)

- Static output for Cloudflare Pages
- React islands for interactive components (login/register forms)
- Pages: `/`, `/prihlaseni`, `/registrace`, `/zapomenute-heslo`, `/reset-hesla`
- Layout with header, footer, brand styling

### Admin SPA (`apps/admin`)

- React 19 + TanStack Router + TanStack Query
- Routes: `/admin/` (dashboard placeholder), `/admin/users` (placeholder)
- Auth guard — redirects to login if no session

### Customer SPA (`apps/customer`)

- React 19 + TanStack Router + TanStack Query
- Routes: `/dashboard/`, `/dashboard/sessions`, `/dashboard/profile`, `/dashboard/delete-account`
- Auth guard — redirects to login if no session

### shadcn/ui Theme (`packages/ui`)

- Tailwind 4 CSS with `@theme` directive, OKLCH brand colors
- Components: Button, Input, Card, Dialog, Form, Alert

### i18n (`packages/i18n`)

- Lingui with Czech catalog (Slovak structure ready, empty)
- All auth-related strings

---

## 7. CI/CD

### GitHub Actions Workflows

**`backend.yml`** — triggers on `backend/**`:
- Java 25 setup, `./mvnw verify` (Testcontainers)
- Deploy to Fly.io on `main`

**`frontend.yml`** — triggers on `apps/**`, `packages/**`:
- pnpm install, turbo lint/typecheck/test/build
- Playwright e2e
- Deploy to Cloudflare Pages on `main`

**`commitlint.yml`** — triggers on PRs:
- Validates commit messages

### Test Strategy

| Layer | Tool | What |
|-------|------|------|
| Backend unit | JUnit 5 + Mockito | AuthService, UserService, DeviceFingerprintService |
| Backend integration | Testcontainers | Repository tests, full auth flow |
| Backend architecture | Spring Modulith | Module boundaries |
| Frontend unit | Vitest | API client, utilities, components |
| E2E | Playwright | Register → login → sessions → logout |

---

## 8. Deviations from architektura.md

| Topic | architektura.md | Phase 1B Decision | Reason |
|-------|----------------|-------------------|--------|
| Email rendering | React Email at runtime | Pre-compiled HTML with placeholders | Java backend can't run Node |
| Concurrent session limit | 3 normal, 1 live | 3 for all | Live lectures are Phase 4 |
| Subscription check | Full Stripe check | Stub returning false | Stripe is Phase 2 |
| Build tool in CI | Gradle | Maven | Phase 1A decision |
| Entitlement revocation | Full event listener | Event published, no listener | Entitlements are Phase 2+ |

---

## 9. Dependencies to Add

### Backend (`pom.xml`)

```xml
<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Spring Session Redis -->
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>

<!-- Mail -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<!-- Security test -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

### Frontend (new packages)

- `apps/web`: astro, @astrojs/react, @astrojs/tailwind, react, react-dom
- `apps/admin`: react, react-dom, @tanstack/react-router, @tanstack/react-query, vite
- `apps/customer`: same as admin
- `packages/ui`: tailwindcss, shadcn/ui components
- `packages/i18n`: @lingui/core, @lingui/react, @lingui/cli
- `packages/api-client`: typed fetch (no external dep)
- Root: playwright, vitest
