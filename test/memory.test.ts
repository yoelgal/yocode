import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  parseFrontmatter,
  serializeFrontmatter,
  extractWikiLinks,
  inferScope,
  slugify,
  readMemory,
  writeMemory,
  loadAllMemories,
  checkDuplicate,
  regenerateIndex,
} from "../lib/memory";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "yocode-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true });
});

describe("parseFrontmatter", () => {
  test("parses YAML frontmatter and body", () => {
    const content = `---
scope: global
type: rule
created: 2026-03-31
---

This is the body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.scope).toBe("global");
    expect(result.frontmatter.type).toBe("rule");
    expect(result.frontmatter.created).toBe("2026-03-31");
    expect(result.body.trim()).toBe("This is the body.");
  });

  test("handles content without frontmatter", () => {
    const content = "Just a body.";
    const result = parseFrontmatter(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("Just a body.");
  });

  test("parses arrays in frontmatter", () => {
    const content = `---
linked: [pgvector, migrations]
keywords: [supabase, database]
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.linked).toEqual(["pgvector", "migrations"]);
    expect(result.frontmatter.keywords).toEqual(["supabase", "database"]);
  });

  test("parses booleans", () => {
    const content = `---
archived: true
---

Body.`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.archived).toBe(true);
  });
});

describe("serializeFrontmatter", () => {
  test("roundtrips with parseFrontmatter", () => {
    const fm = { scope: "global", type: "rule", created: "2026-03-31" };
    const body = "\nTest body.\n";
    const serialized = serializeFrontmatter(fm, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed.frontmatter.scope).toBe("global");
    expect(parsed.frontmatter.type).toBe("rule");
    expect(parsed.body).toBe(body);
  });
});

describe("extractWikiLinks", () => {
  test("extracts [[wiki-links]] from content", () => {
    const content = "Use [[pgvector]] with [[Supabase]] for [[embeddings]].";
    const links = extractWikiLinks(content);
    expect(links).toEqual(["pgvector", "Supabase", "embeddings"]);
  });

  test("deduplicates links", () => {
    const content = "[[foo]] and [[bar]] and [[foo]] again.";
    const links = extractWikiLinks(content);
    expect(links).toEqual(["foo", "bar"]);
  });

  test("returns empty for no links", () => {
    expect(extractWikiLinks("No links here.")).toEqual([]);
  });
});

describe("inferScope", () => {
  test("detects stack scope from technology keywords", () => {
    const result = inferScope("pgvector migrations need SET search_path");
    expect(result.scope).toBe("stack");
  });

  test("defaults to global for general content", () => {
    const result = inferScope("Always trace all callers before modifying code");
    expect(result.scope).toBe("global");
  });
});

describe("slugify", () => {
  test("converts title to filesystem-safe slug", () => {
    expect(slugify("Always Use 16384+ maxTokens")).toBe(
      "always-use-16384-maxtokens"
    );
  });

  test("truncates long titles", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });
});

describe("Memory CRUD", () => {
  test("writeMemory and readMemory roundtrip", async () => {
    const filePath = join(tmpDir, "test-rule.md");
    const fm = {
      scope: "global",
      type: "rule" as const,
      created: "2026-03-31",
    };

    await writeMemory(filePath, fm as any, "\nTest rule body.\n");
    const mem = await readMemory(filePath);

    expect(mem).not.toBeNull();
    expect(mem!.frontmatter.scope).toBe("global");
    expect(mem!.body.trim()).toBe("Test rule body.");
  });

  test("readMemory returns null for non-existent file", async () => {
    const mem = await readMemory(join(tmpDir, "nope.md"));
    expect(mem).toBeNull();
  });
});

describe("loadAllMemories", () => {
  test("loads all .md files from directories", async () => {
    const rulesDir = join(tmpDir, "rules");
    await mkdir(rulesDir, { recursive: true });

    await writeFile(
      join(rulesDir, "rule1.md"),
      "---\nscope: global\ntype: rule\ncreated: 2026-03-31\n---\n\nRule 1."
    );
    await writeFile(
      join(rulesDir, "rule2.md"),
      "---\nscope: global\ntype: rule\ncreated: 2026-03-31\n---\n\nRule 2."
    );
    // index.md should be excluded
    await writeFile(join(rulesDir, "index.md"), "# Index");

    const memories = await loadAllMemories([rulesDir]);
    expect(memories.length).toBe(2);
  });

  test("skips archived memories", async () => {
    await writeFile(
      join(tmpDir, "archived.md"),
      "---\nscope: global\ntype: rule\ncreated: 2026-03-31\narchived: true\n---\n\nOld rule."
    );
    await writeFile(
      join(tmpDir, "active.md"),
      "---\nscope: global\ntype: rule\ncreated: 2026-03-31\n---\n\nActive rule."
    );

    const memories = await loadAllMemories([tmpDir]);
    expect(memories.length).toBe(1);
    expect(memories[0].body.trim()).toBe("Active rule.");
  });
});

describe("regenerateIndex", () => {
  test("creates index.md from memories in directory", async () => {
    const rulesDir = join(tmpDir, "rules");
    await mkdir(rulesDir, { recursive: true });

    await writeFile(
      join(rulesDir, "rule1.md"),
      "---\nscope: global\ntype: rule\ncreated: 2026-03-31\n---\n\n# Always trace callers\nBefore modifying."
    );

    await regenerateIndex(tmpDir);

    const indexPath = join(tmpDir, "index.md");
    const content = await readFile(indexPath, "utf-8");
    expect(content).toContain("Active Rules (1)");
    expect(content).toContain("Always trace callers");
  });
});
