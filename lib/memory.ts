/**
 * yocode Memory System
 *
 * Three-tier memory with L0/L1/L2 loading, wiki-links, scope inference,
 * deduplication, contradiction detection, and index maintenance.
 *
 * Architecture:
 *   ~/.yocode/memory/global/    — Universal lessons (axioms + rules)
 *   ~/.yocode/memory/stacks/X/  — Technology-specific lessons
 *   .yocode/memory/             — Project-specific lessons
 */

import { readdir, readFile, writeFile, mkdir, stat } from "fs/promises";
import { join, basename, dirname, relative } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MemoryScope = "global" | "stack" | "project";
export type MemoryType = "rule" | "axiom" | "decision" | "profile" | "seed";
export type Confidence = "high" | "medium" | "low";

export interface MemoryFrontmatter {
  scope: string; // e.g. "global", "stack/supabase", "project"
  type: MemoryType;
  created: string; // ISO date
  last_validated?: string;
  linked?: string[]; // wiki-link targets e.g. ["pgvector", "migrations"]
  confidence?: Confidence;
  keywords?: string[]; // for L1 JIT loading
  archived?: boolean;
  superseded_by?: string; // path to replacement memory
}

export interface Memory {
  path: string; // absolute file path
  frontmatter: MemoryFrontmatter;
  body: string; // content after frontmatter
  title: string; // first heading or filename
}

export interface MemoryMatch {
  memory: Memory;
  score: number; // 0-1 relevance score
  matchType: "keyword" | "wikilink" | "fulltext";
}

export interface DedupeResult {
  action: "create" | "update" | "merge" | "skip";
  existing?: Memory;
  similarity: number;
}

// ─── Paths ───────────────────────────────────────────────────────────────────

const YOCODE_HOME = join(homedir(), ".yocode");
const GLOBAL_MEMORY = join(YOCODE_HOME, "memory", "global");
const STACKS_MEMORY = join(YOCODE_HOME, "memory", "stacks");

export function globalMemoryPath(): string {
  return GLOBAL_MEMORY;
}

export function stackMemoryPath(stack: string): string {
  return join(STACKS_MEMORY, stack);
}

export function projectMemoryPath(projectRoot: string): string {
  return join(projectRoot, ".yocode", "memory");
}

// ─── Frontmatter Parser ─────────────────────────────────────────────────────

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, any> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: any = line.slice(colonIdx + 1).trim();

    // Parse arrays: [item1, item2]
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s: string) => s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, ""))
        .filter(Boolean);
    }
    // Parse booleans
    else if (value === "true") value = true;
    else if (value === "false") value = false;

    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2] };
}

