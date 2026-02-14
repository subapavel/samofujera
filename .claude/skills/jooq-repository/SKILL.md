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
2. Create repository in `apps/backend/src/main/java/cz/samofujera/$0/internal/`
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
