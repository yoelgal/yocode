---
name: plan-review
description: |
  Three-lens plan review: CEO (scope + vision), Engineer (architecture +
  correctness), Designer (UX + visual quality). Run before executing any
  plan. Interactive — walks through issues one at a time.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - WebSearch
---

# /yocode:plan-review

Review a plan through three lenses before execution. One command replaces
three separate reviews — CEO, Engineer, and Designer all in one pass.

## When to Use

Run this on any PLAN.md before `/yocode:execute`. Especially important for:
- Plans with 5+ tasks
- Plans touching user-facing features
- Plans involving architectural changes
- Plans you have a gut feeling might be wrong

## The Three Lenses

### Lens 1: CEO/Founder (Scope + Vision)

**Mindset:** Are we solving the right problem? Is the scope ambitious enough —
or too ambitious? What's the 10-star version?

**Step 0: Nuclear Scope Challenge**

Before reviewing details, challenge the premise:

1. **Is this the right problem?** Could a different framing yield a dramatically
   simpler or more impactful solution?
2. **What happens if we do nothing?** Is this a real pain point or a hypothetical?
3. **What existing code already solves this?** Map every sub-problem to existing code.
   Rebuilding > refactoring needs justification.

**Implementation Alternatives (mandatory):**
Present at least 2 approaches:
- One "minimal viable" (fewest files, smallest diff)
- One "ideal architecture" (best long-term trajectory)

For each:
```
APPROACH [A/B]: [Name]
  Summary: [1-2 sentences]
  Effort: S/M/L
  Risk: Low/Med/High
  Pros: [2-3 bullets]
  Cons: [2-3 bullets]
  Reuses: [existing code/patterns leveraged]
```

**Scope Mode Selection:**

| Mode | When | What happens |
|------|------|-------------|
| **SCOPE EXPANSION** | Vision is under-ambitious | 10x check: what's 10x more ambitious for 2x effort? |
| **SELECTIVE EXPANSION** | Core is right, opportunities exist | Present top 5 delight opportunities. User cherry-picks. |
| **HOLD SCOPE** | Scope is right-sized | Complexity check only. Flag deferrable work. |
| **SCOPE REDUCTION** | Plan is overbuilt | Ruthless cut to minimum that ships value. |

**Temporal Interrogation:**
Think ahead to implementation:
```
HOUR 1 (foundations):    What does the implementer need to know?
HOUR 2-3 (core logic):  What ambiguities will they hit?
HOUR 4-5 (integration): What will surprise them?
HOUR 6+ (polish/tests): What will they wish they'd planned for?
```

### Lens 2: Engineering Manager (Architecture + Correctness)

**Mindset:** Will this work in production? What breaks at scale? Where are
the landmines?

**Architecture Review:**
- Component boundaries and dependency graph
- Data flow: diagram all four paths for every new data flow:
  - Happy path (data flows correctly)
  - Nil path (input nil/missing)
  - Empty path (input present but empty)
  - Error path (upstream call fails)
- State machines: diagram every new stateful object
- Scaling: what breaks first under 10x load? 100x?
- Rollback posture: if ships and immediately breaks, what's the procedure?

**Error & Rescue Map:**
For every method/codepath that can fail:
```
METHOD/CODEPATH      | WHAT CAN GO WRONG      | HANDLING
ExampleService#call  | API timeout            | Retry with backoff
                     | API returns 429        | Queue and retry
                     | DB pool exhausted      | Degrade gracefully
```
No catch-all error handling. Name specific exceptions.

**Test Coverage Diagram:**
Trace every codepath in the plan:
```
CODE PATH COVERAGE
[+] src/services/billing.ts
    ├── processPayment()
    │   ├── [TESTED] Happy path + decline + timeout
    │   ├── [GAP] Network timeout during callback
    │   └── [GAP] Invalid currency code
    └── refundPayment()
        ├── [TESTED] Full refund
        └── [GAP] Partial refund + simultaneous retry

COVERAGE: 3/7 paths (43%)
GAPS: 4 paths need tests
```

