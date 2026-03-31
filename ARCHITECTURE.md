# yocode — Architecture & Design Document

> This document is the comprehensive handoff from the initial design session (2026-03-31).
> It contains every research finding, design decision, rationale, and tradeoff discussion
> that shaped yocode's architecture. A fresh Claude session should be able to read this
> document and build the entire system autonomously.

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [Source Tool Research](#2-source-tool-research)
3. [Memory Systems Research](#3-memory-systems-research)
4. [Architecture Decisions & Rationale](#4-architecture-decisions--rationale)
5. [Memory System Design](#5-memory-system-design)
6. [Agent System Design](#6-agent-system-design)
7. [Flow Modes & Intent Classification](#7-flow-modes--intent-classification)
8. [Axioms & 100x Engineer Mindset](#8-axioms--100x-engineer-mindset)
9. [Skills Library](#9-skills-library)
10. [Production Connectors](#10-production-connectors)
11. [Onboarding & Migration](#11-onboarding--migration)
12. [Hook System](#12-hook-system)
13. [Browse Daemon](#13-browse-daemon)
14. [Dream / Hygiene Cycle](#14-dream--hygiene-cycle)
15. [Installation & Repo Structure](#15-installation--repo-structure)
16. [Testing Strategy](#16-testing-strategy)
17. [Build Order](#17-build-order)
18. [User Profile](#18-user-profile)

---

## 1. Vision & Philosophy

### What yocode Is

yocode is a unified Claude Code workflow tool that synthesizes the best features from five
existing tools (GSD, gstack, Seed/Paul/CARL/BASE, Ruflo, claude-mem) into a single,
self-improving system. It installs globally at `~/.yocode/` and manages per-project state
at `.yocode/`.

### Why It Exists

The user (Yoel Gal) has extensive experience with GSD and gstack, and researched Seed, Paul,
and Ruflo. The problem: these tools all solve adjacent problems but none solves the whole
problem. The fragmentation creates competing memory systems, conflicting conventions, and
duplicated effort. yocode consolidates everything into one coherent system.

### Core Philosophy

These principles are baked into yocode's DNA — they guide autonomous decision-making:

- **Fix it if cost is ~0** — never defer when building is cheap
- **Validate demand before engineering** — don't build what nobody asked for
- **Source-grounded or don't say it** — no hallucinated confidence
- **Correct once, apply forever** — the self-improving core
- **Infer, don't interrogate** — Assumptions Mode over 20 questions
- **Think like a 100x engineer** — trace all consequences, ship complete work

### Name Origin

"yocode" = "Yo" (from Yoel) + "code." Personal to the creator and reads as an imperative
command ("Yo, code!"). 6 characters, same length as `docker`. Chosen over: `galo` (4 chars,
pure brand), `galcode` (7 chars, clear but long), `galstack` (8 chars, too close to gstack).

### Key Constraint: Lift, Don't Rebuild

All source repos are MIT licensed. The approach is to **literally lift source code** from
existing repos, rebrand completely (no user-facing references to source tools), and adapt
interfaces to plug into yocode's unified memory and orchestration layer. New code is written
only for what doesn't exist: the three-tier memory system, intent router, connector system,
migration skill, onboarding flow, and the glue between everything.

---

## 2. Source Tool Research

### 2.1 GSD (Get Shit Done)

**Repo:** https://github.com/gsd-build/get-shit-done
**What it is:** A meta-prompting and context engineering framework with 57 slash commands,
46 workflow orchestrators, and 18 specialized agents. Sits between the developer and AI
coding agents.

**Core innovation: Context rot prevention.** GSD's entire architecture revolves around
spawning agents with fresh 200K-token context windows so the main session doesn't degrade.
Each of its 18 specialized agents gets a clean slate — the orchestrator stays lean at
30-40% context utilization.

**Key features to extract:**

- **Nyquist Validation** — Borrowed from signal processing theory. Maps automated test
  coverage to requirements BEFORE implementation starts, ensuring every requirement has
  a feedback mechanism that fires within seconds of task completion. Named after the
  Nyquist-Shannon sampling theorem — if you can't observe a requirement changing, you
  can't control it.

- **Assumptions Mode** — Instead of asking 15-20 open-ended questions, a subagent reads
  5-15 source files, forms structured assumptions with confidence levels
  (Confident/Likely/Unclear) and evidence citations, then asks only for corrections.
  Reduces interactions from ~15-20 down to ~2-4. This is the "infer, don't interrogate"
  principle in practice.

- **Seeds with trigger conditions** — Forward-looking ideas annotated with WHEN they should
  surface. When you start a new milestone, the system automatically scans seeds and presents
  relevant ones. This solves the "ideas that aren't actionable yet" problem without them
  getting lost.

- **Wave execution model** — Dependency-aware parallelization. Not "run everything in
  parallel" but topologically sorted waves. Independent tasks run in parallel within a
  wave; dependent tasks wait for the next wave. Each wave's tasks run in isolated worktrees.

- **Context window monitoring hooks** — PostToolUse hook reads context metrics and injects
  warnings at 35% remaining (WARNING: "avoid starting new complex work") and 25% (CRITICAL:
  "prepare for context reset"). Includes debounce to prevent alert fatigue.

- **Model profile system** — Three presets (quality/balanced/budget) that map different model
  tiers to each agent role. Planner always gets the best model (Opus); codebase mapper gets
  the cheapest (Haiku). This optimizes cost without sacrificing quality where it matters.

- **Debug system with persistent knowledge base** — Debug sessions survive context resets
  with a lifecycle (gathering -> investigating -> fixing -> verifying -> resolved). A
  persistent knowledge base at `.planning/debug/knowledge-base.md` is consulted on future
  debug sessions, so previously solved problems are found instantly.

- **Agent architecture** — 18 agents across 10 categories, each defined as Markdown with
  YAML frontmatter. Key design: thin orchestrators (load context, spawn agents, collect
  results, route), principle of least privilege (checkers can't Write, researchers get web
  access, executors get Edit but no web), model assignment per role.

- **Phase-based workflow** — Six-step cycle per phase: Discuss → UI Contract → Plan →
  Execute → Verify → Ship. Wrapped by milestone lifecycle: new-project → phases → audit →
  complete → new-milestone.

**File structure:**
```
.planning/
  PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json
  research/ (SUMMARY, STACK, FEATURES, ARCHITECTURE, PITFALLS)
  codebase/ (7 docs from map-codebase)
  phases/XX-phase-name/ (CONTEXT, RESEARCH, PLANs, SUMMARYs, VERIFICATION, UAT)
  todos/pending/, todos/done/
  threads/ (cross-session knowledge stores)
  seeds/ (forward-looking ideas with triggers)
  debug/ (sessions, resolved/, knowledge-base.md)
```

### 2.2 gstack

**Repo:** https://github.com/garrytan/gstack
**Creator:** Garry Tan, President/CEO of Y Combinator
**What it is:** 23+ specialized agent skills that transform Claude Code into a "virtual
engineering team." Each skill emulates a role: CEO, designer, engineering manager, QA lead,
release engineer, security officer.

**Core philosophy — the sprint loop:** Think, Plan, Build, Review, Test, Ship, Reflect.

**Key architectural innovations:**

- **Persistent browser daemon.** Instead of cold-starting Chromium per command (3-5 seconds),
  gstack runs a long-lived Chromium process via Playwright. First call takes ~3 seconds;
  subsequent calls execute in 100-200ms. This makes browser-based QA practical. 30-minute
  idle timeout, auto-restart on crash, random port selection (10000-60000) for multi-workspace
  isolation.

- **CLI over MCP.** gstack deliberately avoids MCP protocol. Plain text in, plain text out
  via compiled Bun binaries (~58MB). In a 20-command QA session, MCP tools burn 30,000-40,000
  tokens on protocol framing; gstack burns zero. This is a significant cost and context-window
  advantage.

- **Ref system for element interaction.** Instead of DOM mutation (fails on CSP, framework
  hydration, Shadow DOM), uses Playwright's accessibility tree API. Assigns sequential refs
  (@e1, @e2 for ARIA elements, @c1, @c2 for cursor-interactive non-ARIA elements). Stale
  refs detected in ~5ms via async count() checks.

- **SKILL.md template system.** Skills defined as `.tmpl` files compiled into `SKILL.md`
  at build time. Prevents documentation drift — if a command exists in code, it appears
  in docs.

- **Ethos:** Three principles: (1) "Boil the Lake" (completeness costs near-zero with AI,
  so always do the complete thing), (2) "Search Before Building" (tried-and-true, then
  new-and-popular, then first-principles), (3) "User Sovereignty" (AI recommends, users
  decide).

**Key skills to extract:**

- **/browse** — Foundation skill. 50+ commands across navigate, read, interact, visual,
  snapshot categories. Multi-tab support. Handoff mode for CAPTCHA/MFA (opens visible Chrome
  with all state preserved, user solves, `resume` returns control). Cookie import from real
  browser via native SQLite decryption.

- **/qa** — Systematic testing across 6 categories (visual, functional, UX, content,
  performance, accessibility). Health score rubric. Three modes: quick, standard, exhaustive.
  After finding bugs, enters fix loop: locate source, fix, atomic commit, re-test.

- **/ship** — Most comprehensive skill. ~20 substeps: platform detection, pre-flight, base
  branch merge, test framework bootstrap (will set up Vitest/Jest if none exists), test
  execution, coverage audit, plan completion audit, scope drift detection, pre-landing
  review, adversarial multi-model review (Claude + Codex), version bump, changelog, commits,
  push, PR creation.

- **/retro** — Cross-project retrospectives. 14-step analysis of commits, authors,
  timestamps, file changes. Computes: commit frequency, time distribution, work session
  detection, commit type breakdown, hotspot analysis, PR size distribution, focus score,
  "Ship of the Week." Global mode runs across all discovered projects. Persistent history
  for trend comparison.

- **/review** — Pre-landing PR review. SQL safety, LLM trust boundary violations, conditional
  side effects. Features: scope drift detection, specialist dispatch (security, performance,
  API, testing reviewers run in parallel), fix-first classification (AUTO-FIX, ASK, INFO),
  adversarial multi-model review (Claude + Codex).

- **/design-consultation** — Researches competitive landscape, proposes complete design
  system (aesthetic, typography, color, layout, spacing, motion), generates preview pages,
  writes DESIGN.md.

- **/design-review** — Visual audit with 80-item checklist across 10 categories. Finds
  visual inconsistency, spacing issues, hierarchy problems, "AI slop patterns." Fix loop
  with before/after screenshots.

- **/design-shotgun** — Generate multiple AI design variants, comparison board, structured
  feedback, iteration.

- **/office-hours** — YC-style product diagnostic. Two modes: Startup (6 forcing questions:
  demand reality, status quo, desperate specificity, narrowest wedge, observation & surprise,
  future-fit) and Builder (design thinking brainstorming).

- **/autoplan** — Chains CEO, design, and engineering reviews sequentially with auto-decisions
  based on 6 decision principles. Surfaces only "taste decisions" at a final approval gate
  instead of interrupting with 15-30 questions.

- **/cso** — Chief Security Officer. Infrastructure-first security audit: secrets archaeology,
  dependency supply chain, CI/CD pipeline security, OWASP Top 10, STRIDE threat modeling.

- **/canary** — Post-deploy monitoring via browser daemon. Screenshots, console errors,
  performance regressions. Compares against pre-deploy baselines.

- **/learn** — JSONL-based per-project knowledge base that accumulates across sessions.
  Skills load prior learnings before executing.

**Personality layer:** gstack embeds Garry Tan's YC thinking into decision-making. `/office-hours`
asks "who is desperate for this?" — that's a YC-specific forcing function. `/plan-ceo-review`
with its "find the 10-star product" mentality. yocode should similarly embed Yoel's philosophy
(fix if cost ~0, validate demand, source-grounded, etc.).

### 2.3 Seed

**Repo:** https://github.com/ChristopherKahler/seed
**What it is:** A "typed project incubator" that takes raw ideas through structured
exploration to produce buildable project plans.

**Part of a 6-tool ecosystem by Christopher Kahler:**

| Tool | Role |
|------|------|
| Seed | Idea → structured plan (incubator) |
| Paul | Plan → shipped code (execution engine) |
| CARL | Dynamic behavioral rules (learning system) |
| BASE | Persistent workspace state (OS layer) |
| AEGIS | 12-persona epistemic code audit (QA) |
| Skillsmith | Meta-skill that builds other skills |

**Key features:**

- **Type system with rigor adaptation.** 5 project types (Application, Workflow, Client,
  Utility, Campaign), each with different conversation depth, demeanor, and section
  requirements. A utility gets tight/fast treatment; an application gets deep architectural
  exploration. Same tool, different behavior. Adding a new type = dropping 3 files into
  a directory (guide.md, config.md, skill-loadout.md). No code changes.

- **Quality gate.** Before graduation, checks: problem statement exists, design decisions
  have rationale, open questions documented, skill loadout defined. For Paul launch,
  additionally requires phase breakdowns with build/test/outcome and resolved tech stack.

- **Graduation to Paul.** `/seed launch` graduates ideation output and initializes Paul
  for managed builds. Headless — passes PLANNING.md as context, skips redundant questions.

**Philosophy:** "The coach, not the interrogator." Brainstorms alongside you rather than
asking a battery of questions.

### 2.4 Paul (Plan-Apply-Unify Loop)

**Repo:** https://github.com/ChristopherKahler/paul (598 stars)
**What it is:** The downstream execution engine. Takes structured plans from Seed and
orchestrates the actual build through a mandatory three-phase cycle.

**The PAU Loop:**

1. **PLAN** — Scope-adaptive plan with acceptance criteria in BDD (Given/When/Then) format.
   Auto-routes into three tiers: quick-fix (1 file), standard (2-5 tasks), complex (6+ tasks,
   with recommendation to split). Plans include explicit boundary declarations ("DO NOT CHANGE"
   zones), file references per task, and coherence validation against project context.

2. **APPLY** — Execute using Execute/Qualify loop. After each task, independent verification
   against spec. Four nuanced statuses: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED.
   When failures occur, diagnostic routing classifies as intent issues (need re-plan), spec
   issues (fix spec first), or code issues (standard fix).

3. **UNIFY** — Mandatory reconciliation. Creates SUMMARY.md documenting planned vs built,
   records decisions, logs deferred issues, updates STATE.md. NEVER SKIPPED. Core insight:
   "execution without reconciliation creates drift, and drift compounds across sessions."

**Key features to extract:**

- **Acceptance-Driven Development (A.D.D.)** — Acceptance criteria are first-class citizens
  defined before tasks begin. Every task references specific AC numbers. Every SUMMARY.md
  reports pass/fail against them.

- **Diagnostic failure routing** — When something fails, classify root cause (intent / spec /
  code) BEFORE attempting fixes. Prevents the common anti-pattern of patching code when the
  plan itself was wrong.

- **Four-status escalation** — Replaces binary pass/fail with nuanced statuses that surface
  uncertainty honestly. DONE_WITH_CONCERNS is particularly valuable.

- **Mandatory UNIFY** — No orphan plans exist. Every plan gets a summary. Drift is caught
  systematically. This is a hard requirement for yocode.

- **Coherence check** — Before plan approval, automatic validation against PROJECT.md,
  STATE.md decisions, recently modified files, and ROADMAP.md scope.

- **Boundary enforcement** — "DO NOT CHANGE" sections are hard constraints, not suggestions.

**Anti-subagent stance:** Paul explicitly argues against parallel subagent execution for
implementation work, citing ~70% quality compared to in-session work, 2,000-3,000 token
spawn overhead, and context reacquisition costs. Subagents reserved exclusively for discovery
and research. This conflicts with GSD's pro-subagent approach — see resolution in Section 4.

### 2.5 CARL & BASE (Learning System)

**CARL** = Context Augmentation & Reinforcement Layer
**BASE** = Persistent workspace state

**CARL's key features:**

- **Domain-based behavioral rules with JIT loading.** Rules belong to domains. Domains
  activate based on keyword matching in the current prompt. Only relevant rules load —
  not everything every time.

- **Staging pipeline.** The most important feature for yocode's learning system:
  ```
  Session correction → staged proposal → user review → permanent behavioral rule
  ```
  Corrections don't just get saved — they go through staging/review before becoming
  permanent rules, with rationale and recall keywords so they fire in the right contexts.

- **Decision logger.** Decisions stored per domain with ID, statement, rationale, date, and
  recall keywords. When CARL loads a domain, every decision in that domain loads as
  lightweight metadata. Cross-domain search available.

- **Context brackets.** Adapts rule injection verbosity based on remaining context window:
  FRESH (70%+) = lean, MODERATE (40-70%) = reinforce key context, DEPLETED (15-40%) = heavy
  reinforcement with checkpoints, CRITICAL (<15%) = suggest compaction.

**BASE's key features:**

- **Per-Session Meta Memory (PSMM).** Captures three types of moments: corrections (when you
  redirect Claude), decisions (choices made), insights (patterns worth remembering). A hook
  continuously re-injects the most relevant moments throughout the session, preventing them
  from being lost in long conversations. At session end, moments persist to `psmm.json`.

- **Operator profile.** Deep why (5 increasingly deep motivation questions), north star
  metric, rank-ordered values, elevator pitch, concrete success scenes. Injected every
  session so Claude's suggestions naturally align with your goals.

- **Filesystem ground truth principle.** All state decisions start from actual file timestamps
  and content, never from potentially stale session records.

- **Drift scoring.** Numeric drift score (0-15+) from filesystem timestamps, giving a
  quantitative health check for workspace staleness.

**The full learning pipeline:**
```
session correction → PSMM capture → staged CARL proposal → user review → permanent rule
```

### 2.6 Ruflo

**Repo:** https://github.com/ruvnet/ruflo
**What it is:** Enterprise multi-agent AI orchestration layer for Claude Code. 100+ agent
definitions, swarm topologies, consensus algorithms.

**Key features to extract:**

- **Agent definition format.** 100+ agents defined as structured markdown files in
  `.claude/agents/`, organized into 26 directories. Each agent has metadata, core
  responsibilities, implementation guidelines, process, collaboration framework, and
  MCP tool integration sections. The breadth of agent definitions is the standout.

- **Swarm topologies.** Hierarchical (single coordinator delegates to workers — recommended
  for coding), Mesh (peer-to-peer for exploratory work), Hierarchical-Mesh (hybrid), Ring,
  Star. yocode's wave execution maps to hierarchical topology.

- **3-tier model routing.** Tier 1 "Agent Booster" (WASM): instant code transforms without
  LLM calls (<1ms, $0) — var-to-const, add-types, add-error-handling. Tier 2 (Haiku):
  simple tasks. Tier 3 (Sonnet/Opus): complex reasoning. This is a smart cost optimization
  for mechanical changes.

- **Agent categories worth lifting:** Core (coder, planner, researcher, reviewer, tester),
  GitHub (code-review-swarm, pr-manager, release-manager), SPARC methodology (architecture,
  pseudocode, refinement, specification).

**Critical assessment:** Many performance claims are aspirational ("150x-12,500x faster
search", "+55% quality improvement", "978x speedup"). The actual runtime agents are 5 YAML
files; the 100+ markdown definitions are prompt templates. The v3 source code has sparse
implementation. But the architectural thinking is genuinely interesting — particularly the
consensus algorithm agents, tiered routing, and the depth of agent definition format.

### 2.7 claude-mem

**Repo:** https://github.com/thedotmack/claude-mem
**What it is:** Persistent memory plugin for Claude Code that operates as an out-of-band
observer. Runs a parallel process that intercepts tool calls, compresses observations via
a secondary AI agent, stores in SQLite + ChromaDB.

**Key features to extract:**

- **Observer agent architecture.** Rather than having Claude decide what to remember (costs
  context), a secondary process watches the tool stream in real-time and independently
  decides what's noteworthy. Separates "doing" from "remembering." The primary session is
  never burdened with memory management. For yocode, we simplify this: use a PostToolUse
  hook with pattern matching (not a full secondary LLM) to keep it lightweight and free.

- **3-layer progressive disclosure.** search(query) returns compact index with IDs/titles
  (~50-100 tokens). timeline(anchor=ID) shows chronological context. get_observations([IDs])
  fetches full details (~500-1000 tokens). Claims 10x token savings vs dumping all memories.

- **Token economics tracking.** Every observation records both discovery_tokens (raw size)
  and compressed size. The context injection shows savings metrics.

- **Smart code tools with tree-sitter.** Exposes smart_search, smart_outline, smart_unfold
  tools using AST parsing. Folded views of files (signatures without bodies) reduce tokens.

- **Content-hash deduplication.** SHA-256 of (session_id + title + narrative), truncated to
  16 hex chars, with 30-second dedup window.

### 2.8 Claude Code Auto-Dream

**Status:** Built into Claude Code, in staged rollout behind feature flag (codename
reportedly `tengu_onyx_plover`). Available in v2.1.59+ but not for all users. No official
documentation yet.

**What it does:** Four-phase memory consolidation cycle, inspired by how the human brain
consolidates memories during REM sleep. Academic basis: UC Berkeley's "sleep-time compute"
research (5x reduction in test-time compute costs through pre-computation during idle time).

**Four phases:**
1. **Orient** — Scans memory directory, reads MEMORY.md, skims existing topic files
2. **Gather Signal** — Greps session transcripts (JSONL) for corrections, preference changes,
   important decisions, recurring patterns. Targeted grep on narrow terms, not full transcripts.
3. **Consolidate** — Merges overlapping entries, converts relative dates to absolute timestamps,
   deletes contradicted facts, removes stale references to files/code that no longer exist.
4. **Prune & Index** — Rebuilds MEMORY.md as lean index under 200 lines, removes stale
   pointers, demotes verbose entries to topic files.

**Trigger conditions:** Both 24 hours must pass AND at least 5 sessions must occur.

**What we'd extend for yocode:**
- Scope-aware consolidation across global/stack/project tiers
- Wiki-link graph maintenance (detect broken links, orphaned nodes)
- Contradiction resolution (surface conflicts, don't just delete)
- Cross-project promotion (project lessons → stack/global when they recur)
- Staleness validation (check if referenced code/files still exist)

**Resources:**
- Extracted dream system prompt: https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/agent-prompt-dream-memory-consolidation.md
- Community replication: https://github.com/grandamenium/dream-skill

---

## 3. Memory Systems Research

Research was conducted into the state of the art in AI agent memory systems. Key findings:

### 3.1 Mem0

**Repo:** https://github.com/mem0ai/mem0
**Architecture:** Three memory tiers (User Memory, Session Memory, Agent State) with hybrid
vector + graph storage. The graph variant (Mem0g) stores memories as directed labeled graphs.

**Contradiction handling (the key innovation for yocode):** A Conflict Detector flags
overlapping/contradictory nodes, and an LLM-powered Update Resolver decides whether to add,
merge, invalidate, or skip. Outdated relations are INVALIDATED (not deleted) to preserve
temporal reasoning.

**Performance:** +26% accuracy over OpenAI Memory on LOCOMO benchmark, 91% faster responses
than full-context, 90% lower token usage.

### 3.2 Letta/MemGPT

**Repo:** https://github.com/letta-ai/letta (21.8k stars)
**Architecture:** OS-inspired. Core Memory (RAM — always in context, agent can read/write),
Recall Memory (conversation log — searchable), Archival Memory (disk — vector DB, explicitly
formulated knowledge).

**Key insight:** The agent itself manages memory tier transitions via tool calls — it decides
what to promote, archive, or search for. Self-managed memory produces better results than
externally orchestrated memory. 2025 addition: "Sleep-time agents" handle memory management
asynchronously.

### 3.3 Graphiti/Zep

**Repo:** https://github.com/getzep/graphiti
**Architecture:** Temporal knowledge graph that dynamically synthesizes unstructured
conversational data and structured business data while maintaining historical relationships.
**Performance:** 94.8% accuracy on Deep Memory Retrieval benchmark (vs MemGPT's 93.4%).
Now available as MCP server.

### 3.4 MAGMA

**Paper:** arXiv 2601.03236 (January 2026)
**Architecture:** Multi-graph structure explicitly modeling semantic, temporal, causal, and
entity relations as separate graph layers. Dual-stream consolidation: fast stream ingests
in real-time, slow stream handles structural consolidation asynchronously. This decoupling
preserves responsiveness while refining relational structure.

### 3.5 Cog

**Repo:** https://github.com/marciopuga/cog (316 stars)
**Architecture:** Convention-based cognitive architecture built entirely on plain-text markdown.
Most relevant to yocode's approach.

**Three-tier memory:**
- L0 (hot, always-loaded summary under 50 lines)
- L1 (warm, domain-specific directories loaded contextually)
- L2 (glacier, YAML-frontmattered archives indexed for on-demand retrieval)

**Operations:** `/reflect` mines conversations and extracts patterns. `/foresight` does
cross-domain strategic analysis. `/evolve` audits the memory architecture itself.
`/housekeeping` archives stale data and prunes hot memory.

**Key insight:** Zettelkasten-inspired promotion — when topics appear in 3+ observations
across 2+ weeks, they're promoted into synthesis files. Single-source-of-truth: facts live
in one canonical file, other files reference via wiki-links.

### 3.6 claude-diary

**Repo:** https://github.com/rlancemartin/claude-diary
**Architecture:** `/diary` captures raw learnings. `/reflect` synthesizes patterns across
diaries in 6 categories. Detection rules: 2+ occurrences = pattern, 3+ = strong pattern.
Automatically updates CLAUDE.md. PreCompact hook triggers diary before context compaction.

### 3.7 Research Conclusions

**The winning pattern for coding assistants:**

1. **Graph + Vector hybrid is the general winner**, but for a coding assistant with <200
   memories, it's overengineered. Markdown files with wiki-links and grep/keyword matching
   are sufficient. Add vector search later if needed.

2. **Self-managed memory beats externally orchestrated memory.** The agent should participate
   in what it remembers, but through lightweight hooks, not expensive secondary LLM calls.

3. **File-based memory works surprisingly well for coding assistants.** Cog and claude-diary
   prove that markdown files with conventions replicate most of what databases provide, with
   the advantage of being git-trackable and human-readable.

4. **Memory pollution is the #1 practical failure mode.** Every successful system has
   filtering: store insights not transcripts, progressive disclosure, tiered loading,
   intelligent decay.

5. **Obsidian-compatible, not Obsidian-dependent** is the right approach. Use `[[wiki-links]]`
   and YAML frontmatter so the memory directory CAN be opened as an Obsidian vault for visual
   graph browsing, but yocode never requires Obsidian running.

---

## 4. Architecture Decisions & Rationale

### 4.1 Why a Unified Tool (vs. Using Multiple Tools)

**Decision:** Build one tool instead of continuing to use GSD + gstack + others.

**Rationale:** Fragmentation creates competing memory systems, conflicting conventions,
duplicated effort. Each tool has its own state directory (.planning/, .gstack/), its own
memory format, its own hooks. They can conflict. Learning in one tool doesn't transfer to
another. A unified system means one memory, one state, one set of conventions.

### 4.2 Subagent Philosophy: GSD vs Paul Resolution

**The conflict:**
- GSD says: Spawn fresh agents aggressively. Fresh 200K context = quality. Main session stays lean.
- Paul says: Subagents are ~70% quality, 2-3K token overhead each. Keep implementation in-session.

**Resolution: Adaptive routing.** Both are right in different contexts:
- Research, exploration, codebase mapping → subagents (GSD is right — fresh context helps)
- Sequential implementation with tight coupling → in-session (Paul is right — coherence matters)
- Independent implementation tasks → parallel subagents with shared memory (GSD's wave model)
- The system decides based on task dependency graph, not a blanket policy

**Why not always subagents:** Paul's concern is valid for tightly coupled changes where one
function's output is another's input. A subagent working on the API doesn't see what the
other subagent did to the schema. Interface mismatches result.

**Why not always in-session:** GSD's concern is valid for context rot. After 50+ tool calls,
Claude's output quality degrades measurably. Fresh context windows prevent this.

### 4.3 Memory: Markdown vs Database

**Decision:** Markdown files with wiki-links. No SQLite, no ChromaDB, no graph DB.

**Rationale:**
- A well-maintained memory has maybe 50-200 rules across all scopes. At that scale, grep
  handles retrieval, keyword matching handles L1 loading, fuzzy string matching handles dedup.
- Adding ChromaDB for 100 memories is like using Kubernetes for one container.
- Markdown is git-trackable, human-readable, editable in any text editor.
- Cog and claude-diary prove file-based systems work at this scale.
- If memory grows beyond where grep is sufficient, add vector search later. Start simple.

**Rejected alternatives:**
- SQLite + ChromaDB (claude-mem approach): Too much infrastructure for the scale. Needs
  process management, schema migrations, ChromaDB subprocess.
- Full graph database (Graphiti/Zep): Massive overkill. Designed for enterprise with
  thousands of entities and temporal reasoning across millions of interactions.
- Mem0: Good architecture but it's a hosted service / Python library. We need something
  that works as markdown files in a git repo.

### 4.4 Obsidian-Compatible but Not Dependent

**Decision:** Use `[[wiki-links]]` and YAML frontmatter in memory files. The memory directory
CAN be opened as an Obsidian vault. But yocode never needs Obsidian running.

**Rationale:**
- Wiki-links serve double duty: in yocode they power graph traversal (invalidation chains,
  related memories); in Obsidian they render as clickable links in graph view.
- The Obsidian MCP ecosystem is shallow — file read/write, no real graph queries. Not mature
  enough to depend on.
- Running Obsidian as a dependency for a CLI tool is too heavy.
- But having the option to visualize your memory graph in Obsidian is valuable for
  understanding and curating it.

### 4.5 CLI over MCP for Heavy I/O

**Decision:** Compiled Bun binaries for browser, file operations, git. Reserve Claude context
for reasoning.

**Rationale:** gstack's insight is quantifiable: MCP tools burn 30,000-40,000 tokens on
protocol framing per 20-command browser session. CLI tools burn zero. The context window
is the most precious resource; don't waste it on wire protocol overhead.

### 4.6 Task Granularity: Smallest Coherent Unit

**Decision:** Tasks should be the smallest unit where one agent can see the full chain of
what it's changing. Split along natural system boundaries, not code lines.

**Rationale:** Ultra-atomic tasks (one per file/function) create interface boundaries between
agents that need to agree on signatures, types, and return values. The agents work from plan
descriptions, not real code, so assumptions diverge. The integration between pieces breaks.

**Rules:**
- A task is correctly scoped when one agent can trace every consequence of the change
- A task is too small when it creates one side of an interface that another task completes
- A task is too large when it touches 3+ unrelated subsystems
- Cross-cutting changes (type flows through schema → API → frontend) must NOT be split

### 4.7 Conversational Intent Routing

**Decision:** No commands to memorize. The system detects intent from natural conversation
and activates the right mode automatically.

**Rationale:** Memorizing skill commands is annoying. The user said: "Different flows should
be activated automatically based on conversation." Slash commands exist as explicit overrides
for when you want to force a specific mode, but the 90% case is: you just talk, yocode
figures it out.

**Implementation:** A preamble in the system prompt classifies every message. No ML model,
no separate service. Just structured prompting with clear signal words per mode.

**Mode transitions:** Silent for low-risk (explore, plan, retro). Confirm for high-risk
(execute, ship). "I've got a plan with 4 tasks across 3 worktrees. Launch?"

### 4.8 Three-Tier Memory Scoping

**Decision:** Three scopes — global, stack-scoped, project-scoped.

**Rationale:** The user identified that some lessons are universal ("don't restrict
maxTokens"), some are technology-specific ("pgvector needs SET search_path on hosted
Supabase"), and some are project-specific ("entities are permanent, never deleted"). A
flat global memory would apply project-specific rules everywhere. A flat project memory
would lose universal lessons when starting a new project.

**Scope inference at capture time:** When you correct something, the system infers scope
automatically rather than always asking:
- References project-specific domain concepts? → project
- References a technology/framework? → stack
- General coding practice or preference? → global
- Ambiguous? → ask (but rare)

### 4.9 Axioms vs Memories

**Decision:** Separate "axioms" (how to think — shipped + user-defined) from "memories"
(what we've learned — auto-captured).

**Rationale:** The user wants agents to think like 100x engineers from day one, not learn it
through corrections. Axioms are non-negotiable engineering principles injected into every
agent. Memories are situational knowledge that accumulates over time. Axioms are the
constitution; memories are case law.

When a correction feels fundamental enough — not project-specific, not stack-specific, but
"this is how I want code written, always" — it graduates from memory to axiom.

### 4.10 Memory Invalidation Chains

**Decision:** When a decision changes, trace all memories that depend on it and surface the
full chain for user confirmation. Archive invalidated memories, don't delete.

**Rationale:** Mem0's approach is right: invalidate rather than delete, to preserve temporal
reasoning. Wiki-links make the dependency chain traversable — if Memory A links to
`[[MiniMax-M2.5]]` and Memory B also links to `[[MiniMax-M2.5]]`, changing the LLM model
surfaces both for review.

### 4.11 Environment-Aware Deployment

**Decision:** The connector/deployment system adapts to however many environments exist.
One environment? Deploy and verify against that. Two? Pipeline through them.

**Rationale:** The user said: "I don't have staging yet, but what's important is it can
scale to multiple environments, but also work with just one." No mode switches or config
rewrites when adding environments.

---

## 5. Memory System Design

### 5.1 Directory Structure

```
~/.yocode/memory/
  global/
    axioms/                    # "How to think" — shipped + user-added
      execution.md             # Trace all callers, dependencies, stale refs
      analysis.md              # Read before writing, think in consequences
      quality.md               # What "done" means
      communication.md         # How agents interact with user
    rules/                     # Learned corrections, universal scope
    profile.md                 # Who the user is, how they work
    index.md                   # L0 hot summary (<50 lines, auto-maintained)
  stacks/
    supabase/
      rules/
      index.md
    railway/
      rules/
      index.md
    turborepo/
      rules/
      index.md
    ...

.yocode/memory/                # Per-project
  rules/                       # Project-scoped lessons
  decisions/                   # Decision log with recall keywords
  index.md                     # L0 project summary (<50 lines)
```

### 5.2 Memory File Format

```markdown
---
scope: stack/supabase
type: rule
created: 2026-03-15
last_validated: 2026-03-31
linked: [[pgvector]], [[migrations]], [[hosted-supabase]]
confidence: high
---

pgvector migrations need `SET search_path TO public, extensions;`
on hosted Supabase.

**Why:** Hosted Supabase puts extensions in a separate schema.
Local dev doesn't have this issue, so it only breaks in production.

**How to apply:** Any migration that references pgvector or vector
types — add the SET search_path statement at the top.
```

### 5.3 L0/L1/L2 Loading Tiers

**L0 — ALWAYS LOADED (~50 lines per scope):**
index.md files. Auto-maintained summaries of active rules, recent decisions, warnings.
Equivalent of what CLAUDE.md does today. Regenerated when memories change.

**L1 — LOADED ON MATCH (keyword + stack fingerprint):**
Individual rule files. Pulled in when the topic comes up in conversation or code. Like
CARL's JIT injection. Example: mentioning "BullMQ" loads stacks/bullmq/ rules.

**L2 — SEARCH ONLY (never auto-loaded):**
Old debug sessions, archived decisions, superseded rules. Retrieved only when an agent
explicitly searches for something.

### 5.4 Learning Pipeline

```
You correct something
  → CAPTURE: Log correction with context (what was wrong, what's right, why)
  → CLASSIFY: Infer scope automatically
      References project-specific domain? → project
      References a technology/framework?  → stack
      General coding practice/preference? → global
      Ambiguous? → ask (but rare)
  → DEDUPLICATE: Check existing memories in that scope
      >90% match → UPDATE existing memory in place
      60-90% match → MERGE (keep valid parts of both)
      <60% match → CREATE new memory
      Superseded memories → auto-archive
  → STAGE: New/updated memory enters staging
      Auto-approved if: simple correction, low risk
      Needs review if: broad scope, contradicts existing rule, architectural
  → ACTIVATE: Rule goes live, loaded JIT
      Via keyword matching + stack fingerprinting
      Context brackets control injection verbosity (lean when fresh, heavy when depleted)
```

### 5.5 Contradiction Detection

Via wiki-links. When a new memory is created, check: do any existing memories share the
same `[[links]]` AND topic? If yes, check for contradiction.

```
Memory A: "Use [[MiniMax-M2.5]] for [[briefing-pipeline]]"
Memory B: "Use [[Claude-Sonnet]] for [[briefing-pipeline]]"

Both link to [[briefing-pipeline]]. Both type: rule. Both about LLM model selection.
→ Conflict detected. Surface to user. Loser gets archived, not deleted.
```

### 5.6 Invalidation Chains

When a foundational decision changes, trace all memories that depend on it:

```
User: "We're switching from MiniMax M2.5 to Claude Sonnet"

System traces via [[links]]:
  → "LLM Primary: MiniMax M2.5" (project memory) → UPDATE
  → "M2.5 context limit warning" (stack memory, OpenRouter) → ARCHIVE from project,
     keep in stack memory for other projects
  → "Cost math at $0.01 per eval" (project memory) → UPDATE with new pricing

Present chain → user confirms → update atomically
```

### 5.7 Index Maintenance

index.md files auto-regenerate when memories change:

```markdown
# Project Memory Index (auto-generated)

## Active Rules (7)
- Entities are permanent, never deleted
- Use 16384+ maxTokens for all LLM calls
- Briefing pipeline uses Claude Sonnet
...

## Recent Decisions (3)
- 2026-03-31: Switched from MiniMax to Claude Sonnet
...

## Warnings (1)
- First pulse run returns stale signals (needs time filter)
```

### 5.8 Staleness & Hygiene

During dream/hygiene cycles:
- Check if referenced code/files still exist (grep for function names, check file paths)
- Flag memories not referenced in 90+ days
- Validate that stack-scoped memories still match installed dependencies
- Convert any relative dates to absolute

---

## 6. Agent System Design

### 6.1 Agent Definition Format

Each agent is a markdown file with YAML frontmatter:

```markdown
---
name: executor
description: Implements planned tasks in isolated worktrees
model: sonnet
tools: [Read, Write, Edit, Bash, Grep, Glob]
isolation: worktree
---

# Mindset
[axioms auto-injected here]

# Role
You execute a single planned task. You receive:
- The task description with acceptance criteria
- Relevant memory (axioms + L0 + matched L1)
- The project context (PROJECT.md summary)

# Process
1. Read every file you'll touch AND their callers/dependents
2. Implement the change, tracing all consequences
3. Run relevant tests
4. Commit atomically with a clear message
5. Report: DONE | DONE_WITH_CONCERNS | BLOCKED

# Boundaries
- Only modify files listed in the task scope
- If you need to touch files outside scope, report BLOCKED

# Output Format
[structured output spec for orchestrator parsing]
```

**Tool whitelist per agent** (GSD's least-privilege):
- Reviewer: can Read, Grep, Glob — no Write, no Edit
- Mapper: can Read, Grep, Glob, Write (analysis docs) — no Edit
- Executor: can Read, Write, Edit, Bash, Grep, Glob — full access within worktree
- Researcher: can Read, Grep, Glob, WebSearch, WebFetch — no file modification

### 6.2 Model Profiles

Three presets controlling which model each agent role gets:

| Role | Quality | Balanced | Budget |
|------|---------|----------|--------|
| Planner | Opus | Opus | Sonnet |
| Executor | Opus | Sonnet | Sonnet |
| Reviewer | Sonnet | Sonnet | Haiku |
| Researcher | Sonnet | Sonnet | Haiku |
| Mapper | Haiku | Haiku | Haiku |

### 6.3 Wave Execution with Worktrees

```
Plan approved → dependency graph → split into waves

Wave 1: [Task A, Task B, Task C]  (independent)
  ├── worktree-a/ ← Agent A (branch: yocode/task-a)
  ├── worktree-b/ ← Agent B (branch: yocode/task-b)
  └── worktree-c/ ← Agent C (branch: yocode/task-c)

  All parallel. User's main working dir untouched.

  Complete → merge sequentially → test after each merge
  If test fails → identify which branch broke it (bisect by merge order)

Wave 2: [Task D, Task E]  (depend on wave 1)
  Continue on updated main.

Mandatory UNIFY: planned vs built, lessons captured, state updated
```

**Merge strategy:** Sequential rebase-merge back to main. Run tests after each merge to
identify which branch introduced failures. If merge conflict arises, surface to user.

**Cleanup:** Auto-remove worktrees after successful merge.

**User's working directory:** Untouched during wave execution. User can continue working
on main while agents execute in worktrees.

---

## 7. Flow Modes & Intent Classification

### 7.1 Flow Modes

```
EXPLORE — "I have an idea, let's think"
  Open-ended brainstorm. No structure imposed.
  Can graduate to PLAN when the idea crystallizes.
  Decisions made during exploration get logged automatically.

PLAN — "I know what I want, make it bulletproof"
  Assumptions Mode: reads 5-15 files, forms assumptions with
  confidence levels, asks only for corrections.
  Produces acceptance criteria (BDD), boundary declarations,
  dependency graph. Ready for execution.

EXECUTE — "Plan exists, launch the swarm"
  Dependency graph → waves → worktrees per task → parallel agents.
  Each agent gets fresh context + relevant memories + plan.
  Atomic commits. Sequential merge back. Tests after each merge.
  Mandatory UNIFY at the end.

QUICK — "Just do this one thing"
  Minimal ceremony. No planning docs. Still benefits from memory.
  Corrections still captured. For single-file, obvious changes.

DEBUG — "Something's broken"
  Phase 1: Gather (parallel agents pull logs, traces, code history)
  Phase 2: Hypothesize (ranked by evidence, not guessing)
  Phase 3: Verify (test hypotheses in order)
  Phase 4: Fix (with root cause confirmed)
  Phase 5: Persist (debug session saved, memory created)

DIAGNOSE — "Check production"
  Pull from all connected systems (Railway, Langfuse, PostHog, etc.)
  Correlate across sources. Surface anomalies.

SHIP — "Deploy this"
  Full shipping pipeline: tests, review, version bump, changelog, PR.

RETRO — "How'd this week go?"
  Cross-project retrospective with trend tracking.
```

### 7.2 Flow Between Modes

```
explore ──graduates──► plan ──approved──► execute ──done──► unify
                        ↑                    ↑
                  quick─┘              quick──┘

Any mode can loop back:
  execute fails → diagnose → debug → fix → execute
  unify reveals gaps → new plan
```

### 7.3 Intent Classification

Preamble in system prompt, runs on every message:

```
EXPLORE: vague idea, "what if", hypothetical language, no specific files
PLAN:    clear feature, "build X", "add Y", imperative with detail
EXECUTE: "go", "do it", references existing plan
QUICK:   "just", "quickly", "rename this", single-file change
DEBUG:   error messages, stack traces, "broken", "not working"
DIAGNOSE: "in prod", "users reporting", "check logs"
SHIP:    "ship", "deploy", "PR", "push", "release"
RETRO:   "how'd", "last week", "retro", "review progress"

Default if ambiguous: EXPLORE (safest — no irreversible actions)
Transitions happen naturally without announcing mode changes.
```

---

## 8. Axioms & 100x Engineer Mindset

### 8.1 What Axioms Are

Non-negotiable engineering principles injected into every agent definition. Different from
memories: axioms are shipped with yocode (plus user additions), always active, never
auto-generated. Memories are learned, scoped, JIT-loaded.

### 8.2 Core Axioms

**execution.md — Before modifying any code:**
1. TRACE ALL CALLERS — Find every file that imports/calls the function/module. Follow the
   chain up, not just direct callers.
2. TRACE ALL DEPENDENCIES — Find everything the changed code calls downstream. If you change
   a return type, what breaks?
3. CHECK FOR STALE REFERENCES — After your change, grep for old function name, old type, old
   import path. Fix anything that still references the old version.
4. DEAD CODE — If replacing something, delete the old version. No commented-out code, no
   unused imports, no orphaned files.
5. TYPE COHERENCE — Follow type changes through entire chain: schema → API → frontend.
6. TEST IMPLICATIONS — Find tests asserting old behavior, update them. If no tests, flag it.

**analysis.md — Before writing code:**
- Read every file you'll touch AND every file that touches them
- Understand WHY the current code works the way it does
- Identify the full blast radius of your change

**quality.md — Before declaring done:**
- Would a senior engineer approve this PR without comments?
- Is there ANY dead code, stale reference, or broken path?
- Does this work for existing data, not just new data?
- Are all execution paths accounted for?

**mindset.md — The 100x engineer persona:**
- You don't just complete tasks — you understand the system and deliver complete changes
- Questions the premise: "should we even do this, or is there a simpler way?"
- Ships complete work — not 90% with a TODO for the last 10%
- Leaves the codebase better than you found it
- Thinks in consequences: "if I change this, what ripples outward?"

---

## 9. Skills Library

### 9.1 Skills to Lift from Source Repos

| Skill | Source | What to Lift |
|-------|--------|-------------|
| `/yocode:browse` | gstack | Daemon browser, ref system, cookie import, handoff |
| `/yocode:qa` | gstack | QA methodology, health scoring, fix loop |
| `/yocode:ship` | gstack | 20+ step pipeline, adversarial review, version bump |
| `/yocode:retro` | gstack | Cross-project retro, trend tracking, persistent history |
| `/yocode:review` | gstack | Multi-model review, specialist dispatch, scope drift |
| `/yocode:design` | gstack | Consultation, review, shotgun, HTML generation |
| `/yocode:office-hours` | gstack | YC-style product diagnostic (both modes) |
| `/yocode:cso` | gstack | Security audit |
| `/yocode:canary` | gstack | Post-deploy monitoring (extend with connectors) |
| `/yocode:plan` | Paul + GSD | PAU loop, acceptance criteria, assumptions mode |
| `/yocode:execute` | GSD | Wave execution, fresh contexts, model profiles |
| `/yocode:research` | GSD | Parallel research agents |
| `/yocode:debug` | GSD | Persistent debug sessions with knowledge base |
| `/yocode:explore` | Seed | Type-driven ideation, quality gates |
| `/yocode:dream` | Auto-Dream | Memory consolidation (extend with 3-tier + wiki-links) |
| `/yocode:learn` | gstack + CARL | Review, search, prune, stage memories |

### 9.2 New Skills (Not in Any Source Repo)

| Skill | Purpose |
|-------|---------|
| `/yocode:onboard` | Analyze existing codebase, extract conventions, seed memories |
| `/yocode:migrate` | Consolidate from GSD/gstack/Paul into yocode |
| `/yocode:connect` | Wire up a production connector |
| `/yocode:diagnose` | Pull from all connectors, correlate, root cause |
| `/yocode:health` | On-demand production status across all connectors |
| `/yocode:postmortem` | Reconstruct incident timeline from all sources |

---

## 10. Production Connectors

### 10.1 Architecture

```
.yocode/connectors.json          (gitignored, per-project auth config)

~/.yocode/connectors/
  railway.md          # Agent definition: knows Railway API
  langfuse.md         # Agent definition: knows Langfuse API
  posthog.md          # Agent definition: knows PostHog API
  supabase.md         # Agent definition: knows Supabase Management API
  vercel.md           # etc.
  sentry.md
```

Each connector has: agent definition with API knowledge, auth config stored per-project,
capability set (logs, metrics, traces, events, deploys).

### 10.2 Environment Awareness

```json
// .yocode/connectors.json
{
  "environments": ["production"],
  "connectors": {
    "railway": { "token": "...", "project": "..." },
    "supabase": { "ref": "...", "key": "..." }
  }
}
```

One environment? Deploy and verify against that. Add staging later? Add an entry.
No mode switches, no config rewrites.

---

## 11. Onboarding & Migration

### 11.1 Onboarding (`/yocode:onboard`)

For existing codebases that never used any workflow tool:

**Phase 1 — Analyze (parallel read-only agents):**
- stack-mapper: detect tech stack, dependencies, stack fingerprint
- architecture-mapper: file structure, module boundaries, data flow
- convention-miner: naming patterns, code style, error handling, implicit rules
- history-miner: git log analysis, commit patterns, hotspots, branch strategy
- doc-scanner: existing README, CLAUDE.md, architecture docs, inline comments

**Phase 2 — Synthesize:**
- Combine into PROJECT.md, memory/rules/, memory/decisions/
- Detect production systems, offer to run /connect for each

**Phase 3 — Interview (minimal, only what can't be inferred):**
- Present findings using Assumptions Mode
- Ask only for corrections, not 30 questions

**Key property:** Onboarding a second project benefits from the first. Supabase lessons
from project A are already in stack memory when project B is onboarded.

### 11.2 Migration (`/yocode:migrate`)

For projects using GSD, gstack, Paul, CARL, or BASE:

1. Detect: .planning/, .paul/, .base/, .carl/, gstack global files, CLAUDE.md inline conventions
2. Extract: Parse all planning artifacts, handoffs, state files, learnings, decisions
3. Classify: Sort into global/stack/project using scope inference
4. Deduplicate: Check against already-migrated memories
5. Stage: Present summary for review
6. Write: Populate .yocode/ structure
7. Archive: Move old tool dirs to .yocode/migrated-from/ (don't delete)

---

## 12. Hook System

### 12.1 Hook Registration

```json
// Added to ~/.claude/settings.json during install
{
  "hooks": {
    "SessionStart": [{
      "matcher": ".*",
      "command": "~/.yocode/bin/hooks/session-start.sh"
    }],
    "UserPromptSubmit": [{
      "matcher": ".*",
      "command": "~/.yocode/bin/hooks/inject-context.sh"
    }],
    "PostToolUse": [{
      "matcher": ".*",
      "command": "~/.yocode/bin/hooks/observe.sh"
    }],
    "PreCompact": [{
      "matcher": ".*",
      "command": "~/.yocode/bin/hooks/pre-compact-dream.sh"
    }]
  }
}
```

### 12.2 Hook Purposes

| Hook | Purpose | Latency Target |
|------|---------|---------------|
| SessionStart | Load L0 memories, inject axioms, check dream trigger | <100ms |
| UserPromptSubmit | Intent classification context, inject relevant L1 memories | <50ms |
| PostToolUse | Observer — detect corrections, decisions, capture to staging | <50ms |
| PreCompact | Before context compresses, save important context | <200ms |

### 12.3 Observer Hook

The PostToolUse observer watches for patterns:
- User corrections ("no, do it this way", "don't", "always use X")
- Decisions made ("let's use X instead of Y")
- Errors encountered and resolved

Pattern matching, not a secondary LLM call. Must execute in <50ms to stay invisible.

---

## 13. Browse Daemon

Lifted from gstack. Architecture:

```
First call: yocode browse goto <url>
  → Spawns Chromium via Playwright
  → Starts HTTP server on random port (10000-60000)
  → Writes port + auth token to ~/.yocode/browse.pid
  → 3-second cold start

Subsequent calls: yocode browse click @e3
  → Reads port from pid file
  → HTTP request to running daemon
  → 100-200ms response

Idle timeout: 30 minutes → daemon self-terminates
```

Compiled as single Bun binary (~58MB). Bun chosen for: single-file compiled binary (no
node_modules), native SQLite (cookie import), native TypeScript, built-in HTTP server.

Ref system: Accessibility tree API assigns @e refs (ARIA elements) and @c refs
(cursor-interactive non-ARIA). Stale refs detected in ~5ms.

---

## 14. Dream / Hygiene Cycle

### 14.1 Trigger

Auto-trigger when both conditions met:
- 24 hours since last dream cycle
- 5+ sessions have occurred

Also available manually.

### 14.2 Four Phases (Extended from Auto-Dream)

1. **Orient** — Scan all three memory tiers, read index files
2. **Gather Signal** — Grep session transcripts for corrections, decisions, patterns
3. **Consolidate** — Merge overlaps, convert relative dates to absolute, delete contradicted
   facts, remove stale references, validate wiki-links still resolve
4. **Prune & Index** — Rebuild index.md files under 50 lines, archive stale memories to L2

### 14.3 yocode Extensions Beyond Auto-Dream

- Scope-aware consolidation across global/stack/project tiers
- Wiki-link graph maintenance (detect broken links, orphaned nodes)
- Cross-project promotion (project lessons → stack/global when recurring in 2+ projects)
- Staleness validation (grep for referenced function names, check file paths exist)
- Contradiction surfacing (don't silently delete — flag for user review)

---

## 15. Installation & Repo Structure

### 15.1 Repository Structure

```
yocode/
  install.sh                   # One-liner installer → writes to ~/.yocode/
  package.json                 # For npx yocode install
  bin/
    yocode                     # Main CLI entry point
    browse                     # Daemon browser binary (Bun compiled)
    hooks/
      session-start.sh
      inject-context.sh
      observe.sh
      pre-compact-dream.sh
  agents/                      # Agent definitions (markdown)
    executor.md
    planner.md
    researcher.md
    reviewer.md
    debugger.md
    mapper.md
    ...
  axioms/                      # 100x engineer mindset (markdown)
    execution.md
    analysis.md
    quality.md
    mindset.md
  commands/                    # Slash commands (skills)
    yocode/*.md
  workflows/                   # Thin orchestrators
  memory/
    global/                    # Ships with defaults, user extends
      axioms/                  # Symlinked from axioms/
      rules/                   # Initially empty, grows with use
      profile.md               # Generated during first run
      index.md                 # Auto-maintained
    stacks/                    # Stack-scoped lessons (grows with use)
  connectors/                  # Connector agent definitions
    railway.md
    langfuse.md
    posthog.md
    supabase.md
    vercel.md
    sentry.md
  migrations/                  # Consolidators for other tools
    from-gsd.md
    from-gstack.md
    from-paul.md
  templates/                   # Per-project scaffolding (.yocode/ init)
  sources/                     # Cloned source repos (for lifting code)
    gsd/
    gstack/
    seed/
    paul/
    carl/
    base/
    ruflo/
    claude-mem/
    dream-skill/
  ARCHITECTURE.md              # This document
  CLAUDE.md                    # Instructions for Claude sessions working on yocode
  LICENSE                      # MIT
  ACKNOWLEDGMENTS.md           # Attribution for source repos (MIT compliance)
```

### 15.2 Installation Flow

```bash
npx yocode install
# or
git clone https://github.com/yoelgal/yocode.git ~/.yocode-src && ~/.yocode-src/install.sh
```

The installer:
1. Writes agent definitions to `~/.yocode/agents/`
2. Writes commands to `~/.claude/commands/yocode/`
3. Writes hooks to `~/.yocode/bin/hooks/`
4. Registers hooks in `~/.claude/settings.json`
5. Initializes global memory at `~/.yocode/memory/global/`
6. Compiles browse daemon (Bun binary)

### 15.3 Per-Project Init

```bash
/yocode:init
# or detected automatically on first use in a new project
```

Creates `.yocode/` in project root with:
- memory/ (empty, grows with use)
- connectors.json (gitignored template)
- .gitignore (ignores connectors.json, debug sessions)

---

## 16. Testing Strategy

### 16.1 Test Tiers

**Unit tests (fast, free):**
- Memory CRUD: create, read, update, deduplicate, archive
- Wiki-link parser: extract [[links]], detect contradictions
- Intent classifier: input message → correct mode
- L0/L1/L2 loading: right memories loaded for given context
- Scope inference: correction → correct tier assignment

**Integration tests (medium, cheap):**
- Hook → capture → stage → activate pipeline
- Dream cycle: consolidation, pruning, index rebuild
- Migration: .planning/ → .yocode/ conversion

**E2E tests (expensive, run sparingly):**
- Spawn agent → execute task → verify commit
- Wave execution → worktree creation → merge back
- Full onboard cycle on a sample codebase

### 16.2 Approach

The user plans to test and upgrade iteratively by using yocode to build yocode. No
comprehensive test suite on day one. Friction points discovered during use become
immediate fixes. The bootstrapping loop: build → hit friction → fix → repeat.

---

## 17. Build Order

### Phase 1: Foundation
1. Set up repo structure
2. Clone all source repos into `sources/`
3. Build the memory system (three-tier, L0/L1/L2, wiki-links, index maintenance)
4. Write the axioms
5. Build the hook system (session-start, observe, inject-context)

### Phase 2: Core Execution
6. Build intent classifier (system prompt preamble)
7. Lift agent definitions, adapt format
8. Build the plan mode (from Paul's PAU loop + GSD's assumptions mode)
9. Build wave execution with worktrees
10. Build the UNIFY phase

### Phase 3: Skills
11. Lift /browse from gstack (rebrand, wire to memory)
12. Lift /qa from gstack
13. Lift /ship from gstack
14. Lift /review from gstack
15. Lift /retro from gstack
16. Build /onboard (new)
17. Build /migrate (new)

### Phase 4: Production
18. Build connector system
19. Build /diagnose, /health, /canary (extend gstack's with connectors)
20. Build /debug (from GSD, wire to connectors)
21. Build /dream (from Auto-Dream, extend with three-tier + wiki-links)

### Phase 5: Polish & Installation
22. Lift design skills from gstack (/design-*, /office-hours)
23. Lift /cso from gstack
24. Build installer — study gstack's setup script (`sources/gstack/`) first, they do this
    well. Lift what works. The installer should be invoked entirely by a single prompt the
    user pastes into Claude Code. No manual steps. Claude clones the repo, runs the install,
    registers hooks, compiles binaries, asks profile questions, and optionally onboards the
    current project. The README quickstart section is literally just a prompt to paste.
25. Write README for GitHub — the quickstart is a single Claude Code prompt:
    ```
    Install yocode: clone https://github.com/yoelgal/yocode, run the
    installer, register hooks, build the browse daemon, and initialize
    my global memory. Then set up my user profile — ask me a few
    questions about how I work. If I'm in a project, detect the tech
    stack and offer to onboard it. Fix anything that breaks.
    ```
    That's the entire getting started guide. One prompt, Claude handles everything.

---

## 18. User Profile

**Name:** Yoel Gal
**GitHub:** yoelgal
**Experience:** Extensive hands-on with GSD and gstack. Researched Seed, Paul, Ruflo.
**Primary project:** torch0 (competitive intelligence platform)
**Tech stack comfort:** TypeScript, React, Hono, tRPC, Supabase, BullMQ, Railway, Vercel

**Working style:**
- Prefers systems that infer intent rather than interrogating
- Values self-improving systems that never repeat mistakes
- Wants minimal manual overhead — automate everything possible
- Tests and upgrades iteratively, not comprehensively upfront
- Plans to use yocode to orchestrate its own development (bootstrapping)
- Will use torch0 as the primary test case for yocode features

**Key preferences captured from prior work:**
- Don't restrict maxTokens; use 16384+ to avoid truncation failures
- Always validate demand before proposing engineering work
- All LLM outputs must be source-grounded with citations
- Prefer pure generic models over hybrid typed+generic
- After each wave, corrective agents fix ALL issues — no "non-blocking observations"
- When building cost is ~0, always do the best option. Never defer fixes.
- Entities are permanent knowledge, never deleted

---

## Source Repos to Clone

```bash
cd sources/
git clone https://github.com/gsd-build/get-shit-done.git gsd
git clone https://github.com/garrytan/gstack.git gstack
git clone https://github.com/ChristopherKahler/seed.git seed
git clone https://github.com/ChristopherKahler/paul.git paul
git clone https://github.com/ruvnet/ruflo.git ruflo
git clone https://github.com/thedotmack/claude-mem.git claude-mem
git clone https://github.com/grandamenium/dream-skill.git dream-skill
```

Also fetch the extracted dream system prompt:
```bash
curl -o sources/dream-system-prompt.md https://raw.githubusercontent.com/Piebald-AI/claude-code-system-prompts/main/system-prompts/agent-prompt-dream-memory-consolidation.md
```

CARL and BASE are part of the Paul/Seed ecosystem by Christopher Kahler. Check if they
have separate repos or are bundled. If separate:
```bash
git clone https://github.com/ChristopherKahler/carl.git carl
git clone https://github.com/ChristopherKahler/base.git base
```
