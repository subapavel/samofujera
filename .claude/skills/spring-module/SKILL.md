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
- Run `./mvnw test` to verify module boundaries
- If this module needs a database table, use `/flyway-migration` next
- If this module needs JOOQ classes, use `/jooq-regen` after migration

## Important Notes
- **Bean naming**: Avoid class names that conflict with Spring framework beans
  (e.g. don't use `SessionRepository` — Spring Session already defines that bean)
- **Sub-package visibility**: If the `event/` package needs to be accessed by other
  modules, add `@NamedInterface("events")` in `event/package-info.java`
- **@Transactional**: Any service method that publishes events via
  `ApplicationEventPublisher` MUST be annotated with `@Transactional` for
  `@ApplicationModuleListener` handlers to fire
