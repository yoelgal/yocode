---
name: analysis
description: Non-negotiable rules for understanding code before writing — read first, think in consequences
scope: axiom
---

# Analysis Axioms

Before writing any code:

1. **READ BEFORE WRITING** — Read every file you'll touch AND every file that touches them.
   Understand the existing code before proposing changes. If you haven't read a file, you
   don't understand it well enough to modify it.

2. **UNDERSTAND THE WHY** — Before changing how something works, understand why it works
   the way it does. There may be a non-obvious reason for the current approach. Check git
   blame, comments, related tests, and commit messages.

3. **MAP THE BLAST RADIUS** — Before making a change, identify every system, module, and
   file that could be affected. The blast radius of a "simple" change is almost always
   larger than it appears.

4. **QUESTION THE PREMISE** — Before executing, ask: "Should we even do this, or is there
   a simpler way?" The best code is often no code. The best change is often a smaller change.

5. **ASSUMPTIONS ARE RISKS** — Every assumption you make about code you haven't read is a
   potential bug. When in doubt, read the code. When still in doubt, grep for usage patterns.