**Performance Review:**
- N+1 queries: for every association traversal, includes/preload?
- Memory: for every data structure, max size in production?
- Database indexes: for every query, index exists?
- Slow paths: top 3 slowest new codepaths with estimated p99 latency

**Complexity Check:**
- 8+ files or 2+ new classes = smell. Challenge it.
- For every architectural pattern, search: does the framework have a built-in?
- Minimum diff: can we achieve the goal with fewer new abstractions?
- Boil the lake: with AI, the cost of completeness (100% test coverage, full
  edge cases) is near zero. Recommend the complete version.

### Lens 3: Designer's Eye (UX + Visual Quality)

**Mindset:** When this ships, will users feel the design is intentional —
not generated, not accidental, not "we'll polish later"?

**7 Design Passes (each rated 0-10):**

For each dimension: rate, explain the gap, fix the plan to close it, re-rate.

1. **Information Architecture** — What does user see first, second, third?
   If everything competes, nothing wins.

2. **Interaction State Coverage** — Loading, empty, error, success, partial states
   all specified? Empty states are features, not afterthoughts.
   ```
   FEATURE         | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL
   Form submit     | [spec]  | N/A   | [spec]| [spec]  | N/A
   List view       | [spec]  | [spec]| [spec]| [spec]  | [spec]
   ```

3. **User Journey & Emotional Arc** — What does the user feel at each step?
   Time-horizon design: 5-sec visceral, 5-min behavioral, 5-year reflective.

4. **AI Slop Risk** — Instant-fail patterns:
   - Purple/violet gradient backgrounds
   - 3-column feature grid (icon-circle + bold title + 2-line desc)
   - "Welcome to X" / "Unlock the power of" hero copy
   - Uniform bubbly border-radius on everything
   - Cookie-cutter section rhythm (hero → features → testimonials → pricing)
   - Decorative blobs, floating circles, wavy SVG dividers

5. **Design System Alignment** — Does the plan reference DESIGN.md tokens
   and components? Or is it inventing new visual language?

6. **Responsive & Accessibility** — Not "stacked on mobile" but intentional
   layout per viewport. Keyboard nav, ARIA, 44px touch targets, contrast.

7. **Edge Cases & Empty States** — Zero results, max results, long text,
   network failures, first-time vs power user.

## Process

### Step 1: Read the Plan
Read PLAN.md and all referenced files. Understand what's being proposed.

### Step 2: Run All Three Lenses
Go through CEO → Engineer → Designer in order. Rate each dimension.

### Step 3: Interactive Resolution
For each issue found, present one at a time:
- What the issue is (concrete, not abstract)
- Why it matters (connect to user outcome)
- Recommended fix
- Options: A) Fix now B) Defer C) Disagree

User decides. Never batch 10 issues into one wall of text.

### Step 4: Update Plan
After all issues resolved, update the PLAN.md with fixes.
Commit: `refine: plan review findings applied`

### Step 5: Report

```markdown
# Plan Review: [plan name]

## Verdict: [READY | NEEDS_WORK | RE-PLAN]

## CEO Lens
- Scope mode: [EXPANSION | SELECTIVE | HOLD | REDUCTION]
- Premise valid: [yes/no]
- Alternatives considered: [count]

## Engineering Lens
- Architecture: [rating/notes]
- Error coverage: [N/M paths covered]
- Test coverage: [N/M paths covered]
- Performance risks: [count]

## Design Lens
| Dimension | Before | After |
|-----------|--------|-------|
| Information Architecture | [0-10] | [0-10] |
| Interaction States | [0-10] | [0-10] |
| User Journey | [0-10] | [0-10] |
| AI Slop Risk | [0-10] | [0-10] |
| Design System | [0-10] | [0-10] |
| Responsive & A11y | [0-10] | [0-10] |
| Edge Cases | [0-10] | [0-10] |

## Issues Resolved: [N]
## Issues Deferred: [N]
## Plan Updated: [yes/no]
```
