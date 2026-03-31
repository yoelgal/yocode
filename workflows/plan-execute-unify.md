---
name: plan-execute-unify
description: The core workflow loop — from idea to shipped, reconciled work
---

# Plan → Execute → UNIFY Workflow

The primary workflow loop. Thin orchestrator that coordinates between
the planner, executor agents, and the UNIFY phase.

## Entry Points

- User says something that classifies as PLAN → start at Step 1
- User says "go" / "execute" with existing plan → start at Step 3
- User says "quick" with obvious change → skip to Quick Mode

## Step 1: Plan

1. Run `yocode assumptions <context>` to generate the Assumptions Mode prompt
2. Spawn planner agent with the assumptions prompt + project context
3. Planner reads files, forms assumptions, presents for correction
4. After corrections, planner produces PLAN.md with:
   - Acceptance criteria (BDD)
   - Tasks with wave assignments
   - Boundary declarations
5. Save to `.yocode/phases/<name>/PLAN.md`

## Step 2: Confirm

Present the execution plan:
```bash
yocode execute <plan-path>
```

This outputs:
- Number of tasks and waves
- Parallel slots needed
- File conflict warnings
- Agent spawn configurations

Ask: "Plan ready with N tasks across M waves. Launch?"

High-risk gate: EXECUTE mode requires explicit user confirmation.

## Step 3: Execute

For each wave:

**a) Setup:**
```bash
git worktree add -b yocode/<task-id> .yocode/worktrees/<task-id>
```

**b) Spawn agents in parallel:**
Each executor agent receives:
- Task description from the plan
- Axioms (including completion axiom)
- Relevant L1 memories
- Worktree as working directory
- Boundary declarations from plan

**c) Collect results:**
Wait for all agents in the wave. Parse structured output:
- DONE → merge
- DONE_WITH_CONCERNS → merge, log concerns
- NEEDS_CONTEXT → pause, ask user
- BLOCKED → pause, diagnose

**d) Merge sequentially:**
```bash
git merge yocode/<task-id> --no-ff
bun test  # or project's test command
```

If tests fail after merge → identify which branch broke them.

**e) Cleanup:**
```bash
git worktree remove .yocode/worktrees/<task-id>
git branch -d yocode/<task-id>
```

## Step 4: UNIFY (mandatory, never skipped)

```bash
yocode unify <plan-path> <results>
```

Produces SUMMARY.md comparing planned vs built:
- Task-by-task status
- Acceptance criteria verification
- Drift from plan
- Decisions made during execution
- Lessons captured

Updates STATE.md with phase completion.

## Step 5: Verify

Spawn verifier agent with:
- Original plan's acceptance criteria
- SUMMARY.md from UNIFY
- Current codebase state

Verifier runs completion checklist:
- Every planned item marked DONE/PARTIAL/SKIPPED/BLOCKED
- Any PARTIAL or SKIPPED without compelling reason → FAIL
- Integration check across all merged changes
- Dead code check (functions with no callers)

## Quick Mode

For single-file, obvious changes:
1. Read the file
2. Make the change
3. Trace callers, check stale refs
4. Run tests
5. Commit
6. Capture any corrections to memory

No planning docs, no waves, no UNIFY. Still benefits from axioms and memory.
