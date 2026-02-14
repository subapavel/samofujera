# Skills Creation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create all 23 custom Claude Code skills for the Samo Fujera project.

**Architecture:** Each skill is a directory under `.claude/skills/<name>/` containing a `SKILL.md` with YAML frontmatter and markdown instructions. Skills fall into 5 categories: backend generators, frontend generators, cross-cutting generators, convention/reference skills, and workflow skills.

**Tech Stack:** Claude Code skills (SKILL.md format), YAML frontmatter, Markdown

---

### Task 1: Convention/Reference Skills (5 skills)

These load automatically when Claude works on relevant code. They are NOT user-invocable.

**Files:**
- Create: `.claude/skills/tailwind4-conventions/SKILL.md`
- Create: `.claude/skills/spring-modulith-conventions/SKILL.md`
- Create: `.claude/skills/react19-conventions/SKILL.md`
- Create: `.claude/skills/cloudflare-conventions/SKILL.md`
- Create: `.claude/skills/testcontainers-conventions/SKILL.md`

**Step 1: Create all 5 convention skill directories**

Run:
```bash
mkdir -p .claude/skills/tailwind4-conventions
mkdir -p .claude/skills/spring-modulith-conventions
mkdir -p .claude/skills/react19-conventions
mkdir -p .claude/skills/cloudflare-conventions
mkdir -p .claude/skills/testcontainers-conventions
```

**Step 2: Write `.claude/skills/tailwind4-conventions/SKILL.md`**

```markdown
---
name: tailwind4-conventions
description: "Tailwind CSS 4 configuration patterns and conventions. Use when writing any CSS, styling, or theme configuration. Activates on Tailwind classes, @theme directives, or design token work."
user-invocable: false
---

# Tailwind CSS 4 Conventions

## MANDATORY: Check Context7 First
Before writing ANY Tailwind 4 configuration or using Tailwind features, use the
Context7 MCP tool to look up the current Tailwind CSS 4 documentation. Never assume
syntax — Tailwind 4 differs significantly from Tailwind 3.

## Key Differences from Tailwind 3

### Configuration is CSS-based, NOT JavaScript
- There is NO `tailwind.config.js` in Tailwind 4
- All configuration happens in CSS using `@theme` directive
- Import Tailwind with `@import "tailwindcss"` in your main CSS file

### Theme Customization
```css
@import "tailwindcss";

@theme {
  --color-earth: oklch(0.55 0.08 60);
  --color-earth-light: oklch(0.65 0.07 60);
  --color-earth-dark: oklch(0.45 0.08 60);
  --color-cream: oklch(0.97 0.01 80);
  --color-sage: oklch(0.65 0.08 145);
  --color-sage-light: oklch(0.75 0.06 145);
  --color-stone: oklch(0.91 0.02 70);
  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Lora", Georgia, serif;
}
```

### Color Space
- Use OKLCH color space (not HSL) — this is the shadcn/ui v4 standard
- Brand colors from `architektura.md` must be converted to OKLCH

## Project Theme
The brand design is: calm, meditative, personal, authentic.
- Warm earth tones, lots of white space
- Clean readable typography (Inter for UI, Lora for articles/quotes)
- Rounded corners (0.5rem radius), soft shadows
- See `architektura.md` section 2 for full brand identity

## Rules
- Always use the shared theme preset from `packages/config/tailwind/`
- Never hardcode color values — use theme tokens (`bg-earth`, `text-sage`)
- Verify all Tailwind 4 syntax against Context7 before writing
```

**Step 3: Write `.claude/skills/spring-modulith-conventions/SKILL.md`**

```markdown
---
name: spring-modulith-conventions
description: "Spring Modulith module boundary and event-driven communication patterns. Use when working on backend Java modules, creating services, publishing events, or writing module integration tests."
user-invocable: false
---

# Spring Modulith Conventions

## MANDATORY: Check Context7 First
Before using ANY Spring Modulith API, use the Context7 MCP tool to look up the
current Spring Modulith 2 documentation. Verify annotations, test APIs, and event
patterns against the latest docs.

## Module Structure
Every module follows this package layout:
```
cz.samofujera.<module>/
├── <Module>Service.java           # Public API (other modules call this)
├── <Module>Record.java            # Public DTO (Java record)
├── internal/
│   ├── <Entity>Repository.java    # JOOQ DAO (package-private)
│   └── <Impl>Service.java         # Internal logic (package-private)
└── event/
    ├── <Entity>CreatedEvent.java  # Domain event (public record)
    └── <Entity>UpdatedEvent.java
```

## Sacred Rules
1. **Module boundaries are absolute** — never access another module's `internal/` package
2. **Cross-module communication only through:**
   - Public service methods (synchronous)
   - Application events (asynchronous, preferred)
3. **Events are Java records** — immutable, serializable
4. **Public API = classes at module root** — Service + Records only
5. **Internal = everything in `internal/`** — repositories, implementation details

## Event Publishing
```java
// In the publishing module's service:
private final ApplicationEventPublisher events;

public void completeOrder(UUID orderId) {
    // ... business logic ...
    events.publishEvent(new OrderPaidEvent(orderId, userId));
}
```

## Event Handling
```java
// In the consuming module's internal package:
@Component
class EntitlementEventHandler {

    @ApplicationModuleListener
    void on(OrderPaidEvent event) {
        // Grant entitlement...
    }
}
```

## Module Testing
```java
@ApplicationModuleTest
class OrderModuleIntegrationTest {

    @Test
    void verifyModuleStructure(ApplicationModules modules) {
        modules.verify();
    }

    @Test
    void whenOrderPaid_thenEventPublished(Scenario scenario) {
        scenario.stimulate(() -> orderService.pay(orderId))
                .andWaitForEventOfType(OrderPaidEvent.class)
                .toArriveAndVerify(event ->
                    assertThat(event.orderId()).isEqualTo(orderId));
    }
}
```

## Architecture Verification
Run this test to verify ALL module boundaries:
```java
@Test
void verifyAllModules() {
    ApplicationModules.of(SamoFujeraApplication.class).verify();
}
```
```

**Step 4: Write `.claude/skills/react19-conventions/SKILL.md`**

```markdown
---
name: react19-conventions
description: "React 19 patterns, hooks rules, and strict TypeScript conventions. Use when writing React components, hooks, or any frontend interactive code."
user-invocable: false
---

# React 19 Conventions

## MANDATORY: Check Context7 First
Before using ANY React 19 API, use the Context7 MCP tool to verify the current
React 19 documentation. React 19 introduced breaking changes and new patterns.

## Component Rules
- Functional components ONLY — no class components
- Strict TypeScript — no `any`, no `// @ts-ignore`, no `as` casts without justification
- Props defined as TypeScript interfaces (not inline types for non-trivial components)
- Named exports only (no default exports)
- One component per file (except small helper components)

## React 19 Features to Use
- `use()` hook for reading promises and context (verify with Context7)
- React Actions for form handling and mutations
- Automatic batching of state updates
- Ref as prop (no forwardRef needed in React 19)

