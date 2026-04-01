---
name: dream
description: |
  Memory consolidation cycle. Merges, prunes, and indexes memories
  across all three tiers. Inspired by sleep-time compute research.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# /yocode:dream

Memory consolidation — the cognitive equivalent of REM sleep.

## Trigger

Auto-triggered when both conditions met:
- 24+ hours since last dream cycle
- 5+ sessions have occurred

Also available manually via `/yocode:dream`.

## Phase 1: Orient

Scan all three memory tiers:
```bash
# Global
find ~/.yocode/memory/global/ -name "*.md" | wc -l
cat ~/.yocode/memory/global/index.md

# Stacks
find ~/.yocode/memory/stacks/ -name "*.md" 2>/dev/null | wc -l

# Project (if in a project)
find .yocode/memory/ -name "*.md" 2>/dev/null | wc -l
```

Also scan Claude Code's native memory for new entries since last dream:
```bash
# Claude Code accumulates memories here independently of yocode
find ~/.claude/projects/*/memory/ -name "*.md" -newer ~/.yocode/.dream-state 2>/dev/null
```

Any new Claude Code memories found should be:
1. Read and classified (user/feedback/project/reference)
2. Checked for duplicates against yocode's existing memories
3. If new: imported into the appropriate yocode tier
4. This keeps yocode's memory as the single source of truth even when
   Claude Code's auto-memory captures things independently

## Phase 2: Gather Signal

Scan session transcripts and tool logs for:
- **Corrections**: "no, do it this way", "don't", "always use X"
- **Decisions**: "let's use X instead of Y"
- **Patterns**: Recurring approaches or recurring frustrations
- **Insights**: "TIL", "good to know", "remember that"

Sources:
```bash
# Session snapshots
ls -t ~/.yocode/.sessions/*.md 2>/dev/null | head -10
# Tool usage log
cat ~/.yocode/.tool-log 2>/dev/null | tail -100
```

## Phase 3: Consolidate

For each memory tier:

1. **Merge overlapping entries** — Two rules about the same topic → combine
2. **Convert relative dates** — "last Thursday" → "2026-03-27"
3. **Delete contradicted facts** — If A says "use X" and B says "don't use X",
   archive the older one, keep the newer one
4. **Validate references** — Check if referenced files/functions still exist
   ```bash
   # For each file path in memories, check existence
   ```
5. **Check wiki-links** — Detect broken [[links]] and orphaned nodes
6. **Cross-project promotion** — If a lesson appears in 2+ projects,
   promote it to stack or global scope

## Phase 4: Prune & Index

1. **Flag stale memories** — Not referenced in 90+ days, no matching keywords
   in recent sessions
2. **Archive stale to L2** — Move from rules/ to archived/
3. **Rebuild index.md** — Regenerate L0 summaries, keep under 50 lines
4. **Update dream state**:
   ```bash
   echo "$(date +%s)" > ~/.yocode/.dream-state
   echo "0" >> ~/.yocode/.dream-state
   ```

## Report

```markdown
# Dream Cycle: [date]

## Consolidated
- Merged [N] overlapping memories
- Converted [N] relative dates
- Resolved [N] contradictions

## Validated
- [N] referenced files still exist
- [N] broken references archived

## Promoted
- [N] project memories → stack scope
- [N] stack memories → global scope

## Pruned
- [N] stale memories archived to L2

## Index Status
- Global: [N] rules, [N] axioms
- Stacks: [N] rules across [N] stacks
- Project: [N] rules, [N] decisions
```
