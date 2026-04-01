/**
 * yocode Intent Classifier
 *
 * Classifies user messages into flow modes. No ML, no separate service —
 * just structured pattern matching. The system prompt preamble runs this
 * on every message to route to the right mode.
 *
 * Modes: EXPLORE, PLAN, EXECUTE, QUICK, DEBUG, DIAGNOSE, SHIP, RETRO
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlowMode =
  | "explore"
  | "plan"
  | "execute"
  | "quick"
  | "debug"
  | "diagnose"
  | "ship"
  | "retro";

export interface IntentResult {
  mode: FlowMode;
  confidence: "high" | "medium" | "low";
  signals: string[]; // what patterns matched
}

// ─── Signal Patterns ─────────────────────────────────────────────────────────

interface SignalPattern {
  mode: FlowMode;
  weight: number; // higher = stronger signal
  patterns: RegExp[];
}

const SIGNALS: SignalPattern[] = [
  // DEBUG — error messages, stack traces, broken things
  {
    mode: "debug",
    weight: 10,
    patterns: [
      /\b(error|exception|traceback|stack\s*trace|panic|segfault)\b/i,
      /\b(broken|not working|fails|failing|crashed|crash)\b/i,
      /\b(bug|regression|undefined is not|cannot read prop|null pointer)\b/i,
      /\bTypeError|ReferenceError|SyntaxError|RuntimeError\b/,
      /at\s+\S+\s+\(\S+:\d+:\d+\)/, // stack trace pattern
      /\b(debug|investigate|diagnose this|what's wrong|why is)\b/i,
    ],
  },

  // DIAGNOSE — production issues, monitoring
  {
    mode: "diagnose",
    weight: 10,
    patterns: [
      /\b(in prod(uction)?|users? report|customers? (say|complain)|prod is)\b/i,
      /\bcheck\b.*?\b(logs?|metrics?|health|status)\b/i,
      /\b(incident|outage|down|degraded|slow response|latency spike)\b/i,
      /\b(alert|pager|on-?call|sentry|datadog)\b/i,
    ],
  },

  // SHIP — deployment and release
  {
    mode: "ship",
    weight: 9,
    patterns: [
      /\b(ship|deploy|release|publish|push to (main|master|prod))\b/i,
      /\b(create (a )?pr|pull request|merge|land it|land this)\b/i,
      /\b(version bump|changelog|tag|release notes)\b/i,
      /\b(ci|cd|pipeline|github actions)\b.*\b(run|trigger|check)\b/i,
    ],
  },

  // EXECUTE — plan exists, do the thing
  {
    mode: "execute",
    weight: 8,
    patterns: [
      /\b(let'?s go|do it|execute|run it|launch|start building|build it)\b/i,
      /\b(implement|carry out|proceed|let's go|ship it)\b/i,
      /\bplan (exists?|ready|approved|looks good|lgtm)\b/i,
      /\b(wave|worktree|parallel|swarm)\b.*\b(execute|launch|run)\b/i,
    ],
  },

  // PLAN — clear feature request, structured work
  {
    mode: "plan",
    weight: 7,
    patterns: [
      /\b(build|add|create|implement|develop|design)\b.*\b(feature|system|module|component|page|endpoint|api)\b/i,
      /\b(plan|architect|design|spec|specification|requirements?)\b/i,
      /\b(how (should|would|could) (we|I)|what's the (best|right) (way|approach))\b/i,
      /\b(acceptance criteria|user stor(y|ies)|requirements?)\b/i,
      /\b(break(ing)? (it |this )?(down|into)|phase|milestone)\b/i,
    ],
  },

  // RETRO — reflection, retrospective
  {
    mode: "retro",
    weight: 7,
    patterns: [
      /\b(retro|retrospective|review (the|this|last) (week|sprint|month))\b/i,
      /\b(how('d| did) (it|this|the week|we) go)\b/i,
      /\b(what (did|have) (we|I) (done|accomplished|shipped))\b/i,
      /\b(progress report|status update|weekly update)\b/i,
      /\b(reflect|reflection|lessons? learned)\b/i,
    ],
  },

  // QUICK — minimal ceremony, single-file changes
  {
    mode: "quick",
    weight: 6,
    patterns: [
      /\b(just|quickly|simply|real quick|can you just)\b/i,
      /\b(rename|move|delete|remove|update|change|fix|tweak)\b\s+(this|the|that|a)\b/i,
      /\b(typo|spelling|formatting|whitespace|indent)\b/i,
      /\b(one (small|quick|tiny) (thing|change|fix))\b/i,
    ],
  },

  // EXPLORE — vague ideas, brainstorming (lowest priority — it's the default)
  {
    mode: "explore",
    weight: 3,
    patterns: [
      /\b(what if|I('m| am) thinking|idea|brainstorm|explore|consider)\b/i,
      /\b(could we|should we|might|wonder|curious|hypothetical)\b/i,
      /\b(pros? and cons?|trade-?offs?|options?|alternatives?)\b/i,
      /\b(how does|what does|explain|tell me about|walk me through)\b/i,
    ],
  },
];

// ─── Classifier ──────────────────────────────────────────────────────────────

export function classifyIntent(message: string): IntentResult {
  const scores: Map<FlowMode, { score: number; signals: string[] }> = new Map();

  for (const signal of SIGNALS) {
    for (const pattern of signal.patterns) {
      const match = message.match(pattern);
      if (match) {
        const existing = scores.get(signal.mode) || { score: 0, signals: [] };
        existing.score += signal.weight;
        existing.signals.push(match[0]);
        scores.set(signal.mode, existing);
      }
    }
  }

  // Find highest-scoring mode
  let bestMode: FlowMode = "explore"; // default
  let bestScore = 0;
  let bestSignals: string[] = [];

  for (const [mode, data] of scores) {
    if (data.score > bestScore) {
      bestMode = mode;
      bestScore = data.score;
      bestSignals = data.signals;
    }
  }

  // Determine confidence
  let confidence: "high" | "medium" | "low";
  if (bestScore >= 15) {
    confidence = "high";
  } else if (bestScore >= 8) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return { mode: bestMode, confidence, signals: bestSignals };
}

// ─── Mode Metadata ───────────────────────────────────────────────────────────

export interface ModeInfo {
  name: FlowMode;
  description: string;
  confirmBeforeEntering: boolean;
  icon: string;
}

export const MODES: Record<FlowMode, ModeInfo> = {
  explore: {
    name: "explore",
    description: "Open-ended brainstorm. No structure imposed.",
    confirmBeforeEntering: false,
    icon: "🔭",
  },
  plan: {
    name: "plan",
    description: "Structured planning with acceptance criteria.",
    confirmBeforeEntering: false,
    icon: "📋",
  },
  execute: {
    name: "execute",
    description: "Parallel execution with fresh agent contexts.",
    confirmBeforeEntering: true,
    icon: "⚡",
  },
  quick: {
    name: "quick",
    description: "Minimal ceremony. Just do the thing.",
    confirmBeforeEntering: false,
    icon: "🏃",
  },
  debug: {
    name: "debug",
    description: "Systematic debugging with persistent knowledge.",
    confirmBeforeEntering: false,
    icon: "🔍",
  },
  diagnose: {
    name: "diagnose",
    description: "Production investigation across all connectors.",
    confirmBeforeEntering: false,
    icon: "🏥",
  },
  ship: {
    name: "ship",
    description: "Full shipping pipeline: test, review, version, PR.",
    confirmBeforeEntering: true,
    icon: "🚀",
  },
  retro: {
    name: "retro",
    description: "Cross-project retrospective with trend tracking.",
    confirmBeforeEntering: false,
    icon: "📊",
  },
};

// ─── System Prompt Preamble ──────────────────────────────────────────────────

/**
 * Generate the intent classification preamble for the system prompt.
 * This gets injected so Claude classifies every message naturally.
 */
