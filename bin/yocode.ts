#!/usr/bin/env bun
/**
 * yocode CLI
 *
 * The spine of the system. Hooks call this for fast memory operations,
 * commands reference it for structured operations, the dream cycle uses it
 * for consolidation.
 *
 * Usage:
 *   yocode memory load-l0 [--project <path>]
 *   yocode memory load-l1 <keywords...> [--project <path>]
 *   yocode memory search <query> [--project <path>]
 *   yocode memory add <body> [--scope global|stack|project] [--type rule|decision] [--stack <name>]
 *   yocode memory stage <body> [--context <what-triggered-it>]
 *   yocode memory dedupe <path>
 *   yocode memory regen-index <dir>
 *   yocode memory validate-refs <dir>
 *   yocode intent <message>
 *   yocode axioms
 *   yocode stack-detect [--project <path>]
 *   yocode connectors status [--project <path>]
 *   yocode connectors detect [--project <path>]
 *   yocode connectors query <name> <capability> [--env <environment>]
 *   yocode dream [--project <path>]
 *   yocode version
 */

import { join, basename } from "path";
import { homedir } from "os";
import { existsSync } from "fs";
import { readFile, writeFile, readdir, mkdir } from "fs/promises";

import {
  type Memory,
  type MemoryFrontmatter,
  type MemoryScope,
  parseFrontmatter,
  serializeFrontmatter,
  extractWikiLinks,
  loadAllMemories,
  readMemory,
  writeMemory,
  archiveMemory,
  loadL0,
  loadL1,
  searchL2,
  inferScope,
  checkDuplicate,
  detectContradictions,
  regenerateIndex,
  loadAxioms,
  detectStack,
  slugify,
  globalMemoryPath,
  stackMemoryPath,
  projectMemoryPath,
} from "../lib/memory";

import { classifyIntent, generatePreamble } from "../lib/intent";
import {
  loadConnectorConfig,
  getConnectorStatuses,
  detectConnectors,
  listAvailableConnectors,
  getConnector,
} from "../lib/connectors";

// ─── Constants ───────────────────────────────────────────────────────────────

