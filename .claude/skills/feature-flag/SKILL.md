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
