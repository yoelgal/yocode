---
name: tidy
description: |
  Consolidate accumulated artifacts, archive completed phases, clean stale
  state. Use periodically or when .yocode/ feels bloated. Also detects
  and cleans up leftover state from other workflow tools.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# /yocode:tidy

Housekeeping for your project. Consolidates artifacts, archives stale state,
and cleans up clutter — both from yocode and from other tools.

## What It Cleans

### 1. Other tools' leftovers

Detect orphaned state directories from tools that may no longer be in use:

```bash
# Directories from other workflow tools
ls -d .planning/ .paul/ .carl/ .base/ .gsd/ 2>/dev/null

# gstack state (global)
ls -d ~/.gstack/projects/ 2>/dev/null

# Stale CLAUDE.md references
grep -c "gsd\|gstack\|/paul\|\.carl\|\.base" CLAUDE.md 2>/dev/null
```

If found, ask the user:

```
I found leftover state from other workflow tools:

  .planning/  (GSD)     — 47 files, 128KB
  .paul/      (Paul)    — 12 files, 34KB

Options:
  1. Run /yocode:migrate first (extract knowledge, then clean)
  2. Delete them (nothing valuable, or already migrated)
  3. Leave them (I'm still using those tools)
```

If the user has already run `/yocode:migrate` and the `.yocode/migrated-from/`
backup exists, offer to delete the backup too:

```
You have migration backups at .yocode/migrated-from/ (156KB).
The knowledge has been in yocode's memory for [N] days.
Delete the backups? (y/n)
```

### 2. Completed phase artifacts

Phase directories accumulate PLAN.md, SUMMARY.md, research notes, and
execution logs. After a phase ships, the valuable knowledge should be
in memory — the artifacts are just evidence.

```bash
# Find phase directories
ls -d .yocode/phases/*/ 2>/dev/null
```

For each completed phase (has SUMMARY.md with status: complete):
1. Extract any un-captured lessons into memory rules
2. Check if the phase's decisions are logged in memory
3. Archive the phase directory to `.yocode/archive/phases/`

Present summary:
```
Completed phases ready to archive:

  01-foundation/   — completed 2026-03-15, 8 files
  02-auth/         — completed 2026-03-20, 12 files
  03-dashboard/    — completed 2026-03-28, 6 files

Knowledge already captured in memory: 14/14 lessons
Archive these? (y = all, n = skip, or list numbers)
```

### 3. Resolved debug sessions

Debug sessions at `.yocode/debug/sessions/` that are marked `resolved`
have already contributed to the knowledge base. Archive them.

```bash
grep -l "status: resolved" .yocode/debug/sessions/*.md 2>/dev/null
```

### 4. Stale execution state

Leftover worktrees, execution state files, and orphaned branches:

```bash
# Orphaned worktrees
git worktree list | grep yocode

# Stale execution state
ls .yocode/EXECUTION_STATE.json 2>/dev/null

# Orphaned yocode branches
git branch | grep "yocode/"
```

Clean up with user confirmation.

### 5. Session snapshots

The PreCompact hook saves session snapshots at `~/.yocode/.sessions/`.
These are useful for the dream cycle but accumulate. Keep the last 20,
archive or delete older ones.

### 6. Tool logs

The PostToolUse observer writes to `~/.yocode/.tool-log`. This file
grows indefinitely. Trim to last 500 entries.

## Output

```markdown
# Tidy Report

## Cleaned
- Archived [N] completed phases (saved [N]KB)
- Archived [N] resolved debug sessions
- Removed [N] stale worktrees
- Cleaned execution state
- Trimmed tool log ([N] → 500 entries)
- Trimmed session snapshots ([N] → 20)

## Other Tools
- [Deleted/Archived/Skipped] .planning/ (GSD)
- [Deleted/Archived/Skipped] .paul/ (Paul)

## Disk Saved
[N]KB freed across project and global state

## Recommendations
- [Any memories that should be promoted to higher scope]
- [Any stale memories flagged for review]
```

## When to Run

- After shipping a milestone
- When `.yocode/` exceeds 1MB
- When you notice old phase directories piling up
- After completing a `/yocode:migrate`
- Periodically (the dream cycle handles memory, tidy handles files)
