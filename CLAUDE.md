# yocode

A unified Claude Code workflow tool. Read `ARCHITECTURE.md` before doing anything — it
contains the complete design, all research findings, every decision with rationale, and
the build order.

## Quick Context

yocode synthesizes the best features from GSD, gstack, Seed/Paul/CARL/BASE, Ruflo, and
claude-mem into a single self-improving workflow system. It installs globally at `~/.yocode/`
and manages per-project state at `.yocode/`.

## Critical Rules

1. **Lift, don't rebuild.** Source repos are cloned in `sources/`. Extract actual code from
   them, rebrand, adapt interfaces. Do NOT rewrite from scratch what already exists.

2. **No references to source tools.** No "based on gstack" or "adapted from GSD" anywhere
   user-facing. Attribution only in ACKNOWLEDGMENTS.md for MIT compliance.

3. **Build order matters.** Follow the phases in ARCHITECTURE.md Section 17. Memory system
   first, then hooks, then execution, then skills.

4. **Axioms apply to yocode's own development.** Trace all callers, check for stale refs,
   delete dead code, ship complete work. Think like a 100x engineer.

5. **The user tests iteratively.** No need for comprehensive test suites upfront. Build,
   use, fix friction, repeat.

## Commands

```bash
# Development
bun install               # Install dependencies
bun run build             # Build all
bun run test              # Run tests

# Source repos (clone first if not present)
cd sources/ && ./clone-all.sh
```

## Repo Structure

```
bin/                       # CLI entry points + compiled binaries
agents/                    # Agent definitions (markdown)
axioms/                    # 100x engineer principles (markdown)
commands/                  # Slash commands (skills)
workflows/                 # Thin orchestrators
memory/                    # Global memory defaults
connectors/                # Production connector definitions
migrations/                # Tool migration scripts
templates/                 # Per-project scaffolding
sources/                   # Cloned source repos (gitignored)
```

## Key Files

- `ARCHITECTURE.md` — THE document. All design, research, decisions, rationale.
- `bin/hooks/` — Claude Code lifecycle hooks
- `agents/` — Agent definitions with tool whitelists and model assignments
- `axioms/` — Non-negotiable engineering principles injected into every agent
- `memory/global/index.md` — L0 hot memory summary (<50 lines)
