/**
 * yocode Wave Execution Orchestrator
 *
 * This is the engine that makes /yocode:execute actually work.
 * It loads plans, creates worktrees, builds agent prompts with
 * injected axioms and memory, and produces the structured output
 * that Claude Code's Agent tool needs to spawn parallel agents.
 *
 * Architecture:
 *   Plan → parse tasks → dependency graph → waves → for each wave:
 *     → create worktrees → build agent prompts → output spawn configs
 *     → (Claude spawns agents) → collect results → merge → test
 *   → UNIFY
 *
 * This module does NOT call the Agent tool directly — it can't.
 * It produces the structured data that the /yocode:execute command
 * feeds to Claude, who then uses the Agent tool. The orchestrator
 * is the brain; Claude is the hands.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { existsSync } from "fs";
import { parseFrontmatter, loadAxioms, loadL0, loadL1 } from "./memory";
import {
  type Task,
  type Wave,
  type AgentRole,
  planWaves,
  detectFileConflicts,
  loadAgent,
  buildAgentPrompt,
  getModelForRole,
} from "./agents";
import {
  type TaskResult,
  type WaveResult,
  type ExecutionResult,
  type UnifyReport,
  generateSummary,
  writeSummary,
  updateState,
} from "./unify";
import {
  type WorktreeConfig,
  createWorktree,
  worktreeSetupCommands,
  worktreeCleanupCommands,
  worktreeMergeCommands,
  analyzeExecution,
  formatExecutionPlan,
  saveExecutionState,
  loadExecutionState,
  clearExecutionState,
  type ExecutionState,
} from "./waves";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanFile {
  path: string;
  frontmatter: {
    phase: string;
    plan: string;
    type: string;
    wave: number;
    depends_on: string[];
    files_modified: string[];
    autonomous: boolean;
  };
  objective: string;
  acceptanceCriteria: string[];
  tasks: PlanTask[];
  boundaries: string;
}

export interface PlanTask {
  id: string;
  name: string;
  description: string;
  files: string[];
  acceptance: string[];
  wave?: number;
}

export interface AgentSpawnConfig {
  taskId: string;
  agentRole: AgentRole;
  model: string;
  prompt: string;
  worktreePath: string;
  branchName: string;
  isolation: "worktree";
}

export interface WaveSpawnPlan {
  waveNumber: number;
  agents: AgentSpawnConfig[];
  setupCommands: string[];
  mergeCommands: string[];
  cleanupCommands: string[];
}

// ─── Plan Parser ─────────────────────────────────────────────────────────────

/** Parse a PLAN.md file into structured data */
export async function parsePlan(planPath: string): Promise<PlanFile> {
  const content = await readFile(planPath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);

  // Extract objective
  const objectiveMatch = body.match(/<objective>([\s\S]*?)<\/objective>/);
  const objective = objectiveMatch ? objectiveMatch[1].trim() : "";

  // Extract acceptance criteria
  const acMatch = body.match(/<acceptance_criteria>([\s\S]*?)<\/acceptance_criteria>/);
  const acText = acMatch ? acMatch[1] : "";
  const acceptanceCriteria = acText
    .split(/##\s+AC-\d+/)
    .filter(Boolean)
    .map((ac) => ac.trim());

  // Extract tasks
  const tasksMatch = body.match(/<tasks>([\s\S]*?)<\/tasks>/);
  const tasksText = tasksMatch ? tasksMatch[1] : "";
  const tasks = parseTasksSection(tasksText);

  // Extract boundaries
  const boundMatch = body.match(/<boundaries>([\s\S]*?)<\/boundaries>/);
  const boundaries = boundMatch ? boundMatch[1].trim() : "";

  return {
    path: planPath,
    frontmatter: {
      phase: frontmatter.phase || "",
      plan: frontmatter.plan || "01",
      type: frontmatter.type || "execute",
      wave: parseInt(frontmatter.wave) || 1,
      depends_on: frontmatter.depends_on || [],
      files_modified: frontmatter.files_modified || [],
      autonomous: frontmatter.autonomous !== false,
    },
    objective,
    acceptanceCriteria,
    tasks,
    boundaries,
  };
}

function parseTasksSection(text: string): PlanTask[] {
  const tasks: PlanTask[] = [];
  // Split on ### Task N: patterns
  const taskBlocks = text.split(/###\s+Task\s+\d+:\s*/).filter(Boolean);

  for (let i = 0; i < taskBlocks.length; i++) {
    const block = taskBlocks[i];
    const nameMatch = block.match(/^(.+?)$/m);
    const name = nameMatch ? nameMatch[1].trim() : `Task ${i + 1}`;

    // Extract files
    const filesMatch = block.match(/\*\*Files?:\*\*\s*(.+)/);
    const files = filesMatch
      ? filesMatch[1].split(",").map((f) => f.trim().replace(/`/g, ""))
      : [];

    // Extract action/description
    const actionMatch = block.match(/\*\*Action:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
    const description = actionMatch ? actionMatch[1].trim() : block.trim();

    // Extract acceptance criteria references
    const acMatch = block.match(/\*\*Acceptance:\*\*\s*(.+)/);
    const acceptance = acMatch
      ? acMatch[1].split(",").map((a) => a.trim())
      : [];

    // Extract wave assignment
    const waveMatch = block.match(/\*\*Wave:\*\*\s*(\d+)/);
    const wave = waveMatch ? parseInt(waveMatch[1]) : undefined;

    tasks.push({
      id: `task-${i + 1}`,
      name,
      description,
      files,
      acceptance,
      wave,
    });
  }

  return tasks;
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Build the complete execution plan from a PLAN.md file.
 * Returns structured data for each wave with agent spawn configs.
 */
export async function buildExecutionPlan(
  planPath: string,
  projectRoot: string
): Promise<{
  plan: PlanFile;
  waves: WaveSpawnPlan[];
  summary: string;
}> {
  const plan = await parsePlan(planPath);

  // Convert PlanTasks to Wave-compatible Tasks
  const waveTasks: Task[] = plan.tasks.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    files: t.files,
    dependsOn: [], // TODO: parse from plan if specified
    wave: t.wave,
    agent: "executor" as AgentRole,
  }));

  // Plan waves using dependency analysis
  const waves = planWaves(waveTasks);

  // Load context for agent prompts
  const axioms = await loadAxioms();
  const l0Memory = await loadL0(projectRoot);

  // Build spawn configs for each wave
  const waveSpawnPlans: WaveSpawnPlan[] = [];

  for (const wave of waves) {
    const agents: AgentSpawnConfig[] = [];
    const setupCmds: string[] = [];
    const mergeCmds: string[] = [];
    const cleanupCmds: string[] = [];

    // Check for file conflicts
    const conflicts = detectFileConflicts(wave);
    if (conflicts.length > 0) {
      // TODO: handle by making conflicting tasks sequential
    }

    for (const task of wave.tasks) {
      // Create worktree config
      const wt = await createWorktree(projectRoot, task.id);
      setupCmds.push(...worktreeSetupCommands(wt));
      mergeCmds.push(...worktreeMergeCommands(wt));
      cleanupCmds.push(...worktreeCleanupCommands(wt));

      // Build the prompt the executor agent will receive
      const model = getModelForRole("executor");
      const taskPrompt = buildTaskPrompt(task, plan, axioms, l0Memory, projectRoot);

      agents.push({
        taskId: task.id,
        agentRole: "executor",
        model,
        prompt: taskPrompt,
        worktreePath: wt.worktreePath,
        branchName: wt.branchName,
        isolation: "worktree",
      });
    }

    waveSpawnPlans.push({
      waveNumber: wave.number,
      agents,
      setupCommands: setupCmds,
      mergeCommands: mergeCmds,
      cleanupCommands: cleanupCmds,
    });
  }

  // Format summary for user confirmation
  const execPlan = analyzeExecution(waveTasks);
  const summary = formatExecutionPlan(execPlan);

  return { plan, waves: waveSpawnPlans, summary };
}

/**
 * Build the full prompt for an executor agent working on a task.
 */
function buildTaskPrompt(
  task: Task,
  plan: PlanFile,
  axioms: string,
  memory: string,
  projectRoot: string
): string {
  return `# Task: ${task.name}

## Axioms (non-negotiable)
${axioms || "No axioms loaded."}

## Project Memory
${memory || "No project memory."}

## Context
You are executing a task from a plan. Work in the worktree provided.
Project root: ${projectRoot}

## Plan Objective
${plan.objective}

## Your Task
${task.description}

## Files to Modify
${task.files.length > 0 ? task.files.join("\n") : "Determined by the task description."}

## Boundaries
${plan.boundaries || "No explicit boundaries."}

## Requirements
1. Read every file you'll touch AND their callers before modifying
2. Implement the task completely
3. Run relevant tests
4. Commit atomically with a clear message
5. Report your status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

## Output Format
\`\`\`
STATUS: [DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED]
COMMIT: [commit hash]
FILES_CHANGED: [list]
CONCERNS: [if any]
BLOCKED_BY: [if blocked]
\`\`\``;
}

/**
 * Generate the commands that /yocode:execute should give Claude
 * to actually run a wave. This bridges the gap between the orchestrator
 * (which plans) and Claude (which executes via Agent tool).
 */
export function generateWaveInstructions(wavePlan: WaveSpawnPlan): string {
  const lines: string[] = [];

  lines.push(`## Wave ${wavePlan.waveNumber}: ${wavePlan.agents.length} parallel tasks\n`);

  // Setup
  lines.push("### Setup worktrees\n");
  lines.push("Run these git commands to create isolated worktrees:\n");
  lines.push("```bash");
  for (const cmd of wavePlan.setupCommands) {
    lines.push(cmd);
  }
  lines.push("```\n");

  // Agent spawning
  lines.push("### Spawn executor agents\n");
  lines.push(
    "Launch these agents in parallel using the Agent tool:\n"
  );

  for (const agent of wavePlan.agents) {
    lines.push(`**${agent.taskId}** (${agent.model}, worktree isolation):`);
    lines.push("```");
    lines.push(`Agent tool parameters:`);
    lines.push(`  description: "Execute ${agent.taskId}"`);
    lines.push(`  subagent_type: "general-purpose"`);
    lines.push(`  model: "${agent.model}"`);
    lines.push(`  isolation: "worktree"`);
    lines.push(`  prompt: <see below>`);
    lines.push("```");
    lines.push("");
  }

  // Merge
  lines.push("### After all agents complete\n");
  lines.push("Merge branches back sequentially, testing after each:\n");
  lines.push("```bash");
  for (const cmd of wavePlan.mergeCommands) {
    lines.push(cmd);
    lines.push("# Run tests here — if they fail, identify which merge broke them");
  }
  lines.push("```\n");

  // Cleanup
  lines.push("### Cleanup\n");
  lines.push("```bash");
  for (const cmd of wavePlan.cleanupCommands) {
    lines.push(cmd);
  }
  lines.push("```\n");

  return lines.join("\n");
}

/**
 * Build the UNIFY report after all waves complete.
 */
export async function unifyExecution(
  plan: PlanFile,
  results: TaskResult[],
  projectRoot: string
): Promise<string> {
  const endTime = new Date().toISOString();

  const executionResult: ExecutionResult = {
    planPath: plan.path,
    startTime: plan.frontmatter.phase, // approximate
    endTime,
    waves: [
      {
        wave: 1,
        tasks: results,
        mergeOrder: results.filter((r) => r.commit).map((r) => r.commit!),
        testsPassed: true, // TODO: track actual test results
      },
    ],
    overallStatus: results.every(
      (r) => r.status === "DONE" || r.status === "DONE_WITH_CONCERNS"
    )
      ? "complete"
      : results.some((r) => r.status === "BLOCKED")
        ? "blocked"
        : "partial",
  };

  const report: UnifyReport = {
    planned: {
      tasks: plan.tasks.length,
      waves: Math.max(...plan.tasks.map((t) => t.wave || 1)),
      acceptanceCriteria: plan.acceptanceCriteria,
    },
    built: {
      tasksComplete: results.filter((r) => r.status === "DONE").length,
      tasksWithConcerns: results.filter((r) => r.status === "DONE_WITH_CONCERNS").length,
      tasksBlocked: results.filter((r) => r.status === "BLOCKED").length,
      totalCommits: results.filter((r) => r.commit).length,
      filesChanged: results.flatMap((r) => r.filesChanged),
    },
    drift: [],
    decisions: [],
    deferred: [],
    lessons: [],
  };

  const summaryContent = generateSummary(executionResult, report);
  const summaryPath = await writeSummary(
    projectRoot,
    plan.frontmatter.phase,
    summaryContent
  );

  await updateState(
    projectRoot,
    plan.frontmatter.phase,
    executionResult.overallStatus
  );

  await clearExecutionState(projectRoot);

  return summaryPath;
}
