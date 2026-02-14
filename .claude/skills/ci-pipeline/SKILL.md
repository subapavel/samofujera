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
    paths: ['apps/backend/**']
  pull_request:
    paths: ['apps/backend/**']

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
      - run: cd backend && ./mvnw test

  modulith-verify:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 25
      - run: cd backend && ./mvnw modulithVerify

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
- Use pnpm for frontend, Maven for backend
- Run tests BEFORE deploy
- Only deploy from main branch
- Use secrets for tokens (FLY_API_TOKEN, etc.)
- Verify action versions against Context7 / GitHub docs
