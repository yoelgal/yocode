---
name: plan
description: |
  Structured planning with Assumptions Mode and acceptance criteria.
  Use when asked to "plan", "architect", "design", or "build X".
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Agent
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# /yocode:plan

Create an executable plan for the requested work.

## Process

### Step 0: Load Context

Load yocode memory and axioms:
```bash
~/.yocode/bin/hooks/session-start.sh
```

Read the project's existing state:
```bash
cat .yocode/STATE.md 2>/dev/null || echo "No project state yet"
cat CLAUDE.md 2>/dev/null || echo "No CLAUDE.md"
```

### Step 1: Assumptions Mode

Instead of asking 15-20 questions, form assumptions from evidence:

1. Read 5-15 source files relevant to the request
2. Read package.json, tsconfig, CLAUDE.md for conventions
3. Form structured assumptions with confidence levels:
   - **Confident** — Read the code, verified directly
   - **Likely** — Strong evidence but not confirmed
   - **Unclear** — Need user input

4. Present assumptions to the user: "Here's my understanding. Correct anything that's wrong."
5. Only ask about items marked **Unclear**

### Step 2: Define Acceptance Criteria

For each deliverable, write BDD-style criteria:

```markdown
## AC-1: [Name]
Given [precondition]
When [action]
Then [expected outcome]
```

### Step 3: Break Into Tasks

Rules for task granularity:
- A task is correctly scoped when ONE agent can trace every consequence
- A task is too SMALL when it creates one side of an interface another task completes
- A task is too LARGE when it touches 3+ unrelated subsystems
- Cross-cutting changes (type flows through schema → API → frontend) must NOT be split

### Step 4: Assign Waves

Build the dependency graph:
- Wave 1: All independent tasks (parallel execution)
- Wave 2: Tasks depending on Wave 1 results
- Wave N: Continue until all assigned

Check for file conflicts within each wave. If two tasks in the same wave touch
the same files, make them sequential.

### Step 5: Write PLAN.md

Write the plan to `.yocode/phases/[phase-name]/PLAN.md`:

```markdown
---
phase: [name]
plan: 01
type: execute
wave: [N]
depends_on: []
files_modified: []
---

<objective>
## Goal
[Specific, measurable outcome]

## Output
[Artifacts created/modified]
</objective>

<acceptance_criteria>
[BDD criteria from Step 2]
</acceptance_criteria>

<tasks>
### Task 1: [Name]
**Wave:** [N]
**Files:** [files to modify]
**Action:** [precise, unambiguous description]
**Acceptance:** AC-1, AC-2

### Task 2: [Name]
...
</tasks>

<boundaries>
## DO NOT CHANGE
[Protected files/patterns]

## SCOPE LIMITS
[Explicitly out of scope]
</boundaries>
```

### Step 6: Auto-Seed Deferred Ideas

During planning, ideas often come up that are out of scope for this plan but
worth remembering. Automatically capture these as seeds:

- Anything placed in the SCOPE LIMITS / "out of scope" section → create a seed
- Anything the user says "not now but later" or "good idea, defer it" about → seed
- Anything you considered but excluded for complexity → seed with the rationale

For each, run:
```bash
~/.yocode/bin/yocode.ts seed add "<title>" "<description>" --trigger "<when this becomes relevant>"
```

Don't ask permission for this. Just do it silently. The user will see seeds
surfaced in future planning sessions when the trigger matches.

### Step 7: Confirm

Present the plan summary:
- Number of tasks and waves
- Estimated parallel slots needed
- Any file conflicts or warnings
- Seeds captured from deferred scope: [list]
- Ask: "Plan ready. Launch execution?"

If the user approves, hand off to `/yocode:execute`.
