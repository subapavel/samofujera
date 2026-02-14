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
