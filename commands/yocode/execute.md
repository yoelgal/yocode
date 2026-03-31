---
name: execute
description: |
  Wave execution with parallel agents in isolated worktrees.
  Use after a plan is approved, or when asked to "go", "do it", "execute".
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
---

# /yocode:execute

Execute an approved plan using parallel agents in isolated worktrees.

## Completion Contract

**Every item in the plan WILL be implemented.** Not most. Not "the key ones." ALL.

Before declaring execution complete, enumerate every task from the plan and verify
each is DONE. If any task is PARTIAL or SKIPPED, execution is NOT complete — either
finish it or explicitly report it as BLOCKED with a reason.

Boil the Lake: the marginal cost of completeness is near zero. Do the complete thing.

## Process

### Step 0: Validate

1. Confirm a plan exists and is approved
2. Read the PLAN.md file
3. Parse tasks, waves, dependencies, and boundaries

### Step 1: Pre-flight

```bash
# Ensure clean working directory
git status --porcelain
# Stash if needed
git stash push -m "yocode: pre-execution stash" 2>/dev/null || true
```

Check for:
- Uncommitted changes (stash or warn)
- Tests passing on current state
- No active worktrees from previous runs

### Step 2: Execute Waves

For each wave:

**a) Create worktrees** (parallel for all tasks in wave):
```bash
git worktree add -b yocode/task-[id] .yocode/worktrees/[id]
```

**b) Spawn executor agents** (parallel):
Each agent receives:
- The task description from the plan
- Axioms + relevant memory
- Project context
- Boundary declarations
- The worktree path as its working directory

Agent configuration:
- `subagent_type: "general-purpose"` or use the Agent tool
- `isolation: "worktree"` when available
- Model tier from current profile (quality/balanced/budget)

**c) Collect results:**
Wait for all agents in the wave to complete.
Parse each agent's structured output for status:
- DONE → proceed
- DONE_WITH_CONCERNS → log concerns, proceed
- NEEDS_CONTEXT → pause wave, ask user
- BLOCKED → pause wave, diagnose

### Step 3: Merge Wave

After all tasks in a wave complete:

```bash
# For each completed task, in dependency order:
git merge yocode/task-[id] --no-ff -m "merge: [task name]"
# Run tests after each merge
bun test  # or whatever the project's test command is
# If tests fail, identify which merge broke them
```

### Step 4: Cleanup

```bash
# Remove worktrees
git worktree remove .yocode/worktrees/[id] --force
git branch -d yocode/task-[id]
```

### Step 5: Next Wave or UNIFY

If more waves remain → go to Step 2 for the next wave.

If all waves complete → run UNIFY:
1. Compare planned vs built
2. Generate SUMMARY.md
3. Update STATE.md
4. Capture lessons to memory
5. Pop any stashed changes

### Recovery

If context resets during execution:
1. Check `.yocode/EXECUTION_STATE.json` for progress
2. Check for existing worktrees: `git worktree list`
3. Resume from last completed wave
