/**
 * yocode Learning Pipeline
 *
 * The "correct once, apply forever" engine.
 *
 * Flow:
 *   Correction detected (by hook or explicit)
 *     → CAPTURE: Log with context
 *     → CLASSIFY: Infer scope (global / stack / project)
 *     → DEDUPLICATE: Check existing memories
 *     → STAGE: Queue for review (or auto-approve if low-risk)
 *     → ACTIVATE: Write to memory, regenerate index
 */

import { readFile, writeFile, readdir, mkdir, rm } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { existsSync } from "fs";
import {
  type Memory,
  type MemoryScope,
  type MemoryFrontmatter,
  inferScope,
  checkDuplicate,
  detectContradictions,
  writeMemory,
  regenerateIndex,
  extractWikiLinks,
  slugify,
  globalMemoryPath,
  stackMemoryPath,
  projectMemoryPath,
} from "./memory";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Correction {
  /** What the user said / what was wrong */
  what: string;
  /** Why it was wrong (if known) */
  why?: string;
  /** What the correct approach is */
  correct: string;
  /** Context: what was being worked on */
  context?: string;
  /** When this happened */
  timestamp: string;
  /** Project root where it happened */
  projectRoot: string;
}

export interface StagedRule {
  id: string;
  body: string;
  scope: MemoryScope;
  stack?: string;
  confidence: "high" | "medium" | "low";
  source: "correction" | "decision" | "pattern" | "manual";
  context?: string;
  autoApprovable: boolean;
  stagedAt: string;
  status: "pending" | "approved" | "rejected" | "archived";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const YOCODE_HOME = join(homedir(), ".yocode");
const STAGING_DIR = join(YOCODE_HOME, ".staging");
const CORRECTIONS_LOG = join(YOCODE_HOME, ".corrections-log");

// ─── Capture ─────────────────────────────────────────────────────────────────

/**
 * Capture a correction and run it through the learning pipeline.
 * Returns the staged rule (or null if it was a duplicate).
 */
export async function captureCorrection(
  correction: Correction
): Promise<StagedRule | null> {
  // Build the rule body from the correction
  const body = formatCorrectionAsRule(correction);

  // Classify scope
  const scopeResult = inferScope(body);

  // Check for duplicates
  const dedupe = await checkDuplicate(
    body,
    scopeResult.scope,
    (scopeResult as any).stack,
    correction.projectRoot
  );

  if (dedupe.action === "skip") {
    return null; // Already known
  }

  // Determine if auto-approvable
  const autoApprovable = isAutoApprovable(correction, scopeResult);

  // Stage the rule
  const staged = await stageRule({
    body,
    scope: scopeResult.scope,
    stack: (scopeResult as any).stack,
    confidence: scopeResult.confidence,
    source: "correction",
    context: correction.context,
    autoApprovable,
  });

  // Auto-approve if safe
  if (autoApprovable) {
    await approveRule(staged.id, correction.projectRoot);
  }

  return staged;
}

/**
 * Capture a decision (user chose X over Y).
 */
export async function captureDecision(
  decision: string,
  rationale: string,
  projectRoot: string
): Promise<StagedRule | null> {
  const body = `${decision}\n\n**Why:** ${rationale}`;
  const scopeResult = inferScope(body);

  const staged = await stageRule({
    body,
    scope: scopeResult.scope,
    stack: (scopeResult as any).stack,
    confidence: "high",
    source: "decision",
    context: `Decision made in ${projectRoot}`,
    autoApprovable: false, // Decisions always need review
  });

  return staged;
}

// ─── Format ──────────────────────────────────────────────────────────────────

function formatCorrectionAsRule(correction: Correction): string {
  const parts: string[] = [];

  parts.push(correction.correct);

  if (correction.why) {
    parts.push(`\n**Why:** ${correction.why}`);
  }

  parts.push(
    `\n**How to apply:** ${correction.what.startsWith("Don't") || correction.what.startsWith("Never") ? correction.what : `Avoid: ${correction.what}. Instead: ${correction.correct}`}`
  );

  return parts.join("\n");
}

// ─── Auto-Approve Logic ──────────────────────────────────────────────────────

function isAutoApprovable(
  correction: Correction,
  scopeResult: { scope: MemoryScope; confidence: string }
): boolean {
  // Auto-approve if:
  // 1. Simple correction (short body)
  // 2. Project-scoped (low blast radius)
  // 3. High confidence on scope classification

  const bodyLength = correction.correct.length;

  if (bodyLength < 200 && scopeResult.scope === "project" && scopeResult.confidence === "high") {
    return true;
  }

  // Never auto-approve:
  // - Global rules (affect all projects)
  // - Rules with low confidence scope
  // - Long/complex rules
  if (scopeResult.scope === "global") return false;
  if (scopeResult.confidence === "low") return false;
  if (bodyLength > 500) return false;

  return false;
}

// ─── Staging ─────────────────────────────────────────────────────────────────

async function stageRule(params: {
  body: string;
  scope: MemoryScope;
  stack?: string;
  confidence: "high" | "medium" | "low";
  source: "correction" | "decision" | "pattern" | "manual";
  context?: string;
  autoApprovable: boolean;
}): Promise<StagedRule> {
  await mkdir(STAGING_DIR, { recursive: true });

  const id = `${Date.now()}-${slugify(params.body.split("\n")[0].slice(0, 30))}`;
  const rule: StagedRule = {
    id,
    body: params.body,
    scope: params.scope,
    stack: params.stack,
    confidence: params.confidence,
    source: params.source,
    context: params.context,
    autoApprovable: params.autoApprovable,
    stagedAt: new Date().toISOString(),
    status: "pending",
  };

  const filePath = join(STAGING_DIR, `${id}.json`);
  await writeFile(filePath, JSON.stringify(rule, null, 2), "utf-8");

  return rule;
}

/** List all staged rules */
export async function listStaged(): Promise<StagedRule[]> {
  if (!existsSync(STAGING_DIR)) return [];

  const files = await readdir(STAGING_DIR);
  const rules: StagedRule[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const content = await readFile(join(STAGING_DIR, file), "utf-8");
      rules.push(JSON.parse(content));
    } catch {
      continue;
    }
  }

