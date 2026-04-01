# yocode

This project uses yocode. The system loads automatically via hooks — axioms,
memory rules, and intent classification inject on every message. You don't
need to type commands. Just talk.

## How Conversations Become Workflows

Classify the user's intent from their message and respond in the appropriate
mode. Do NOT announce mode changes — just behave accordingly. Slash commands
exist as explicit overrides but the 90% case is natural conversation.

### Conversation → Mode Routing

**"I have an idea..." / "What if..." / "Should we..."**
→ EXPLORE mode. Brainstorm freely. Log decisions if made. Auto-seed ideas
that aren't actionable yet. If the idea crystallizes, transition to PLAN.

**"Build X" / "Add Y" / "I need a feature that..."**
→ PLAN mode. Use Assumptions Mode: read 5-15 source files, form assumptions
with confidence levels, ask only for corrections. Produce acceptance criteria.
Scan seeds for relevant prior ideas. Auto-seed anything deferred.

**"Let me review this plan" / "Is this plan solid?"**
→ PLAN-REVIEW mode. Three lenses: CEO (scope + vision), Engineer (architecture
+ correctness), Designer (UX + visual quality). Interactive, one issue at a time.

**"Go" / "Do it" / "Execute" / "Launch"**
→ EXECUTE mode. Confirm scope, then wave execution with parallel agents.
Mandatory UNIFY at the end. Auto-seed any deferred items.

**"Just rename X" / "Quickly fix Y" / "Change this one thing"**
→ QUICK mode. No planning docs. Just do it. Still benefits from memory and axioms.

**"This is broken" / "Error:" / "Not working" / stack traces**
→ DEBUG mode. Check knowledge base first. Gather → Hypothesize → Verify → Fix
→ Persist. Auto-seed deeper fixes that got patched instead of properly solved.

**"Users are reporting..." / "Check prod" / "Is the API down?"**
→ DIAGNOSE mode. Pull from all connected systems, correlate, surface anomalies.

**"Ship it" / "Create a PR" / "Deploy" / "Push"**
→ SHIP mode. Full pipeline: merge base → test → review → version → changelog → PR.
Requires confirmation before proceeding (high-risk mode).

**"How'd this week go?" / "What did we ship?" / "Retro"**
→ RETRO mode. Analyze commits, patterns, trends. Compare with history.

**"What if we added dark mode?" (during brainstorming)**
→ Stay in EXPLORE. Auto-seed the idea.

**Ambiguous or unclear?**
→ Default to EXPLORE. It's the safest — no irreversible actions.

### Automatic Behaviors (No Commands Needed)

These happen silently in the background:

- **Memory loading** — axioms and L0 rules inject every session. L1 rules inject
  when keywords in your message match. You never ask for this.
- **Correction capture** — when you correct something, it's staged as a memory rule.
  Low-risk project corrections auto-approve. Global rules need review.
- **Seed capture** — deferred ideas, out-of-scope items, tangent thoughts are
  auto-seeded during plan/explore/debug/execute. They surface when relevant.
- **Seed surfacing** — when starting new work, matching seeds from prior sessions
  appear automatically.
- **Context pressure** — at 35% remaining context, you'll see a warning. At 25%,
  a critical alert to commit and compact.
- **Dream trigger** — after 24h + 5 sessions, you'll see a suggestion to run
  memory consolidation.

### When Commands Are Useful

Slash commands override the automatic routing. Use them when:
- You want a specific workflow that conversation routing might not trigger
- You want to force a mode (e.g., `/yocode:plan-review` on a plan you're reading)
- You want to run a standalone tool (e.g., `/yocode:cso` for a security audit)
- You want to manage the system itself (e.g., `/yocode:learn`, `/yocode:tidy`)

### The Developer's Journey (All Conversation-Driven)

```
"I've got an idea for..."        → Explore → seeds planted
"OK let's build it"              → Plan → assumptions → acceptance criteria
"Is this plan good?"             → Plan Review → CEO + Eng + Design lenses
"Go"                             → Execute → parallel agents → UNIFY
"This looks broken"              → Debug → knowledge base → fix → persist
"Ship it"                        → Ship → test → review → PR
"How'd this week go?"            → Retro → metrics → trends
"Something's wrong in prod"      → Diagnose → cross-system correlation
```

No commands memorized. No workflows to learn. Just talk about what you need.

## State

`.yocode/` contains project state. `~/.yocode/` contains global memory.
Both are managed automatically. Run `/yocode:tidy` periodically to clean up.
