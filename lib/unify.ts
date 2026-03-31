/**
 * yocode UNIFY Phase
 *
 * Mandatory reconciliation after execution. Compares planned vs built,
 * records decisions, logs deferred issues, captures learnings.
 *
 * Core principle from Paul: "Execution without reconciliation creates
 * drift, and drift compounds across sessions." NEVER SKIPPED.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskStatus = "DONE" | "DONE_WITH_CONCERNS" | "NEEDS_CONTEXT" | "BLOCKED";

export interface TaskResult {
  id: string;
  name: string;
  status: TaskStatus;
  commit?: string;
  filesChanged: string[];
  concerns?: string;
  blockedBy?: string;
  contextNeeded?: string;
  deviations?: string[];
}

export interface WaveResult {
  wave: number;
  tasks: TaskResult[];
  mergeOrder: string[]; // commit hashes in merge order
  testsPassed: boolean;
}

export interface ExecutionResult {
  planPath: string;
  startTime: string;
  endTime: string;
  waves: WaveResult[];
  overallStatus: "complete" | "partial" | "blocked";
}

export interface UnifyReport {
  planned: {
    tasks: number;
    waves: number;
    acceptanceCriteria: string[];
  };
  built: {
    tasksComplete: number;
    tasksWithConcerns: number;
    tasksBlocked: number;
    totalCommits: number;
    filesChanged: string[];
  };
  drift: DriftItem[];
  decisions: Decision[];
  deferred: DeferredItem[];
  lessons: Lesson[];
}

export interface DriftItem {
  type: "scope_addition" | "scope_reduction" | "approach_change";
  description: string;
  reason: string;
}

export interface Decision {
  id: string;
  description: string;
  rationale: string;
  alternatives?: string[];
}

export interface DeferredItem {
  description: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface Lesson {
  description: string;
  scope: "global" | "stack" | "project";
  keywords: string[];
}

// ─── UNIFY Generator ─────────────────────────────────────────────────────────

/**
 * Generate SUMMARY.md from execution results.
 * This is the reconciliation artifact — planned vs built.
 */
export function generateSummary(
  result: ExecutionResult,
  report: UnifyReport
): string {
  const lines: string[] = [];

  lines.push("---");
  lines.push(`plan: ${result.planPath}`);
  lines.push(`started: ${result.startTime}`);
  lines.push(`completed: ${result.endTime}`);
  lines.push(`status: ${result.overallStatus}`);
  lines.push("---");
  lines.push("");
  lines.push("# Execution Summary");
  lines.push("");

  // ─── Planned vs Built ─────────────────────────────────
  lines.push("## Planned vs Built");
  lines.push("");
  lines.push(`| Metric | Planned | Built |`);
  lines.push(`|--------|---------|-------|`);
  lines.push(
    `| Tasks | ${report.planned.tasks} | ${report.built.tasksComplete + report.built.tasksWithConcerns} complete |`
  );
  lines.push(`| Waves | ${report.planned.waves} | ${result.waves.length} |`);
  lines.push(`| Commits | — | ${report.built.totalCommits} |`);
  lines.push(
    `| Files Changed | — | ${report.built.filesChanged.length} |`
  );
  lines.push("");

  // ─── Acceptance Criteria ──────────────────────────────
  if (report.planned.acceptanceCriteria.length > 0) {
    lines.push("## Acceptance Criteria");
    lines.push("");
    for (const ac of report.planned.acceptanceCriteria) {
      lines.push(`- [ ] ${ac}`);
    }
    lines.push("");
    lines.push(
      "_Criteria should be verified by the verifier agent, not self-reported._"
    );
    lines.push("");
  }

  // ─── Task Results ─────────────────────────────────────
  lines.push("## Task Results");
  lines.push("");
  for (const wave of result.waves) {
    lines.push(`### Wave ${wave.wave}`);
    lines.push("");
    for (const task of wave.tasks) {
      const icon =
        task.status === "DONE"
          ? "✅"
          : task.status === "DONE_WITH_CONCERNS"
            ? "⚠️"
            : task.status === "BLOCKED"
              ? "🚫"
              : "❓";
      lines.push(`${icon} **${task.name}** — ${task.status}`);
      if (task.commit) lines.push(`  Commit: \`${task.commit}\``);
      if (task.concerns) lines.push(`  Concerns: ${task.concerns}`);
      if (task.blockedBy) lines.push(`  Blocked by: ${task.blockedBy}`);
      if (task.deviations && task.deviations.length > 0) {
        for (const d of task.deviations) {
          lines.push(`  Deviation: ${d}`);
        }
      }
    }
    lines.push("");
  }

  // ─── Drift ────────────────────────────────────────────
  if (report.drift.length > 0) {
    lines.push("## Drift from Plan");
    lines.push("");
    for (const d of report.drift) {
      lines.push(`- **${d.type}**: ${d.description}`);
      lines.push(`  Reason: ${d.reason}`);
    }
    lines.push("");
  }

  // ─── Decisions ────────────────────────────────────────
  if (report.decisions.length > 0) {
    lines.push("## Decisions Made");
    lines.push("");
    for (const d of report.decisions) {
      lines.push(`### ${d.id}: ${d.description}`);
      lines.push(`Rationale: ${d.rationale}`);
      if (d.alternatives) {
        lines.push(`Alternatives considered: ${d.alternatives.join(", ")}`);
      }
      lines.push("");
    }
  }

  // ─── Deferred ─────────────────────────────────────────
  if (report.deferred.length > 0) {
    lines.push("## Deferred Items");
    lines.push("");
    for (const d of report.deferred) {
      lines.push(`- [${d.priority}] ${d.description} — ${d.reason}`);
    }
    lines.push("");
  }

  // ─── Lessons ──────────────────────────────────────────
  if (report.lessons.length > 0) {
    lines.push("## Lessons Learned");
    lines.push("");
    for (const l of report.lessons) {
      lines.push(`- [${l.scope}] ${l.description}`);
      if (l.keywords.length > 0) {
        lines.push(`  Keywords: ${l.keywords.join(", ")}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Write SUMMARY.md to the appropriate phase directory.
 */
export async function writeSummary(
  projectRoot: string,
  phaseName: string,
  content: string
): Promise<string> {
  const dir = join(projectRoot, ".yocode", "phases", phaseName);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "SUMMARY.md");
  await writeFile(path, content, "utf-8");
  return path;
}

// ─── STATE.md Management ─────────────────────────────────────────────────────

/**
 * Update the project state file after UNIFY.
 */
export async function updateState(
  projectRoot: string,
  phaseName: string,
  status: "complete" | "partial" | "blocked"
): Promise<void> {
  const statePath = join(projectRoot, ".yocode", "STATE.md");
  const timestamp = new Date().toISOString().split("T")[0];

  let content: string;
  try {
    content = await readFile(statePath, "utf-8");
  } catch {
    content = `# Project State\n\n## Completed Phases\n\n## Current Phase\n\n## Decisions\n`;
  }

  // Add phase completion entry
  const entry = `\n- ${timestamp}: ${phaseName} — ${status}`;
  content = content.replace(
    "## Completed Phases",
    `## Completed Phases${entry}`
  );

  await writeFile(statePath, content, "utf-8");
}
