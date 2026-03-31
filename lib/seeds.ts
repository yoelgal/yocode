/**
 * yocode Seed System
 *
 * Seeds are forward-looking ideas annotated with WHEN they should surface.
 * When you start new work, the system automatically scans seeds and presents
 * relevant ones. Solves "ideas that aren't actionable yet" without losing them.
 */

import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import { parseFrontmatter, serializeFrontmatter, slugify } from "./memory";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Seed {
  path: string;
  title: string;
  description: string;
  trigger: string; // WHEN condition
  priority: "high" | "medium" | "low";
  created: string;
  surfaced?: string; // last time it was shown to user
  status: "active" | "implemented" | "dismissed";
}

// ─── Paths ───────────────────────────────────────────────────────────────────

function seedsDir(projectRoot: string): string {
  return join(projectRoot, ".yocode", "seeds");
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createSeed(
  projectRoot: string,
  title: string,
  description: string,
  trigger: string,
  priority: "high" | "medium" | "low" = "medium"
): Promise<string> {
  const dir = seedsDir(projectRoot);
  await mkdir(dir, { recursive: true });

  const slug = slugify(title);
  const filePath = join(dir, `${slug}.md`);
  const today = new Date().toISOString().split("T")[0];

  const content = serializeFrontmatter(
    {
      created: today,
      trigger,
      priority,
      status: "active",
    },
    `\n# ${title}\n\n${description}\n\n## When to Surface\n${trigger}\n`
  );

  await writeFile(filePath, content, "utf-8");
  return filePath;
}

export async function loadSeeds(projectRoot: string): Promise<Seed[]> {
  const dir = seedsDir(projectRoot);
  if (!existsSync(dir)) return [];

  const files = await readdir(dir);
  const seeds: Seed[] = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    try {
      const content = await readFile(join(dir, file), "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);

      const titleMatch = body.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : basename(file, ".md");

      seeds.push({
        path: join(dir, file),
        title,
        description: body.trim(),
        trigger: frontmatter.trigger || "",
        priority: frontmatter.priority || "medium",
        created: frontmatter.created || "",
        surfaced: frontmatter.surfaced,
        status: frontmatter.status || "active",
      });
    } catch {}
  }

  return seeds.filter((s) => s.status === "active");
}

/**
 * Scan seeds for ones whose trigger condition matches the current context.
 * Context is typically: what the user is about to work on (feature name,
 * tech area, phase description).
 */
export async function scanRelevantSeeds(
  projectRoot: string,
  context: string
): Promise<Seed[]> {
  const seeds = await loadSeeds(projectRoot);
  if (seeds.length === 0) return [];

  const contextLower = context.toLowerCase();
  const contextWords = contextLower.split(/\s+/).filter((w) => w.length > 3);

  return seeds.filter((seed) => {
    const triggerLower = seed.trigger.toLowerCase();
    const triggerWords = triggerLower.split(/\s+/).filter((w) => w.length > 3);

    // Check if context matches the trigger
    const matchCount = triggerWords.filter(
      (tw) => contextWords.some((cw) => cw.includes(tw) || tw.includes(cw))
    ).length;

    return matchCount > 0 || contextLower.includes(triggerLower);
  });
}

/** Mark a seed as surfaced (shown to user) */
export async function markSurfaced(seed: Seed): Promise<void> {
  const content = await readFile(seed.path, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);
  frontmatter.surfaced = new Date().toISOString().split("T")[0];
  await writeFile(seed.path, serializeFrontmatter(frontmatter, body), "utf-8");
}

/** Mark a seed as implemented */
export async function markImplemented(seed: Seed): Promise<void> {
  const content = await readFile(seed.path, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);
  frontmatter.status = "implemented";
  await writeFile(seed.path, serializeFrontmatter(frontmatter, body), "utf-8");
}

/** Mark a seed as dismissed */
export async function dismissSeed(seed: Seed): Promise<void> {
  const content = await readFile(seed.path, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);
  frontmatter.status = "dismissed";
  await writeFile(seed.path, serializeFrontmatter(frontmatter, body), "utf-8");
}

/** Format seeds for display in context injection */
export function formatSeedsForInjection(seeds: Seed[]): string {
  if (seeds.length === 0) return "";

  const lines = ["<yocode-seeds>", "Relevant ideas from previous sessions:\n"];
  for (const s of seeds) {
    lines.push(`- [${s.priority}] **${s.title}** — ${s.trigger}`);
  }
  lines.push("\nConsider these while planning. Dismiss with `/yocode:seed dismiss <name>`.");
  lines.push("</yocode-seeds>");

  return lines.join("\n");
}
