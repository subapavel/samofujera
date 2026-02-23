# Samo Fujera Platform

Solopreneur platform for personal development, health, and spiritual growth.
Sells digital downloads, streaming content, physical products, memberships,
events, and vouchers.

## Architecture Reference

The architecture spec lives in `architektura.md` (Czech). It is an **orientational
guide — not definitive**. It covers: database schema, API endpoints, module structure,
event flows, deployment config, design system, and roadmap.

**If we find a better solution during brainstorming, we go that way.**

## Tech Stack

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| Frontend       | Next.js 16 (App Router), React 19, TanStack Query       |
| UI Components  | shadcn/ui (customized brand theme)                      |
| Styling        | Tailwind CSS 4 (CSS-based config, `@theme` directive)   |
| i18n           | Lingui (ICU MessageFormat, cs/sk plurals)               |
| Backend        | Java 25, Spring Boot 4, Spring Modulith 2               |
| DB Access      | JOOQ (generated from schema), Flyway migrations         |
| Auth           | Spring Security + Spring Session (Redis, 30-day TTL)    |
| Payments       | Stripe (one-time + subscriptions)                       |
| Storage        | Cloudflare R2 (files), Cloudflare Stream (video)        |
| Email          | React Email templates, Resend (prod), Mailpit (dev)     |
| Hosting        | Fly.io FRA (backend + Postgres + Redis), CF Workers (FE) |
| Monorepo       | Turborepo + pnpm                                        |
| CI/CD          | GitHub Actions                                          |

## Critical Rules

### 1. Editor and public view MUST use identical CSS
The admin page editor and the public PageRenderer MUST share the exact same CSS
classes and rules. NEVER create separate styles, overrides, or Tailwind utility
classes for one that don't apply to the other. Both render inside `.page-content`
— use shared CSS classes defined in `global.css` for all visual elements
(separators, buttons, typography, spacing). When adding or changing any visual
style, update the shared CSS class and verify it applies in BOTH the editor
component AND the PageRenderer. This is essential for template consistency.

### 2. ALWAYS ask before taking action
NEVER assume what the user wants. ALWAYS ask first, then act. This applies to
ALL changes — CSS, code, file edits, architecture decisions. Present what you
plan to do and wait for approval before making any change. The only exception
is when the user explicitly tells you to "just do it" or gives a direct instruction
with no ambiguity.

### 3. Never implement bugs/fixes outside of a plan
When working through an implementation plan, NEVER start implementing bug fixes
or other changes that come up outside the plan. Always ask the user first how
they want to handle it — add it to the current plan, create a separate task, or
discuss the approach. This applies even for "obvious" fixes. Ask first, act second.

### 4. Brainstorm before implementing
Before starting any phase or major feature, ALWAYS brainstorm first using the
brainstorming skill. The architecture in `architektura.md` is orientational — if a
better approach is found, we take it. Explore intent, requirements, and alternatives.

### 5. Use Context7 for documentation
ALWAYS use the Context7 MCP tool to look up current library documentation before
writing code. Never assume API signatures, configuration options, or best practices.
Check first. This applies to ALL technologies in the stack.

### 6. No untested code — ever
Every piece of code must be tested before delivery. Run tests, verify they pass,
fix errors until green. No exceptions.

- Structure the project for testability from day one
- Backend: Testcontainers (PostgreSQL, Redis) for integration tests
- Frontend: Vitest for unit tests
- E2E: Playwright for full flow verification
- TDD workflow: red -> green -> refactor
- Never claim code is done without running tests and showing green output
- **E2E tests MUST be verified by actually running them.** When writing E2E tests,
  start the backend and frontend yourself (Docker is always running) and execute
  the tests to confirm they pass. Never deliver E2E tests without running them.

### 7. Conventional commits (English, lowercase)
Format: `<type>(<scope>): <description>`

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

Scopes (warning-level — flexible):
- `backend`    — Spring Boot application
- `web`        — Next.js frontend app
- `admin`      — Admin section (/admin)
- `customer`   — Customer dashboard (/muj-ucet)
- `ui`         — Shared shadcn/ui components
- `api-client` — Shared typed API client
- `emails`     — React Email templates
- `i18n`       — Translations
- `config`     — Configuration files
- `deps`       — Dependencies
- `infra`      — Docker, CI/CD, deployment

Rules: lower-case subject, no period, max 100 chars, scope optional but encouraged.

### 8. All strings through i18n
Every user-facing string goes through Lingui (frontend) or MessageSource (backend).
Even if only Czech exists initially. ICU MessageFormat for plurals.

Czech has 4 plural forms: one, few, many, other.
Slovak has 3 plural forms: one, few, other.

### 9. Feature flags from day one
Every new feature behind a flag. DB-backed with Redis cache.

### 10. Module boundaries are sacred
Spring Modulith modules communicate only through public APIs and events.
Never access another module's `internal/` package directly.

### 11. JOOQ only — no JPA, no raw SQL
All database access through JOOQ generated classes. Type-safe queries only.

### 12. pnpm only
Use pnpm for all frontend/monorepo operations. No npm, no yarn.

### 13. Next.js App Router conventions
The frontend uses Next.js 16 App Router with route groups:
- `(public)` — marketing/SEO pages (server components)
- `(auth)` — login, register, password reset pages
- `(dashboard)` — admin + customer sections (client components with TanStack Query)

