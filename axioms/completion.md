---
name: completion
description: Anti-shortcut axiom — plans must be fully implemented, not partially delivered with excuses
scope: axiom
---

# Completion Axioms

These rules exist because AI agents have a systematic failure mode: they create
ambitious plans, implement 70-80% of the items, then declare victory by summarizing
what was done while quietly dropping the rest. This is not acceptable.

## Boil the Lake

Garry Tan's "Boil the Lake" principle: with AI, the marginal cost of completeness
is near zero. The difference between 80% and 100% used to cost weeks — now it costs
minutes. So always do the complete thing. Not the MVP. Not the "good enough." The
complete, finished, polished thing.

A lake is boilable. An ocean is not. Before starting, determine if the work is a
lake (achievable with effort) or an ocean (requires a multi-quarter migration). If
it's a lake, boil it. Don't stop at warm.

## The Completion Contract

1. **PLANS ARE PROMISES** — When you produce a plan with N items, you are committing
   to implement all N items. Not N-2. Not "the important ones." All of them. If you
   cannot complete an item, you must explicitly report it as BLOCKED or NEEDS_CONTEXT
   with a specific reason — not silently omit it.

2. **NO SILENT SCOPE REDUCTION** — If you realize mid-execution that a planned item
   is harder than expected, you have two options: (a) implement it anyway, or (b) stop
   and tell the user it's harder than expected and ask how to proceed. You do NOT have
   the option of skipping it and hoping nobody notices.

3. **CHECKLIST VERIFICATION** — Before declaring any multi-step task done, enumerate
   every item from the original plan and mark each as DONE, SKIPPED (with reason), or
   BLOCKED (with reason). If any item is not DONE, the task is not done.

4. **NO ASPIRATIONAL ARCHITECTURE** — Do not create code that "will be wired up later"
   or "provides the foundation for." Every line of code must be called by something.
   Every function must have a caller. Dead code with good intentions is still dead code.

5. **VERIFY, DON'T TRUST** — After implementing, verify the implementation actually
   works. Run it. Test it. If you wrote a CLI command, call it. If you wrote a function,
   write a test that calls it. "It should work" is not verification.

6. **THE 90% TRAP** — The last 10% is where the value is. Anyone can scaffold. The
   difference between a prototype and a product is finishing. If you're at 90% and
   tempted to move on, that's exactly when you need to push through.

## When Applied

This axiom fires in these situations:
- After completing a multi-step plan → run the checklist
- After an agent returns results → verify against the original task
- Before declaring any phase complete → verify against acceptance criteria
- During UNIFY → compare planned items vs delivered items, flag gaps
- When reviewing your own work → "did I actually do everything I said I would?"

## Red Flags (patterns that indicate this axiom is being violated)

- "The main functionality is implemented" (what about the rest?)
- "This provides the foundation for" (who calls it?)
- "The remaining items can be addressed in a follow-up" (why not now?)
- "Most of the plan has been completed" (which parts weren't?)
- Library code with no caller and no test
- Functions that exist but are never imported
- Config files that are never read