export function generatePreamble(): string {
  return `
# yocode — Conversation-Driven Workflows

You are operating within yocode. The user does NOT need to type commands.
Classify their intent from natural conversation and respond in the right mode.
Do NOT announce mode changes — just behave accordingly.

## Routing

EXPLORE: "I have an idea" / "What if" / "Should we" / vague, hypothetical
  → Brainstorm freely. Auto-seed ideas that come up but aren't actionable.
    If the idea crystallizes into something concrete, transition to PLAN.

PLAN: "Build X" / "Add Y" / "I need a feature" / clear imperative with detail
  → Assumptions Mode: read 5-15 files, form assumptions with confidence levels,
    ask only for corrections. Produce acceptance criteria and wave assignments.
    Scan seeds for relevant prior ideas. Auto-seed anything out of scope.

EXECUTE: "Go" / "Do it" / "Launch" / references an existing plan
  → Confirm scope, then parallel agents in worktrees. Mandatory UNIFY after.
    Auto-seed deferred items. REQUIRES user confirmation (high-risk).

QUICK: "Just" / "Quickly" / "Rename this" / single-file, obvious change
  → Do it directly. No planning docs. Still benefits from axioms and memory.

DEBUG: Error messages, stack traces, "broken", "not working", "failing"
  → Check knowledge base first. Gather → Hypothesize → Verify → Fix → Persist.
    Auto-seed deeper fixes that got patched not solved.

DIAGNOSE: "In prod" / "Users reporting" / "Check logs" / "Is it down"
  → Pull from all connected systems, correlate across sources, find the fire.

SHIP: "Ship" / "Deploy" / "PR" / "Push" / "Release"
  → Full pipeline: merge → test → review → version → changelog → PR.
    REQUIRES user confirmation (high-risk).

RETRO: "How'd this week go" / "What did we ship" / "Retro"
  → Analyze commits, patterns, trends. Compare with history.

Default: EXPLORE (safest — no irreversible actions).

## Automatic Background Behaviors

These happen silently without the user asking:
- Memory rules inject when keywords match (L1 JIT loading)
- Corrections are captured and staged as permanent rules
- Ideas are auto-seeded during plan/explore/debug/execute
- Seeds surface when starting new work that matches their trigger
- Context pressure warnings at 35% and 25% remaining

## Slash Commands (Explicit Overrides)

Commands like /yocode:plan or /yocode:cso exist for when the user wants
to force a specific workflow. But the default path is conversation.
`.trim();
}