## Project Patterns
- **Server state**: TanStack Query (useQuery, useMutation) — never useState for API data
- **Routing**: TanStack Router (file-based routes in admin/customer SPAs)
- **UI components**: shadcn/ui from `packages/ui/`
- **i18n**: Every user-facing string through Lingui `t()` or `<Trans>`
- **Styling**: Tailwind CSS 4 utility classes

## Component Template
```tsx
import { t } from "@lingui/core/macro";
import { Button } from "@samofujera/ui";

interface ProductCardProps {
  title: string;
  price: number;
  currency: string;
  onBuy: () => void;
}

export function ProductCard({ title, price, currency, onBuy }: ProductCardProps) {
  return (
    <div className="rounded-lg border border-stone bg-warm-white p-6">
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="text-earth">{formatPrice(price, currency)}</p>
      <Button onClick={onBuy}>{t`Buy now`}</Button>
    </div>
  );
}
```

## Rules
- Never use `any` — find the correct type or use `unknown` with type guards
- Never suppress TypeScript errors — fix the underlying issue
- Always destructure props in function signature
- Always handle loading and error states (TanStack Query provides these)
```

**Step 5: Write `.claude/skills/cloudflare-conventions/SKILL.md`**

```markdown
---
name: cloudflare-conventions
description: "Cloudflare R2 presigned URLs and Stream signed token patterns. Use when implementing file storage, download endpoints, video streaming, or asset management with Cloudflare services."
user-invocable: false
---

# Cloudflare Conventions

## MANDATORY: Check Context7 First
Before using ANY Cloudflare R2 or Stream API, use the Context7 MCP tool to verify
the current documentation. API signatures and auth patterns change.

## Cloudflare R2 (File Storage)

### Presigned URLs (S3-compatible)
- R2 uses AWS S3-compatible API for presigned URLs
- Presigned URLs are generated client-side using AWS Signature Version 4
- They require R2 API credentials (Access Key ID + Secret Access Key)
- No communication with R2 is needed to generate a presigned URL
- Presigned URLs work with the S3 API domain ONLY (not custom domains)

### URL Generation (Java/Spring)
```java
// Use AWS SDK v2 S3Presigner (R2 is S3-compatible)
// TTL: 15 minutes for downloads
// Bind to requesting IP when possible
```

### R2 Key Structure
```
originals/<assetId>/<filename>           # Clean uploaded file
watermarked/<userId>/<assetId>.pdf       # User-specific watermarked PDF
thumbnails/<productId>/<size>.webp       # Product thumbnails
```

## Cloudflare Stream (Video)

### Signed Tokens (NOT API calls)
- For high-volume token generation, use a **signing key** locally
- Do NOT call the Stream API for each token — generate in your application
- Tokens are JWTs signed with your Stream signing key

### Token Claims
```json
{
  "sub": "<video-uid>",
  "kid": "<key-id>",
  "exp": "<video-duration + 30min buffer>",
  "accessRules": [
    { "type": "ip.src", "ip": ["<user-ip>"] }
  ]
}
```

### Playback
```html
<iframe src="https://customer-{code}.cloudflarestream.com/{uid}?token={token}" />
```

## Rules
- Always set expiration on presigned URLs (15 min for downloads)
- Always use signing keys for Stream tokens (not API calls)
- Log all downloads to `download_logs` table
- Rate limit downloads: max 5/hour/user (Redis counter)
```

**Step 6: Write `.claude/skills/testcontainers-conventions/SKILL.md`**

```markdown
---
name: testcontainers-conventions
description: "Testcontainers integration test setup patterns for PostgreSQL and Redis. Use when writing integration tests, setting up test infrastructure, or configuring Spring Modulith module tests."
user-invocable: false
---

# Testcontainers Conventions

## MANDATORY: Check Context7 First
Before configuring ANY Testcontainers setup, use the Context7 MCP tool to verify
the current Testcontainers documentation for Java/Spring Boot.

## Test Infrastructure
All integration tests use real services via Testcontainers:
- **PostgreSQL** — real database with Flyway migrations applied
- **Redis** — real Redis for Spring Session and cache testing

## Spring Boot Integration
```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfig {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgres() {
        return new PostgreSQLContainer<>("postgres:16-alpine");
    }

    @Bean
    @ServiceConnection
    GenericContainer<?> redis() {
        return new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);
    }
}
```

## Module Integration Tests
```java
@ApplicationModuleTest
@Import(TestcontainersConfig.class)
class EntitlementModuleTest {

    @Test
    void whenOrderPaid_thenEntitlementGranted(Scenario scenario) {
        scenario.publish(new OrderPaidEvent(orderId, userId, productId))
                .andWaitForStateChange(() ->
                    entitlementService.hasAccess(userId, productId))
                .andVerify(result -> assertThat(result).isTrue());
    }
}
```

## JOOQ Code Generation in Build
```
Build pipeline:
1. Flyway migrations applied to Testcontainers PostgreSQL
2. JOOQ reads schema from Testcontainers → generates Java classes
3. Compile (type-safe checks against generated schema)
4. Run tests (against Testcontainers)
```

## Rules
- Never use H2 or in-memory DB — always real PostgreSQL via Testcontainers
- Never mock Redis — use real Redis via Testcontainers
- Every module gets an `@ApplicationModuleTest` class
- Use Spring Modulith's `Scenario` API for event-driven test flows
- Shared `TestcontainersConfig` reused across all module tests
```

**Step 7: Verify all 5 convention skills exist**

Run:
```bash
ls -la .claude/skills/tailwind4-conventions/SKILL.md
ls -la .claude/skills/spring-modulith-conventions/SKILL.md
ls -la .claude/skills/react19-conventions/SKILL.md
ls -la .claude/skills/cloudflare-conventions/SKILL.md
ls -la .claude/skills/testcontainers-conventions/SKILL.md
```
Expected: All 5 files exist.

**Step 8: Commit**

```bash
git add .claude/skills/tailwind4-conventions/ .claude/skills/spring-modulith-conventions/ .claude/skills/react19-conventions/ .claude/skills/cloudflare-conventions/ .claude/skills/testcontainers-conventions/
git commit -m "feat(config): add 5 convention/reference skills

Auto-loaded skills for Tailwind 4, Spring Modulith, React 19,
Cloudflare R2/Stream, and Testcontainers patterns."
```

---

### Task 2: Backend Generator Skills (6 skills)

**Files:**
- Create: `.claude/skills/spring-module/SKILL.md`
- Create: `.claude/skills/flyway-migration/SKILL.md`
- Create: `.claude/skills/jooq-regen/SKILL.md`
- Create: `.claude/skills/jooq-repository/SKILL.md`
- Create: `.claude/skills/api-endpoint/SKILL.md`
- Create: `.claude/skills/stripe-webhook/SKILL.md`

**Step 1: Create all 6 backend skill directories**

Run:
```bash
mkdir -p .claude/skills/spring-module
mkdir -p .claude/skills/flyway-migration
mkdir -p .claude/skills/jooq-regen
mkdir -p .claude/skills/jooq-repository
mkdir -p .claude/skills/api-endpoint
mkdir -p .claude/skills/stripe-webhook
```

**Step 2: Write `.claude/skills/spring-module/SKILL.md`**

```markdown
---
name: spring-module
description: "Scaffold a new Spring Modulith module with standard package structure, public API, internal implementation, domain events, and integration test."
argument-hint: "[module-name]"
disable-model-invocation: true
---

