<div align="center">

# yocode

**One tool. One memory. One system that gets better every time you use it.**

[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/yoelgal/yocode?style=for-the-badge&logo=github&color=181717)](https://github.com/yoelgal/yocode)

</div>

---

## Why This Exists

I've used [GSD](https://github.com/gsd-build/get-shit-done), [gstack](https://github.com/garrytan/gstack), [Paul](https://github.com/ChristopherKahler/paul), [Seed](https://github.com/ChristopherKahler/seed), and a bunch of others. They're all good. They all solve adjacent problems. But none of them solve the whole problem.

The fragmentation is the issue. Competing memory systems, conflicting conventions, duplicated effort. Learning something in one tool doesn't transfer to another. You end up context-switching between workflow systems instead of building things.

So I took the best ideas from all of them and built one system:

- **GSD's** wave execution model, fresh-context agents, assumptions mode
- **gstack's** QA methodology, shipping pipeline, design skills, security audits
- **Paul's** mandatory UNIFY reconciliation, acceptance-driven development
- **Seed's** typed ideation, quality gates
- **CARL's** JIT rule injection, staging pipeline for corrections
- **Auto-Dream's** memory consolidation cycle

One memory. One set of conventions. One system that improves every session.

---

## Install — One Prompt

Open Claude Code and paste this:

> Install yocode: clone https://github.com/yoelgal/yocode to ~/.yocode, run the installer at ~/.yocode/install.sh, and verify the hooks are registered. Then set up my user profile — ask me a few questions about how I work. If I'm in a project, detect the tech stack and offer to onboard it.

That's the entire getting started guide. Claude clones the repo, runs the installer, registers hooks, initializes memory, asks you a few profile questions, and optionally onboards your current project. No manual steps.

Or if you prefer doing it yourself:

```bash
git clone https://github.com/yoelgal/yocode.git ~/.yocode && ~/.yocode/install.sh
```

---

## What You Get

### 20 commands that cover the full lifecycle

**Build**
| Command | What it does |
|---------|-------------|
| `/yocode:explore` | Open-ended brainstorming with a seed system for ideas that aren't actionable yet |
| `/yocode:plan` | Assumptions Mode — reads your code, forms assumptions, asks only for corrections |
| `/yocode:plan-review` | Three-lens review: CEO (scope), Engineer (architecture), Designer (UX). One pass. |
| `/yocode:execute` | Parallel agents in isolated worktrees, wave-based execution, mandatory reconciliation |
| `/yocode:quick` | No ceremony. Just do the thing. Still benefits from memory. |
| `/yocode:debug` | Gather → hypothesize → verify → fix → persist to knowledge base |

**Ship**
| Command | What it does |
|---------|-------------|
| `/yocode:ship` | Full pipeline: merge base → test → review → version bump → changelog → PR |
| `/yocode:review` | Multi-specialist dispatch: security, performance, API, and test reviewers in parallel |
| `/yocode:qa` | 6-category testing with health scores. Fix loop: locate → fix → commit → re-test |

**Observe**
| Command | What it does |
|---------|-------------|
| `/yocode:diagnose` | Pull from all connected systems, correlate across sources, find the fire |
| `/yocode:health` | Quick production status. One table. Is prod up? |
| `/yocode:canary` | Post-deploy monitoring. 5 checks over 10 minutes. Recommends rollback before your users find the bug. |
| `/yocode:retro` | 14 metrics, trend tracking, Ship of the Week. Reflection with numbers. |

**Think**
| Command | What it does |
|---------|-------------|
| `/yocode:design` | Full design system: competitive research → typography → color → layout → DESIGN.md |
| `/yocode:design-review` | Visual audit with AI slop detection. Yes, we know about the gradient. |
| `/yocode:cso` | Security audit: secrets archaeology, supply chain, OWASP Top 10, STRIDE |
| `/yocode:office-hours` | Product diagnostic — Startup mode (6 forcing questions) or Builder mode (design thinking) |

**Learn**
| Command | What it does |
|---------|-------------|
| `/yocode:dream` | Memory consolidation. REM sleep for your codebase. |
| `/yocode:learn` | Review, search, stage, and prune memories |
| `/yocode:onboard` | 5 parallel mappers analyze your codebase and seed memory |
| `/yocode:migrate` | Bring your GSD/gstack/Paul state into yocode — then clean up the mess |
| `/yocode:tidy` | Archive completed phases, clean stale state, reclaim disk space |

---

### Memory that actually works

Most tools either don't remember anything, or remember everything (and drown you in stale context). yocode does neither.

**Three scopes:**
```
~/.yocode/memory/global/     → "Don't restrict maxTokens" (universal)
~/.yocode/memory/stacks/X/   → "pgvector needs SET search_path on hosted Supabase" (tech-specific)
.yocode/memory/              → "Entities are permanent, never deleted" (this project)
```

**Three loading tiers:**
- **L0** — Always loaded. Index summaries, axioms. ~50 lines. The stuff that matters every session.
- **L1** — Loaded when relevant. Mention "Supabase" and your Supabase lessons appear. JIT injection.
- **L2** — Search only. Old debug sessions, archived decisions. Retrieved when you explicitly need them.

**Self-improving:**
```
You correct something
  → Captured with context
  → Scope inferred (global / stack / project)
  → Deduplicated against existing rules
  → Staged for review
  → Activated as a permanent rule
```

Correct it once, never correct it again.

---

### 7 agents with the right model for the job

| Agent | Model | Why |
|-------|-------|-----|
| **planner** | opus | Planning is where mistakes are most expensive |
| **executor** | sonnet | Implementation needs quality but burns lots of tokens |
| **reviewer** | sonnet | Catches bugs, not creative writing |
| **researcher** | sonnet | Reads a lot, synthesizes well |
| **debugger** | sonnet | Systematic investigation |
| **mapper** | haiku | Scans fast, breadth over depth |
| **verifier** | sonnet | "Did we ship what we promised?" — goal-backward checking |

Three profiles (**quality** / **balanced** / **budget**) let you control cost. Planner always gets the best model. Mapper always gets the cheapest. Everything else scales with your budget.

---

### 4 hooks running under 50ms

| Hook | What it does |
|------|-------------|
| **SessionStart** | Loads axioms + L0 memories. Checks if dream cycle is due. |
| **UserPromptSubmit** | Scans your message for keywords, injects matching L1 rules. |
| **PostToolUse** | Watches for correction patterns. Monitors context pressure. |
| **PreCompact** | Saves session state before context compression wipes it. |

All pattern matching. No LLM calls. The <50ms budget is sacred.

---

### Production connectors

Wire up your infrastructure, then ask yocode to investigate across all of it.

**Supported:** Railway, Supabase, Vercel, Sentry, PostHog, Langfuse

`/yocode:connect` walks you through auth setup. `/yocode:diagnose` pulls from everything in parallel and cross-correlates. Error spike right after a deploy? It'll find it.

---

## Philosophy

These aren't aspirational. They're enforced by the axioms injected into every agent:

- **Fix it if cost is ~0** — never defer when doing it right costs the same as doing it wrong
- **Validate demand before engineering** — don't build what nobody asked for
- **Source-grounded or don't say it** — no hallucinated confidence, ever
- **Correct once, apply forever** — the self-improving core
- **Infer, don't interrogate** — read the code, form assumptions, ask only for corrections
- **Think like a 100x engineer** — trace all consequences, ship complete work

---

## Architecture

The full design — every research finding, every decision with rationale, every tradeoff — is in [ARCHITECTURE.md](ARCHITECTURE.md). It's 1,500 lines. It's thorough. If you want to understand *why* yocode works the way it does, start there.

---

## Acknowledgments

yocode stands on the shoulders of great open-source tools. See [ACKNOWLEDGMENTS.md](ACKNOWLEDGMENTS.md) for full attribution. Everything is MIT licensed.

---

<div align="center">

**MIT License** · Built by [Yoel Gal](https://github.com/yoelgal) · Powered by Claude

</div>
