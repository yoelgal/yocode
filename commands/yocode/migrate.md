---
name: migrate
description: |
  Consolidate from any workflow tool — known or custom — into yocode.
  Presents a checklist, scans for artifacts, extracts knowledge into
  memory, then cleans up. Use on any project with existing workflow state.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# /yocode:migrate

Consolidate state from workflow tools into yocode's unified system.
Handles known tools (GSD, gstack, Paul, etc.) AND custom workflows.

## Step 1: Interview — What Have You Used?

Present a checklist. The user picks what applies to THIS project:

```markdown
Which workflow tools or systems have you used in this project?
Check all that apply:

**Known tools (I know where to look):**
- [ ] GSD (Get Shit Done) — .planning/ directory
- [ ] gstack — ~/.gstack/ directory + .claude/skills/gstack/
- [ ] Paul — .paul/ directory
- [ ] CARL — .carl/ directory
- [ ] BASE — .base/ directory
- [ ] Seed — .seed/ or PLANNING.md
- [ ] Ruflo — .ruflo/ or .claude/agents/
- [ ] Claude Code auto-memory — ~/.claude/projects/*/memory/

**Common patterns (I'll scan for these):**
- [ ] Custom CLAUDE.md instructions (rules, conventions, notes)
- [ ] Architecture docs (ARCHITECTURE.md, DESIGN.md, etc.)
- [ ] Planning docs (PLAN.md, TODO.md, ROADMAP.md, etc.)
- [ ] Decision logs (ADR/, decisions/, etc.)
- [ ] Existing .claude/ directory with custom commands or agents

**Other:**
- [ ] Something else (describe it and I'll figure out where to look)
```

Use the checklist to guide the scan — don't waste time searching for
tools the user never used, but DO search thoroughly for the ones they did.

## Step 2: Scan

Based on the user's selections, scan for artifacts.

### Known tool scan paths

| Tool | Local (project) | Global (user) |
|------|----------------|---------------|
| **GSD** | `.planning/` — PROJECT.md, ROADMAP.md, STATE.md, config.json, research/, phases/, debug/, threads/, seeds/, todos/ | — |
| **gstack** | `.claude/skills/gstack/` | `~/.gstack/` — projects/[slug]/learnings.jsonl, config.yaml; `~/.claude/skills/gstack/` |
| **Paul** | `.paul/` — PROJECT.md, STATE.md, phases/, SPECIAL-FLOWS.md | `~/.claude/paul-framework/` |
| **CARL** | `.carl/` — carl.json (v2) or rules/, decisions/, domains/ (v1) | `~/.carl/` |
| **BASE** | `.base/` — workspace.json, psmm.json, state.json | — |
| **Seed** | `.seed/`, `PLANNING.md` | — |
| **Ruflo** | `.ruflo/`, `.claude/agents/` | — |
| **Auto-memory** | — | `~/.claude/projects/*/memory/MEMORY.md` and topic files |

### General documentation scan

Regardless of tool selections, always scan for scattered knowledge:

```bash
# Project root documentation
ls *.md 2>/dev/null | grep -iv "readme\|license\|changelog\|contributing"

# Common planning/architecture directories
ls -d docs/ doc/ design/ plans/ planning/ architecture/ adr/ decisions/ 2>/dev/null

# Hidden state directories (catch anything we missed)
ls -d .*/  2>/dev/null | grep -v '^\.\.\?/$\|\.git/$\|\.yocode/$\|\.vscode/$\|\.idea/$'

# Custom Claude config
ls -d .claude/commands/ .claude/agents/ .claude/skills/ 2>/dev/null

# Inline knowledge in CLAUDE.md
wc -l CLAUDE.md 2>/dev/null
```

Report everything found with file counts and sizes.

## Step 3: Extract

For each detected source, extract knowledge into yocode's format:

### Known tools (structured extraction)

**GSD (.planning/):**
- `PROJECT.md` → `.yocode/PROJECT.md`
- `STATE.md` → `.yocode/STATE.md`
- `ROADMAP.md` → `.yocode/ROADMAP.md`
- `research/` → scan for reusable findings → stage as memories
- `phases/*/SUMMARY.md` → extract lessons learned
- `debug/knowledge-base.md` → `.yocode/debug/knowledge-base.md`
- `threads/` → scan for cross-session knowledge
- `seeds/` → `.yocode/seeds/`
- `todos/` → `.yocode/todos/`

**gstack (~/.gstack/ + .claude/skills/gstack/):**
- `projects/[slug]/learnings.jsonl` → parse each entry, classify by scope
- `config.yaml` → extract user preferences
- `projects/[slug]/*-reviews.jsonl` → extract review patterns

**Paul (.paul/):**
- `PROJECT.md`, `STATE.md` → merge with existing
- `phases/*/PLAN.md, SUMMARY.md` → extract patterns and lessons
- Decisions → `.yocode/memory/decisions/`

**CARL (.carl/):**
- `carl.json` (v2) or `rules/` (v1) → classify into global/stack/project memory
- `decisions/` → `.yocode/memory/decisions/`
- `domains/` → map to stack-scoped memory

**BASE (.base/):**
- `psmm.json` → extract corrections, decisions, insights → stage as memories
- `workspace.json` → extract operator profile → `~/.yocode/memory/global/profile.md`
- `state.json` → extract drift indicators, groom cadence → project memory

