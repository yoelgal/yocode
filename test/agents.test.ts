import { describe, test, expect } from "bun:test";
import {
  planWaves,
  detectFileConflicts,
  getModelForRole,
  setModelProfile,
  type Task,
} from "../lib/agents";

describe("planWaves", () => {
  test("independent tasks go in wave 1", () => {
    const tasks: Task[] = [
      { id: "a", name: "Task A", description: "", files: [], dependsOn: [] },
      { id: "b", name: "Task B", description: "", files: [], dependsOn: [] },
      { id: "c", name: "Task C", description: "", files: [], dependsOn: [] },
    ];

    const waves = planWaves(tasks);
    expect(waves.length).toBe(1);
    expect(waves[0].tasks.length).toBe(3);
    expect(waves[0].number).toBe(1);
  });

  test("dependent tasks go in later waves", () => {
    const tasks: Task[] = [
      { id: "a", name: "Task A", description: "", files: [], dependsOn: [] },
      { id: "b", name: "Task B", description: "", files: [], dependsOn: ["a"] },
      { id: "c", name: "Task C", description: "", files: [], dependsOn: ["b"] },
    ];

    const waves = planWaves(tasks);
    expect(waves.length).toBe(3);
    expect(waves[0].tasks[0].id).toBe("a");
    expect(waves[1].tasks[0].id).toBe("b");
    expect(waves[2].tasks[0].id).toBe("c");
  });

  test("diamond dependencies resolve correctly", () => {
    const tasks: Task[] = [
      { id: "a", name: "A", description: "", files: [], dependsOn: [] },
      { id: "b", name: "B", description: "", files: [], dependsOn: ["a"] },
      { id: "c", name: "C", description: "", files: [], dependsOn: ["a"] },
      { id: "d", name: "D", description: "", files: [], dependsOn: ["b", "c"] },
    ];

    const waves = planWaves(tasks);
    expect(waves.length).toBe(3);
    expect(waves[0].tasks.map((t) => t.id)).toEqual(["a"]);
    expect(waves[1].tasks.map((t) => t.id).sort()).toEqual(["b", "c"]);
    expect(waves[2].tasks.map((t) => t.id)).toEqual(["d"]);
  });
});

describe("detectFileConflicts", () => {
  test("detects overlapping files in a wave", () => {
    const wave = {
      number: 1,
      tasks: [
        { id: "a", name: "A", description: "", files: ["src/auth.ts", "src/db.ts"], dependsOn: [] },
        { id: "b", name: "B", description: "", files: ["src/auth.ts", "src/api.ts"], dependsOn: [] },
      ],
    };

    const conflicts = detectFileConflicts(wave);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].files).toEqual(["src/auth.ts"]);
  });

  test("no conflicts when files don't overlap", () => {
    const wave = {
      number: 1,
      tasks: [
        { id: "a", name: "A", description: "", files: ["src/auth.ts"], dependsOn: [] },
        { id: "b", name: "B", description: "", files: ["src/api.ts"], dependsOn: [] },
      ],
    };

    expect(detectFileConflicts(wave).length).toBe(0);
  });
});

describe("model profiles", () => {
  test("quality profile gives opus to planner", () => {
    setModelProfile("quality");
    expect(getModelForRole("planner")).toBe("opus");
    expect(getModelForRole("executor")).toBe("opus");
    expect(getModelForRole("mapper")).toBe("haiku");
  });

  test("budget profile gives sonnet to planner", () => {
    setModelProfile("budget");
    expect(getModelForRole("planner")).toBe("sonnet");
    expect(getModelForRole("mapper")).toBe("haiku");
  });

  test("balanced profile is the default middle ground", () => {
    setModelProfile("balanced");
    expect(getModelForRole("planner")).toBe("opus");
    expect(getModelForRole("executor")).toBe("sonnet");
    expect(getModelForRole("reviewer")).toBe("sonnet");
    expect(getModelForRole("mapper")).toBe("haiku");
  });
});
