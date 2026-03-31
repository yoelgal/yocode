/**
 * yocode Agent System
 *
 * Loads agent definitions from markdown files, assigns models based on
 * the active profile, and provides the interface for spawning agents
 * with fresh contexts.
 */

import { readFile, readdir } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { existsSync } from "fs";
import { parseFrontmatter, loadAxioms } from "./memory";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModelTier = "opus" | "sonnet" | "haiku";

export type AgentRole =
  | "planner"
  | "executor"
  | "reviewer"
  | "researcher"
  | "mapper"
  | "debugger"
  | "verifier";

export type ModelProfile = "quality" | "balanced" | "budget";

export interface AgentDefinition {
  name: string;
  description: string;
  model: ModelTier;
  tools: string[];
  isolation?: "worktree" | "none";
  body: string; // full prompt content
}

export interface SpawnConfig {
  agent: AgentDefinition;
  prompt: string; // the specific task prompt
  memory: string; // injected memory context
  axioms: string; // injected axioms
  projectRoot: string;
}

// ─── Model Profiles ──────────────────────────────────────────────────────────

const MODEL_PROFILES: Record<ModelProfile, Record<AgentRole, ModelTier>> = {
  quality: {
    planner: "opus",
    executor: "opus",
    reviewer: "sonnet",
    researcher: "sonnet",
    mapper: "haiku",
    debugger: "opus",
    verifier: "sonnet",
  },
  balanced: {
    planner: "opus",
    executor: "sonnet",
    reviewer: "sonnet",
    researcher: "sonnet",
    mapper: "haiku",
    debugger: "sonnet",
    verifier: "sonnet",
  },
  budget: {
    planner: "sonnet",
    executor: "sonnet",
    reviewer: "haiku",
    researcher: "haiku",
    mapper: "haiku",
    debugger: "sonnet",
    verifier: "haiku",
  },
};

let activeProfile: ModelProfile = "balanced";

export function setModelProfile(profile: ModelProfile): void {
  activeProfile = profile;
}

export function getModelProfile(): ModelProfile {
  return activeProfile;
}

/** Get the effective model for an agent role under the current profile */
export function getModelForRole(role: AgentRole): ModelTier {
  return MODEL_PROFILES[activeProfile][role];
}

// ─── Agent Loading ───────────────────────────────────────────────────────────

const AGENTS_DIR = join(homedir(), ".yocode", "agents");

/** Load a single agent definition from its markdown file */
export async function loadAgent(name: string): Promise<AgentDefinition | null> {
  const filePath = join(AGENTS_DIR, `${name}.md`);
  if (!existsSync(filePath)) return null;

  const content = await readFile(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);

  // Override model based on active profile if the agent role is known
  const role = name as AgentRole;
  const effectiveModel = MODEL_PROFILES[activeProfile][role] ?? frontmatter.model ?? "sonnet";

  return {
    name: frontmatter.name || name,
    description: frontmatter.description || "",
    model: effectiveModel,
    tools: frontmatter.tools || [],
    isolation: frontmatter.isolation,
    body,
  };
}

/** Load all available agent definitions */
export async function loadAllAgents(): Promise<AgentDefinition[]> {
  if (!existsSync(AGENTS_DIR)) return [];

  const files = await readdir(AGENTS_DIR);
  const agents: AgentDefinition[] = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const name = basename(file, ".md");
    const agent = await loadAgent(name);
    if (agent) agents.push(agent);
  }

  return agents;
}

// ─── Agent Prompt Assembly ───────────────────────────────────────────────────

/**
 * Build the full prompt for spawning an agent.
 * Injects axioms and memory into the agent's template.
 */
export async function buildAgentPrompt(config: SpawnConfig): Promise<string> {
  const parts: string[] = [];

  // Agent identity and role
  parts.push(`# Agent: ${config.agent.name}`);
  parts.push(`Model: ${config.agent.model}`);
  parts.push("");

  // Inject axioms into the placeholder
  let body = config.agent.body;
  if (body.includes("<axioms>")) {
    body = body.replace(
      /<axioms>[\s\S]*?<\/axioms>/,
      `<axioms>\n${config.axioms}\n</axioms>`
    );
  }
  parts.push(body);

  // Inject memory context
  if (config.memory) {
    parts.push("\n<memory>");
    parts.push(config.memory);
    parts.push("</memory>");
  }

  // Inject the specific task
  parts.push("\n<task>");
  parts.push(config.prompt);
  parts.push("</task>");

  return parts.join("\n");
}

/**
 * Prepare a spawn config for an agent with auto-loaded axioms and memory.
 * This doesn't actually spawn — it builds everything needed for the
 * orchestrator to call the Agent tool.
 */
export async function prepareSpawn(
  agentName: string,
  taskPrompt: string,
  memoryContext: string,
  projectRoot: string
): Promise<SpawnConfig | null> {
  const agent = await loadAgent(agentName);
  if (!agent) return null;

  const axioms = await loadAxioms();

  return {
    agent,
    prompt: taskPrompt,
    memory: memoryContext,
    axioms,
    projectRoot,
  };
}

// ─── Wave Execution Planning ─────────────────────────────────────────────────

export interface Task {
  id: string;
  name: string;
  description: string;
  files: string[];
  dependsOn: string[]; // task IDs
  wave?: number;
  agent?: AgentRole;
}

export interface Wave {
  number: number;
  tasks: Task[];
}

/** Sort tasks into execution waves based on dependencies */
export function planWaves(tasks: Task[]): Wave[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const assigned = new Set<string>();
  const waves: Wave[] = [];
  let waveNum = 1;

  while (assigned.size < tasks.length) {
    const waveTasks: Task[] = [];

    for (const task of tasks) {
      if (assigned.has(task.id)) continue;

      // Can run in this wave if all dependencies are assigned
      const depsReady = task.dependsOn.every((dep) => assigned.has(dep));
      if (depsReady) {
        task.wave = waveNum;
        waveTasks.push(task);
      }
    }

    if (waveTasks.length === 0) {
      // Circular dependency detected — break by assigning remaining tasks
      const remaining = tasks.filter((t) => !assigned.has(t.id));
      for (const t of remaining) {
        t.wave = waveNum;
        waveTasks.push(t);
      }
    }

    for (const t of waveTasks) {
      assigned.add(t.id);
    }

    waves.push({ number: waveNum, tasks: waveTasks });
    waveNum++;
  }

  return waves;
}

// ─── File Conflict Detection ─────────────────────────────────────────────────

/** Check if any tasks in a wave touch the same files (merge conflict risk) */
export function detectFileConflicts(
  wave: Wave
): { taskA: string; taskB: string; files: string[] }[] {
  const conflicts: { taskA: string; taskB: string; files: string[] }[] = [];

  for (let i = 0; i < wave.tasks.length; i++) {
    for (let j = i + 1; j < wave.tasks.length; j++) {
      const a = wave.tasks[i];
      const b = wave.tasks[j];
      const overlap = a.files.filter((f) => b.files.includes(f));
      if (overlap.length > 0) {
        conflicts.push({
          taskA: a.id,
          taskB: b.id,
          files: overlap,
        });
      }
    }
  }

  return conflicts;
}
