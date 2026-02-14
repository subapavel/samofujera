# Phase 1A — Infrastructure Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the monorepo, backend skeleton with Flyway + JOOQ pipeline, Docker Compose, commitlint, and a working feature flags module — all with tests.

**Architecture:** Turborepo + pnpm manages the monorepo (frontend packages only). Backend is a standalone Maven project (Spring Boot 4.0.2 + Spring Modulith 2.0.2) with JOOQ codegen powered by Testcontainers PostgreSQL at build time. Feature flags module serves as proof-of-concept for the full stack.

**Tech Stack:** Java 25, Spring Boot 4.0.2, Spring Modulith 2.0.2, JOOQ 3.20.x (Spring Boot managed), Flyway, Testcontainers, PostgreSQL 17, Redis 7, Maven, Turborepo, pnpm

**Prerequisites:** Docker Desktop running (required for Testcontainers and Docker Compose). Java 25 JDK installed. pnpm installed globally.

---

## Task 1: Monorepo Root Setup

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Modify: `.gitignore` (add Node/Java ignores)

**Step 1: Initialize root package.json**

```json
{
  "name": "samofujera",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "pnpm@9.15.4"
}
```

**Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```jsonc
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".astro/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "interactive": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

**Step 4: Create placeholder directories**

```bash
mkdir -p apps/.gitkeep packages/.gitkeep
```

Create empty `.gitkeep` files in `apps/` and `packages/` so Git tracks them.

**Step 5: Update .gitignore**

Add comprehensive ignores for Node.js, Java/Maven, IDE files, and OS files. Key entries:

```gitignore
# Node
node_modules/
.turbo/
dist/

# Java / Maven
backend/target/
*.class
*.jar
*.war

# IDE
.idea/
*.iml
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local
```

**Step 6: Install dependencies**

Run: `pnpm install`

**Step 7: Verify turbo works**

Run: `pnpm build`
Expected: "No tasks to run" (no packages yet) — clean exit.

**Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml .gitignore apps/.gitkeep packages/.gitkeep
git commit -m "feat(config): initialize turborepo monorepo with pnpm"
```

---

## Task 2: Commitlint + Husky

**Files:**
- Modify: `package.json` (add devDependencies)
- Create: `commitlint.config.js`
- Create: `.husky/commit-msg`

**Step 1: Install dependencies**

```bash
pnpm add -D -w @commitlint/cli @commitlint/config-conventional husky
```

**Step 2: Create commitlint.config.js**

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'perf', 'test', 'build', 'ci', 'chore', 'revert',
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'backend', 'web', 'admin', 'customer', 'ui',
        'api-client', 'emails', 'i18n', 'config', 'deps', 'infra',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};
```

**Step 3: Initialize Husky**

```bash
pnpm exec husky init
```

**Step 4: Create commit-msg hook**

Write `.husky/commit-msg`:

```bash
pnpm exec commitlint --edit $1
```

**Step 5: Test commitlint passes on valid message**

```bash
echo "feat(backend): add something" | pnpm exec commitlint
```

Expected: No errors, clean exit.

**Step 6: Test commitlint rejects invalid message**

```bash
echo "Added something" | pnpm exec commitlint
```

Expected: Error about type, case, etc.

**Step 7: Commit**

```bash
git add commitlint.config.js .husky/ package.json pnpm-lock.yaml
git commit -m "build(config): add commitlint and husky for conventional commits"
```

---

## Task 3: Docker Compose

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml**

```yaml
services:
  samofujera-db:
    image: postgres:17-alpine
    container_name: samofujera-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: samofujera
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    volumes:
      - samofujera-pgdata:/var/lib/postgresql/data

  samofujera-redis:
    image: redis:7-alpine
    container_name: samofujera-redis
    ports:
      - "6379:6379"

  samofujera-mailpit:
    image: axllent/mailpit
    container_name: samofujera-mailpit
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  samofujera-pgdata:
```

**Step 2: Verify Docker Compose starts**

```bash
docker compose up -d
```

Expected: All 3 containers running.

**Step 3: Verify Postgres is reachable**

```bash
docker exec samofujera-db psql -U dev -d samofujera -c "SELECT 1"
```

Expected: Returns `1`.

**Step 4: Verify Redis is reachable**

```bash
docker exec samofujera-redis redis-cli ping
```

Expected: `PONG`

**Step 5: Tear down**

```bash
docker compose down
```

**Step 6: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(infra): add docker compose for local development"
```

