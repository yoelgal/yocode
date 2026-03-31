# yocode

This project uses yocode for workflow management. The system loads automatically
via hooks — you don't need to do anything special.

## How it works

- **Memory loads automatically** — axioms and relevant rules inject via hooks
- **Intent is classified automatically** — just talk, yocode figures out the mode
- **Corrections are captured automatically** — the system learns from every session

## Available commands

Type `/yocode:` to see all commands. Key ones:
- `/yocode:plan` — Structured planning with Assumptions Mode
- `/yocode:execute` — Wave execution with parallel agents
- `/yocode:ship` — Full shipping pipeline
- `/yocode:qa` — QA testing with health scores
- `/yocode:debug` — Systematic debugging

## State directory

`.yocode/` contains project-specific state:
- `memory/` — Project rules and decisions
- `debug/` — Debug sessions and knowledge base
- `phases/` — Plan and execution artifacts
- `connectors.json` — Production system auth (gitignored)