# Scaffold Spring Modulith Module

## MANDATORY: Check Context7 First
Use Context7 to verify the latest Spring Modulith 2 and Spring Boot 4 APIs
before generating any code.

## What This Creates

For module name `$ARGUMENTS`:

```
backend/src/main/java/cz/samofujera/$ARGUMENTS/
├── ${Name}Service.java              # Public API
├── ${Name}Record.java               # Public DTO (Java record)
├── internal/
│   └── ${Name}Repository.java       # JOOQ repository
└── event/
    └── ${Name}CreatedEvent.java     # Domain event

backend/src/test/java/cz/samofujera/$ARGUMENTS/
└── ${Name}ModuleIntegrationTest.java  # @ApplicationModuleTest
```

## Steps

1. Create the package structure under `backend/src/main/java/cz/samofujera/$ARGUMENTS/`
2. Create the public service class with constructor injection
3. Create the public record DTO
4. Create the `internal/` package with a JOOQ repository skeleton
5. Create the `event/` package with an initial domain event record
6. Create the integration test with `@ApplicationModuleTest`
7. Include module verification test: `ApplicationModules.of(SamoFujeraApplication.class).verify()`
8. Run the module verification test to confirm boundaries are correct

## Service Template
```java
package cz.samofujera.$ARGUMENTS;

import org.springframework.stereotype.Service;

@Service
public class ${Name}Service {

    private final ${Name}Repository repository;

    ${Name}Service(${Name}Repository repository) {
        this.repository = repository;
    }
}
```

## Record Template
```java
package cz.samofujera.$ARGUMENTS;

import java.util.UUID;

public record ${Name}Record(
    UUID id
    // Add fields matching the domain entity
) {}
```

## Event Template
```java
package cz.samofujera.$ARGUMENTS.event;

import java.util.UUID;

public record ${Name}CreatedEvent(UUID id) {}
```

## Integration Test Template
```java
package cz.samofujera.$ARGUMENTS;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.test.ApplicationModuleTest;
import static org.assertj.core.api.Assertions.assertThat;

@ApplicationModuleTest
class ${Name}ModuleIntegrationTest {

    @Test
    void moduleLoads() {
        // Module context loads without errors
    }
}
```

## After Creation
- Run `./gradlew test` to verify module boundaries
- If this module needs a database table, use `/flyway-migration` next
- If this module needs JOOQ classes, use `/jooq-regen` after migration
```

**Step 3: Write `.claude/skills/flyway-migration/SKILL.md`**

```markdown
---
name: flyway-migration
description: "Create a properly versioned Flyway SQL migration file. Auto-detects next version number from existing migrations."
argument-hint: "[description]"
disable-model-invocation: true
---

# Create Flyway Migration

## MANDATORY: Check Context7 First
Use Context7 to verify Flyway migration naming conventions and SQL syntax
for PostgreSQL.

## Steps

1. **Detect next version number:**
   List existing migrations in `backend/src/main/resources/db/migration/`
   Find the highest `V{N}__` prefix and increment by 1.
   If no migrations exist, start with `V1__`.

2. **Create migration file:**
   Path: `backend/src/main/resources/db/migration/V{N}__${description}.sql`
   - Replace spaces in description with underscores
   - Use lowercase for description
   - Example: `V3__create_products_table.sql`

3. **Write the SQL:**
   - Use PostgreSQL syntax
   - UUIDs for all primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Always include `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Always include `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Add indexes for common query patterns
   - Add foreign key constraints with appropriate ON DELETE behavior
   - Reference `architektura.md` section 6 for the schema design

4. **After creating the migration:**
   Remind to run `/jooq-regen` to regenerate JOOQ classes.

## SQL Conventions
```sql
-- Table names: lowercase, plural (users, products, orders)
-- Column names: lowercase, snake_case
-- Enums: stored as VARCHAR, not PostgreSQL ENUM type
-- JSONB for flexible data (metadata, addresses, features)
-- Soft deletes: nullable timestamp columns (deleted_at, blocked_at, revoked_at)
-- Indexes: idx_{table}_{columns} naming convention
```

## Template
```sql
-- V{N}__$ARGUMENTS.sql

CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- columns here
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_table_name_column ON table_name(column);
```
```

**Step 4: Write `.claude/skills/jooq-regen/SKILL.md`**

```markdown
---
name: jooq-regen
description: "Regenerate JOOQ classes after a Flyway schema change. Runs the Testcontainers-based code generation pipeline."
disable-model-invocation: true
---

# Regenerate JOOQ Classes

## MANDATORY: Check Context7 First
Use Context7 to verify the current JOOQ code generation Gradle plugin
configuration if making changes to the build setup.

## When to Use
Run this after every Flyway migration that changes the database schema.

## Steps

1. **Run JOOQ code generation:**
   ```bash
   cd backend && ./gradlew generateJooq
   ```
   This will:
   - Start a Testcontainers PostgreSQL instance
   - Apply all Flyway migrations to it
   - Read the schema and generate Java classes to `build/generated-sources/jooq/`

2. **Verify generation succeeded:**
   ```bash
   cd backend && ./gradlew compileJava
   ```
   If any existing JOOQ queries reference columns that changed, this will
   produce compile errors. Fix them.

3. **Run tests to verify nothing broke:**
   ```bash
   cd backend && ./gradlew test
   ```

## Generated Classes Location
```
backend/build/generated-sources/jooq/
└── cz/samofujera/jooq/
    ├── tables/           # Table descriptors
    ├── tables/records/   # Row records
    └── Keys.java         # Primary and foreign keys
```

## Rules
- NEVER manually edit generated JOOQ files
- ALWAYS run this after creating a Flyway migration
- If compile errors appear, fix the queries — the schema is the source of truth
```

**Step 5: Write `.claude/skills/jooq-repository/SKILL.md`**

```markdown
---
name: jooq-repository
description: "Create a JOOQ repository with type-safe queries following project patterns. Uses DSLContext injection, no JPA."
argument-hint: "[module-name] [entity-name]"
disable-model-invocation: true
---

# Create JOOQ Repository

## MANDATORY: Check Context7 First
Use Context7 to verify the current JOOQ DSL API and query patterns.

## Steps

1. Verify JOOQ classes exist for the target table (run `/jooq-regen` if not)
2. Create repository in `backend/src/main/java/cz/samofujera/$0/internal/`
3. Write unit test with assertions on query behavior
4. Run tests

