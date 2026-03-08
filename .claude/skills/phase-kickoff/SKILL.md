---
name: phase-kickoff
description: "Start a new implementation phase or feature. Applies the 3-tier workflow: large tasks get full brainstorm/design/plan, medium tasks get a short plan, small tasks skip this skill entirely."
argument-hint: "[task-description]"
disable-model-invocation: true
---

# Phase Kickoff

## First: Determine Task Size

Before doing anything, classify the task:

| Size | Examples | Action |
|------|----------|--------|
| **Large** | New phase, new module, architecture change | Full workflow below |
| **Medium** | New endpoint, new page, new component | Write 5-10 point plan in chat, then implement |
| **Small** | Bug fix, CSS tweak, refactor, text change | **Skip this skill** — implement directly |

If the task is **small**, tell the user and implement directly. No design doc needed.
If the task is **medium**, write a quick plan in chat and start after approval.

## Full Workflow (Large Tasks Only)

### Step 1: Brainstorm
Invoke the `superpowers:brainstorming` skill to:
- Review the relevant section of `architektura.md`
- Challenge assumptions — the architecture is orientational, not definitive
- Use Context7 to verify technology choices against current docs
- Explore 2-3 approaches with trade-offs
- Get user approval on the approach

### Step 2: Design Doc
Write to: `docs/plans/YYYY-MM-DD-<topic>-design.md`

Include: Goal, architecture decisions, DB schema, API endpoints, component
structure, test strategy (as applicable). Commit the design doc.

### Step 3: Implementation Plan
Invoke the `superpowers:writing-plans` skill. Save to:
`docs/plans/YYYY-MM-DD-<topic>-implementation.md`

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
- NEVER skip brainstorming for large tasks
- For medium tasks, a chat plan is sufficient — no design doc file needed
- ALWAYS use TDD during implementation