export function serializeFrontmatter(
  frontmatter: Record<string, any>,
  body: string
): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => `${v}`).join(", ")}]`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  lines.push(body);
  return lines.join("\n");
}

// ─── Wiki-Link System ────────────────────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/** Extract all [[wiki-links]] from content */
export function extractWikiLinks(content: string): string[] {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(content)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

/** Find all memories that share wiki-links with the given content */
export async function findLinkedMemories(
  content: string,
  searchPaths: string[]
): Promise<Memory[]> {
  const links = extractWikiLinks(content);
  if (links.length === 0) return [];

  const allMemories = await loadAllMemories(searchPaths);
  return allMemories.filter((mem) => {
    const memLinks = extractWikiLinks(mem.body);
    return memLinks.some((link) => links.includes(link));
  });
}

// ─── Memory CRUD ─────────────────────────────────────────────────────────────

/** Read a single memory file */
export async function readMemory(filePath: string): Promise<Memory | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    // Extract title from first heading or filename
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : basename(filePath, ".md");

    return {
      path: filePath,
      frontmatter: frontmatter as MemoryFrontmatter,
      body,
      title,
    };
  } catch {
    return null;
  }
}

/** Load all memories from given directories */
export async function loadAllMemories(dirs: string[]): Promise<Memory[]> {
  const memories: Memory[] = [];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const files = await walkMarkdownFiles(dir);
    for (const file of files) {
      const mem = await readMemory(file);
      if (mem && !mem.frontmatter.archived) {
        memories.push(mem);
      }
    }
  }

  return memories;
}

/** Recursively find all .md files in a directory */
async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await walkMarkdownFiles(fullPath)));
      } else if (entry.name.endsWith(".md") && entry.name !== "index.md") {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or isn't readable
  }
  return results;
}

/** Write a memory file, creating directories as needed */
export async function writeMemory(
  filePath: string,
  frontmatter: MemoryFrontmatter,
  body: string
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const content = serializeFrontmatter(frontmatter, body);
  await writeFile(filePath, content, "utf-8");
}

/** Archive a memory (mark as archived, don't delete) */
export async function archiveMemory(
  memory: Memory,
  reason: string
): Promise<void> {
  memory.frontmatter.archived = true;
  const archiveNote = `\n\n> **Archived:** ${reason} (${new Date().toISOString().split("T")[0]})\n`;
  await writeMemory(memory.path, memory.frontmatter, memory.body + archiveNote);
}

// ─── L0 / L1 / L2 Loading ───────────────────────────────────────────────────

/** L0: Always-loaded index summaries. Returns content of index.md files */
export async function loadL0(projectRoot?: string): Promise<string> {
  const parts: string[] = [];

  // Global index
  const globalIndex = join(GLOBAL_MEMORY, "index.md");
  if (existsSync(globalIndex)) {
    parts.push(await readFile(globalIndex, "utf-8"));
  }

  // Project index
  if (projectRoot) {
    const projectIndex = join(projectMemoryPath(projectRoot), "index.md");
    if (existsSync(projectIndex)) {
      parts.push(await readFile(projectIndex, "utf-8"));
    }
  }

  return parts.join("\n\n---\n\n");
}

/** L1: JIT-loaded memories matching keywords or stack fingerprint */
export async function loadL1(
  keywords: string[],
  projectRoot?: string
): Promise<Memory[]> {
  const searchDirs = [
    join(GLOBAL_MEMORY, "rules"),
    join(GLOBAL_MEMORY, "axioms"),
  ];

  // Add matching stack directories
  if (existsSync(STACKS_MEMORY)) {
    const stacks = await readdir(STACKS_MEMORY);
    for (const stack of stacks) {
      // Load stack if any keyword matches the stack name
      if (keywords.some((kw) => stack.toLowerCase().includes(kw.toLowerCase()))) {
        searchDirs.push(join(STACKS_MEMORY, stack));
      }
    }
  }

  // Add project memory
  if (projectRoot) {
    searchDirs.push(join(projectMemoryPath(projectRoot), "rules"));
    searchDirs.push(join(projectMemoryPath(projectRoot), "decisions"));
  }

  const allMemories = await loadAllMemories(searchDirs);

  // Score and filter by keyword relevance
  return allMemories.filter((mem) => {
    const memKeywords = mem.frontmatter.keywords || [];
    const memText = `${mem.title} ${mem.body}`.toLowerCase();

    return keywords.some(
      (kw) =>
        memKeywords.includes(kw.toLowerCase()) ||
        memText.includes(kw.toLowerCase())
    );
  });
}

/** L2: Search-only retrieval for archived/old memories */
export async function searchL2(
  query: string,
  projectRoot?: string
): Promise<MemoryMatch[]> {
  const allDirs = [GLOBAL_MEMORY, STACKS_MEMORY];
  if (projectRoot) {
    allDirs.push(projectMemoryPath(projectRoot));
  }

  const allMemories = await loadAllMemories(allDirs);
  const queryTerms = query.toLowerCase().split(/\s+/);

  const matches: MemoryMatch[] = [];
  for (const mem of allMemories) {
    const text = `${mem.title} ${mem.body}`.toLowerCase();
    const matchCount = queryTerms.filter((term) => text.includes(term)).length;
    if (matchCount > 0) {
      matches.push({
        memory: mem,
        score: matchCount / queryTerms.length,
        matchType: "fulltext",
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

// ─── Scope Inference ─────────────────────────────────────────────────────────

/** Known technology/framework keywords for stack detection */
const STACK_KEYWORDS = new Set([
  // Databases
  "supabase", "postgres", "postgresql", "pgvector", "prisma", "drizzle",
  "mongodb", "redis", "sqlite",
  // Frameworks
  "react", "next", "nextjs", "vue", "svelte", "angular", "remix", "astro",
  "hono", "express", "fastify", "django", "flask", "rails",
  // Runtime/Build
  "node", "bun", "deno", "vite", "webpack", "turbo", "turborepo",
  // Infrastructure
  "railway", "vercel", "netlify", "fly", "aws", "gcp", "azure", "docker",
  "kubernetes",
  // APIs/Services
  "stripe", "clerk", "auth0", "sentry", "posthog", "langfuse", "openai",
  "anthropic",
  // Languages
  "typescript", "javascript", "python", "rust", "go",
  // Queues/Workers
  "bullmq", "bull", "celery", "sidekiq",
  // RPC/API
  "trpc", "graphql", "grpc", "rest",
]);

/** Infer the scope of a correction/rule from its content */
export function inferScope(content: string): {
  scope: MemoryScope;
  stack?: string;
  confidence: Confidence;
} {
  const lower = content.toLowerCase();
  const words = lower.split(/\s+/);

  // Check for stack-specific keywords
  const matchedStacks = words.filter((w) =>
    STACK_KEYWORDS.has(w.replace(/[^a-z0-9]/g, ""))
  );

  if (matchedStacks.length > 0) {
    // Most specific stack keyword wins
    return {
      scope: "stack",
      stack: matchedStacks[0].replace(/[^a-z0-9]/g, ""),
      confidence: matchedStacks.length > 1 ? "high" : "medium",
    };
  }

  // Project-specific signals: domain objects, business logic references
  const projectSignals = [
    /\b(entity|entities|model|schema|table|column)\b.*\b(specific|our|this project)\b/i,
    /\b(pipeline|workflow|job|queue)\b.*\b(our|this|the)\b/i,
  ];

  if (projectSignals.some((re) => re.test(content))) {
    return { scope: "project", confidence: "medium" };
  }

  // Default: global (general coding practice)
  return { scope: "global", confidence: "low" };
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/** Simple word-overlap similarity (0-1) */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return intersection / union;
}

/** Check if a new memory duplicates an existing one */
export async function checkDuplicate(
  newBody: string,
  scope: MemoryScope,
  stack?: string,
  projectRoot?: string
): Promise<DedupeResult> {
  const searchDirs: string[] = [];

  switch (scope) {
    case "global":
      searchDirs.push(join(GLOBAL_MEMORY, "rules"));
      break;
    case "stack":
      if (stack) searchDirs.push(stackMemoryPath(stack));
      break;
    case "project":
      if (projectRoot)
        searchDirs.push(join(projectMemoryPath(projectRoot), "rules"));
      break;
  }

  const existing = await loadAllMemories(searchDirs);
  let bestMatch: Memory | undefined;
  let bestSimilarity = 0;

  for (const mem of existing) {
    const sim = textSimilarity(newBody, mem.body);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = mem;
    }
  }

  if (bestSimilarity > 0.9) {
    return { action: "skip", existing: bestMatch, similarity: bestSimilarity };
  } else if (bestSimilarity > 0.6) {
    return { action: "merge", existing: bestMatch, similarity: bestSimilarity };
  } else if (bestSimilarity > 0.3) {
    return { action: "update", existing: bestMatch, similarity: bestSimilarity };
  }

  return { action: "create", similarity: bestSimilarity };
}

// ─── Contradiction Detection ─────────────────────────────────────────────────

export interface Contradiction {
  memoryA: Memory;
  memoryB: Memory;
  sharedLinks: string[];
  description: string;
}

/** Detect potential contradictions between a new memory and existing ones */
export async function detectContradictions(
  newContent: string,
  searchPaths: string[]
): Promise<Contradiction[]> {
  const newLinks = extractWikiLinks(newContent);
  if (newLinks.length === 0) return [];

  const allMemories = await loadAllMemories(searchPaths);
  const contradictions: Contradiction[] = [];

  for (const mem of allMemories) {
    const memLinks = extractWikiLinks(mem.body);
    const shared = newLinks.filter((link) => memLinks.includes(link));

    if (shared.length > 0) {
      // Same links + same type = potential contradiction
      // The orchestrator/user decides if it's actually contradictory
      contradictions.push({
        memoryA: {
          path: "new",
          frontmatter: {} as MemoryFrontmatter,
          body: newContent,
          title: "New memory",
        },
        memoryB: mem,
        sharedLinks: shared,
        description: `Both reference ${shared.map((s) => `[[${s}]]`).join(", ")}`,
      });
    }
  }

  return contradictions;
}

// ─── Index Maintenance ───────────────────────────────────────────────────────

/** Regenerate an index.md file from all memories in a directory */
export async function regenerateIndex(memoryDir: string): Promise<void> {
  const memories = await loadAllMemories([memoryDir]);

  const rules = memories.filter((m) => m.frontmatter.type === "rule");
  const axioms = memories.filter((m) => m.frontmatter.type === "axiom");
  const decisions = memories.filter(
    (m) => m.frontmatter.type === "decision"
  );

  // Determine scope label
  const rel = relative(join(YOCODE_HOME, "memory"), memoryDir);
  const scopeLabel = rel.startsWith("global")
    ? "Global"
    : rel.startsWith("stacks")
      ? `Stack: ${basename(memoryDir)}`
      : "Project";

  const lines: string[] = [`# ${scopeLabel} Memory Index (auto-generated)\n`];

  if (axioms.length > 0) {
    lines.push(`## Active Axioms (${axioms.length})`);
    for (const a of axioms) {
      lines.push(`- [[${basename(a.path, ".md")}]] — ${a.title}`);
    }
    lines.push("");
  }

  if (rules.length > 0) {
    lines.push(`## Active Rules (${rules.length})`);
    for (const r of rules) {
      lines.push(`- ${r.title}`);
    }
    lines.push("");
  }

  if (decisions.length > 0) {
    lines.push(`## Recent Decisions (${decisions.length})`);
    for (const d of decisions.slice(-5)) {
      // Last 5
      lines.push(`- ${d.frontmatter.created}: ${d.title}`);
    }
    lines.push("");
  }

  // Keep it under 50 lines
  const content = lines.join("\n").split("\n").slice(0, 50).join("\n");
  await writeFile(join(memoryDir, "index.md"), content, "utf-8");
}