---

## Task 4: Backend Maven Project Skeleton

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/cz/samofujera/SamoFujeraApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/application-dev.yml`
- Add Maven Wrapper: `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/`

**Step 1: Create Maven Wrapper**

```bash
cd backend
mvn wrapper:wrapper -Dmaven=3.9.9
```

If `mvn` is not installed globally, download the wrapper files manually or use `mvn -N wrapper:wrapper`.

Alternative: copy Maven Wrapper files from a known source.

**Step 2: Create pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.0.2</version>
        <relativePath/>
    </parent>

    <groupId>cz.samofujera</groupId>
    <artifactId>samofujera-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>Samo Fujera Backend</name>
    <description>Backend for Samo Fujera platform</description>

    <properties>
        <java.version>25</java.version>
        <spring-modulith.version>2.0.2</spring-modulith.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.modulith</groupId>
                <artifactId>spring-modulith-bom</artifactId>
                <version>${spring-modulith.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <!-- Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- JOOQ -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jooq</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>

        <!-- Redis -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>

        <!-- Spring Modulith -->
        <dependency>
            <groupId>org.springframework.modulith</groupId>
            <artifactId>spring-modulith-starter-core</artifactId>
        </dependency>

        <!-- Actuator -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.modulith</groupId>
            <artifactId>spring-modulith-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-testcontainers</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>

            <!-- Step 1: Concatenate Flyway migrations for JOOQ codegen -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-antrun-plugin</artifactId>
                <executions>
                    <execution>
                        <id>concat-migrations</id>
                        <phase>generate-sources</phase>
                        <goals>
                            <goal>run</goal>
                        </goals>
                        <configuration>
                            <target>
                                <mkdir dir="${project.build.directory}"/>
                                <concat destfile="${project.build.directory}/db-init.sql" fixlastline="yes">
                                    <sort>
                                        <fileset dir="src/main/resources/db/migration" includes="V*.sql"/>
                                    </sort>
                                </concat>
                            </target>
                        </configuration>
                    </execution>
                </executions>
            </plugin>

            <!-- Step 2: Generate JOOQ classes from Testcontainers PostgreSQL -->
            <plugin>
                <groupId>org.jooq</groupId>
                <artifactId>jooq-codegen-maven</artifactId>
                <executions>
                    <execution>
                        <id>jooq-codegen</id>
                        <phase>generate-sources</phase>
                        <goals>
                            <goal>generate</goal>
                        </goals>
                    </execution>
                </executions>
                <dependencies>
                    <dependency>
                        <groupId>org.testcontainers</groupId>
                        <artifactId>postgresql</artifactId>
                        <version>1.20.4</version>
                    </dependency>
                    <dependency>
                        <groupId>org.postgresql</groupId>
                        <artifactId>postgresql</artifactId>
                        <version>42.7.4</version>
                    </dependency>
                </dependencies>
                <configuration>
                    <jdbc>
                        <driver>org.testcontainers.jdbc.ContainerDatabaseDriver</driver>
                        <url>jdbc:tc:postgresql:17-alpine:///samofujera?TC_INITSCRIPT=file:${project.build.directory}/db-init.sql</url>
                        <user>dev</user>
                        <password>dev</password>
                    </jdbc>
                    <generator>
                        <database>
                            <name>org.jooq.meta.postgres.PostgresDatabase</name>
                            <inputSchema>public</inputSchema>
                            <excludes>flyway_schema_history</excludes>
                        </database>
                        <generate>
                            <records>true</records>
                            <fluentSetters>true</fluentSetters>
                            <javaTimeTypes>true</javaTimeTypes>
                        </generate>
                        <target>
                            <packageName>cz.samofujera.generated.jooq</packageName>
                            <directory>${project.build.directory}/generated-sources/jooq</directory>
                        </target>
                    </generator>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

**Note:** Use Context7 to verify exact dependency coordinates and versions at implementation time. Spring Boot 4.0.2 manages most versions via its parent POM — only override when necessary.

**Step 3: Create SamoFujeraApplication.java**

```java
package cz.samofujera;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SamoFujeraApplication {

    public static void main(String[] args) {
        SpringApplication.run(SamoFujeraApplication.class, args);
    }
}
```

**Step 4: Create application.yml**

```yaml
spring:
  application:
    name: samofujera
  flyway:
    enabled: true
    locations: classpath:db/migration
  jooq:
    sql-dialect: postgres

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

