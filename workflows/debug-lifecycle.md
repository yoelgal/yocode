---
name: debug-lifecycle
description: Orchestrates the debug workflow from symptoms to persisted knowledge
---

# Debug Lifecycle Workflow

Coordinates the debugger agent through the full lifecycle:
gathering → investigating → fixing → verifying → resolved.

## Entry

Triggered when intent classifies as DEBUG (error messages, stack traces,
"broken", "not working").

## Step 1: Check Knowledge Base

```bash
yocode memory search "<error message or symptom keywords>"
```

Also check:
```bash
cat .yocode/debug/knowledge-base.md 2>/dev/null
```

If a match is found, present the known fix and ask if it applies.

## Step 2: Create Debug Session

```bash
mkdir -p .yocode/debug/sessions
```

Write session file with:
- Status: gathering
- Symptoms
- Timestamp

## Step 3: Spawn Debugger Agent

Agent receives:
- Symptoms and error messages
- Debug knowledge base
- Recent git history
- Relevant axioms

Agent works through: Gather → Hypothesize → Verify → Fix

## Step 4: Persist

On resolution:
1. Update debug session status to "resolved"
2. Append to knowledge base:
   - Symptoms, root cause, fix, prevention
3. Create memory rule if lesson is broadly applicable:
   ```bash
   yocode learn capture "<what was wrong>" "<correct approach>" --why "<root cause>"
   ```

## Step 5: Recovery

If context resets during debugging:
1. Read `.yocode/debug/sessions/` for active sessions
2. Resume from last recorded state
3. The session file IS the state — fresh agent reads it and continues
