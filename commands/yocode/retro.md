---
name: retro
description: |
  Engineering retrospective with commit analysis and trend tracking.
  Use when asked for "retro", "what did we ship", or end of sprint.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

# /yocode:retro

Cross-project retrospective with persistent history and trend tracking.

## Step 0: Determine Scope

```bash
# Default: last 7 days
SINCE=${1:-"7 days ago"}
echo "Retro period: $SINCE to now"
```

Options:
- Single project (current directory)
- Global (scan ~/Developer/ for all git repos)

## Step 1: Gather Data

```bash
# Commit history
git log --since="$SINCE" --oneline --all
git log --since="$SINCE" --format="%H|%an|%ae|%at|%s" --all

# File change stats
git log --since="$SINCE" --numstat --format="" --all

# Authors
git shortlog --since="$SINCE" -sn --all
```

## Step 2: Analyze (14 Metrics)

1. **Commit Count** — Total commits in period
2. **Commit Frequency** — Commits per day distribution
3. **Time Distribution** — When commits happen (hours, days of week)
4. **Work Sessions** — Gaps > 2 hours define session boundaries
5. **Session Duration** — Average productive session length
6. **Commit Type Breakdown** — feat/fix/refactor/docs/test/chore
7. **Files Changed** — Total unique files modified
8. **Hotspots** — Most-changed files (potential complexity indicators)
9. **Lines Added/Removed** — Net code growth
10. **PR Size Distribution** — Small/medium/large commits
11. **Focus Score** — Are commits clustered or scattered across the codebase?
12. **Test Coverage Delta** — New tests added vs code added
13. **Author Breakdown** — Per-person contribution patterns
14. **Ship Velocity** — Features shipped to production

## Step 3: Highlights

### Ship of the Week
The most impactful change — the one that moved the needle most for users.

### Wins
- What went well?
- What was surprisingly easy?
- What tooling/process worked?

### Friction Points
- What took longer than expected?
- What required multiple attempts?
- What tooling/process was painful?

### Lessons
- What should we remember for next time?
- Any corrections that should become permanent rules?

## Step 4: Trend Comparison

Load previous retro from `.yocode/retros/`:

```bash
ls -t .yocode/retros/*.md 2>/dev/null | head -1
```

Compare key metrics:
- Commit frequency: trending up/down/stable?
- Focus score: more or less scattered?
- Session duration: longer or shorter?
- Ship velocity: accelerating or decelerating?

## Step 5: Save & Report

Write retro to `.yocode/retros/[date].md`:

```markdown
# Retro: [date range]

## Summary
[2-3 sentence overview]

## Metrics
| Metric | This Period | Previous | Trend |
|--------|-----------|----------|-------|
| Commits | [N] | [N] | [↑↓→] |
| Focus Score | [N] | [N] | [↑↓→] |
...

## Ship of the Week
[Description and impact]

## Wins
- [List]

## Friction
- [List]

## Lessons
- [List]

## Action Items
- [ ] [Specific improvements for next period]
```

Capture any lessons as memory rules.