const YOCODE_HOME = join(homedir(), ".yocode");
const VERSION = "0.1.0";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findProjectRoot(): string {
  // Walk up from cwd looking for .yocode/ or .git/
  let dir = process.cwd();
  while (dir !== "/") {
    if (existsSync(join(dir, ".yocode")) || existsSync(join(dir, ".git"))) {
      return dir;
    }
    dir = join(dir, "..");
  }
  return process.cwd();
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function printText(text: string): void {
  console.log(text);
}

// ─── Memory Commands ─────────────────────────────────────────────────────────

async function memoryLoadL0(projectPath?: string): Promise<void> {
  const project = projectPath || findProjectRoot();
  const content = await loadL0(project);
  printText(content);
}

async function memoryLoadL1(
  keywords: string[],
  projectPath?: string
): Promise<void> {
  const project = projectPath || findProjectRoot();
  const memories = await loadL1(keywords, project);

  if (memories.length === 0) {
    return; // Silent — no matching memories is normal
  }

  const output = memories
    .map((m) => {
      const scope = m.frontmatter.scope || "unknown";
      // Strip frontmatter, keep body trimmed
      return `[${scope}] ${m.body.trim().split("\n").slice(0, 15).join("\n")}`;
    })
    .join("\n\n---\n\n");

  printText(output);
}

async function memorySearch(
  query: string,
  projectPath?: string
): Promise<void> {
  const project = projectPath || findProjectRoot();
  const matches = await searchL2(query, project);

  if (matches.length === 0) {
    printText("No memories match that query.");
    return;
  }

  for (const match of matches.slice(0, 10)) {
    printText(
      `[${(match.score * 100).toFixed(0)}%] ${match.memory.title} (${match.memory.frontmatter.scope})`
    );
    printText(`  ${match.memory.body.trim().split("\n")[0]}`);
    printText(`  Path: ${match.memory.path}`);
    printText("");
  }
}

async function memoryAdd(
  body: string,
  options: {
    scope?: MemoryScope;
    type?: "rule" | "decision";
    stack?: string;
    keywords?: string[];
    project?: string;
  }
): Promise<void> {
  const project = options.project || findProjectRoot();

  // Infer scope if not provided
  const scopeResult = options.scope
    ? { scope: options.scope, confidence: "high" as const }
    : inferScope(body);

  const scope = scopeResult.scope;
  const stack = options.stack || (scopeResult as any).stack;
  const memType = options.type || "rule";

  // Determine target directory
  let targetDir: string;
  switch (scope) {
    case "global":
      targetDir = join(globalMemoryPath(), memType === "decision" ? "decisions" : "rules");
      break;
    case "stack":
      if (!stack) {
        console.error("Stack scope requires --stack <name>");
        process.exit(1);
      }
      targetDir = join(stackMemoryPath(stack), "rules");
      break;
    case "project":
      targetDir = join(projectMemoryPath(project), memType === "decision" ? "decisions" : "rules");
      break;
  }

  // Check for duplicates
  const dedupe = await checkDuplicate(body, scope, stack, project);

  if (dedupe.action === "skip") {
    printText(
      `Skipped: ${(dedupe.similarity * 100).toFixed(0)}% similar to existing memory at ${dedupe.existing?.path}`
    );
    return;
  }

  if (dedupe.action === "merge" && dedupe.existing) {
    printText(
      `Merging with existing memory (${(dedupe.similarity * 100).toFixed(0)}% similar): ${dedupe.existing.path}`
    );
    // Append new content to existing
    const merged = dedupe.existing.body + "\n\n" + body;
    dedupe.existing.frontmatter.last_validated = today();
    await writeMemory(dedupe.existing.path, dedupe.existing.frontmatter, merged);
    printText(`Updated: ${dedupe.existing.path}`);
    return;
  }

  // Check for contradictions
  const searchPaths = [globalMemoryPath()];
  if (stack) searchPaths.push(stackMemoryPath(stack));
  searchPaths.push(projectMemoryPath(project));

  const contradictions = await detectContradictions(body, searchPaths);
  if (contradictions.length > 0) {
    printText("⚠ Potential contradictions detected:");
    for (const c of contradictions) {
      printText(`  ${c.description} — existing: ${c.memoryB.path}`);
    }
    printText(""); // Caller (hook or command) decides how to handle
  }

  // Extract wiki-links for frontmatter
  const linked = extractWikiLinks(body);

  // Create the memory
  const slug = slugify(body.split("\n")[0].replace(/^#+\s*/, "").slice(0, 60));
  const fileName = `${slug}.md`;
  const filePath = join(targetDir, fileName);

  const frontmatter: MemoryFrontmatter = {
    scope: scope === "stack" ? `stack/${stack}` : scope,
    type: memType,
    created: today(),
    last_validated: today(),
    linked: linked.length > 0 ? linked : undefined,
    confidence: scopeResult.confidence,
    keywords: options.keywords,
  };

  await writeMemory(filePath, frontmatter, "\n" + body + "\n");
  printText(`Created: ${filePath} (scope: ${scope}, confidence: ${scopeResult.confidence})`);

  // Regenerate index for the parent memory directory
  const memDir =
    scope === "global"
      ? globalMemoryPath()
      : scope === "stack"
        ? stackMemoryPath(stack!)
        : projectMemoryPath(project);
  await regenerateIndex(memDir);
}

async function memoryStage(
  body: string,
  context?: string
): Promise<void> {
  const stagingDir = join(YOCODE_HOME, ".staging");
  await mkdir(stagingDir, { recursive: true });

  const timestamp = Date.now();
  const slug = slugify(body.split("\n")[0].slice(0, 40));
  const filePath = join(stagingDir, `${timestamp}-${slug}.md`);

  const content = [
    "---",
    `staged: ${new Date().toISOString()}`,
    `status: pending`,
    context ? `context: "${context.replace(/"/g, '\\"')}"` : "",
    "---",
    "",
    body,
  ]
    .filter(Boolean)
    .join("\n");

  await writeFile(filePath, content, "utf-8");
  printText(`Staged: ${filePath}`);
}

async function memoryRegenIndex(dir: string): Promise<void> {
  await regenerateIndex(dir);
  printText(`Regenerated index: ${join(dir, "index.md")}`);
}

async function memoryValidateRefs(dir: string): Promise<void> {
  const memories = await loadAllMemories([dir]);
  let staleCount = 0;

  for (const mem of memories) {
    const links = extractWikiLinks(mem.body);
    // Check if referenced files/functions still exist
    const fileRefs = mem.body.match(/`([^`]+\.[a-z]{1,4})`/g) || [];
    for (const ref of fileRefs) {
      const path = ref.replace(/`/g, "");
      if (path.includes("/") && !existsSync(path)) {
        printText(`Stale ref: ${mem.path} references ${path} (not found)`);
        staleCount++;
      }
    }
  }

  printText(
    staleCount === 0
      ? "All references valid."
      : `Found ${staleCount} stale reference(s).`
  );
}