## Repository Template
```java
package cz.samofujera.$0.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.Optional;
import java.util.List;

import static cz.samofujera.jooq.Tables.*;

@Repository
class ${Entity}Repository {

    private final DSLContext dsl;

    ${Entity}Repository(DSLContext dsl) {
        this.dsl = dsl;
    }

    Optional<${Entity}Record> findById(UUID id) {
        return dsl.selectFrom(${TABLE})
                   .where(${TABLE}.ID.eq(id))
                   .fetchOptionalInto(${Entity}Record.class);
    }

    List<${Entity}Record> findAll() {
        return dsl.selectFrom(${TABLE})
                   .orderBy(${TABLE}.CREATED_AT.desc())
                   .fetchInto(${Entity}Record.class);
    }

    UUID create(/* params */) {
        var id = UUID.randomUUID();
        dsl.insertInto(${TABLE})
           .set(${TABLE}.ID, id)
           // .set(${TABLE}.COLUMN, value)
           .execute();
        return id;
    }
}
```

## Rules
- Repository classes are ALWAYS in `internal/` package (package-private)
- Constructor injection of `DSLContext` (no @Autowired)
- Use static imports from generated `Tables` class
- Return domain records, not JOOQ-generated records at the public API boundary
- NO JPA, NO raw SQL strings, NO Spring Data repositories
```

**Step 6: Write `.claude/skills/api-endpoint/SKILL.md`**

```markdown
---
name: api-endpoint
description: "Create a full vertical slice API endpoint: Controller, Service method, Repository query, DTO, unit test, and integration test."
argument-hint: "[HTTP-method] [path] [description]"
disable-model-invocation: true
---

# Create Full Vertical Slice API Endpoint

## MANDATORY: Check Context7 First
Use Context7 to verify Spring Boot 4 controller annotations, Spring Security
configuration, and response handling patterns.

## Steps (TDD)

1. **Write the integration test first** (red)
   - Test the HTTP endpoint end-to-end
   - Use `@ApplicationModuleTest` + `MockMvc` or `WebTestClient`
   - Assert on response status, body structure, and side effects

2. **Run the test** — verify it fails (red)

3. **Create the DTO** (Java record in module root)
   - Request record (if POST/PUT)
   - Response record

4. **Create/update the Repository** (in `internal/`)
   - JOOQ query for the data access needed

5. **Create/update the Service** (public API)
   - Business logic, validation, event publishing

6. **Create the Controller**
   - Maps to the service method
   - Uses `ApiResponse<T>` wrapper for consistency

7. **Run the test** — verify it passes (green)

8. **Refactor** if needed

9. **Commit**

## Controller Template
```java
@RestController
@RequestMapping("/api")
class ${Name}Controller {

    private final ${Module}Service service;

    ${Name}Controller(${Module}Service service) {
        this.service = service;
    }

    @GetMapping("${path}")
    ApiResponse<${Response}Record> handle() {
        var result = service.method();
        return ApiResponse.ok(result);
    }
}
```

## Response Wrapper
All endpoints return `ApiResponse<T>`:
```java
public record ApiResponse<T>(T data, String message) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }
}
```

For paginated results, use `PagedResponse<T>`.

## Security
- Public endpoints: no annotation needed (configured in `SecurityConfig`)
- Authenticated endpoints: `@PreAuthorize("isAuthenticated()")`
- Admin endpoints: `@PreAuthorize("hasRole('ADMIN')")`

## Rules
- Always TDD — test first, then implement
- Always use `ApiResponse` wrapper
- Always validate input (Bean Validation annotations on request records)
- Always handle errors via `GlobalExceptionHandler`
- i18n for any user-facing error messages
```

**Step 7: Write `.claude/skills/stripe-webhook/SKILL.md`**

```markdown
---
name: stripe-webhook
description: "Add a new Stripe webhook handler following the event-driven pattern: verify signature, process event, publish domain event."
argument-hint: "[stripe-event-type]"
disable-model-invocation: true
---

# Add Stripe Webhook Handler

## MANDATORY: Check Context7 First
Use Context7 to verify the current Stripe Java SDK API, webhook signature
verification, and event object structure for the specific event type.

## Steps (TDD)

1. **Write the integration test first** (red)
   - Mock Stripe webhook payload for `$ARGUMENTS`
   - POST to `/api/stripe/webhook` with valid signature
   - Assert domain event is published

2. **Run the test** — verify it fails

3. **Add handler method to `StripeWebhookHandler`:**
   ```java
   // payment/internal/StripeWebhookHandler.java

   private void handle${EventType}(Event event) {
       var session = (${StripeObject}) event.getDataObjectDeserializer()
           .getObject().orElseThrow();
       // Extract relevant data
       // Publish domain event
       events.publishEvent(new ${DomainEvent}(...));
   }
   ```

4. **Register in the webhook dispatcher switch:**
   ```java
   case "$ARGUMENTS" -> handle${EventType}(event);
   ```

5. **Run the test** — verify it passes

6. **Commit**

## Webhook Security
- ALWAYS verify Stripe signature using `Webhook.constructEvent(payload, sigHeader, webhookSecret)`
- NEVER trust unverified webhook payloads
- Return 200 quickly — do heavy processing via domain events
- Idempotency: check if event was already processed (store Stripe event ID)

## Pattern
```
Stripe Webhook → StripeWebhookHandler → Domain Event → Module Event Handlers
```
The webhook handler is thin — it verifies, extracts data, and publishes a domain
event. All business logic lives in the consuming modules via event handlers.

## Common Stripe Events for This Project
- `checkout.session.completed` → OrderPaidEvent
- `customer.subscription.created` → SubscriptionActivatedEvent
- `customer.subscription.deleted` → SubscriptionCancelledEvent
- `invoice.paid` → SubscriptionRenewedEvent
- `invoice.payment_failed` → PaymentFailedEvent
```

**Step 8: Verify all 6 backend skills exist**

Run:
```bash
ls -la .claude/skills/spring-module/SKILL.md
ls -la .claude/skills/flyway-migration/SKILL.md
ls -la .claude/skills/jooq-regen/SKILL.md
ls -la .claude/skills/jooq-repository/SKILL.md
ls -la .claude/skills/api-endpoint/SKILL.md
ls -la .claude/skills/stripe-webhook/SKILL.md
```
Expected: All 6 files exist.

**Step 9: Commit**

```bash
git add .claude/skills/spring-module/ .claude/skills/flyway-migration/ .claude/skills/jooq-regen/ .claude/skills/jooq-repository/ .claude/skills/api-endpoint/ .claude/skills/stripe-webhook/
git commit -m "feat(config): add 6 backend generator skills

