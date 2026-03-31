---
name: onboard
description: |
  Analyze an existing codebase and seed yocode memory.
  Use on first run in a new project or when asked to "onboard".
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
---

# /yocode:onboard

Analyze an existing codebase, extract conventions, and seed yocode's memory.
Runs automatically on first use in a new project, or explicitly via `/yocode:onboard`.

## Process

### Step 0: Initialize Project

```bash
mkdir -p .yocode/memory/rules .yocode/memory/decisions .yocode/debug
```

Create `.yocode/.gitignore` if it doesn't exist.

### Step 1: Parallel Analysis

Launch 5 mapper agents in parallel (each is read-only):

**Agent 1: Stack Mapper**
- Detect tech stack from package.json, Cargo.toml, go.mod, etc.
- List all dependencies with versions
- Identify infrastructure (Docker, CI config)
- Output: stack fingerprint for L1 memory matching

**Agent 2: Architecture Mapper**
- File structure and module boundaries
- Entry points and data flow
- API surface (routes, endpoints, schemas)
- State management approach

**Agent 3: Convention Miner**
- Naming patterns (camelCase, snake_case)
- Error handling patterns
- Import/export conventions
- Test patterns and locations
- Code organization patterns

**Agent 4: History Miner**
- `git log` analysis: commit patterns, frequency, authors
- `git shortlog`: who works on what
- Hotspot detection: most-changed files
- Branch strategy detection

**Agent 5: Doc Scanner**
- Existing README, CLAUDE.md, architecture docs
- Inline comment patterns
- API documentation
- Configuration documentation

### Step 2: Synthesize

Combine agent outputs into:

1. **PROJECT.md** — Project summary, stack, architecture overview
2. **Memory rules** — Extracted conventions as rules in `.yocode/memory/rules/`
3. **Stack memories** — Tech-specific lessons pushed to `~/.yocode/memory/stacks/`

### Step 3: Detect Production Systems

Scan for deployment and monitoring configuration:
- Railway (railway.toml, railway.json)
- Vercel (vercel.json)
- Docker / docker-compose
- CI/CD configs (.github/workflows/, .gitlab-ci.yml)
- Monitoring (Sentry DSN, PostHog keys, Langfuse config)

For each detected system, offer: "Found [system]. Set up connector? (y/n)"

### Step 4: Assumptions Review

Present findings using Assumptions Mode:
- Show what was discovered with confidence levels
- Ask ONLY for corrections ("Here's what I found. Correct anything wrong.")
- Don't ask 30 questions — infer from evidence

### Step 5: Profile Questions (First Project Only)

If `~/.yocode/memory/global/profile.md` hasn't been populated yet:

Ask 3-5 targeted questions:
1. "What's your role?" (helps calibrate explanation depth)
2. "What's your primary project and tech stack?"
3. "How do you prefer corrections — just fix it, or explain first?"
4. "Anything you want me to always/never do?"

Write responses to profile.md.

### Step 6: Commit Initial State

```bash
git add .yocode/
git commit -m "init: yocode project onboarding"
```

Report what was discovered and what memories were seeded.
