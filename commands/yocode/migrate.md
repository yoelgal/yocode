---
name: migrate
description: |
  Consolidate from GSD, gstack, Paul, CARL, or BASE into yocode.
  Use when a project has existing workflow tool state.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# /yocode:migrate

Consolidate state from other workflow tools into yocode's unified system.

## Supported Sources

| Tool | State Dir | Key Files |
|------|-----------|-----------|
| GSD | `.planning/` | PROJECT.md, ROADMAP.md, STATE.md, config.json |
| gstack | `~/.gstack/` | learnings.jsonl, config.yaml |
| Paul | `.paul/` | PROJECT.md, STATE.md, phases/ |
| CARL | `.carl/` | rules/, decisions/, domains/ |
| BASE | `.base/` | psmm.json, profile.md |

## Process

### Step 1: Detect

```bash
# Check for existing tool state
ls -d .planning/ .paul/ .carl/ .base/ 2>/dev/null
ls ~/.gstack/ 2>/dev/null
grep -l "gsd\|gstack\|paul\|carl\|base" CLAUDE.md 2>/dev/null
```

Report what was found.

### Step 2: Extract

For each detected tool:

**GSD (.planning/):**
- `PROJECT.md` → `.yocode/PROJECT.md`
- `STATE.md` → `.yocode/STATE.md`
- `ROADMAP.md` → `.yocode/ROADMAP.md`
- `research/` → scan for reusable findings
- `phases/*/SUMMARY.md` → extract lessons
- `debug/knowledge-base.md` → `.yocode/debug/knowledge-base.md`
- `threads/` → scan for cross-session knowledge
- `seeds/` → `.yocode/seeds/`
- `todos/` → `.yocode/todos/`

**gstack (~/.gstack/):**
- `projects/[slug]/learnings.jsonl` → parse and classify by scope
- `config.yaml` → extract relevant preferences

**Paul (.paul/):**
- `PROJECT.md` → merge with existing
- `STATE.md` → merge with existing
- `phases/*/PLAN.md, SUMMARY.md` → extract patterns and lessons
- Decisions → `.yocode/memory/decisions/`

**CARL (.carl/):**
- `rules/` → classify into global/stack/project memory
- `decisions/` → `.yocode/memory/decisions/`
- `domains/` → map to stack-scoped memory

**BASE (.base/):**
- `psmm.json` → extract corrections and insights → stage as memories
- `profile.md` → merge into `~/.yocode/memory/global/profile.md`

### Step 3: Classify & Deduplicate

For each extracted piece of knowledge:
1. Infer scope (global/stack/project) from content
2. Check for duplicates against existing yocode memories
3. Stage new memories for review

### Step 4: Review

Present migration summary:
```markdown
## Migration Summary

### Extracted
- [N] rules from [source]
- [N] decisions from [source]
- [N] debug entries from [source]

### Classified
- [N] global rules
- [N] stack-scoped rules ([stacks])
- [N] project rules

### Duplicates Skipped
- [N] already exist in yocode memory

### Ready to Import
[List of new memories with previews]
```

Ask: "Import these? (y = all, n = cancel, or list numbers to select)"

### Step 5: Write

Write approved memories to their scoped locations.

### Step 6: Archive

Move old tool directories to `.yocode/migrated-from/`:
```bash
mkdir -p .yocode/migrated-from
mv .planning/ .yocode/migrated-from/gsd/ 2>/dev/null
mv .paul/ .yocode/migrated-from/paul/ 2>/dev/null
mv .carl/ .yocode/migrated-from/carl/ 2>/dev/null
mv .base/ .yocode/migrated-from/base/ 2>/dev/null
```

Don't delete — archive. The user might want to reference old state.

### Step 7: Update CLAUDE.md

Remove or update any tool-specific references in CLAUDE.md.
Add yocode-specific instructions if appropriate.
