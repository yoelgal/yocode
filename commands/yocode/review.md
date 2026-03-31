---
name: review
description: |
  Pre-landing PR review with specialist dispatch and scope drift detection.
  Use when asked to "review", "code review", or before merging.
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# /yocode:review

Pre-landing code review with multiple specialist perspectives.

## Step 0: Load Diff

```bash
BASE=$(git remote show origin 2>/dev/null | grep "HEAD branch" | awk '{print $NF}')
BASE=${BASE:-main}
git diff $BASE...HEAD --stat
git diff $BASE...HEAD
git log $BASE...HEAD --oneline
```

## Step 1: Structural Review

Check the diff for structural issues:

### SQL Safety
- Raw SQL queries without parameterization
- Migrations that could lock tables
- Missing indexes on new foreign keys
- Destructive migrations without rollback

### Security
- OWASP Top 10 violations
- Secret exposure (grep for API keys, tokens, passwords)
- Command injection via user input
- XSS in rendered content
- Missing auth checks on new endpoints

### LLM Trust Boundaries
- User input flowing into LLM prompts without sanitization
- LLM output used in SQL/shell/eval without validation
- Missing content filtering on LLM responses
- Prompt injection vectors

### Conditional Side Effects
- State mutations inside conditions that might not execute
- Error paths that skip cleanup
- Race conditions in async code
- Missing rollback on partial failures

## Step 2: Specialist Dispatch

Launch parallel reviewer agents for focused analysis:

1. **Security Reviewer** — OWASP, secrets, injection vectors
2. **Performance Reviewer** — N+1 queries, unnecessary re-renders, bundle impact
3. **API Reviewer** — Breaking changes, missing validation, response format
4. **Test Reviewer** — Coverage gaps, flaky patterns, missing edge cases

Each specialist reports independently.

## Step 3: Scope Drift Detection

Compare the diff against the stated objective (PR title, plan, or commit messages):
- Changes outside the stated scope
- Files touched that weren't part of the feature
- "While I was here" cleanups that could introduce risk

## Step 4: Classify Findings

| Classification | Action Required |
|----------------|----------------|
| **AUTO-FIX** | Safe to fix automatically (formatting, imports) |
| **ASK** | Needs human decision (architecture, breaking change) |
| **INFO** | Informational, no action needed (trade-off noted) |

## Step 5: Report

```markdown
# Review: [branch/PR]

## Verdict: [APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION]

## Must Fix ([N])
[Issues that block shipping]

## Should Fix ([N])
[Issues that create risk or tech debt]

## Informational ([N])
[Trade-offs and observations]

## Scope Drift
[Any changes outside stated objective]

## Overall
[2-3 sentence assessment]
```
