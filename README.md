# yocode

A unified Claude Code workflow tool. One memory, one system, one set of conventions.

yocode synthesizes the best ideas from [GSD](https://github.com/gsd-build/get-shit-done), [gstack](https://github.com/garrytan/gstack), [Paul](https://github.com/ChristopherKahler/paul), [Seed](https://github.com/ChristopherKahler/seed), and other tools into a single self-improving workflow system.

## Quickstart

Open Claude Code and paste this:

```
Install yocode: clone https://github.com/yoelgal/yocode to ~/.yocode,
run the installer at ~/.yocode/install.sh, and verify the hooks are
registered. Then set up my user profile — ask me a few questions about
how I work. If I'm in a project, detect the tech stack and offer to
onboard it.
```

That's it. Claude handles everything.

## What You Get

### 20 slash commands

| Command | What it does |
|---------|-------------|
| `/yocode:plan` | Structured planning with Assumptions Mode |
| `/yocode:execute` | Parallel agents in worktrees, wave execution |
| `/yocode:ship` | Full pipeline: test → review → version → changelog → PR |
| `/yocode:qa` | 6-category testing with health scores and fix loop |
| `/yocode:review` | Multi-specialist pre-landing review |
| `/yocode:debug` | Systematic debugging with persistent knowledge base |
| `/yocode:retro` | Engineering retrospective with trend tracking |
| `/yocode:onboard` | Analyze codebase, extract conventions, seed memory |
| `/yocode:migrate` | Consolidate from GSD/gstack/Paul into yocode |
| `/yocode:explore` | Open-ended brainstorming with seed system |
| `/yocode:quick` | Minimal ceremony, just do the thing |
| `/yocode:dream` | Memory consolidation (REM sleep for your codebase) |
| `/yocode:learn` | Review, search, stage, and prune memories |
| `/yocode:design` | Design system from competitive research to DESIGN.md |
| `/yocode:design-review` | Visual audit with AI slop detection |
| `/yocode:cso` | Security audit: secrets, supply chain, OWASP, STRIDE |
| `/yocode:office-hours` | Product diagnostic (startup + builder modes) |
| `/yocode:diagnose` | Cross-system production investigation |
| `/yocode:health` | Quick production status across all connectors |
| `/yocode:canary` | Post-deploy monitoring loop |

### Three-tier memory system

```
~/.yocode/memory/global/     → Universal lessons (axioms + rules)
~/.yocode/memory/stacks/X/   → Technology-specific lessons
.yocode/memory/              → Project-specific lessons
```

Memory loads in three tiers:
- **L0** (always loaded): Index summaries, axioms, profile — ~50 lines per scope
- **L1** (JIT on keyword match): Individual rules loaded when the topic comes up
- **L2** (search only): Archives, old debug sessions — retrieved on explicit search

Memories use `[[wiki-links]]` for graph traversal and contradiction detection. The memory directory is Obsidian-compatible — open it as a vault for visual graph browsing.

### Self-improving system

Corrections you make are captured, classified by scope, deduplicated, and staged as memory rules. The system learns from every interaction.

```
You correct something
  → Captured with context
  → Classified: global / stack / project
  → Deduplicated against existing rules
  → Staged for review (or auto-approved if low-risk)
  → Activated as a rule, loaded JIT
```

### 7 specialized agents

| Agent | Model | Role |
|-------|-------|------|
| planner | opus | Breaks problems into parallel waves |
| executor | sonnet | Implements tasks in isolated worktrees |
| reviewer | sonnet | Read-only code review |
| researcher | sonnet | Read-only intelligence gathering |
| debugger | sonnet | Systematic debugging |
| mapper | haiku | Fast codebase scanning |
| verifier | sonnet | Goal-backward verification |

Three model profiles (quality / balanced / budget) control cost.

### 4 lifecycle hooks

| Hook | Purpose | Budget |
|------|---------|--------|
| SessionStart | Load axioms + L0 memories | <100ms |
| UserPromptSubmit | JIT inject L1 memories | <50ms |
| PostToolUse | Observe patterns + context pressure | <50ms |
| PreCompact | Save session state before compression | <200ms |

### Production connectors

Wire up Railway, Supabase, Vercel, Sentry, PostHog, Langfuse — then use `/yocode:diagnose` to cross-correlate across all of them.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) — the complete design document with every research finding, decision, and rationale.

## Philosophy

- **Fix it if cost is ~0** — never defer when building is cheap
- **Validate demand before engineering** — don't build what nobody asked for
- **Source-grounded or don't say it** — no hallucinated confidence
- **Correct once, apply forever** — the self-improving core
- **Infer, don't interrogate** — form assumptions, ask only for corrections
- **Think like a 100x engineer** — trace all consequences, ship complete work

## License

MIT. See [LICENSE](LICENSE) and [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) for attribution.
