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
| Backend        | Java 25, Quarkus 3 (Hibernate Reactive, Panache)        |
| DB Access      | Hibernate Reactive Panache, Flyway migrations            |
| Auth           | Custom session auth (DB-backed sessions, cookie-based)   |
| Payments       | Stripe (one-time + subscriptions)                       |
| Storage        | Cloudflare R2 (files), Cloudflare Stream (video)        |
| Email          | React Email templates, Resend (prod), Mailpit (dev)     |
| Hosting        | Fly.io FRA (backend + Postgres + Redis), CF Workers (FE) |
| Monorepo       | Turborepo + pnpm                                        |
| CI/CD          | GitHub Actions                                          |

## Workflow — 3 Tiers

| Size | Examples | Workflow |
|------|----------|----------|
| **Large** (new phase, module, architecture) | Phase 2 Catalog, membership module | Brainstorm → Design doc → Implementation plan → Implement |
| **Medium** (new endpoint, page, component) | API endpoint, admin page | Short plan in chat (5-10 points) → Implement |
| **Small** (bug fix, UI tweak, refactor) | CSS fix, rename, text change | Implement directly, show result |

## Critical Rules

### 1. Editor and public view MUST use identical CSS
Admin page editor and public PageRenderer share the exact same CSS classes.
Both render inside `.page-content` — use shared CSS classes in `global.css`.
When changing any visual style, update the shared class and verify it in BOTH.

### 2. Ask before acting — scaled to change size
- **Large changes**: Always ask and get approval before starting
- **Within an approved plan**: Work autonomously, don't ask for each step
- **Small changes** (bug fix, refactor): Implement directly, show the result

### 3. Stay on plan
When working through an implementation plan, don't start fixing unrelated bugs
or making changes outside the plan. Ask first how to handle it — add to plan,
separate task, or discuss.

### 4. Brainstorm for large changes only
Brainstorming is mandatory for **large** changes (new modules, phases, architecture
decisions). For medium and small changes, skip brainstorming.

### 5. Use Context7 for documentation
ALWAYS use Context7 MCP to look up current library docs before writing code.
Never assume API signatures or config options. This applies to ALL stack technologies.

### 6. No untested code — ever
- Backend: Testcontainers (PostgreSQL, Redis) for integration tests
- Frontend: Vitest for unit tests
- E2E: Playwright — must be actually run, not just written
- TDD workflow: red → green → refactor
- Never claim code is done without green tests

### 7. Conventional commits (English, lowercase)
Format: `<type>(<scope>): <description>`

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

Scopes: `backend`, `web`, `admin`, `customer`, `ui`, `api-client`, `emails`,
`i18n`, `config`, `deps`, `infra`

Rules: lower-case subject, no period, max 100 chars, scope optional but encouraged.

### 8. All strings through i18n
Every user-facing string through Lingui (frontend) or MessageSource (backend).
Czech: one/few/many/other. Slovak: one/few/other.

### 9. Feature flags from day one
Every new feature behind a flag. DB-backed with Redis cache.

### 10. Panache entities — no raw SQL
All database access through Hibernate Reactive Panache entities.

### 12. pnpm only — no npm, no yarn

### 13. Next.js App Router conventions
Route groups: `(public)` (SSR/SEO), `(auth)` (login/register), `(dashboard)` (admin + customer, client components).
Middleware protects `/admin` and `/muj-ucet` via `SESSION` cookie. `AuthGuard` validates client-side.

## Code Conventions

### Backend (Java/Quarkus)
- Package: `cz.samofujera.<module>` (auth, domain, security, realtime)
- Panache entities extend `PanacheEntityBase`, public fields
- Records for DTOs, `@Inject` for CDI injection, PascalCase/camelCase/UPPER_SNAKE
- RESTEasy Reactive endpoints with `Uni<>` return types
- `@WithTransaction` for write operations

### Frontend (TypeScript/React)
- Strict TypeScript — no `any`, no `// @ts-ignore`
- React 19 functional components, named exports, one component per file
- `use()` hook for promises/context, ref as prop (no forwardRef)
- TanStack Query for server state, shadcn/ui from `packages/ui/`
- Always handle loading, error, and empty states

