/**
 * yocode Wave Executor
 *
 * Orchestrates parallel task execution across git worktrees.
 * Each task gets a fresh agent in an isolated worktree.
 * After each wave, branches merge back sequentially with tests.
 *
 * Architecture:
 *   Plan → dependency graph → waves → parallel worktrees → merge → UNIFY
 */

import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import { type Task, type Wave, planWaves, detectFileConflicts } from "./agents";
import { type TaskResult, type WaveResult, type ExecutionResult } from "./unify";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorktreeConfig {
  taskId: string;
  branchName: string;
  worktreePath: string;
  projectRoot: string;
}

export interface MergeResult {
  taskId: string;
  branchName: string;
  commit: string;
  success: boolean;
  testsPassed: boolean;
  conflictFiles?: string[];
}

// ─── Worktree Management ─────────────────────────────────────────────────────

/** Create a git worktree for a task */
export async function createWorktree(
  projectRoot: string,
  taskId: string
): Promise<WorktreeConfig> {
  const branchName = `yocode/${taskId}`;
  const worktreePath = join(projectRoot, ".yocode", "worktrees", taskId);

  // Ensure parent directory exists
  await mkdir(join(projectRoot, ".yocode", "worktrees"), { recursive: true });

  return {
    taskId,
    branchName,
    worktreePath,
    projectRoot,
  };
}

/** Generate the git commands to set up a worktree */
export function worktreeSetupCommands(config: WorktreeConfig): string[] {
  return [
    `git worktree add -b ${config.branchName} ${config.worktreePath}`,
  ];
}

/** Generate the git commands to clean up a worktree */
export function worktreeCleanupCommands(config: WorktreeConfig): string[] {
  return [
    `git worktree remove ${config.worktreePath} --force`,
    `git branch -d ${config.branchName}`,
  ];
}

/** Generate the git commands to merge a worktree branch back */
export function worktreeMergeCommands(config: WorktreeConfig): string[] {
  return [
    `git merge ${config.branchName} --no-ff -m "merge: ${config.taskId}"`,
  ];
}

// ─── Wave Execution Plan ─────────────────────────────────────────────────────

export interface WaveExecutionPlan {
  waves: Wave[];
  totalTasks: number;
  parallelSlots: number; // max concurrent agents
  estimatedMerges: number;
  conflicts: { taskA: string; taskB: string; files: string[] }[];
  warnings: string[];
}

/**
 * Analyze tasks and produce a wave execution plan.
 * This doesn't execute — it shows what WOULD happen for user confirmation.
 */
export function analyzeExecution(
  tasks: Task[],
  maxParallel: number = 5
): WaveExecutionPlan {
  const waves = planWaves(tasks);
  const warnings: string[] = [];
  const allConflicts: { taskA: string; taskB: string; files: string[] }[] = [];

  for (const wave of waves) {
    // Check for file conflicts within each wave
    const conflicts = detectFileConflicts(wave);
    allConflicts.push(...conflicts);

    if (conflicts.length > 0) {
      warnings.push(
        `Wave ${wave.number}: ${conflicts.length} potential file conflict(s). ` +
          `Consider making these tasks sequential.`
      );
    }

    // Check if wave exceeds parallel limit
    if (wave.tasks.length > maxParallel) {
      warnings.push(
        `Wave ${wave.number}: ${wave.tasks.length} tasks exceeds ` +
          `parallel limit of ${maxParallel}. Will batch.`
      );
    }
  }

  return {
    waves,
    totalTasks: tasks.length,
    parallelSlots: Math.min(
      maxParallel,
      Math.max(...waves.map((w) => w.tasks.length))
    ),
    estimatedMerges: tasks.length,
    conflicts: allConflicts,
    warnings,
  };
}

/**
 * Format a wave execution plan for user confirmation.
 */
export function formatExecutionPlan(plan: WaveExecutionPlan): string {
  const lines: string[] = [];

  lines.push(`## Execution Plan`);
  lines.push("");
  lines.push(`**${plan.totalTasks} tasks** across **${plan.waves.length} waves**`);
  lines.push(
    `Max parallel: ${plan.parallelSlots} | Merges: ${plan.estimatedMerges}`
  );
  lines.push("");

  for (const wave of plan.waves) {
    lines.push(`### Wave ${wave.number} (${wave.tasks.length} tasks, parallel)`);
    for (const task of wave.tasks) {
      const deps =
        task.dependsOn.length > 0
          ? ` ← depends on: ${task.dependsOn.join(", ")}`
          : "";
      lines.push(`- **${task.id}**: ${task.name}${deps}`);
      if (task.files.length > 0) {
        lines.push(`  Files: ${task.files.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (plan.warnings.length > 0) {
    lines.push("### Warnings");
    for (const w of plan.warnings) {
      lines.push(`- ⚠️ ${w}`);
    }
    lines.push("");
  }

  if (plan.conflicts.length > 0) {
    lines.push("### File Conflicts");
    for (const c of plan.conflicts) {
      lines.push(
        `- ${c.taskA} ↔ ${c.taskB}: ${c.files.join(", ")}`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Execution State Tracking ────────────────────────────────────────────────

export interface ExecutionState {
  planPath: string;
  startTime: string;
  currentWave: number;
  completedWaves: WaveResult[];
  status: "pending" | "executing" | "merging" | "complete" | "failed";
}

/** Save execution state for recovery after context reset */
export async function saveExecutionState(
  projectRoot: string,
  state: ExecutionState
): Promise<void> {
  const dir = join(projectRoot, ".yocode");
  await mkdir(dir, { recursive: true });
  const path = join(dir, "EXECUTION_STATE.json");
  await writeFile(path, JSON.stringify(state, null, 2), "utf-8");
}

/** Load execution state for recovery */
export async function loadExecutionState(
  projectRoot: string
): Promise<ExecutionState | null> {
  const path = join(projectRoot, ".yocode", "EXECUTION_STATE.json");
  if (!existsSync(path)) return null;
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Clean up execution state after UNIFY */
export async function clearExecutionState(
  projectRoot: string
): Promise<void> {
  const path = join(projectRoot, ".yocode", "EXECUTION_STATE.json");
  if (existsSync(path)) {
    await rm(path);
  }
}
