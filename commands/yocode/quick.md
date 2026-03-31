---
name: quick
description: |
  Minimal ceremony for single-file, obvious changes.
  Use when "just", "quickly", "rename this" detected.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# /yocode:quick

Minimal ceremony mode. Just do the thing.

## Behavior

No planning docs. No wave execution. No UNIFY phase. Just:

1. **Read** the relevant file(s)
2. **Make** the change
3. **Verify** nothing broke (trace callers, check imports)
4. **Commit** atomically

Still benefits from:
- Memory (axioms still apply, L1 rules still load)
- Correction capture (if you correct the approach, it's logged)
- The axioms (trace all callers, check stale refs, etc.)

### When to Use

- Single-file changes
- Obvious fixes (typos, renames, formatting)
- "Just do X" requests
- Changes where planning overhead exceeds implementation time

### When NOT to Use

If the "quick" change touches more than 3 files or crosses module
boundaries, it's not quick — transition to `/yocode:plan`.