**Step 5: Create application-dev.yml**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/samofujera
    username: dev
    password: dev
  data:
    redis:
      host: localhost
      port: 6379
```

**Step 6: Verify the project compiles (without migrations yet — will fail on JOOQ codegen)**

This step will be completed after Task 5 (migrations).

**Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): initialize spring boot 4 maven project skeleton"
```

---

## Task 5: Flyway Migrations

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__create_users_table.sql`
- Create: `backend/src/main/resources/db/migration/V2__create_feature_flags_table.sql`

**Step 1: Create V1 — Users table**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
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

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
```

**Step 2: Create V2 — Feature flags table**

```sql
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description VARCHAR(500),
    rules JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_feature_flags_key ON feature_flags(key);
```

**Step 3: Commit**

```bash
git add backend/src/main/resources/db/migration/
git commit -m "feat(backend): add flyway migrations for users and feature_flags tables"
```

---

## Task 6: Verify JOOQ Codegen Pipeline

**Step 1: Run Maven compile to trigger JOOQ codegen**

```bash
cd backend && ./mvnw compile
```

Expected:
- Testcontainers starts a PostgreSQL 17 container
- Migrations are applied via init script
- JOOQ generates classes in `target/generated-sources/jooq/`
- Compilation succeeds

**Step 2: Verify generated classes exist**

Check that `target/generated-sources/jooq/cz/samofujera/generated/jooq/tables/` contains:
- `Users.java` (table reference)
- `FeatureFlags.java` (table reference)
- `records/UsersRecord.java`
- `records/FeatureFlagsRecord.java`

**Step 3: If codegen fails, troubleshoot**

Common issues:
- Docker not running → start Docker Desktop
- TC_INITSCRIPT path wrong → verify `target/db-init.sql` was created by antrun
- Version mismatches → check Context7 for exact compatible versions

**No commit** — this is a verification step.

---

## Task 7: Shared Utilities

**Files:**
- Create: `backend/src/main/java/cz/samofujera/shared/api/ApiResponse.java`
- Create: `backend/src/main/java/cz/samofujera/shared/api/ErrorResponse.java`
- Create: `backend/src/main/java/cz/samofujera/shared/exception/NotFoundException.java`
- Create: `backend/src/main/java/cz/samofujera/shared/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/java/cz/samofujera/shared/package-info.java`

**Step 1: Create ApiResponse**

```java
package cz.samofujera.shared.api;

public record ApiResponse<T>(T data, String message) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(data, message);
    }
}
```

**Step 2: Create ErrorResponse**

```java
package cz.samofujera.shared.api;

import java.time.Instant;

public record ErrorResponse(
    int status,
    String error,
    String message,
    Instant timestamp
) {
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(status, error, message, Instant.now());
    }
}
```

**Step 3: Create NotFoundException**

```java
package cz.samofujera.shared.exception;

public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
```

**Step 4: Create GlobalExceptionHandler**

```java
package cz.samofujera.shared.exception;

import cz.samofujera.shared.api.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse.of(404, "Not Found", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse.of(500, "Internal Server Error", ex.getMessage()));
    }
}
```

**Step 5: Create package-info.java for Spring Modulith**

```java
@org.springframework.modulith.NamedInterface("shared")
package cz.samofujera.shared;
```

Note: `shared/` is not a module — it's an open namespace accessible by all modules. The `@NamedInterface` annotation exposes it. Check Context7 for the correct Spring Modulith annotation to mark a package as a shared/open namespace.

**Step 6: Verify compilation**

```bash
cd backend && ./mvnw compile
```

Expected: Successful compilation.