Skills for scaffolding Spring Modulith modules, Flyway migrations,
JOOQ regeneration/repositories, API endpoints, and Stripe webhooks."
```

---

### Task 3: Frontend Generator Skills (7 skills)

**Files:**
- Create: `.claude/skills/astro-page/SKILL.md`
- Create: `.claude/skills/tanstack-route/SKILL.md`
- Create: `.claude/skills/tanstack-query-hook/SKILL.md`
- Create: `.claude/skills/react-component/SKILL.md`
- Create: `.claude/skills/shadcn-component/SKILL.md`
- Create: `.claude/skills/email-template/SKILL.md`
- Create: `.claude/skills/lingui-extract/SKILL.md`

**Step 1: Create all 7 frontend skill directories**

Run:
```bash
mkdir -p .claude/skills/astro-page
mkdir -p .claude/skills/tanstack-route
mkdir -p .claude/skills/tanstack-query-hook
mkdir -p .claude/skills/react-component
mkdir -p .claude/skills/shadcn-component
mkdir -p .claude/skills/email-template
mkdir -p .claude/skills/lingui-extract
```

**Step 2: Write `.claude/skills/astro-page/SKILL.md`**

```markdown
---
name: astro-page
description: "Create an Astro page with the correct layout, Lingui i18n, SEO metadata, and optional React island hydration."
argument-hint: "[page-path] [layout-type]"
disable-model-invocation: true
---

# Create Astro Page

## MANDATORY: Check Context7 First
Use Context7 to verify the current Astro framework API — page syntax, layout
patterns, island hydration directives, and SSR configuration.

## Arguments
- `$0`: Page path relative to `apps/web/src/pages/` (e.g., `katalog/index`)
- `$1`: Layout type — `marketing`, `article`, or `base`

## Steps

1. Determine the correct layout component:
   - `marketing` → `MarketingLayout.astro` (homepage, about, contact)
   - `article` → `ArticleLayout.astro` (blog posts, articles)
   - `base` → `BaseLayout.astro` (minimal, for SPA shells)

2. Create the `.astro` file in `apps/web/src/pages/$0.astro`

3. Include:
   - Layout wrapper with SEO props (title, description, og:image)
   - Lingui i18n setup for the page
   - Any React islands with appropriate hydration directives

4. Write a basic test or visual verification step

## Page Template
```astro
---
import { MarketingLayout } from "../layouts/MarketingLayout.astro";
// import ReactComponent from "../components/ReactComponent";

const title = "Page Title";
const description = "Page description for SEO";
---

<MarketingLayout {title} {description}>
  <section class="mx-auto max-w-4xl px-4 py-16">
    <h1 class="text-display text-text">{title}</h1>
    <!-- Page content -->
  </section>

  <!-- React island (only if interactive) -->
  <!-- <ReactComponent client:visible /> -->
</MarketingLayout>
```

## Hydration Directives
- `client:load` — Hydrate on page load (use sparingly)
- `client:visible` — Hydrate when scrolled into view (preferred)
- `client:idle` — Hydrate when browser is idle
- `client:only="react"` — Skip SSR, client-only rendering

## i18n
All user-facing text must go through Lingui. For Astro pages, import and use
the translation functions.

## SEO Checklist
- [ ] Title tag (unique, descriptive, <60 chars)
- [ ] Meta description (<160 chars)
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] Canonical URL
- [ ] Language tag (cs/sk)
```

**Step 3: Write `.claude/skills/tanstack-route/SKILL.md`**

```markdown
---
name: tanstack-route
description: "Create a TanStack Router file-based route with type-safe params, data loader, and code splitting."
argument-hint: "[app] [route-path]"
disable-model-invocation: true
---

# Create TanStack Router Route

## MANDATORY: Check Context7 First
Use Context7 to verify the current TanStack Router API — file-based routing
conventions, loader patterns, and search params validation.

## Arguments
- `$0`: App name — `admin` or `customer`
- `$1`: Route path (e.g., `produkty/$id`, `objednavky/index`)

## Steps

1. Determine the file location: `apps/$0/src/routes/$1.tsx`
2. Create the route file following TanStack Router file-based naming:
   - `index.tsx` — index route
   - `$id.tsx` — dynamic param
   - `__root.tsx` — root layout
   - `_layout.tsx` — pathless layout
3. Add data loader with TanStack Query integration
4. Add the route component
5. If the route has a `.lazy.tsx` split, create both files

## Route Template (with loader)
```tsx
import { createFileRoute } from "@tanstack/react-router";
import { queryClient } from "../lib/query-client";
import { ${entity}QueryOptions } from "../lib/queries/use${Entity}";

export const Route = createFileRoute("/${path}")({
  loader: () => queryClient.ensureQueryData(${entity}QueryOptions()),
  component: ${Component}Page,
});

function ${Component}Page() {
  const data = Route.useLoaderData();

  return (
    <div>
      {/* Page content using loaded data */}
    </div>
  );
}
```

## Route with Dynamic Params
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/${path}/$id")({
  loader: ({ params }) =>
    queryClient.ensureQueryData(${entity}QueryOptions(params.id)),
  component: ${Component}DetailPage,
});

function ${Component}DetailPage() {
  const { id } = Route.useParams();
  const data = Route.useLoaderData();
  // ...
}
```

## Rules
- Always use file-based routing (TanStack Router convention)
- Always integrate with TanStack Query for data loading
- Use `queryClient.ensureQueryData()` in loaders for SSR-safe data fetching
- Code-split large route components with `.lazy.tsx`
- Type-safe params — never use `as` casts on route params
```

**Step 4: Write `.claude/skills/tanstack-query-hook/SKILL.md`**

```markdown
---
name: tanstack-query-hook
description: "Create a TanStack Query hook with useQuery for fetching, useMutation for writes, optimistic updates, and cache invalidation."
argument-hint: "[entity-name]"
disable-model-invocation: true
---

# Create TanStack Query Hook

## MANDATORY: Check Context7 First
Use Context7 to verify the current TanStack Query v5 API — useQuery,
useMutation, queryOptions, and optimistic update patterns.

## Steps

1. Create hook file: `apps/{admin|customer}/src/lib/queries/use$ARGUMENTS.ts`
2. Define query options factory (for reuse in loaders)
3. Create `useQuery` hook for reading
4. Create `useMutation` hook for writes (if needed)
5. Add optimistic updates for mutations (if applicable)
6. Write tests with MSW (Mock Service Worker) for API mocking

## Query Hook Template
```typescript
import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { ${Entity}Record } from "@samofujera/api-client";

// Query options factory (reusable in route loaders)
export const ${entity}ListQueryOptions = () =>
  queryOptions({
    queryKey: ["${entity}s"],
    queryFn: () => api.${entity}s.list(),
  });

export const ${entity}DetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["${entity}s", id],
    queryFn: () => api.${entity}s.getById(id),
  });

// Read hook
export function use${Entity}s() {
  return useQuery(${entity}ListQueryOptions());
}

export function use${Entity}(id: string) {
  return useQuery(${entity}DetailQueryOptions(id));
}

// Write hook with optimistic update
export function useCreate${Entity}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create${Entity}Request) => api.${entity}s.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${entity}s"] });
    },
  });
}

