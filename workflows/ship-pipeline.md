---
name: ship-pipeline
description: Orchestrates the full shipping workflow from tests to PR
---

# Ship Pipeline Workflow

Coordinates the /yocode:ship command through all steps.

## Entry

Triggered when intent classifies as SHIP ("ship", "deploy", "PR", "push").
High-risk gate: requires user confirmation before proceeding.

## Pre-flight

1. Detect platform and base branch
2. Verify not on base branch
3. Check for uncommitted changes (stash if needed)
4. Load project test command from CLAUDE.md

## Pipeline

```
Merge base → Tests → Review → Version → Changelog → Commit → Push → PR
```

### Merge Base Branch
```bash
git fetch origin <base>
git merge origin/<base> --no-edit
```

### Run Tests
Execute project's test suite. All must pass.
If fail → identify cause → fix if ours → re-test.

### Pre-Landing Review
Spawn reviewer agent(s) in parallel:
- Security reviewer
- Performance reviewer
- API reviewer
- Test coverage reviewer

Classify findings: AUTO-FIX (safe to fix) / ASK (needs decision) / INFO (noted).

### Version Bump
Auto-decide based on diff size and feature signals:
- <50 lines, no features → patch
- 50+ lines, no features → minor candidate
- New features detected → ask user

### Changelog
Generate from commits. Write for users, not contributors.
Lead with what they can now DO.

### Commit + Push + PR
Bisectable commits. Each independently valid.
PR body includes: summary, test results, review findings, scope check.

## Post-Ship

- Offer `/yocode:canary` for post-deploy monitoring
- Update STATE.md with ship event
- Capture any lessons to memory
