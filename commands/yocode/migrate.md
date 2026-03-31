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

### Step 6: Cleanup Decision

Present the user with a clear summary of what's left behind:

```markdown
## Cleanup

Migration extracted all valuable state into yocode's memory system.
The original directories are now redundant:

| Directory | Size | Files | Status |
|-----------|------|-------|--------|
| .planning/ | [N]KB | [N] files | All knowledge extracted |
| .paul/ | [N]KB | [N] files | All knowledge extracted |
| .carl/ | [N]KB | [N] files | All rules imported |
| .base/ | [N]KB | [N] files | Profile + PSMM imported |

Options:
  1. **Delete originals** — everything valuable is in .yocode/ now
  2. **Archive to .yocode/migrated-from/** — keep a backup just in case
  3. **Leave as-is** — I'll delete them myself later
```

Ask the user which option they prefer. Default recommendation is option 1
(delete) if the extraction was complete, option 2 (archive) if anything
was skipped or partially extracted.

If deleting:
```bash
rm -rf .planning/ .paul/ .carl/ .base/
# Also clean up any tool-specific gitignore entries
```

If archiving:
```bash
mkdir -p .yocode/migrated-from
mv .planning/ .yocode/migrated-from/gsd/ 2>/dev/null
mv .paul/ .yocode/migrated-from/paul/ 2>/dev/null
mv .carl/ .yocode/migrated-from/carl/ 2>/dev/null
mv .base/ .yocode/migrated-from/base/ 2>/dev/null
```

### Step 7: Clean CLAUDE.md

CLAUDE.md often accumulates tool-specific instructions from previous workflows.
These become stale and confusing after migration.

1. Read CLAUDE.md fully
2. Identify sections referencing old tools:
   - GSD command references (`/gsd:*`)
   - gstack skill references (`/qa`, `/ship`, `/review` pointing to gstack)
   - Paul workflow instructions (`.paul/`, PAU loop)
   - CARL domain rules
   - BASE workspace instructions
3. Present proposed changes to the user:
   ```
   I'd like to clean up these CLAUDE.md sections:
   - Remove: "## GSD Configuration" (migrated to yocode memory)
   - Remove: "## gstack skills" (replaced by /yocode: commands)
   - Update: "## Testing" (keep — project-specific, not tool-specific)
   - Add: "## yocode" (brief section explaining the new setup)
   ```
4. Only make changes the user approves
5. Commit: `chore: clean up CLAUDE.md after yocode migration`

### Step 8: Verify

After cleanup, verify the project is clean:
```bash
# No orphaned tool directories
ls -d .planning/ .paul/ .carl/ .base/ 2>/dev/null && echo "WARN: old dirs still present"

# No stale references in CLAUDE.md
grep -n "gsd\|gstack\|/paul\|\.carl\|\.base" CLAUDE.md 2>/dev/null && echo "WARN: stale refs in CLAUDE.md"

# yocode state is populated
ls .yocode/memory/ 2>/dev/null && echo "OK: yocode memory populated"
```

Report final status.