**Step 7: Commit**

```bash
git add backend/src/main/java/cz/samofujera/shared/
git commit -m "feat(backend): add shared api response, error handling, and exceptions"
```

---

## Task 8: Feature Flag Module — Write Failing Tests

**Files:**
- Create: `backend/src/test/java/cz/samofujera/featureflag/FeatureFlagServiceTest.java`
- Create: `backend/src/test/java/cz/samofujera/featureflag/internal/FeatureFlagRepositoryIntegrationTest.java`
- Create: `backend/src/test/java/cz/samofujera/TestcontainersConfig.java` (shared test infra)

**Step 1: Create shared Testcontainers configuration**

```java
package cz.samofujera;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfig {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>("postgres:17-alpine");
    }

    @Bean
    @ServiceConnection(name = "redis")
    GenericContainer<?> redisContainer() {
        return new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);
    }
}
```

**Step 2: Write FeatureFlagService unit test**

```java
package cz.samofujera.featureflag;

import cz.samofujera.featureflag.internal.FeatureFlagRepository;
import cz.samofujera.featureflag.internal.FeatureFlagCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FeatureFlagServiceTest {

    @Mock
    private FeatureFlagRepository repository;

    @Mock
    private FeatureFlagCache cache;

    private FeatureFlagService service;

    @BeforeEach
    void setUp() {
        service = new FeatureFlagService(repository, cache);
    }

    @Test
    void isEnabled_returnsCachedValue_whenInCache() {
        when(cache.get("test-flag")).thenReturn(Optional.of(true));

        assertThat(service.isEnabled("test-flag")).isTrue();
    }

    @Test
    void isEnabled_queriesRepository_whenNotInCache() {
        when(cache.get("test-flag")).thenReturn(Optional.empty());
        when(repository.isEnabled("test-flag")).thenReturn(true);

        assertThat(service.isEnabled("test-flag")).isTrue();
        verify(cache).put("test-flag", true);
    }

    @Test
    void isEnabled_returnsFalse_whenFlagNotFound() {
        when(cache.get("unknown-flag")).thenReturn(Optional.empty());
        when(repository.isEnabled("unknown-flag")).thenReturn(false);

        assertThat(service.isEnabled("unknown-flag")).isFalse();
    }
}
```

**Step 3: Write FeatureFlagRepository integration test**

```java
package cz.samofujera.featureflag.internal;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.FEATURE_FLAGS;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class FeatureFlagRepositoryIntegrationTest {

    @Autowired
    private DSLContext dsl;

    private FeatureFlagRepository repository;

    @BeforeEach
    void setUp() {
        repository = new FeatureFlagRepository(dsl);
        dsl.deleteFrom(FEATURE_FLAGS).execute();
    }

    @Test
    void isEnabled_returnsTrue_whenFlagExistsAndEnabled() {
        dsl.insertInto(FEATURE_FLAGS)
            .set(FEATURE_FLAGS.ID, UUID.randomUUID())
            .set(FEATURE_FLAGS.KEY, "test-flag")
            .set(FEATURE_FLAGS.ENABLED, true)
            .execute();

        assertThat(repository.isEnabled("test-flag")).isTrue();
    }

    @Test
    void isEnabled_returnsFalse_whenFlagExistsButDisabled() {
        dsl.insertInto(FEATURE_FLAGS)
            .set(FEATURE_FLAGS.ID, UUID.randomUUID())
            .set(FEATURE_FLAGS.KEY, "disabled-flag")
            .set(FEATURE_FLAGS.ENABLED, false)
            .execute();

        assertThat(repository.isEnabled("disabled-flag")).isFalse();
    }

    @Test
    void isEnabled_returnsFalse_whenFlagDoesNotExist() {
        assertThat(repository.isEnabled("nonexistent")).isFalse();
    }
}
```

**Step 4: Run tests — verify they fail**

```bash
cd backend && ./mvnw test
```

Expected: Compilation errors — `FeatureFlagService`, `FeatureFlagRepository`, and `FeatureFlagCache` don't exist yet.

**Step 5: Commit failing tests**

```bash
git add backend/src/test/
git commit -m "test(backend): add failing tests for feature flag module"
```

