---
name: quality
description: Non-negotiable definition of "done" — the bar for shipping work
scope: axiom
---

# Quality Axioms

Before declaring any work done:

1. **THE PR TEST** — Would a senior engineer approve this PR without comments? If not,
   it's not done.

2. **ZERO STALE REFERENCES** — Is there ANY dead code, stale reference, broken import path,
   or orphaned file resulting from your changes? If yes, fix them before declaring done.

3. **EXISTING DATA** — Does this work for existing data, not just new data? Schema migrations,
   API changes, and UI updates must handle both the old state and the new state.

4. **ALL PATHS** — Are all execution paths accounted for? Error cases, edge cases, empty
   states, loading states, concurrent access. Not every path needs handling, but every path
   needs consideration.

5. **COMPLETE WORK** — Ship complete work, not 90% with a TODO for the last 10%. If a change
   requires follow-up work to be correct, either do the follow-up now or don't ship the change.