// ─── Intent Command ──────────────────────────────────────────────────────────

function intentClassify(message: string): void {
  const result = classifyIntent(message);
  printJson(result);
}

// ─── Axioms Command ──────────────────────────────────────────────────────────

async function axiomsLoad(): Promise<void> {
  const axioms = await loadAxioms();
  if (axioms) {
    printText(axioms);
  } else {
    printText("No axioms found.");
  }
}

// ─── Stack Detection ─────────────────────────────────────────────────────────

async function stackDetectCmd(projectPath?: string): Promise<void> {
  const project = projectPath || findProjectRoot();
  const stacks = await detectStack(project);
  printJson(stacks);
}

// ─── Connector Commands ──────────────────────────────────────────────────────

async function connectorsStatus(projectPath?: string): Promise<void> {
  const project = projectPath || findProjectRoot();
  const statuses = await getConnectorStatuses(project);

  if (statuses.length === 0) {
    printText("No connectors configured. Run /yocode:connect to set up.");
    return;
  }

  for (const s of statuses) {
    const icon = s.connected ? "✓" : "✗";
    printText(
      `${icon} ${s.name} (${s.environment}) — ${s.capabilities.join(", ")}`
    );
  }
}

async function connectorsDetect(projectPath?: string): Promise<void> {
  const project = projectPath || findProjectRoot();
  const detected = await detectConnectors(project);
  printJson(detected);
}

async function connectorsQuery(
  name: string,
  capability: string,
  projectPath?: string,
  env?: string
): Promise<void> {
  const project = projectPath || findProjectRoot();
  const config = await loadConnectorConfig(project);

  if (!config) {
    console.error("No connectors.json found. Run /yocode:connect first.");
    process.exit(1);
  }

  const connector = getConnector(name);
  if (!connector) {
    console.error(`Unknown connector: ${name}`);
    console.error(`Available: ${listAvailableConnectors().map((c) => c.name.toLowerCase()).join(", ")}`);
    process.exit(1);
  }

  const auth = config.connectors[name];
  if (!auth) {
    console.error(`Connector ${name} not configured in connectors.json`);
    process.exit(1);
  }

  // Output auth + connector info for the calling agent to make API calls
  printJson({
    connector: connector.name,
    capability,
    environment: env || config.environments[0],
    apiBase: connector.apiBase,
    auth, // The agent needs this to make the actual API call
  });
}

// ─── Dream Command ───────────────────────────────────────────────────────────

