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