  return rules.filter((r) => r.status === "pending").sort(
    (a, b) => new Date(b.stagedAt).getTime() - new Date(a.stagedAt).getTime()
  );
}

/** Approve a staged rule — write to memory and activate */
export async function approveRule(
  ruleId: string,
  projectRoot?: string
): Promise<string | null> {
  const filePath = join(STAGING_DIR, `${ruleId}.json`);
  if (!existsSync(filePath)) return null;

  const content = await readFile(filePath, "utf-8");
  const rule: StagedRule = JSON.parse(content);

  // Determine target directory
  let targetDir: string;
  let memDir: string;

  switch (rule.scope) {
    case "global":
      targetDir = join(globalMemoryPath(), "rules");
      memDir = globalMemoryPath();
      break;
    case "stack":
      if (!rule.stack) return null;
      targetDir = join(stackMemoryPath(rule.stack), "rules");
      memDir = stackMemoryPath(rule.stack);
      break;
    case "project":
      const project = projectRoot || process.cwd();
      targetDir = join(projectMemoryPath(project), "rules");
      memDir = projectMemoryPath(project);
      break;
  }

  // Extract wiki-links and keywords
  const linked = extractWikiLinks(rule.body);
  const keywords = rule.body
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 10);

  // Write the memory file
  const today = new Date().toISOString().split("T")[0];
  const slug = slugify(rule.body.split("\n")[0].slice(0, 60));
  const memPath = join(targetDir, `${slug}.md`);

  const frontmatter: MemoryFrontmatter = {
    scope: rule.scope === "stack" ? `stack/${rule.stack}` : rule.scope,
    type: rule.source === "decision" ? "decision" : "rule",
    created: today,
    last_validated: today,
    linked: linked.length > 0 ? linked : undefined,
    confidence: rule.confidence,
    keywords,
  };

  await writeMemory(memPath, frontmatter, "\n" + rule.body + "\n");

  // Update staged rule status
  rule.status = "approved";
  await writeFile(filePath, JSON.stringify(rule, null, 2), "utf-8");

  // Regenerate index
  await regenerateIndex(memDir);

  return memPath;
}

/** Reject a staged rule */
export async function rejectRule(ruleId: string): Promise<void> {
  const filePath = join(STAGING_DIR, `${ruleId}.json`);
  if (!existsSync(filePath)) return;

  const content = await readFile(filePath, "utf-8");
  const rule: StagedRule = JSON.parse(content);
  rule.status = "rejected";
  await writeFile(filePath, JSON.stringify(rule, null, 2), "utf-8");
}

/** Clean up old staged rules (approved/rejected older than 7 days) */
export async function cleanStaging(): Promise<number> {
  if (!existsSync(STAGING_DIR)) return 0;

  const files = await readdir(STAGING_DIR);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const content = await readFile(join(STAGING_DIR, file), "utf-8");
      const rule: StagedRule = JSON.parse(content);

      if (
        rule.status !== "pending" &&
        new Date(rule.stagedAt).getTime() < sevenDaysAgo
      ) {
        await rm(join(STAGING_DIR, file));
        cleaned++;
      }
    } catch {
      continue;
    }
  }

  return cleaned;
}

// ─── Correction Log Analysis ─────────────────────────────────────────────────

export interface CorrectionSignal {
  timestamp: number;
  type: string;
  detail: string;
  project: string;
}

/** Parse the corrections log written by the observe hook */
export async function parseCorrectionSignals(): Promise<CorrectionSignal[]> {
  if (!existsSync(CORRECTIONS_LOG)) return [];

  const content = await readFile(CORRECTIONS_LOG, "utf-8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      return {
        timestamp: parseInt(parts[0] || "0"),
        type: parts[1] || "",
        detail: parts[2] || "",
        project: parts[3] || "",
      };
    });
}

/** Summarize correction patterns for the dream cycle */
export async function summarizeCorrectionPatterns(): Promise<string> {
  const signals = await parseCorrectionSignals();

  if (signals.length === 0) {
    return "No correction signals detected.";
  }

  const types: Record<string, number> = {};
  for (const s of signals) {
    types[s.detail] = (types[s.detail] || 0) + 1;
  }

  const lines: string[] = [`${signals.length} correction signals:`];
  for (const [type, count] of Object.entries(types).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${type}: ${count}`);
  }

  return lines.join("\n");
}
