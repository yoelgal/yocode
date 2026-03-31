import { describe, test, expect } from "bun:test";
import { classifyIntent } from "../lib/intent";

describe("classifyIntent", () => {
  test("classifies debug signals", () => {
    expect(classifyIntent("this login page is broken").mode).toBe("debug");
    expect(classifyIntent("TypeError: Cannot read property 'map' of undefined").mode).toBe("debug");
    expect(classifyIntent("the API is not working, returns 500").mode).toBe("debug");
  });

  test("classifies ship signals", () => {
    expect(classifyIntent("ship it, create a PR").mode).toBe("ship");
    expect(classifyIntent("deploy this to main").mode).toBe("ship");
    expect(classifyIntent("push to main and create a pull request").mode).toBe("ship");
  });

  test("classifies explore signals", () => {
    expect(classifyIntent("what if we added dark mode?").mode).toBe("explore");
    expect(classifyIntent("I'm thinking about a new approach").mode).toBe("explore");
  });

  test("classifies quick signals", () => {
    expect(classifyIntent("just rename that variable").mode).toBe("quick");
    expect(classifyIntent("quickly fix this typo").mode).toBe("quick");
  });

  test("classifies plan signals", () => {
    expect(classifyIntent("build a new authentication system").mode).toBe("plan");
    expect(classifyIntent("add a user settings page with profile editing").mode).toBe("plan");
  });

  test("classifies diagnose signals", () => {
    expect(classifyIntent("users are reporting slow responses in prod").mode).toBe("diagnose");
    expect(classifyIntent("check the production logs for errors").mode).toBe("diagnose");
  });

  test("classifies retro signals", () => {
    expect(classifyIntent("run a weekly retro").mode).toBe("retro");
    expect(classifyIntent("run a retrospective on last sprint").mode).toBe("retro");
  });

  test("defaults to explore for ambiguous input", () => {
    expect(classifyIntent("hmm").mode).toBe("explore");
    expect(classifyIntent("hello").mode).toBe("explore");
  });

  test("returns confidence levels", () => {
    const highConf = classifyIntent("ship it, deploy, create a PR, push to main");
    expect(highConf.confidence).toBe("high");

    const lowConf = classifyIntent("maybe something");
    expect(lowConf.confidence).toBe("low");
  });

  test("returns matched signals", () => {
    const result = classifyIntent("this is broken and not working");
    expect(result.signals.length).toBeGreaterThan(0);
  });
});
