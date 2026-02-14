# Phase 1A Design — Infrastructure Foundation

**Date:** 2026-02-14
**Status:** Approved

## Goal

Establish the infrastructure foundation for the Samo Fujera platform: monorepo
structure, backend skeleton with working build pipeline, Docker Compose for local
development, and conventional commit enforcement.

## Architecture Decisions

### Deviations from architektura.md

| Topic | architektura.md | Decision | Reason |
|-------|----------------|----------|--------|
| Build tool | Gradle (Kotlin DSL) | **Maven** | User preference |
| Postgres | 16 Alpine | **17 Alpine** | Latest stable |
| Spring Boot | 4.x (unspecified) | **4.0.2** | Latest GA (Jan 2026) |
| Spring Modulith | 2.x (unspecified) | **2.0.2** | Latest compatible with Boot 4.0.2 |
| Tailwind config | `tailwind.config.js` | **CSS-based `@theme`** | Tailwind 4 standard (already in CLAUDE.md) |

### Tech Versions (verified via Context7 + web search)

| Technology | Version | Source |
|-----------|---------|--------|
| Java | 25 | architektura.md requirement |
| Spring Boot | 4.0.2 | [Spring Boot releases](https://github.com/spring-projects/spring-boot/releases) |
| Spring Modulith | 2.0.2 | [Spring Modulith](https://github.com/spring-projects/spring-modulith) |
| Spring Framework | 7.x | Required by Spring Boot 4 |
| JOOQ | 3.20.x | [jOOQ releases](https://www.jooq.org) |
| Flyway | Latest compatible | Via Spring Boot dependency management |
| Maven | 3.9.x (wrapper) | Build tool |
| PostgreSQL | 17 Alpine | Docker image |
| Redis | 7 Alpine | Docker image |
| Mailpit | Latest | Docker image |
| Turborepo | Latest | pnpm monorepo management |
| pnpm | 9.x | Package manager |

## Monorepo Structure

```
samofujera/
├── apps/                        # Frontend apps (empty — Phase 1C)
├── packages/                    # Shared packages (empty — Phase 1C)
├── backend/                     # Spring Boot 4 + Maven
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/cz/samofujera/
│   │   │   │   ├── SamoFujeraApplication.java
│   │   │   │   ├── featureflag/
│   │   │   │   │   ├── FeatureFlagService.java
│   │   │   │   │   ├── FeatureFlagRecord.java
│   │   │   │   │   └── internal/
│   │   │   │   │       ├── FeatureFlagRepository.java
│   │   │   │   │       └── FeatureFlagCache.java
│   │   │   │   └── shared/
│   │   │   │       ├── api/
│   │   │   │       │   ├── ApiResponse.java
│   │   │   │       │   └── ErrorResponse.java
│   │   │   │       ├── config/
│   │   │   │       │   └── RedisConfig.java
│   │   │   │       └── exception/
│   │   │   │           ├── GlobalExceptionHandler.java
│   │   │   │           └── NotFoundException.java
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       ├── application-dev.yml
│   │   │       └── db/migration/
│   │   │           ├── V1__create_users_table.sql
│   │   │           └── V2__create_feature_flags_table.sql
│   │   └── test/
│   │       └── java/cz/samofujera/
│   │           ├── ModularityTests.java
│   │           └── featureflag/
│   │               ├── FeatureFlagServiceTest.java
│   │               └── internal/
│   │                   └── FeatureFlagRepositoryIntegrationTest.java
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   ├── Dockerfile
│   └── fly.toml
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── commitlint.config.js
├── .husky/commit-msg
├── .gitignore
├── CLAUDE.md
└── architektura.md
```

## Database Schema (Phase 1A)

### V1: Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    locale VARCHAR(5) NOT NULL DEFAULT 'cs',
    stripe_customer_id VARCHAR(255),
    avatar_url VARCHAR(500),
    blocked_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
```

### V2: Feature Flags Table

```sql
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description VARCHAR(500),
    rules JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_feature_flags_key ON feature_flags(key);
```

## Backend Modules (Phase 1A)

### featureflag module

**Public API:**
- `FeatureFlagService.isEnabled(String key)` — global check
- `FeatureFlagService.isEnabled(String key, String role, UUID userId)` — rule-based check
- `FeatureFlagRecord` — DTO (key, enabled, description, rules)

**Internal:**
- `FeatureFlagRepository` — JOOQ-based data access
- `FeatureFlagCache` — Redis cache with 5-minute TTL

### shared (not a module)

- `ApiResponse<T>` — standard response wrapper
- `ErrorResponse` — error response format
- `GlobalExceptionHandler` — `@RestControllerAdvice`
- `NotFoundException` — 404 exception
- `RedisConfig` — Redis connection configuration

## JOOQ Code Generation Pipeline

Maven-based pipeline using Testcontainers:

1. Flyway migrations in `src/main/resources/db/migration/`
2. During `generate-sources` phase: start Testcontainers PostgreSQL, apply Flyway migrations, run JOOQ codegen
3. Generated classes go to `target/generated-sources/jooq/`
4. Package: `cz.samofujera.generated.jooq`

## Docker Compose

```yaml
services:
  samofujera-db:
    image: postgres:17-alpine
    container_name: samofujera-db
    ports: ['5432:5432']
    environment:
      POSTGRES_DB: samofujera
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev

  samofujera-redis:
    image: redis:7-alpine
    container_name: samofujera-redis
    ports: ['6379:6379']

  samofujera-mailpit:
    image: axllent/mailpit
    container_name: samofujera-mailpit
    ports:
      - '1025:1025'   # SMTP
      - '8025:8025'   # Web UI
```

## Commitlint Configuration

Conventional commits with project scopes from CLAUDE.md:
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Scopes: backend, web, admin, customer, ui, api-client, emails, i18n, config, deps, infra
- Rules: lowercase, no period, max 100 chars

## Test Strategy

| Test Type | What | Tool |
|-----------|------|------|
| Module architecture | `ApplicationModules.verify()` | Spring Modulith |
| Integration | Context loads, Flyway runs, JOOQ queries work | Testcontainers (PG + Redis) |
| Unit | `FeatureFlagService.isEnabled()` logic | JUnit 5 + Mockito |

## What's NOT in Phase 1A

- Authentication (login/register) — Phase 1B
- Frontend apps (Astro, admin, customer) — Phase 1C
- CI/CD pipelines — Phase 1C
- i18n setup — Phase 1C
- Email sending — Phase 1B
- Stripe integration — Phase 2
- User module service logic — Phase 1B (only migration in 1A)

## Next Steps

1. Create implementation plan with TDD checkpoints
2. Execute plan task by task
3. Deploy #0: Backend boots, connects to Postgres/Redis, feature flags work
