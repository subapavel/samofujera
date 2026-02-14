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
| Frontend       | Astro, React 19, TanStack Router, TanStack Query        |
| UI Components  | shadcn/ui (customized brand theme)                      |
| Styling        | Tailwind CSS 4 (CSS-based config, `@theme` directive)   |
| i18n           | Lingui (ICU MessageFormat, cs/sk plurals)               |
| Backend        | Java 25, Spring Boot 4, Spring Modulith 2               |
| DB Access      | JOOQ (generated from schema), Flyway migrations         |
| Auth           | Spring Security + Spring Session (Redis, 30-day TTL)    |
| Payments       | Stripe (one-time + subscriptions)                       |
| Storage        | Cloudflare R2 (files), Cloudflare Stream (video)        |
| Email          | React Email templates, Resend (prod), Mailpit (dev)     |
| Hosting        | Fly.io WAW (backend + Postgres + Redis), CF Pages (FE)  |
| Monorepo       | Turborepo + pnpm                                        |
| CI/CD          | GitHub Actions                                          |

## Critical Rules

### 1. Brainstorm before implementing
Before starting any phase or major feature, ALWAYS brainstorm first using the
brainstorming skill. The architecture in `architektura.md` is orientational — if a
better approach is found, we take it. Explore intent, requirements, and alternatives.

### 2. Use Context7 for documentation
ALWAYS use the Context7 MCP tool to look up current library documentation before
writing code. Never assume API signatures, configuration options, or best practices.
Check first. This applies to ALL technologies in the stack.

### 3. No untested code — ever
Every piece of code must be tested before delivery. Run tests, verify they pass,
fix errors until green. No exceptions.

- Structure the project for testability from day one
- Backend: Testcontainers (PostgreSQL, Redis) for integration tests
- Frontend: Vitest for unit tests
- E2E: Playwright for full flow verification
- TDD workflow: red -> green -> refactor
- Never claim code is done without running tests and showing green output

### 4. Conventional commits (English, lowercase)
Format: `<type>(<scope>): <description>`

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

Scopes (warning-level — flexible):
- `backend`    — Spring Boot application
- `web`        — Astro public site
- `admin`      — Admin React SPA
- `customer`   — Customer dashboard React SPA
- `ui`         — Shared shadcn/ui components
- `api-client` — Shared typed API client
- `emails`     — React Email templates
- `i18n`       — Translations
- `config`     — Configuration files
- `deps`       — Dependencies
- `infra`      — Docker, CI/CD, deployment

Rules: lower-case subject, no period, max 100 chars, scope optional but encouraged.

### 5. All strings through i18n
Every user-facing string goes through Lingui (frontend) or MessageSource (backend).
Even if only Czech exists initially. ICU MessageFormat for plurals.

Czech has 4 plural forms: one, few, many, other.
Slovak has 3 plural forms: one, few, other.

### 6. Feature flags from day one
Every new feature behind a flag. DB-backed with Redis cache.

### 7. Module boundaries are sacred
Spring Modulith modules communicate only through public APIs and events.
Never access another module's `internal/` package directly.

### 8. JOOQ only — no JPA, no raw SQL
All database access through JOOQ generated classes. Type-safe queries only.

### 9. pnpm only
Use pnpm for all frontend/monorepo operations. No npm, no yarn.

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
- TanStack Query for all server state
- TanStack Router for SPA routing (admin, customer dashboard)
- Astro pages for public/SEO content
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
│   ├── web/                     # Astro (public website, SSR)
│   ├── admin/                   # React SPA (admin panel)
│   ├── customer/                # React SPA (customer dashboard)
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
- `astro-page` — Astro page with layout, i18n, SEO
- `tanstack-route` — TanStack Router route with loader and type-safe params
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
