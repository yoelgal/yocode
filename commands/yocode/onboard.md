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

### Step 0: Detect and Migrate Existing Tools (MANDATORY — run BEFORE anything else)

Check for existing workflow tool state. This is NOT optional — if other tools
are present and you skip this, the user ends up with competing systems.

```bash
echo "=== Checking for existing workflow tools ==="
ls -d .planning/ 2>/dev/null && echo "FOUND: GSD (.planning/)"
ls -d .paul/ 2>/dev/null && echo "FOUND: Paul (.paul/)"
ls -d .carl/ 2>/dev/null && echo "FOUND: CARL (.carl/)"
ls -d .base/ 2>/dev/null && echo "FOUND: BASE (.base/)"
ls -d .claude/skills/gstack/ 2>/dev/null && echo "FOUND: gstack (.claude/skills/gstack/)"
ls ~/.gstack/ 2>/dev/null && echo "FOUND: gstack global (~/.gstack/)"
grep -l "gsd\|gstack\|/paul\|\.carl\|\.base" CLAUDE.md 2>/dev/null && echo "FOUND: tool references in CLAUDE.md"
```

**If ANY tools are found:**
1. Tell the user what was found
2. Run `/yocode:migrate` FIRST — this extracts knowledge, cleans up old state,
   and removes stale CLAUDE.md sections
3. Only THEN proceed with onboarding

Do NOT just append a yocode section to CLAUDE.md while leaving gstack/GSD
sections in place. That creates competing instruction sets. Migration MUST
happen first.

**If no tools found:** proceed to Step 1.

### Step 1: Initialize Project

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

### Step 6: Update CLAUDE.md

CLAUDE.md is Claude Code's project-level instruction file. yocode should have a
section here so every Claude session knows the system is active.

1. Read existing CLAUDE.md (if any)
2. Check if it already has a yocode section — skip if so
3. Add a yocode section using the template at `~/.yocode/templates/project-claude-md.md`
4. If CLAUDE.md has existing tool sections (GSD, gstack, Paul, etc.):
   - Ask: "I see you have [tool] instructions in CLAUDE.md. Want to migrate them to yocode? (/yocode:migrate)"
5. If CLAUDE.md doesn't exist, create it with:
   - The yocode section
   - Any project-specific conventions discovered in Step 1-2

**Also add discovered conventions to CLAUDE.md:**
The mapper agents found naming patterns, test commands, build commands, etc.
Add these as project instructions so Claude follows them in every session:

```markdown
## Project Conventions

- Test command: `bun test`
- Build command: `bun run build`
- Naming: camelCase for variables, PascalCase for types
- Error handling: [pattern discovered by convention miner]
```

### Step 7: Commit Initial State

```bash
git add .yocode/ CLAUDE.md
git commit -m "init: yocode project onboarding

Analyzed codebase, extracted conventions, seeded memory.
Added yocode section to CLAUDE.md."
```

Report what was discovered and what memories were seeded.
