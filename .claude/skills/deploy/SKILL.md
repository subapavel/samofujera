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
