/**
 * yocode Assumptions Mode
 *
 * Instead of asking 15-20 questions, read 5-15 source files, form
 * structured assumptions with confidence levels and evidence citations,
 * then ask only for corrections. Reduces interactions from ~15-20 to ~2-4.
 *
 * This module generates the structured assumption prompt that planner
 * and onboard agents use.
 */

import { readFile, readdir } from "fs/promises";
import { join, basename, extname } from "path";
import { existsSync } from "fs";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "Confident" | "Likely" | "Unclear";

export interface Assumption {
  id: string;
  statement: string;
  confidence: ConfidenceLevel;
  evidence: string; // file path or observation that supports this
  category: "architecture" | "convention" | "dependency" | "behavior" | "requirement";
}

export interface AssumptionSet {
  assumptions: Assumption[];
  filesRead: string[];
  questionsForUser: string[]; // only for "Unclear" items
}

// ─── File Discovery ──────────────────────────────────────────────────────────

/** Priority files to read for building assumptions */
const PRIORITY_FILES = [
  "package.json",
  "tsconfig.json",
  "CLAUDE.md",
  "README.md",
  "ARCHITECTURE.md",
  "DESIGN.md",
  ".env.example",
  "docker-compose.yml",
  "Dockerfile",
];

const PRIORITY_DIRS = [
  "src",
  "app",
  "lib",
  "pages",
  "api",
  "components",
  "server",
];

/**
 * Discover the most informative files to read for assumption building.
 * Returns 5-15 file paths, prioritized by informativeness.
 */
export async function discoverKeyFiles(
  projectRoot: string,
  topic?: string
): Promise<string[]> {
  const files: string[] = [];

  // Priority config files
  for (const f of PRIORITY_FILES) {
    const path = join(projectRoot, f);
    if (existsSync(path)) files.push(path);
  }

  // Entry points and key source files
  for (const dir of PRIORITY_DIRS) {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) continue;

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && isSourceFile(entry.name)) {
          files.push(join(dirPath, entry.name));
        }
        // Also check one level deep for index/main files
        if (entry.isDirectory()) {
          const subDir = join(dirPath, entry.name);
          for (const subFile of ["index.ts", "index.tsx", "index.js", "main.ts", "route.ts", "page.tsx"]) {
            const path = join(subDir, subFile);
            if (existsSync(path)) files.push(path);
          }
        }
      }
    } catch {}
  }

  // If a topic is specified, also grep for relevant files
  // (the caller should do this with Grep tool — we just return the base set)

  // Cap at 15 files
  return files.slice(0, 15);
}

function isSourceFile(name: string): boolean {
  const ext = extname(name);
  return [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".rb"].includes(ext);
}

// ─── Assumption Generator ────────────────────────────────────────────────────

/**
 * Generate the structured prompt for Assumptions Mode.
 * This is injected into planner/onboard agents so they read files
 * and form assumptions instead of asking questions.
 */
export function generateAssumptionsPrompt(
  filePaths: string[],
  context: string
): string {
  return `
## Assumptions Mode

You are operating in Assumptions Mode. Instead of asking the user questions,
you will read source files, form structured assumptions, and present them
for correction.

### Files to Read
Read ALL of these files before forming assumptions:

${filePaths.map((f) => `- \`${f}\``).join("\n")}

### Context
${context}

### Process

1. Read every file listed above
2. Form assumptions about the project in these categories:
   - **Architecture**: How the system is structured, what talks to what
   - **Conventions**: Naming patterns, code style, error handling patterns
   - **Dependencies**: What libraries/services are used and why
   - **Behavior**: How features work, data flows, state management
   - **Requirements**: What the user likely wants based on context

3. For each assumption, rate your confidence:
   - **Confident**: You read the code and verified this directly
   - **Likely**: Strong evidence but not directly confirmed
   - **Unclear**: You need user input to resolve this

4. Present your assumptions in this format:

\`\`\`markdown
## My Understanding

Here's what I've gathered from reading the codebase. Please correct anything wrong.

### Architecture
- [Confident] The app uses Next.js with app router (evidence: app/ directory structure)
- [Likely] API routes are in app/api/ using route handlers (evidence: file naming pattern)

### Conventions
- [Confident] TypeScript strict mode is enabled (evidence: tsconfig.json)
- [Unclear] Are you using a specific component library? I see both custom and shadcn components

### Dependencies
- [Confident] Supabase for database and auth (evidence: @supabase/supabase-js in package.json)

### Questions (only for Unclear items)
1. [question about unclear item]
\`\`\`

5. Wait for corrections before proceeding. Only ask about "Unclear" items.

### Rules
- Do NOT ask more than 3 questions total
- If something is Likely, proceed with that assumption — don't ask
- Only escalate to a question if you genuinely cannot determine the answer from code
- The goal is to reduce interactions from 15-20 to 2-4
`.trim();
}

/**
 * Parse assumption responses into structured data.
 * Used by the orchestrator to track which assumptions were confirmed/corrected.
 */
export function parseAssumptions(text: string): Assumption[] {
  const assumptions: Assumption[] = [];
  const lines = text.split("\n");
  let category: Assumption["category"] = "architecture";
  let id = 1;

  for (const line of lines) {
    // Detect category headers
    if (line.match(/###?\s*Architecture/i)) category = "architecture";
    else if (line.match(/###?\s*Convention/i)) category = "convention";
    else if (line.match(/###?\s*Dependenc/i)) category = "dependency";
    else if (line.match(/###?\s*Behavior/i)) category = "behavior";
    else if (line.match(/###?\s*Requirement/i)) category = "requirement";

    // Parse assumption lines: "- [Confident] Statement (evidence: ...)"
    const match = line.match(
      /^-\s*\[(Confident|Likely|Unclear)\]\s*(.+?)(?:\s*\(evidence:\s*(.+?)\))?$/i
    );
    if (match) {
      assumptions.push({
        id: `A-${id++}`,
        confidence: match[1] as ConfidenceLevel,
        statement: match[2].trim(),
        evidence: match[3]?.trim() || "",
        category,
      });
    }
  }

  return assumptions;
}