---

## Task 9: Feature Flag Module — Implementation

**Files:**
- Create: `backend/src/main/java/cz/samofujera/featureflag/FeatureFlagService.java`
- Create: `backend/src/main/java/cz/samofujera/featureflag/FeatureFlagRecord.java`
- Create: `backend/src/main/java/cz/samofujera/featureflag/internal/FeatureFlagRepository.java`
- Create: `backend/src/main/java/cz/samofujera/featureflag/internal/FeatureFlagCache.java`
- Create: `backend/src/main/java/cz/samofujera/featureflag/internal/package-info.java`

**Step 1: Create FeatureFlagRecord (DTO)**

```java
package cz.samofujera.featureflag;

import java.util.UUID;

public record FeatureFlagRecord(
    UUID id,
    String key,
    boolean enabled,
    String description
) {}
```

**Step 2: Create FeatureFlagRepository**

```java
package cz.samofujera.featureflag.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import static cz.samofujera.generated.jooq.Tables.FEATURE_FLAGS;

@Repository
class FeatureFlagRepository {

    private final DSLContext dsl;

    FeatureFlagRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    boolean isEnabled(String key) {
        return Boolean.TRUE.equals(
            dsl.select(FEATURE_FLAGS.ENABLED)
               .from(FEATURE_FLAGS)
               .where(FEATURE_FLAGS.KEY.eq(key))
               .fetchOne(FEATURE_FLAGS.ENABLED)
        );
    }
}
```

**Step 3: Create FeatureFlagCache**

```java
package cz.samofujera.featureflag.internal;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
class FeatureFlagCache {

    private static final String PREFIX = "ff:";
    private static final Duration TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate redis;

    FeatureFlagCache(StringRedisTemplate redis) {
        this.redis = redis;
    }

    Optional<Boolean> get(String key) {
        String value = redis.opsForValue().get(PREFIX + key);
        if (value == null) {
            return Optional.empty();
        }
        return Optional.of(Boolean.parseBoolean(value));
    }

    void put(String key, boolean enabled) {
        redis.opsForValue().set(PREFIX + key, String.valueOf(enabled), TTL);
    }
}
```

**Step 4: Create FeatureFlagService**

```java
package cz.samofujera.featureflag;

import cz.samofujera.featureflag.internal.FeatureFlagCache;
import cz.samofujera.featureflag.internal.FeatureFlagRepository;
import org.springframework.stereotype.Service;

@Service
public class FeatureFlagService {

    private final FeatureFlagRepository repository;
    private final FeatureFlagCache cache;

    FeatureFlagService(FeatureFlagRepository repository, FeatureFlagCache cache) {
        this.repository = repository;
        this.cache = cache;
    }

    public boolean isEnabled(String key) {
        return cache.get(key)
            .orElseGet(() -> {
                boolean enabled = repository.isEnabled(key);
                cache.put(key, enabled);
                return enabled;
            });
    }
}
```

**Step 5: Create package-info.java for internal package**

```java
package cz.samofujera.featureflag.internal;
```

This ensures Spring Modulith recognizes `internal/` as a module-internal package, not accessible from other modules.

**Step 6: Run tests**

```bash
cd backend && ./mvnw test
```

Expected: All 6 tests pass (3 unit + 3 integration).

**Step 7: If tests fail, debug**

Common issues:
- JOOQ generated class imports don't match → verify `Tables.FEATURE_FLAGS` reference
- Testcontainers can't start → Docker Desktop running?
- Redis connection → check `TestcontainersConfig` `@ServiceConnection`
- Spring Modulith visibility → `FeatureFlagRepository` and `FeatureFlagCache` must be package-private (no `public`), but `FeatureFlagService` constructor needs access. Solution: all in same module, constructor injection via Spring.

**Important:** The `FeatureFlagService` constructor uses package-private classes from `internal/`. Spring Modulith allows this within the same module. The constructor should be package-private too (no `public`), but Spring can inject it. Mark the service itself as `public` since it's the module's public API.

**Step 8: Commit**

```bash
git add backend/src/main/java/cz/samofujera/featureflag/
git commit -m "feat(backend): implement feature flag module with jooq repository and redis cache"
```

