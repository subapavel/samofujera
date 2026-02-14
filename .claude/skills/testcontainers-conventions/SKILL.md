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
2. JOOQ reads schema from Testcontainers -> generates Java classes
3. Compile (type-safe checks against generated schema)
4. Run tests (against Testcontainers)
```

## Rules
- Never use H2 or in-memory DB — always real PostgreSQL via Testcontainers
- Never mock Redis — use real Redis via Testcontainers
- Every module gets an `@ApplicationModuleTest` class
- Use Spring Modulith's `Scenario` API for event-driven test flows
- Shared `TestcontainersConfig` reused across all module tests