export function useUpdate${Entity}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update${Entity}Request }) =>
      api.${entity}s.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["${entity}s", id] });
      const previous = queryClient.getQueryData(["${entity}s", id]);
      queryClient.setQueryData(["${entity}s", id], (old: ${Entity}Record) => ({
        ...old,
        ...data,
      }));
      return { previous };
    },
    onError: (_err, { id }, context) => {
      queryClient.setQueryData(["${entity}s", id], context?.previous);
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["${entity}s", id] });
    },
  });
}
```

## Rules
- Always export `queryOptions` factories for route loader reuse
- Query keys: `["entity", id?]` convention
- Invalidate related queries after mutations
- Use optimistic updates for edits where UX benefits (admin forms, toggles)
- Never use `useState` for server-derived data — always TanStack Query
```

**Step 5: Write `.claude/skills/react-component/SKILL.md`**

```markdown
---
name: react-component
description: "Create a React 19 component following project patterns: functional, strict TypeScript, shadcn/ui primitives, Lingui i18n, Tailwind 4."
argument-hint: "[component-name] [location]"
disable-model-invocation: true
---

# Create React Component

## MANDATORY: Check Context7 First
Use Context7 to verify React 19 API patterns and any shadcn/ui component
APIs you plan to use.

## Arguments
- `$0`: Component name (PascalCase, e.g., `ProductCard`)
- `$1`: Location — `ui` (shared), `admin`, `customer`, or `web`

## Steps

1. Determine file path:
   - `ui` → `packages/ui/src/components/$0.tsx`
   - `admin` → `apps/admin/src/components/$0.tsx`
   - `customer` → `apps/customer/src/components/$0.tsx`
   - `web` → `apps/web/src/components/$0.tsx`

2. Write the component with:
   - TypeScript interface for props
   - Lingui i18n for all user-facing strings
   - Tailwind 4 classes for styling
   - shadcn/ui primitives where applicable

3. Write a Vitest test:
   - Test rendering with required props
   - Test user interactions (if interactive)
   - Test i18n string presence

4. Run tests, verify pass

## Component Template
```tsx
import { t } from "@lingui/core/macro";
import { cn } from "@samofujera/ui/lib/utils";

interface $0Props {
  className?: string;
  // Add props
}

export function $0({ className, ...props }: $0Props) {
  return (
    <div className={cn("", className)}>
      {/* Component content */}
    </div>
  );
}
```

## Test Template
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { $0 } from "./$0";

describe("$0", () => {
  it("renders correctly", () => {
    render(<$0 /* required props */ />);
    // assertions
  });
});
```

## Rules
- Named export only (no default exports)
- Props interface (not inline type)
- `cn()` utility for className merging
- All user-facing text through Lingui
- No `any`, no `// @ts-ignore`
- One component per file
- Colocate test file: `$0.test.tsx` next to `$0.tsx`
```

**Step 6: Write `.claude/skills/shadcn-component/SKILL.md`**

```markdown
---
name: shadcn-component
description: "Customize or extend a shadcn/ui component for the project's brand theme. Uses Tailwind 4 @theme and OKLCH colors."
argument-hint: "[component-name]"
disable-model-invocation: true
---

# Customize shadcn/ui Component

## MANDATORY: Check Context7 First
Use Context7 to verify the current shadcn/ui component API and Tailwind 4
theming approach (OKLCH colors, CSS variables).

## Steps

1. **Add the base component** (if not already added):
   ```bash
   cd packages/ui && pnpm dlx shadcn@latest add $ARGUMENTS
   ```

2. **Review the generated component** in `packages/ui/src/components/`

3. **Customize for brand:**
   - Replace default colors with brand theme tokens
   - Adjust border-radius to 0.5rem (project standard)
   - Use warm tones (earth, sage, cream, stone) instead of defaults
   - Ensure OKLCH color variables are used

4. **Export from package barrel:**
   Add export to `packages/ui/src/index.ts`

5. **Test in Storybook or visual check**

## Brand Theme Tokens (reference)
```css
@theme {
  --color-earth: oklch(...);        /* Primary warm brown */
  --color-sage: oklch(...);         /* CTA green */
  --color-cream: oklch(...);        /* Light background */
  --color-stone: oklch(...);        /* Borders */
  --color-text: oklch(...);         /* Main text warm dark */
  --radius: 0.5rem;                 /* Standard radius */
}
```

## Customization Pattern
Modify CSS variables in the component, not hardcoded values:
```tsx
// Use theme-aware classes
<Button className="bg-earth text-warm-white hover:bg-earth-dark">
```

## Rules
- Always install via shadcn CLI first, then customize
- Never hardcode colors — use theme tokens
- Keep customizations minimal — brand alignment only
- Export all shared components from `packages/ui/src/index.ts`
- Verify the component renders correctly with the project theme
```

**Step 7: Write `.claude/skills/email-template/SKILL.md`**

```markdown
---
name: email-template
description: "Create a React Email template with branded layout, i18n support, and locale-aware formatting."
argument-hint: "[template-name]"
disable-model-invocation: true
---

# Create React Email Template

## MANDATORY: Check Context7 First
Use Context7 to verify the current React Email API — components, styling
approach, and rendering patterns.

## Steps

1. Create template file: `packages/emails/src/templates/$ARGUMENTS.tsx`
2. Use the shared `EmailLayout` component for branded header/footer
3. Accept `locale` prop for i18n
4. Use locale-aware formatting for dates and prices
5. Add to barrel export in `packages/emails/src/index.ts`
6. Preview the email using React Email dev server

## Template
```tsx
import { EmailLayout } from "../components/EmailLayout";
import { Text, Button, Section } from "@react-email/components";

interface $ARGUMENTSProps {
  locale: "cs" | "sk";
  userName: string;
  // Add template-specific props
}

export function $ARGUMENTS({ locale, userName }: $ARGUMENTSProps) {
  const translations = {
    cs: {
      greeting: `Dobrý den, ${userName}`,
      // ...
    },
    sk: {
      greeting: `Dobrý deň, ${userName}`,
      // ...
    },
  };
  const t = translations[locale];

  return (
    <EmailLayout locale={locale}>
      <Section>
        <Text>{t.greeting}</Text>
        {/* Template content */}
      </Section>
    </EmailLayout>
  );
}

export default $ARGUMENTS;
```

## Email Layout
All emails use `EmailLayout` which provides:
- Brand logo header
- Consistent typography (warm tones)
- Footer with links and legal text
- Locale-aware content direction

## Rules
- Every email must support both `cs` and `sk` locales
- Use inline styles (React Email requirement for email clients)
- Keep emails simple — not all CSS works in email clients
- Format prices with `Intl.NumberFormat` (locale-aware)
- Format dates with `Intl.DateTimeFormat` (locale-aware)
- Always preview before committing
```

**Step 8: Write `.claude/skills/lingui-extract/SKILL.md`**

```markdown
---
name: lingui-extract
description: "Extract i18n strings from source code and update .po message catalogs for Czech and Slovak. Manages Lingui translations."
disable-model-invocation: true
---

# Extract and Manage i18n Strings

## MANDATORY: Check Context7 First
Use Context7 to verify the current Lingui CLI commands, .po file format,
and ICU MessageFormat syntax.

## Steps

