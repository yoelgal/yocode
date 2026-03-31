---
name: learn
description: |
  Review, search, stage, and prune memories. Interactive memory management.
  Use when asked to "what have we learned", "show memories", or "prune".
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# /yocode:learn

Interactive memory management — review, search, stage, and prune.

## Modes

### Review
Show all active memories across scopes:
```bash
echo "=== Global ==="
find ~/.yocode/memory/global/rules/ -name "*.md" 2>/dev/null
echo "=== Stacks ==="
find ~/.yocode/memory/stacks/ -name "*.md" 2>/dev/null
echo "=== Project ==="
find .yocode/memory/rules/ -name "*.md" 2>/dev/null
```

For each memory, show: title, scope, created date, last validated, keywords.

### Search
Search memories by keyword or topic:
- Full-text search across all tiers
- Wiki-link search for related memories
- Show results ranked by relevance

### Stage
Review pending corrections/rules in staging:
```bash
ls ~/.yocode/.staging/ 2>/dev/null
```

For each staged memory:
- Show the proposed rule
- Context (what triggered it)
- Ask: approve / edit / reject

### Prune
Interactive cleanup:
- Show memories not validated in 90+ days
- Show memories with broken references
- Show potential duplicates (>60% similarity)
- Ask: archive / keep / merge for each

### Promote
Move a memory to a higher scope:
- Project rule that applies broadly → stack
- Stack rule that's universal → global
- Frequent correction → axiom candidate
