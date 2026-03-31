---
name: init
description: |
  Initialize yocode in the current project. Creates .yocode/ directory,
  seeds memory from codebase analysis, and offers to run onboarding.
  Runs automatically on first use or explicitly via /yocode:init.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# /yocode:init

Initialize yocode for the current project.

## Process

### Step 1: Check if Already Initialized

```bash
if [ -d ".yocode" ]; then
  echo "yocode already initialized in this project."
  echo "Run /yocode:onboard to re-analyze, or /yocode:tidy to clean up."
  exit 0
fi
```

### Step 2: Create Project Structure

```bash
mkdir -p .yocode/memory/rules
mkdir -p .yocode/memory/decisions
mkdir -p .yocode/debug
mkdir -p .yocode/seeds
mkdir -p .yocode/phases
```

Copy the gitignore template:
```bash
cp ~/.yocode/templates/project/.yocode/.gitignore .yocode/.gitignore
```

Create empty connectors.json:
```bash
cp ~/.yocode/templates/project/.yocode/connectors.json .yocode/connectors.json
```

### Step 3: Detect Tech Stack

```bash
~/.yocode/bin/yocode.ts stack-detect
```

Use the detected stack to pre-load relevant stack memories.

### Step 4: Scan for Seeds

Check if there are relevant seeds from other projects:
```bash
~/.yocode/bin/yocode.ts seed scan "$(basename $(pwd))"
```

### Step 5: Check for Other Tools

```bash
ls -d .planning/ .paul/ .carl/ .base/ 2>/dev/null
```

If found, suggest: "I see state from [tool]. Run `/yocode:migrate` to consolidate?"

### Step 6: Offer Full Onboarding

Ask: "Want me to do a deep analysis of this codebase? This takes about a minute
and seeds memory with your project's conventions, architecture, and patterns.
(y/n — you can always run /yocode:onboard later)"

If yes → hand off to `/yocode:onboard`

### Step 7: Commit

```bash
git add .yocode/
git commit -m "init: yocode project setup"
```

Print: "yocode initialized. Your slash commands are ready — type `/yocode:` to see them all."
