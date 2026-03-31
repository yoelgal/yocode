---
name: onboard-migrate
description: Orchestrates first-time project setup and tool migration
---

# Onboard + Migrate Workflow

Handles the first-time experience: analyzing a codebase, extracting
knowledge, migrating from other tools, and setting up yocode.

## Entry

- First time yocode is used in a project (no .yocode/ directory)
- User runs /yocode:init, /yocode:onboard, or /yocode:migrate

## Auto-Detection Flow

```
Is .yocode/ present?
  YES → Already initialized. Offer /onboard to re-analyze or /tidy to clean.
  NO  → Run /yocode:init

Are .planning/, .paul/, .carl/, .base/ present?
  YES → Offer /yocode:migrate before onboarding
  NO  → Proceed to onboard
```

## Onboard Flow

1. **Init** — Create .yocode/ structure
2. **Detect stack** — `yocode stack-detect`
3. **Parallel mappers** — 5 agents analyze codebase
4. **Synthesize** — Combine findings into PROJECT.md + memory rules
5. **Assumptions review** — Present findings, ask for corrections
6. **CLAUDE.md** — Add yocode section + discovered conventions
7. **Profile** — First project only: ask 3-5 questions about how user works
8. **Commit** — `git add .yocode/ CLAUDE.md`

## Migrate Flow

1. **Interview** — Checklist of tools used
2. **Scan** — Find artifacts at known paths
3. **Extract** — Parse each tool's state into yocode format
4. **Classify** — Scope inference (global/stack/project)
5. **Deduplicate** — Check against existing memories
6. **Review** — Present summary, user approves
7. **Write** — Create memory files
8. **Cleanup** — Delete/archive originals (user choice)
9. **Clean CLAUDE.md** — Remove stale tool references
10. **Verify** — Confirm clean state

## Post-Onboard

After either flow completes:
- Scan seeds for relevant ideas: `yocode seed scan <project-name>`
- Detect production connectors: `yocode connectors detect`
- Offer to set up connectors: `/yocode:connect`
