/**
 * yocode Connector System
 *
 * Production connectors for Railway, Supabase, Vercel, Sentry, PostHog,
 * Langfuse, etc. Each connector is an agent definition with API knowledge
 * and per-project auth config.
 *
 * Architecture:
 *   ~/.yocode/connectors/    — Connector agent definitions
 *   .yocode/connectors.json  — Per-project auth (gitignored)
 */

import { readFile, readdir } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConnectorCapability =
  | "logs"
  | "metrics"
  | "traces"
  | "events"
  | "deploys"
  | "database"
  | "storage"
  | "analytics";

export interface ConnectorDefinition {
  name: string;
  description: string;
  capabilities: ConnectorCapability[];
  authFields: string[]; // what the connector needs (token, project_id, etc.)
  apiBase?: string;
}

export interface ConnectorConfig {
  environments: string[];
  connectors: Record<string, Record<string, string>>; // name → { field: value }
}

export interface ConnectorStatus {
  name: string;
  connected: boolean;
  capabilities: ConnectorCapability[];
  environment: string;
  lastChecked?: string;
}

// ─── Known Connectors ────────────────────────────────────────────────────────

const CONNECTORS: Record<string, ConnectorDefinition> = {
  railway: {
    name: "Railway",
    description: "Infrastructure deployment platform",
    capabilities: ["logs", "deploys", "metrics"],
    authFields: ["token", "project_id"],
    apiBase: "https://backboard.railway.app/graphql/v2",
  },
  supabase: {
    name: "Supabase",
    description: "PostgreSQL database and auth platform",
    capabilities: ["database", "logs", "storage", "analytics"],
    authFields: ["project_ref", "service_role_key"],
    apiBase: "https://api.supabase.com",
  },
  vercel: {
    name: "Vercel",
    description: "Frontend deployment platform",
    capabilities: ["deploys", "logs", "analytics"],
    authFields: ["token", "project_id"],
    apiBase: "https://api.vercel.com",
  },
  sentry: {
    name: "Sentry",
    description: "Error tracking and monitoring",
    capabilities: ["events", "traces", "metrics"],
    authFields: ["dsn", "auth_token", "org", "project"],
    apiBase: "https://sentry.io/api/0",
  },
  posthog: {
    name: "PostHog",
    description: "Product analytics",
    capabilities: ["events", "analytics"],
    authFields: ["api_key", "project_id"],
    apiBase: "https://app.posthog.com/api",
  },
  langfuse: {
    name: "Langfuse",
    description: "LLM observability and tracing",
    capabilities: ["traces", "metrics", "events"],
    authFields: ["public_key", "secret_key", "host"],
  },
};

// ─── Config Management ───────────────────────────────────────────────────────

/** Load connector config for a project */
export async function loadConnectorConfig(
  projectRoot: string
): Promise<ConnectorConfig | null> {
  const path = join(projectRoot, ".yocode", "connectors.json");
  if (!existsSync(path)) return null;
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Get the status of all configured connectors */
export async function getConnectorStatuses(
  projectRoot: string
): Promise<ConnectorStatus[]> {
  const config = await loadConnectorConfig(projectRoot);
  if (!config) return [];

  const statuses: ConnectorStatus[] = [];

  for (const [name, auth] of Object.entries(config.connectors)) {
    const def = CONNECTORS[name];
    if (!def) continue;

    // Check if all required auth fields are present
    const connected = def.authFields.every(
      (field) => auth[field] && auth[field].length > 0
    );

    for (const env of config.environments) {
      statuses.push({
        name: def.name,
        connected,
        capabilities: def.capabilities,
        environment: env,
      });
    }
  }

  return statuses;
}

/** List all available connectors (known + any custom) */
export function listAvailableConnectors(): ConnectorDefinition[] {
  return Object.values(CONNECTORS);
}

/** Get a specific connector definition */
export function getConnector(name: string): ConnectorDefinition | null {
  return CONNECTORS[name] || null;
}

// ─── Connector Detection ─────────────────────────────────────────────────────

/** Detect which production systems a project uses */
export async function detectConnectors(
  projectRoot: string
): Promise<string[]> {
  const detected: string[] = [];

  // Railway
  if (
    existsSync(join(projectRoot, "railway.toml")) ||
    existsSync(join(projectRoot, "railway.json"))
  ) {
    detected.push("railway");
  }

  // Vercel
  if (existsSync(join(projectRoot, "vercel.json"))) {
    detected.push("vercel");
  }

  // Check package.json for service SDKs
  const pkgPath = join(projectRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (allDeps["@supabase/supabase-js"]) detected.push("supabase");
      if (allDeps["@sentry/node"] || allDeps["@sentry/nextjs"])
        detected.push("sentry");
      if (allDeps["posthog-node"] || allDeps["posthog-js"])
        detected.push("posthog");
      if (allDeps["langfuse"]) detected.push("langfuse");
    } catch {}
  }

  // Check for .env references
  const envPath = join(projectRoot, ".env.example");
  if (existsSync(envPath)) {
    try {
      const env = await readFile(envPath, "utf-8");
      if (env.includes("RAILWAY")) detected.push("railway");
      if (env.includes("SUPABASE")) detected.push("supabase");
      if (env.includes("SENTRY")) detected.push("sentry");
      if (env.includes("POSTHOG")) detected.push("posthog");
      if (env.includes("LANGFUSE")) detected.push("langfuse");
      if (env.includes("VERCEL")) detected.push("vercel");
    } catch {}
  }

  return [...new Set(detected)];
}