async function dreamRun(projectPath?: string): Promise<void> {
  const project = projectPath || findProjectRoot();

  printText("# Dream Cycle\n");

  // Phase 1: Orient
  printText("## Phase 1: Orient\n");
  const globalMems = await loadAllMemories([globalMemoryPath()]);
  const stacksDir = join(YOCODE_HOME, "memory", "stacks");
  let stackMems: Memory[] = [];
  if (existsSync(stacksDir)) {
    const stacks = await readdir(stacksDir);
    for (const s of stacks) {
      stackMems.push(
        ...(await loadAllMemories([join(stacksDir, s)]))
      );
    }
  }
  const projMems = await loadAllMemories([projectMemoryPath(project)]);

  printText(`Global: ${globalMems.length} memories`);
  printText(`Stacks: ${stackMems.length} memories`);
  printText(`Project: ${projMems.length} memories\n`);

  const allMems = [...globalMems, ...stackMems, ...projMems];

  // Phase 2: Gather Signal
  printText("## Phase 2: Gather Signal\n");
  const sessionsDir = join(YOCODE_HOME, ".sessions");
  let sessionCount = 0;
  if (existsSync(sessionsDir)) {
    const sessions = await readdir(sessionsDir);
    sessionCount = sessions.filter((f) => f.endsWith(".md")).length;
  }

  const toolLog = join(YOCODE_HOME, ".tool-log");
  let toolEntries = 0;
  if (existsSync(toolLog)) {
    const content = await readFile(toolLog, "utf-8");
    toolEntries = content.split("\n").filter(Boolean).length;
  }

  const stagingDir = join(YOCODE_HOME, ".staging");
  let stagedCount = 0;
  if (existsSync(stagingDir)) {
    const staged = await readdir(stagingDir);
    stagedCount = staged.filter((f) => f.endsWith(".md")).length;
  }

  printText(`Sessions since last dream: ${sessionCount}`);
  printText(`Tool log entries: ${toolEntries}`);
  printText(`Staged corrections: ${stagedCount}\n`);

  // Phase 3: Consolidate
  printText("## Phase 3: Consolidate\n");

  let mergedCount = 0;
  let staleCount = 0;
  let brokenLinks = 0;

  // Check for duplicate/overlapping memories
  for (let i = 0; i < allMems.length; i++) {
    for (let j = i + 1; j < allMems.length; j++) {
      const a = allMems[i];
      const b = allMems[j];
      // Simple word overlap check
      const wordsA = new Set(a.body.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
      const wordsB = new Set(b.body.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
      if (wordsA.size === 0 || wordsB.size === 0) continue;
      const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
      const similarity = overlap / Math.min(wordsA.size, wordsB.size);

      if (similarity > 0.8 && a.path !== b.path) {
        printText(`  Overlap: "${a.title}" ↔ "${b.title}" (${(similarity * 100).toFixed(0)}%)`);
        mergedCount++;
      }
    }
  }

  // Validate wiki-links
  for (const mem of allMems) {
    const links = extractWikiLinks(mem.body);
    for (const link of links) {
      // Check if any memory has this as its slug
      const hasTarget = allMems.some(
        (m) => basename(m.path, ".md") === slugify(link) || m.title.toLowerCase().includes(link.toLowerCase())
      );
      if (!hasTarget) {
        printText(`  Broken link: [[${link}]] in ${basename(mem.path)}`);
        brokenLinks++;
      }
    }
  }

  // Validate file references
  for (const mem of allMems) {
    const fileRefs = mem.body.match(/`([^`]+\.[a-z]{1,4})`/g) || [];
    for (const ref of fileRefs) {
      const path = ref.replace(/`/g, "");
      if (path.includes("/") && !existsSync(join(project, path)) && !existsSync(path)) {
        staleCount++;
      }
    }
  }

  printText(`Overlapping memories: ${mergedCount}`);
  printText(`Broken wiki-links: ${brokenLinks}`);
  printText(`Stale file references: ${staleCount}\n`);

  // Phase 4: Prune & Index
  printText("## Phase 4: Prune & Index\n");

  // Check memory age
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  let oldCount = 0;

  for (const mem of allMems) {
    if (mem.frontmatter.last_validated) {
      const validated = new Date(mem.frontmatter.last_validated).getTime();
      if (now - validated > ninetyDays) {
        oldCount++;
      }
    } else if (mem.frontmatter.created) {
      const created = new Date(mem.frontmatter.created).getTime();
      if (now - created > ninetyDays) {
        oldCount++;
      }
    }
  }

  printText(`Memories not validated in 90+ days: ${oldCount}`);

  // Regenerate all indexes
  await regenerateIndex(globalMemoryPath());
  if (existsSync(stacksDir)) {
    const stacks = await readdir(stacksDir);
    for (const s of stacks) {
      await regenerateIndex(join(stacksDir, s));
    }
  }
  if (existsSync(projectMemoryPath(project))) {
    await regenerateIndex(projectMemoryPath(project));
  }
  printText("Rebuilt all index.md files.");

  // Update dream state
  const dreamState = join(YOCODE_HOME, ".dream-state");
  await writeFile(dreamState, `${Math.floor(Date.now() / 1000)}\n0\n`, "utf-8");
  printText("Dream state reset.\n");

  // Summary
  printText("## Summary\n");
  printText(`Total memories: ${allMems.length}`);
  printText(`Overlaps found: ${mergedCount}`);
  printText(`Broken links: ${brokenLinks}`);
  printText(`Stale refs: ${staleCount}`);
  printText(`Aging (90d+): ${oldCount}`);
  printText(`Staged pending: ${stagedCount}`);
}