### Tailwind 4
- CSS-based config via `@theme {}` — NO tailwind.config.js
- OKLCH color space, shared preset from `packages/config/tailwind/`
- Never hardcode colors — use theme tokens (`bg-earth`, `text-sage`)
- **Gotcha**: `hover:text-[rgb(...)]` silently fails — use plain CSS classes instead

### Cloudflare R2 & Stream
- R2: S3-compatible presigned URLs (AWS SDK v2), 15-min TTL, bind to IP
- R2 keys: `originals/<assetId>/`, `watermarked/<userId>/`, `thumbnails/<productId>/`
- Stream: Local JWT signing with signing key (not API calls per token)
- Stream tokens: `sub=video-uid`, `exp=duration+30min`, `accessRules` with IP
- Rate limit downloads: max 5/hour/user (Redis counter)

### Quarkus Patterns
- Custom session auth via `SessionAuthMechanism` (cookie-based, DB sessions)
- Superadmin: set `SUPERADMIN_EMAIL` env var — user registering with that email gets ADMIN role
- CSRF filter checks Origin/Referer headers on mutating requests
- SSE for real-time updates via PostgreSQL LISTEN/NOTIFY

### Database
- Flyway migrations (`V{number}__{description}.sql`), UUIDs for PKs
- `created_at`/`updated_at` on every table, soft deletes where specified
- JSONB for flexible/nested data

## UI Development Workflow

### Live Preview
Use Claude Code live preview — start dev server and check result directly.
Don't ask user to screenshot — look yourself.

### Playwright for Visual Verification
For complex UI interactions, use Playwright to verify the result.

### UI Rules
- Always mobile-first
- Every component: loading, error, and empty state
- Use shadcn/ui components — don't reinvent
- Tailwind 4 with `@theme`, OKLCH colors, shared design system

## Agent Teams

For complex tasks, use Claude Code Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).

### When to use
- Cross-layer features (frontend + backend + DB simultaneously)
- Code review from multiple angles (security, performance, tests)
- Parallel implementation of independent parts

### When NOT to use
- Sequential tasks (step depends on previous)
- Small changes (single file edit)
- Work on the same file

### Team configurations

**Feature implementation:** Architect (API contract, DB schema) + Frontend dev + Backend dev + Reviewer

**Code review:** Security reviewer (OWASP, auth) + Performance reviewer (N+1, rendering) + Test coverage reviewer

### Team rules
- Each teammate works autonomously within their assignment
- Team lead synthesizes results and presents to user
- Small teams (2-3) work better than large ones
- Always plan-first: approve plan BEFORE launching team

## Development Workflow

### Branch Strategy
```
main <- develop <- feature/<phase>-<description>
                <- fix/<description>
```

### Local Dev
```bash
docker compose up -d          # PostgreSQL, Redis, Mailpit, MinIO
cd apps/backend-quarkus && ./mvnw quarkus:dev -Dquarkus.http.host=0.0.0.0
pnpm dev                      # from apps/web
```

## Project Structure

```
samofujera/
├── architektura.md              # Architecture guide (Czech) — orientational
├── CLAUDE.md                    # This file
├── docs/plans/                  # Design docs and implementation plans
├── .claude/skills/              # Custom project skills
├── apps/
│   ├── web/                     # Next.js 16 app
│   └── backend-quarkus/         # Quarkus 3 (Hibernate Reactive, Panache)
├── packages/
│   ├── ui/                      # Shared shadcn/ui components
│   ├── api-client/              # Typed API client
│   ├── emails/                  # React Email templates
│   ├── i18n/                    # Shared translations (Lingui)
│   ├── config/                  # Shared Tailwind/ESLint/TS config
│   └── utils/                   # Shared formatters, validators
├── docker-compose.yml
├── turbo.json
├── commitlint.config.js
└── package.json                 # pnpm workspace root
```

## Skills Reference (`.claude/skills/`)

**Backend:** `flyway-migration`, `api-endpoint`, `stripe-webhook`

**Frontend:** `nextjs-page`, `tanstack-query-hook`, `react-component`, `shadcn-component`, `email-template`, `lingui-extract`

**Cross-cutting:** `feature-flag`, `api-client-endpoint`

**Workflow:** `phase-kickoff`, `deploy`, `ci-pipeline`