**Auto-memory (~/.claude/projects/*/memory/):**
- Read MEMORY.md index
- Read each topic file (preferences.md, decisions.md, corrections.md, etc.)
- Classify: project-specific stays project, universal → global, tech-specific → stack

### Custom/scattered documentation (smart extraction)

For docs the user pointed out or the general scan found:

1. **Read each document fully**
2. **Classify content type:**
   - Architecture decisions → memory decisions
   - Coding conventions → memory rules
   - Tech stack notes → stack-scoped memory
   - Project-specific knowledge → project memory
   - Debugging notes → debug knowledge base
   - Planning state → `.yocode/` state files
   - User preferences → profile
3. **Extract actionable knowledge** — not the whole doc, just the lessons:
   - "Always do X because Y" → rule
   - "We chose X over Y because Z" → decision
   - "X breaks when Y" → rule or debug knowledge
   - "The architecture is..." → project context (keep as-is)
4. **Skip ephemeral content** — old sprint plans, stale roadmaps, completed TODOs

### CLAUDE.md deep extraction

CLAUDE.md is often the richest source of accumulated knowledge:

1. Read it fully
2. Extract sections that are really rules/conventions → stage as memories
3. Identify tool-specific sections that should be removed
4. Identify project-specific sections that should stay
5. Flag anything that contradicts existing yocode memory

## Step 4: Classify & Deduplicate

For each extracted piece of knowledge:
1. Infer scope (global/stack/project) using content analysis
2. Check for duplicates against existing yocode memories (>60% similarity = merge)
3. Check for contradictions (same topic, different advice)
4. Stage new memories for review

## Step 5: Review

Present migration summary:

```markdown
## Migration Summary

### Sources Scanned
- GSD (.planning/) — 47 files
- gstack (~/.gstack/) — 12 learnings
- CLAUDE.md — 8 extractable sections
- ARCHITECTURE.md — 3 decisions

### Extracted
- [N] rules (conventions, patterns, lessons)
- [N] decisions (choices with rationale)
- [N] debug entries (known issues and fixes)
- [N] seeds (future ideas with triggers)

### Classified
- [N] global rules (apply everywhere)
- [N] stack-scoped rules ([list stacks])
- [N] project rules (this project only)

### Duplicates
- [N] already exist in yocode memory (skipped)

### Contradictions
- [N] conflicts with existing rules (need your input)

### Ready to Import
[Numbered list with one-line previews]
```

For contradictions, present both versions and ask which to keep.

Ask: "Import these? (y = all, n = cancel, or list numbers to cherry-pick)"

## Step 6: Write

Write approved memories to their scoped locations.
Regenerate index.md files for affected scopes.

## Step 7: Cleanup Decision

Present what's left behind:

```markdown
## Cleanup

Everything valuable has been extracted. These are now redundant:

| Source | Location | Size | Extraction |
|--------|----------|------|-----------|
| GSD | .planning/ | 128KB | Complete |
| Paul | .paul/ | 34KB | Complete |
| CLAUDE.md sections | inline | — | 5 of 8 sections extracted |

Options:
  1. **Delete originals** — knowledge is safely in .yocode/ now
  2. **Archive to .yocode/migrated-from/** — backup just in case
  3. **Leave as-is** — I'll handle it myself
```

Default: recommend delete if extraction was complete, archive if partial.

If deleting:
```bash
rm -rf .planning/ .paul/ .carl/ .base/ .seed/ .ruflo/
```

If archiving:
```bash
mkdir -p .yocode/migrated-from
# Move each detected source to archive
```

## Step 8: Clean CLAUDE.md

CLAUDE.md accumulates tool-specific instructions that become stale:

1. Read CLAUDE.md fully
2. Identify sections to remove (tool references now in yocode memory)
3. Identify sections to keep (project-specific, not tool-specific)
4. Present proposed changes:
   ```
   CLAUDE.md cleanup:
   - Remove: "## GSD Configuration" (now in yocode memory)
   - Remove: "## gstack skills" (replaced by /yocode: commands)
   - Keep: "## Testing" (project-specific)
   - Keep: "## API Conventions" (project-specific)
   - Simplify: "## Coding Standards" (extracted 4 rules to memory, keep the rest)
   - Add: "## yocode" section (brief, from template)
   ```
5. Only make changes the user approves
6. Commit: `chore: clean up CLAUDE.md after yocode migration`

## Step 9: Verify

```bash
# No orphaned tool directories (if user chose to delete)
ls -d .planning/ .paul/ .carl/ .base/ .seed/ .ruflo/ 2>/dev/null

# No stale tool references in CLAUDE.md
grep -n "gsd\|gstack\|/paul\|\.carl\|\.base\|ruflo" CLAUDE.md 2>/dev/null

# yocode state is populated
find .yocode/memory/ -name "*.md" 2>/dev/null | wc -l
```

Report final status:
```
Migration complete.
  Imported: [N] rules, [N] decisions, [N] debug entries
  Cleaned: [list of removed directories]
  CLAUDE.md: [N] sections removed, [N] kept, [N] simplified

Run /yocode:tidy periodically to keep things clean.
```