1. **Extract messages from source code:**
   ```bash
   pnpm lingui extract
   ```
   This scans all source files for `t()`, `<Trans>`, and `msg()` calls
   and updates the `.po` catalog files.

2. **Review new/changed strings in:**
   - `packages/i18n/src/locales/cs.po` (Czech)
   - `packages/i18n/src/locales/sk.po` (Slovak)

3. **Translate new strings:**
   - Fill in translations for both locales
   - Pay attention to plural forms

4. **Compile catalogs:**
   ```bash
   pnpm lingui compile
   ```

5. **Verify no missing translations:**
   Check that there are no untranslated entries.

## Czech Plural Forms
Czech has 4 forms: one, few, many, other
```
{count, plural,
  one {# položka}
  few {# položky}
  many {# položky}
  other {# položek}
}
```

## Slovak Plural Forms
Slovak has 3 forms: one, few, other
```
{count, plural,
  one {# položka}
  few {# položky}
  other {# položiek}
}
```

## Marking Strings for Translation
```tsx
// Simple string
import { t } from "@lingui/core/macro";
const label = t`Add to cart`;

// With JSX
import { Trans } from "@lingui/react/macro";
<Trans>Add to cart</Trans>

// With plurals
import { Plural } from "@lingui/react/macro";
<Plural value={count} one="# item" few="# items" other="# items" />
```

## Rules
- EVERY user-facing string must go through Lingui
- Run extract after adding/changing any translated strings
- Always provide both cs and sk translations
- Use ICU MessageFormat for plurals, numbers, dates
- Never hardcode user-facing text in components
```

**Step 9: Verify all 7 frontend skills exist**

Run:
```bash
ls -la .claude/skills/astro-page/SKILL.md
ls -la .claude/skills/tanstack-route/SKILL.md
ls -la .claude/skills/tanstack-query-hook/SKILL.md
ls -la .claude/skills/react-component/SKILL.md
ls -la .claude/skills/shadcn-component/SKILL.md
ls -la .claude/skills/email-template/SKILL.md
ls -la .claude/skills/lingui-extract/SKILL.md
```
Expected: All 7 files exist.

**Step 10: Commit**

```bash
git add .claude/skills/astro-page/ .claude/skills/tanstack-route/ .claude/skills/tanstack-query-hook/ .claude/skills/react-component/ .claude/skills/shadcn-component/ .claude/skills/email-template/ .claude/skills/lingui-extract/
git commit -m "feat(config): add 7 frontend generator skills

Skills for Astro pages, TanStack Router routes, TanStack Query hooks,
React 19 components, shadcn/ui customization, email templates, and
Lingui i18n extraction."
```

---

### Task 4: Cross-Cutting Generator Skills (2 skills)

**Files:**
- Create: `.claude/skills/feature-flag/SKILL.md`
- Create: `.claude/skills/api-client-endpoint/SKILL.md`

**Step 1: Create directories**

Run:
```bash
mkdir -p .claude/skills/feature-flag
mkdir -p .claude/skills/api-client-endpoint
```

**Step 2: Write `.claude/skills/feature-flag/SKILL.md`**

```markdown
---
name: feature-flag
description: "Create an end-to-end feature flag: Flyway migration to insert the flag, backend FeatureFlagService usage, AOP annotation, and frontend useFeatureFlags() hook."
argument-hint: "[flag-key]"
disable-model-invocation: true
---

# Create End-to-End Feature Flag

## MANDATORY: Check Context7 First
Use Context7 to verify Spring AOP patterns if using the @FeatureFlag annotation.

## Steps

1. **Create Flyway migration** to insert the flag:
   Use `/flyway-migration` to create:
   ```sql
   INSERT INTO feature_flags (id, key, enabled, description, created_at, updated_at)
   VALUES (gen_random_uuid(), '$ARGUMENTS', false, 'Description here', NOW(), NOW());
   ```

2. **Backend usage — programmatic:**
   ```java
   if (featureFlagService.isEnabled("$ARGUMENTS")) {
       // New behavior
   } else {
       // Old behavior (or nothing)
   }
   ```

3. **Backend usage — AOP annotation:**
   ```java
   @FeatureFlag("$ARGUMENTS")
   public void newFeatureMethod() { ... }
   ```

4. **Frontend usage:**
   ```tsx
   const { data: flags } = useFeatureFlags();

   if (flags?.["$ARGUMENTS"]) {
     return <NewFeature />;
   }
   return <OldFeature />; // or null
   ```

5. **Test both states** (flag on and off)

6. **Commit**

## Flag Naming Convention
- lowercase, kebab-case
- descriptive: `new-checkout-flow`, `article-paywall-v2`, `event-waitlist`

## Flag Rules (JSONB)
Optional per-role or per-user targeting:
```json
{
  "roles": ["ADMIN"],
  "userIds": ["uuid-1", "uuid-2"]
}
```

## Rules
- Every new feature starts behind a flag
- Test with flag both enabled and disabled
- Remove flags when feature is stable and fully rolled out
- Redis cache (5 min TTL) means changes take up to 5 min to propagate
```

**Step 3: Write `.claude/skills/api-client-endpoint/SKILL.md`**

```markdown
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
```

**Step 4: Verify both skills exist**

Run:
```bash
ls -la .claude/skills/feature-flag/SKILL.md
ls -la .claude/skills/api-client-endpoint/SKILL.md
```
Expected: Both files exist.

**Step 5: Commit**

```bash
git add .claude/skills/feature-flag/ .claude/skills/api-client-endpoint/
git commit -m "feat(config): add 2 cross-cutting generator skills

Skills for end-to-end feature flag creation and typed API client
endpoint generation."
```

---

### Task 5: Workflow Skills (3 skills)

**Files:**
- Create: `.claude/skills/phase-kickoff/SKILL.md`
- Create: `.claude/skills/deploy/SKILL.md`
- Create: `.claude/skills/ci-pipeline/SKILL.md`

**Step 1: Create directories**

Run:
```bash
mkdir -p .claude/skills/phase-kickoff
mkdir -p .claude/skills/deploy
mkdir -p .claude/skills/ci-pipeline
```

**Step 2: Write `.claude/skills/phase-kickoff/SKILL.md`**

```markdown
---
name: phase-kickoff
description: "Start a new implementation phase. Enforces the mandatory workflow: brainstorm first, write design doc, then create implementation plan. Never skip steps."
argument-hint: "[phase-number] [phase-name]"
disable-model-invocation: true
---

# Phase Kickoff

This skill enforces the project's critical workflow rule: **brainstorm before implementing.**

## Mandatory Workflow

Every phase MUST follow these steps in order. No exceptions.

### Step 1: Brainstorm
Invoke the `superpowers:brainstorming` skill to:
- Review the relevant section of `architektura.md`
- Challenge assumptions — the architecture is orientational, not definitive
- Use Context7 to verify all technology choices against current best practices
- Explore 2-3 approaches with trade-offs
- Get user approval on the approach

### Step 2: Design Doc
Write the validated design to:
```
docs/plans/YYYY-MM-DD-phase-$0-$1-design.md
```

