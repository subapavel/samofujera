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
