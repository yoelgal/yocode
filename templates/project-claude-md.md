# yocode

This project uses yocode as its ONLY workflow system. If you see sections in
this file for gstack, GSD, Paul, or other tools — they are stale and MUST be
removed. Run `/yocode:migrate` to consolidate their knowledge and clean up.

## HARD RULES (never violate these)

1. **NEVER use `mcp__claude-in-chrome__*` tools.** For ALL browser interaction,
   use the `/yocode:browse` skill which uses the headless browse daemon. This
   includes QA testing, dogfooding, screenshots, form testing, everything.
   If you catch yourself about to call any `mcp__claude-in-chrome__*` tool, STOP
   and use `/yocode:browse` instead.

2. **ALWAYS write memories to yocode's memory system**, not Claude Code's native
   memory. Corrections, rules, decisions, feedback — all go to:
   - Project-specific: `.yocode/memory/rules/` or `.yocode/memory/decisions/`
   - Stack-specific: `~/.yocode/memory/stacks/<stack>/`
   - Global: `~/.yocode/memory/global/rules/`
   Use the CLI: `~/.yocode/bin/yocode.ts memory add "<rule>" --scope <scope>`
   or `~/.yocode/bin/yocode.ts learn capture "<what>" "<correction>"`.
   Do NOT use Claude Code's auto-memory system for anything yocode should own.

3. **NEVER leave old tool state in place.** If `.planning/`, `.paul/`, `.carl/`,
   `.base/`, or `.claude/skills/gstack/` exist, run `/yocode:migrate` before
   doing anything else. If this CLAUDE.md has sections for gstack or GSD,
   those sections must be removed after migration.

## How It Works

The system loads automatically via hooks — axioms, memory rules, and intent
classification inject on every message. You don't need to type commands. Just talk.

## Conversation → Mode Routing

Classify the user's intent and respond in the appropriate mode.
Do NOT announce mode changes — just behave accordingly.

**"I have an idea..." / "What if..." / "Should we..."**
→ EXPLORE. Brainstorm freely. Auto-seed tangent ideas silently.

**"Build X" / "Add Y" / "I need a feature that..."**
→ PLAN. Assumptions Mode → acceptance criteria → skeptic failure analysis → waves.

**"Let me review this plan" / "Is this plan solid?"**
→ PLAN-REVIEW. CEO + Engineer + Designer lenses. Interactive.

**"Go" / "Do it" / "Execute"**
→ EXECUTE. Parallel agents in worktrees. Mandatory UNIFY. Requires confirmation.

**"Just rename X" / "Quickly fix Y"**
→ QUICK. No ceremony. Still uses axioms and memory.

**"This is broken" / errors / stack traces**
→ DEBUG. Knowledge base → gather → hypothesize → verify → fix → persist.

**"Users reporting..." / "Check prod"**
→ DIAGNOSE. Pull from all connected systems, correlate.

**"Ship it" / "Create a PR"**
→ SHIP. Test → review → version → changelog → PR. Requires confirmation.

**"QA this" / "Test the site" / "Does it work?"**
→ QA. Use `/yocode:browse` to navigate the site. NEVER Claude in Chrome.

**"How'd this week go?" / "Retro"**
→ RETRO. Commit analysis, metrics, trends.

**Ambiguous?** → Default to EXPLORE.

## Automatic Behaviors

These happen silently:
- Memory rules inject when keywords match (L1 JIT loading)
- Corrections are captured and staged as permanent rules (in yocode memory)
- Ideas are auto-seeded during plan/explore/debug/execute
- Seeds surface when starting new work that matches their trigger
- Context pressure warnings at 35% and 25% remaining

## Browser Interaction

For ANY browser interaction (QA, dogfooding, screenshots, testing):
```bash
B="${HOME}/.yocode/browse/dist/browse"
$B goto <url>              # Navigate
$B snapshot -i             # Interactive elements
$B click @e3               # Click by ref
$B fill @e5 "text"         # Fill input
$B screenshot              # Capture
```

NEVER use `mcp__claude-in-chrome__*`. NEVER. Use the browse daemon.

## State

`.yocode/` — project state and memory
`~/.yocode/` — global memory and axioms
Both managed automatically. Run `/yocode:tidy` to clean up.