Include:
- Goal (one sentence)
- Architecture decisions (what changed from architektura.md and why)
- Database schema (if applicable)
- API endpoints (if applicable)
- Component structure (if applicable)
- Test strategy

Commit the design doc.

### Step 3: Implementation Plan
Invoke the `superpowers:writing-plans` skill to create a detailed
step-by-step implementation plan with TDD checkpoints.

Save to:
```
docs/plans/YYYY-MM-DD-phase-$0-$1-implementation.md
```

### Step 4: Execute
Use `superpowers:executing-plans` or `superpowers:subagent-driven-development`
to implement the plan task by task.

## Phase Reference (from architektura.md)
- Phase 1: Foundation (monorepo, auth, infrastructure, CI/CD)
- Phase 2: Catalog & Digital Sales
- Phase 3: Membership & Articles
- Phase 4: Video & Streaming
- Phase 5: Events
- Phase 6: Physical Products
- Phase 7: Vouchers

## Rules
- NEVER skip brainstorming
- NEVER start coding without a written plan
- ALWAYS commit design docs before implementation begins
- ALWAYS use TDD during implementation
```

**Step 3: Write `.claude/skills/deploy/SKILL.md`**

```markdown
---
name: deploy
description: "Deploy the application to staging or production. Backend to Fly.io, frontend to Cloudflare Pages."
argument-hint: "[environment]"
disable-model-invocation: true
---

# Deploy Application

## Pre-Deploy Checklist

Before deploying, verify ALL of these:

- [ ] All tests pass (`./gradlew test` for backend, `pnpm turbo test` for frontend)
- [ ] No TypeScript errors (`pnpm turbo typecheck`)
- [ ] No lint errors (`pnpm turbo lint`)
- [ ] Build succeeds (`./gradlew bootJar` for backend, `pnpm turbo build` for frontend)
- [ ] Feature flags configured correctly for the environment
- [ ] Database migrations are safe (no destructive changes without confirmation)

## Backend (Fly.io)

### Staging
```bash
cd backend && fly deploy --config fly.staging.toml
```

### Production
```bash
cd backend && fly deploy
```

### Verify
```bash
fly status
fly logs --app samofujera-api
curl https://samofujera-api.fly.dev/actuator/health
```

## Frontend (Cloudflare Pages)

### Staging
Cloudflare Pages creates preview deployments automatically for non-main branches.
Push to `develop` branch → preview URL generated.

### Production
Push to `main` branch → automatic production deployment.

### Verify
```bash
curl -I https://samofujera.pages.dev
```

## Database Migrations
Flyway migrations run automatically on backend startup.
- Verify migration status: check Spring Boot logs for "Successfully applied N migrations"
- If a migration fails: Fly.io will roll back to the previous machine

## Rollback
```bash
# Backend: roll back to previous release
fly releases --app samofujera-api
fly deploy --image <previous-image>

# Frontend: Cloudflare Pages dashboard → rollback to previous deployment
```

## Rules
- NEVER deploy without passing all pre-deploy checks
- ALWAYS verify health endpoint after deployment
- Monitor logs for 5 minutes after production deploy
- If anything looks wrong, rollback immediately
```

**Step 4: Write `.claude/skills/ci-pipeline/SKILL.md`**

```markdown
---
name: ci-pipeline
description: "Create or update a GitHub Actions CI/CD workflow for the backend or frontend."
argument-hint: "[backend|frontend|commitlint]"
disable-model-invocation: true
---

# Create/Update CI Pipeline

## MANDATORY: Check Context7 First
Use Context7 to verify the current GitHub Actions syntax and any action
versions being used.

## Backend Pipeline (`.github/workflows/backend.yml`)
```yaml
name: backend ci/cd

on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 25
      - uses: gradle/actions/setup-gradle@v4
      - run: cd backend && ./gradlew test

  modulith-verify:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 25
      - run: cd backend && ./gradlew modulithVerify

  deploy:
    needs: modulith-verify
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: cd backend && flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Frontend Pipeline (`.github/workflows/frontend.yml`)
```yaml
name: frontend ci/cd

on:
  push:
    branches: [main, develop]
    paths: ['apps/**', 'packages/**']
  pull_request:
    paths: ['apps/**', 'packages/**']

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint
      - run: pnpm turbo typecheck
      - run: pnpm turbo test
      - run: pnpm turbo build

  e2e:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm turbo e2e
```

## Commitlint Pipeline (`.github/workflows/commitlint.yml`)
```yaml
name: commitlint

on:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: wagoid/commitlint-github-action@v6
        with:
          configFile: commitlint.config.js
```

## Rules
- Always pin action versions (use @v4 not @latest)
- Use pnpm for frontend, Gradle for backend
- Run tests BEFORE deploy
- Only deploy from main branch
- Use secrets for tokens (FLY_API_TOKEN, etc.)
- Verify action versions against Context7 / GitHub docs
```

**Step 5: Verify all 3 workflow skills exist**

Run:
```bash
ls -la .claude/skills/phase-kickoff/SKILL.md
ls -la .claude/skills/deploy/SKILL.md
ls -la .claude/skills/ci-pipeline/SKILL.md
```
Expected: All 3 files exist.

**Step 6: Commit**

```bash
git add .claude/skills/phase-kickoff/ .claude/skills/deploy/ .claude/skills/ci-pipeline/
git commit -m "feat(config): add 3 workflow skills

Skills for phase kickoff (enforces brainstorm-first rule), deployment
to Fly.io/Cloudflare Pages, and GitHub Actions CI/CD pipelines."
```

---

### Task 6: Final Verification

**Step 1: Count all skills — expect 23**

Run:
```bash
find .claude/skills -name "SKILL.md" | wc -l
```
Expected: `23`

**Step 2: List all skill directories**

Run:
```bash
ls .claude/skills/
```
Expected output (23 directories):
```
api-client-endpoint   deploy                  jooq-repository        react-component        stripe-webhook
api-endpoint          email-template          lingui-extract         react19-conventions    tailwind4-conventions
astro-page            feature-flag            phase-kickoff          shadcn-component       tanstack-query-hook
ci-pipeline           flyway-migration        spring-module          spring-modulith-conventions  tanstack-route
cloudflare-conventions jooq-regen             testcontainers-conventions
```

**Step 3: Verify frontmatter correctness**

Check that:
- Convention skills (5) have `user-invocable: false`
- Generator skills (15) have `disable-model-invocation: true`
- Workflow skills (3) have `disable-model-invocation: true`

Run:
```bash
grep -l "user-invocable: false" .claude/skills/*/SKILL.md | wc -l
```
Expected: `5`

```bash
grep -l "disable-model-invocation: true" .claude/skills/*/SKILL.md | wc -l
```
Expected: `18`

**Step 4: Final commit (if any remaining changes)**

```bash
git status
```
If clean, done. If not, commit remaining changes.

**Step 5: Tag the milestone**

```bash
git tag v0.0.1-skills -m "All 23 project skills created"
```