Middleware (`src/middleware.ts`) protects `/admin` and `/muj-ucet` by checking
the `SESSION` cookie. `AuthGuard` component validates the session client-side
and checks roles for admin access.

## Code Conventions

### Backend (Java/Spring)
- Package structure: `cz.samofujera.<module>` with `internal/` and `event/` sub-packages
- Public API: Service classes and Records (DTOs) at module root
- Internal: Repositories, implementation details inside `internal/`
- Events: Domain events inside `event/`
- Naming: PascalCase classes, camelCase methods, UPPER_SNAKE enums
- Records for DTOs, not classes
- Constructor injection (no @Autowired on fields)

### Frontend (TypeScript/React)
- Strict TypeScript — no `any`, no `// @ts-ignore`
- React 19 functional components only
- Next.js App Router for all routing (file-based)
- TanStack Query for client-side server state (dashboard sections)
- Server components for public/SEO pages, client components for interactive dashboard
- `useRouter()` / `usePathname()` / `useParams()` from `next/navigation`
- `Link` from `next/link` for all internal navigation
- shadcn/ui components from shared `packages/ui/`
- Named exports, barrel files via `index.ts`

### Styling (Tailwind 4)
- Tailwind 4 uses CSS-based configuration, NOT tailwind.config.js
- Theme customization via `@theme { }` directive in CSS
- OKLCH color space for theme colors (shadcn/ui v4 standard)
- Brand colors, fonts, and design tokens defined in shared CSS preset
- Use Context7 to verify exact Tailwind 4 syntax before implementation

### Database
- All migrations through Flyway (`V{number}__{description}.sql`)
- UUIDs for all primary keys
- `created_at` / `updated_at` on every table
- Soft deletes where specified (`deleted_at`, `blocked_at`, `revoked_at`)
- JSONB for flexible/nested data (metadata, features, addresses)

## Development Workflow

### Branch Strategy
```
main <- develop <- feature/<phase>-<description>
                <- fix/<description>
```

### Process per Phase
1. **Brainstorm** — explore requirements, challenge architecture, find best approach
2. **Write design doc** — `docs/plans/YYYY-MM-DD-<topic>-design.md`
3. **Write implementation plan** — step-by-step with test checkpoints
4. **Implement with TDD** — red/green/refactor per feature
5. **Run all tests** — fix until green
6. **Commit** (conventional), PR to develop

### Local Dev
```bash
docker compose up -d          # PostgreSQL, Redis, Mailpit, Stripe CLI
# Backend:
cd apps/backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# Frontend:
pnpm dev                      # from apps/web
```

## Project Structure

```
samofujera/
├── architektura.md              # Architecture guide (Czech) — orientational
├── CLAUDE.md                    # This file — project rules for Claude
├── docs/plans/                  # Design docs and implementation plans
├── .claude/skills/              # Custom project skills
├── apps/
│   ├── web/                     # Next.js 16 app (public + /admin + /muj-ucet)
│   └── backend/                 # Spring Boot 4 + Modulith
├── packages/
│   ├── ui/                      # Shared shadcn/ui components
│   ├── api-client/              # Typed API client (shared)
│   ├── emails/                  # React Email templates
│   ├── i18n/                    # Shared translations (Lingui)
│   ├── config/                  # Shared Tailwind/ESLint/TS config
│   └── utils/                   # Shared formatters, validators
├── docker-compose.yml           # Local dev infrastructure
├── turbo.json                   # Turborepo config
├── commitlint.config.js         # Conventional commits enforcement
└── package.json                 # Root package.json (pnpm workspace)
```

## Skills Reference

### Custom Project Skills (in `.claude/skills/`)

**Backend Generators:**
- `spring-module` — Scaffold Spring Modulith module
- `flyway-migration` — Create versioned migration
- `jooq-regen` — Regenerate JOOQ classes after schema change
- `jooq-repository` — Create JOOQ repository with type-safe queries
- `api-endpoint` — Full vertical slice (controller -> service -> repo -> DTO -> tests)
- `stripe-webhook` — Add Stripe webhook handler

**Frontend Generators:**
- `nextjs-page` — Next.js App Router page with metadata, layout, i18n
- `tanstack-query-hook` — TanStack Query hook (query + mutation + optimistic updates)
- `react-component` — React 19 component following project patterns
- `shadcn-component` — Customize/extend shadcn/ui component for project theme
- `email-template` — React Email template with i18n and brand layout
- `lingui-extract` — Extract strings, update .po catalogs for cs/sk

**Cross-Cutting Generators:**
- `feature-flag` — End-to-end feature flag (migration + backend + frontend)
- `api-client-endpoint` — Add typed endpoint to shared api-client package

**Convention Skills (auto-loaded):**
- `tailwind4-conventions` — Tailwind 4 CSS config patterns
- `spring-modulith-conventions` — Module boundaries, event-driven patterns
- `react19-conventions` — React 19 patterns, strict TypeScript
- `cloudflare-conventions` — R2 presigned URLs, Stream signed tokens
- `testcontainers-conventions` — Integration test setup patterns

**Workflow Skills:**
- `phase-kickoff` — Start new implementation phase (brainstorm -> design -> plan)
- `deploy` — Deploy to Fly.io + Cloudflare Pages
- `ci-pipeline` — Create/update GitHub Actions workflow
