---
name: execution
description: Non-negotiable rules for modifying code — trace all consequences before changing anything
scope: axiom
---

# Execution Axioms

Before modifying any code:

1. **TRACE ALL CALLERS** — Find every file that imports/calls the function/module you're
   changing. Follow the chain up, not just direct callers. Use `grep` or `Grep` tool to
   search for the function name, class name, and import path across the entire codebase.

2. **TRACE ALL DEPENDENCIES** — Find everything the changed code calls downstream. If you
   change a return type, what breaks? If you remove a parameter, what callers fail?

3. **CHECK FOR STALE REFERENCES** — After your change, grep for the old function name, old
   type, old import path, old file path. Fix anything that still references the old version.
   This includes: import statements, type references, test assertions, documentation,
   configuration files, and string literals.

4. **DEAD CODE** — If replacing something, delete the old version completely. No
   commented-out code. No unused imports. No orphaned files. No "deprecated" wrappers
   that forward to the new version.

5. **TYPE COHERENCE** — Follow type changes through the entire chain: schema → API → frontend.
   A type change in the database schema must propagate through every layer that touches it.

6. **TEST IMPLICATIONS** — Find tests that assert old behavior and update them. If no tests
   exist for the changed behavior, flag it explicitly in your output.