// ─── CLI Router ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function getRest(startIdx: number): string[] {
  return args.slice(startIdx).filter((a) => !a.startsWith("--"));
}

async function main(): Promise<void> {
  switch (command) {
    case "memory":
      switch (subcommand) {
        case "load-l0":
          await memoryLoadL0(getFlag("project"));
          break;
        case "load-l1":
          await memoryLoadL1(getRest(2), getFlag("project"));
          break;
        case "search":
          await memorySearch(args[2] || "", getFlag("project"));
          break;
        case "add":
          await memoryAdd(args.slice(2).filter((a) => !a.startsWith("--")).join(" "), {
            scope: getFlag("scope") as MemoryScope | undefined,
            type: getFlag("type") as "rule" | "decision" | undefined,
            stack: getFlag("stack"),
            keywords: getFlag("keywords")?.split(","),
            project: getFlag("project"),
          });
          break;
        case "stage":
          await memoryStage(
            args.slice(2).filter((a) => !a.startsWith("--")).join(" "),
            getFlag("context")
          );
          break;
        case "regen-index":
          await memoryRegenIndex(args[2] || globalMemoryPath());
          break;
        case "validate-refs":
          await memoryValidateRefs(args[2] || globalMemoryPath());
          break;
        default:
          console.error("Usage: yocode memory <load-l0|load-l1|search|add|stage|regen-index|validate-refs>");
          process.exit(1);
      }
      break;

    case "intent":
      if (!args[1]) {
        console.error("Usage: yocode intent <message>");
        process.exit(1);
      }
      intentClassify(args.slice(1).join(" "));
      break;

    case "preamble":
      printText(generatePreamble());
      break;

    case "axioms":
      await axiomsLoad();
      break;

    case "stack-detect":
      await stackDetectCmd(getFlag("project"));
      break;

    case "connectors":
      switch (subcommand) {
        case "status":
          await connectorsStatus(getFlag("project"));
          break;
        case "detect":
          await connectorsDetect(getFlag("project"));
          break;
        case "query":
          await connectorsQuery(
            args[2] || "",
            args[3] || "",
            getFlag("project"),
            getFlag("env")
          );
          break;
        default:
          console.error("Usage: yocode connectors <status|detect|query>");
          process.exit(1);
      }
      break;

    case "dream":
      await dreamRun(getFlag("project"));
      break;

    case "version":
      printText(`yocode v${VERSION}`);
      break;

    case undefined:
    case "help":
      printText(`yocode v${VERSION} — unified Claude Code workflow tool

Commands:
  memory load-l0              Load always-on L0 memories
  memory load-l1 <kw...>      Load L1 memories matching keywords
  memory search <query>       Search all memories (L2)
  memory add <body>           Add a memory (auto-infers scope)
  memory stage <body>         Stage a correction for review
  memory regen-index <dir>    Regenerate index.md
  memory validate-refs <dir>  Check for stale file references

  intent <message>            Classify intent (returns JSON)
  preamble                    Output system prompt preamble
  axioms                      Load all axioms

  stack-detect                Detect project tech stack
  connectors status           Show configured connectors
  connectors detect           Auto-detect connectors from project files
  connectors query <n> <cap>  Get connector auth for API calls

  dream                       Run memory consolidation cycle
  version                     Show version`);
      break;

    default:
      console.error(`Unknown command: ${command}. Run 'yocode help' for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