// ─── Axiom Loader ────────────────────────────────────────────────────────────

/** Load all axioms and format for injection into agent prompts */
export async function loadAxioms(): Promise<string> {
  const axiomsDir = join(YOCODE_HOME, "memory", "global", "axioms");
  if (!existsSync(axiomsDir)) return "";

  const memories = await loadAllMemories([axiomsDir]);
  return memories.map((m) => m.body.trim()).join("\n\n---\n\n");
}

// ─── Stack Fingerprinting ────────────────────────────────────────────────────

/** Detect tech stack from a project directory by reading package.json, etc. */
export async function detectStack(
  projectRoot: string
): Promise<string[]> {
  const stacks: string[] = [];

  // Check package.json
  const pkgPath = join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      for (const dep of Object.keys(allDeps)) {
        const normalized = dep
          .replace(/^@/, "")
          .replace(/\/.*/, "")
          .toLowerCase();
        if (STACK_KEYWORDS.has(normalized)) {
          stacks.push(normalized);
        }
        // Also check common package name patterns
        const knownMap: Record<string, string> = {
          "@supabase/supabase-js": "supabase",
          "@trpc/server": "trpc",
          "@trpc/client": "trpc",
          "next": "nextjs",
          "hono": "hono",
          "@hono/trpc-server": "hono",
          "bullmq": "bullmq",
          "@prisma/client": "prisma",
          "drizzle-orm": "drizzle",
        };
        if (knownMap[dep]) {
          stacks.push(knownMap[dep]);
        }
      }
    } catch {
      // Invalid package.json
    }
  }

  // Check for Python
  if (
    existsSync(join(projectRoot, "requirements.txt")) ||
    existsSync(join(projectRoot, "pyproject.toml"))
  ) {
    stacks.push("python");
  }

  // Check for Rust
  if (existsSync(join(projectRoot, "Cargo.toml"))) {
    stacks.push("rust");
  }

  // Check for Go
  if (existsSync(join(projectRoot, "go.mod"))) {
    stacks.push("go");
  }

  // Check for Docker
  if (
    existsSync(join(projectRoot, "Dockerfile")) ||
    existsSync(join(projectRoot, "docker-compose.yml"))
  ) {
    stacks.push("docker");
  }

  return [...new Set(stacks)];
}

// ─── Memory Slugify ──────────────────────────────────────────────────────────

/** Generate a filesystem-safe slug from a title */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
