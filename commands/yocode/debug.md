---
name: debug
description: |
  Systematic debugging with persistent knowledge base.
  Use when errors, stack traces, or "broken"/"not working" detected.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - WebSearch
---

# /yocode:debug

Systematic debugging with a persistent knowledge base that survives sessions.

## Process

### Step 0: Check Knowledge Base

Before investigating, check if this has been seen before:

```bash
cat .yocode/debug/knowledge-base.md 2>/dev/null || echo "No prior debug knowledge"
```

Search for relevant entries matching the current symptoms.
If a match is found, apply the known fix and verify.

### Step 1: Gather Evidence

Collect ALL available evidence before forming hypotheses:

1. **Error messages** — Exact text, full stack traces
2. **Logs** — Application logs, system logs, build output
3. **Recent changes** — `git log --oneline -20` and `git diff HEAD~5`
4. **Configuration** — Environment variables, config files
5. **Reproduction** — Can we reliably reproduce?

### Step 2: Hypothesize

Form ranked hypotheses based on evidence, NOT intuition:

```markdown
| # | Hypothesis | Evidence | Likelihood | Test |
|---|-----------|----------|------------|------|
| 1 | [Most likely cause] | [What supports it] | High | [How to verify] |
| 2 | [Second candidate] | [What supports it] | Medium | [How to verify] |
| 3 | [Third candidate] | [What supports it] | Low | [How to verify] |
```

### Step 3: Verify

Test hypotheses in ranked order:
- Design a test that would **disprove** the hypothesis
- Run the test
- If disproven → next hypothesis
- If confirmed → proceed to fix
- If all disproven → gather more evidence (back to Step 1)

### Step 4: Fix

With root cause confirmed:
1. Implement the minimal correct fix
2. Verify the fix resolves the original symptoms
3. Check for related instances of the same bug pattern
4. Add a test that catches this regression
5. Commit atomically

### Step 5: Persist

Save to the debug knowledge base:

```bash
mkdir -p .yocode/debug
```

Append to `.yocode/debug/knowledge-base.md`:

```markdown
### [Date]: [Short description]
**Symptoms:** [What was observed]
**Root Cause:** [Confirmed cause]
**Fix:** [What was changed]
**Prevention:** [How to avoid this class of bug]
**Keywords:** [searchable terms for Step 0 matching]
```

If the lesson is broadly applicable (not project-specific), also create
a memory rule at the appropriate scope (global/stack/project).
