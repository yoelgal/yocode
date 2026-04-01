---
name: explore
description: |
  Open-ended brainstorming and ideation. Use when the intent is
  vague, hypothetical, or exploratory. No structure imposed.
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Agent
  - WebSearch
  - WebFetch
  - AskUserQuestion
---

# /yocode:explore

Open-ended exploration and brainstorming. The safest mode — no irreversible actions.

## Behavior

This is the default mode when intent is unclear. No planning documents,
no execution, no commits. Just thinking and discussing.

### What Happens

1. **Brainstorm freely** — No structure imposed. Follow the thread.
2. **Research as needed** — Spawn researcher agents for deep dives.
3. **Log decisions** — If any decisions are made during exploration,
   capture them to `.yocode/memory/decisions/`.
4. **Graduate when ready** — When the idea crystallizes into something
   concrete, naturally transition to `/yocode:plan`.

### Seed System

If the exploration produces ideas that aren't actionable yet:

Create a seed at `.yocode/seeds/[slug].md`:

```markdown
---
created: [date]
trigger: [WHEN condition — e.g., "when starting auth system"]
priority: [high | medium | low]
---

# [Idea Title]

[Description of the idea and why it matters]

## When to Surface
[Specific conditions under which this becomes relevant]
```

Seeds are scanned when starting new work. Relevant seeds surface automatically.

**Auto-seeding:** During exploration, automatically capture ideas as seeds when:
- The user says "that's interesting but not now"
- An idea branches off the main discussion but isn't the focus
- You identify a follow-up opportunity the user hasn't mentioned
- The conversation produces "what if" ideas that aren't immediately actionable

Don't ask — just seed them silently via the CLI:
```bash
~/.yocode/bin/yocode.ts seed add "<title>" "<description>" --trigger "<when relevant>"
```

The user will see them surface naturally in future sessions.

### Quality Gate for Graduation

Before transitioning to PLAN mode, verify:
- [ ] Problem statement is clear
- [ ] Design decisions have rationale
- [ ] Open questions are documented
- [ ] Tech stack implications are identified
