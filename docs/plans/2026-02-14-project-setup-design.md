# Project Setup Design — CLAUDE.md & Skills Infrastructure

**Date:** 2026-02-14
**Status:** Approved

## Goal

Establish the foundational project configuration for vibe-coding the Samo Fujera
platform with Claude. This includes the CLAUDE.md project rules file and 23 custom
Claude Code skills.

## Context

The project has a comprehensive architecture document (`architektura.md`, Czech) that
serves as an orientational guide. The platform is a solopreneur content & commerce
system for personal development, health, and spiritual growth.

Key constraint: this project is fully vibe-coded with Claude's help. All rules,
conventions, and skills must be designed to ensure Claude produces correct, tested,
consistent code every time.

## Decisions Made

### Critical Rules (in priority order)
1. **Brainstorm before implementing** — architecture is orientational, not definitive
2. **Use Context7 MCP** for all library documentation lookups — never assume
3. **No untested code** — TDD from day one, test infrastructure first
4. **Conventional commits** — English, lowercase, with project-specific scopes
5. **All strings through i18n** — Lingui (FE) + MessageSource (BE), even for Czech-only
6. **Feature flags from day one** — DB-backed with Redis cache
7. **Module boundaries sacred** — Spring Modulith event-driven communication
8. **JOOQ only** — no JPA, no raw SQL
9. **pnpm only** — no npm, no yarn

### Technology Adjustments from Reference Architecture
- **Tailwind CSS 4** instead of 3 (CSS-based config with `@theme`, OKLCH colors)
- **pnpm** instead of npm (monorepo package manager)

### Skills Inventory (23 total)

#### Backend Generators (6)
| Skill | Purpose |
|-------|---------|
| `spring-module` | Scaffold Spring Modulith module with full structure |
| `flyway-migration` | Create versioned migration with auto-detection |
| `jooq-regen` | Run JOOQ code generation pipeline |
| `jooq-repository` | Create JOOQ repository with type-safe queries |
| `api-endpoint` | Full vertical slice with tests |
| `stripe-webhook` | Add webhook handler with event publishing |

#### Frontend Generators (7)
| Skill | Purpose |
|-------|---------|
| `astro-page` | Astro page with layout, i18n, SEO |
| `tanstack-route` | TanStack Router route with loader |
| `tanstack-query-hook` | Query/mutation hook with optimistic updates |
| `react-component` | React 19 component with project patterns |
| `shadcn-component` | Customize shadcn/ui for project theme |
| `email-template` | React Email template with i18n |
| `lingui-extract` | Extract and manage i18n catalogs |

#### Cross-Cutting Generators (2)
| Skill | Purpose |
|-------|---------|
| `feature-flag` | End-to-end feature flag creation |
| `api-client-endpoint` | Typed endpoint in shared api-client |

#### Convention/Reference Skills (5, auto-loaded)
| Skill | Triggers on |
|-------|-------------|
| `tailwind4-conventions` | Any CSS/styling work |
| `spring-modulith-conventions` | Backend module work |
| `react19-conventions` | React component work |
| `cloudflare-conventions` | R2/Stream integration |
| `testcontainers-conventions` | Integration test work |

#### Workflow Skills (3, user-invocable only)
| Skill | Purpose |
|-------|---------|
| `phase-kickoff` | Enforce brainstorm -> design -> plan workflow |
| `deploy` | Deploy to Fly.io + Cloudflare Pages |
| `ci-pipeline` | Create/update GitHub Actions workflow |

## Artifacts Created
- `CLAUDE.md` — Project rules and conventions
- `docs/plans/2026-02-14-project-setup-design.md` — This document
- `.claude/skills/` — Directory for 23 custom skills (to be created)

## Next Steps
1. Initialize git repository
2. Create all 23 skills as SKILL.md files in `.claude/skills/`
3. Begin Phase 1 implementation (brainstorm first per critical rule #1)