---

## Task 10: Module Architecture Test

**Files:**
- Create: `backend/src/test/java/cz/samofujera/ModularityTests.java`

**Step 1: Write the architecture test**

```java
package cz.samofujera;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTests {

    @Test
    void verifyModuleStructure() {
        ApplicationModules modules = ApplicationModules.of(SamoFujeraApplication.class);
        modules.verify();
    }

    @Test
    void printModuleStructure() {
        ApplicationModules modules = ApplicationModules.of(SamoFujeraApplication.class);
        modules.forEach(System.out::println);
    }
}
```

**Step 2: Run the test**

```bash
cd backend && ./mvnw test -pl . -Dtest=ModularityTests
```

Expected: PASS — modules are properly structured with no illegal cross-references.

If it fails, it typically means:
- A module's internal class is referenced from outside
- The shared package isn't properly configured
- Fix by adjusting package visibility or `@NamedInterface` annotations

**Step 3: Commit**

```bash
git add backend/src/test/java/cz/samofujera/ModularityTests.java
git commit -m "test(backend): add spring modulith architecture verification test"
```

---

## Task 11: Dockerfile + fly.toml

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/fly.toml`

**Step 1: Create Dockerfile**

```dockerfile
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B || true
COPY src/ src/
RUN ./mvnw package -B -DskipTests -Djooq.codegen.skip=true

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
USER app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-XX:+UseG1GC", "-jar", "app.jar"]
```

**Note:** The Dockerfile skips JOOQ codegen (`-Djooq.codegen.skip=true`) because the generated sources are already compiled into the JAR from the build machine. If this doesn't work, we'll need to pre-generate JOOQ sources and include them in the repo, or run codegen in Docker (requires Docker-in-Docker). Adjust at implementation time.

**Step 2: Create fly.toml**

```toml
app = "samofujera-api"
primary_region = "waw"

[build]
  dockerfile = "Dockerfile"

[env]
  SPRING_PROFILES_ACTIVE = "prod"
  SERVER_PORT = "8080"
  TZ = "Europe/Prague"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

[checks]
  [checks.health]
    type = "http"
    port = 8080
    path = "/actuator/health"
    interval = "30s"
```

**Step 3: Commit**

```bash
git add backend/Dockerfile backend/fly.toml
git commit -m "feat(infra): add dockerfile and fly.io configuration"
```

---

## Task 12: Final Verification

**Step 1: Run full test suite**

```bash
cd backend && ./mvnw clean verify
```

Expected: All tests pass:
- `FeatureFlagServiceTest` (3 unit tests)
- `FeatureFlagRepositoryIntegrationTest` (3 integration tests)
- `ModularityTests` (2 architecture tests)

**Step 2: Start Docker Compose and verify backend boots**

```bash
docker compose up -d
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Expected: Application starts on port 8080, Flyway runs migrations, connects to Redis.

**Step 3: Verify health endpoint**

```bash
curl http://localhost:8080/actuator/health
```

Expected: `{"status":"UP"}`

**Step 4: Stop the backend and Docker Compose**

```bash
# Ctrl+C on the backend
docker compose down
```

**Step 5: Final commit (if any uncommitted changes)**

```bash
git status
# If clean, no commit needed
# If changes exist, commit them with appropriate message
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Monorepo root (Turborepo + pnpm) | Verify turbo runs |
| 2 | Commitlint + Husky | Valid/invalid commit messages |
| 3 | Docker Compose | Containers start, PG/Redis reachable |
| 4 | Backend Maven skeleton | Compilation succeeds |
| 5 | Flyway migrations (users + feature_flags) | — |
| 6 | JOOQ codegen verification | Generated classes exist |
| 7 | Shared utilities | Compilation |
| 8 | Feature flag tests (failing) | 6 tests, all fail |
| 9 | Feature flag implementation | 6 tests, all pass |
| 10 | Module architecture test | Modulith verify passes |
| 11 | Dockerfile + fly.toml | — |
| 12 | Final verification | Full suite green, backend boots |

**Total estimated commits:** 10
**Total tests:** 8 (3 unit + 3 integration + 2 architecture)
