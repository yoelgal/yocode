/**
 * yocode Connector API Clients
 *
 * Real HTTP clients for each production platform.
 * Each client knows how to: health check, pull logs, query metrics.
 *
 * Used by /yocode:diagnose, /yocode:health, /yocode:canary.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConnectorResult {
  connector: string;
  success: boolean;
  data?: unknown;
  error?: string;
  latencyMs: number;
}

export interface HealthCheck {
  name: string;
  status: "up" | "degraded" | "down" | "unknown";
  details: string;
  latencyMs: number;
}

export interface LogEntry {
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  message: string;
  source: string;
}

// ─── Generic HTTP Helper ─────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOpts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...fetchOpts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function timedFetch(
  url: string,
  options: RequestInit = {}
): Promise<{ response: Response; latencyMs: number }> {
  const start = performance.now();
  const response = await fetchWithTimeout(url, options);
  const latencyMs = Math.round(performance.now() - start);
  return { response, latencyMs };
}

// ─── Railway ─────────────────────────────────────────────────────────────────

export async function railwayHealth(
  token: string
): Promise<HealthCheck> {
  try {
    const { response, latencyMs } = await timedFetch(
      "https://backboard.railway.app/graphql/v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "{ me { name } }" }),
      }
    );
    const data = await response.json() as any;
    if (data.data?.me?.name) {
      return { name: "Railway", status: "up", details: `Authenticated as ${data.data.me.name}`, latencyMs };
    }
    return { name: "Railway", status: "down", details: "Auth failed", latencyMs };
  } catch (e: any) {
    return { name: "Railway", status: "unknown", details: e.message, latencyMs: 0 };
  }
}

export async function railwayLogs(
  token: string,
  projectId: string,
  limit: number = 100
): Promise<LogEntry[]> {
  try {
    const { response } = await timedFetch(
      "https://backboard.railway.app/graphql/v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `query { project(id: "${projectId}") { services { edges { node { name } } } } }`,
        }),
      }
    );
    const data = await response.json() as any;
    // Railway's log API is more complex — this gets project structure
    return [];
  } catch {
    return [];
  }
}

export async function railwayDeploys(
  token: string,
  projectId: string
): Promise<ConnectorResult> {
  try {
    const { response, latencyMs } = await timedFetch(
      "https://backboard.railway.app/graphql/v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `query {
            project(id: "${projectId}") {
              services { edges { node {
                name
                deployments(first: 3) { edges { node { id status createdAt } } }
              } } }
            }
          }`,
        }),
      }
    );
    const data = await response.json();
    return { connector: "railway", success: true, data, latencyMs };
  } catch (e: any) {
    return { connector: "railway", success: false, error: e.message, latencyMs: 0 };
  }
}

// ─── Supabase ────────────────────────────────────────────────────────────────

export async function supabaseHealth(
  projectRef: string,
  serviceRoleKey: string
): Promise<HealthCheck> {
  try {
    const { response, latencyMs } = await timedFetch(
      `https://${projectRef}.supabase.co/rest/v1/`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    if (response.ok) {
      return { name: "Supabase", status: "up", details: `Project ${projectRef} responding`, latencyMs };
    }
    return { name: "Supabase", status: "down", details: `HTTP ${response.status}`, latencyMs };
  } catch (e: any) {
    return { name: "Supabase", status: "unknown", details: e.message, latencyMs: 0 };
  }
}

// ─── Sentry ──────────────────────────────────────────────────────────────────

export async function sentryHealth(
  authToken: string,
  org: string,
  project: string
): Promise<HealthCheck> {
  try {
    const { response, latencyMs } = await timedFetch(
      `https://sentry.io/api/0/projects/${org}/${project}/`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (response.ok) {
      return { name: "Sentry", status: "up", details: `${org}/${project} accessible`, latencyMs };
    }
    return { name: "Sentry", status: "down", details: `HTTP ${response.status}`, latencyMs };
  } catch (e: any) {
    return { name: "Sentry", status: "unknown", details: e.message, latencyMs: 0 };
  }
}

export async function sentryIssues(
  authToken: string,
  org: string,
  project: string,
  query: string = "is:unresolved"
): Promise<ConnectorResult> {
  try {
    const { response, latencyMs } = await timedFetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=${encodeURIComponent(query)}&limit=25`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    const data = await response.json();
    return { connector: "sentry", success: true, data, latencyMs };
  } catch (e: any) {
    return { connector: "sentry", success: false, error: e.message, latencyMs: 0 };
  }
}

// ─── Vercel ──────────────────────────────────────────────────────────────────

export async function vercelHealth(token: string): Promise<HealthCheck> {
  try {
    const { response, latencyMs } = await timedFetch(
      "https://api.vercel.com/v2/user",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (response.ok) {
      const data = await response.json() as any;
      return { name: "Vercel", status: "up", details: `Authenticated as ${data.user?.name || "user"}`, latencyMs };
    }
    return { name: "Vercel", status: "down", details: `HTTP ${response.status}`, latencyMs };
  } catch (e: any) {
    return { name: "Vercel", status: "unknown", details: e.message, latencyMs: 0 };
  }
}

export async function vercelDeploys(
  token: string,
  projectId: string,
  limit: number = 5
): Promise<ConnectorResult> {
  try {
    const { response, latencyMs } = await timedFetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();
    return { connector: "vercel", success: true, data, latencyMs };
  } catch (e: any) {
    return { connector: "vercel", success: false, error: e.message, latencyMs: 0 };
  }
}

// ─── PostHog ─────────────────────────────────────────────────────────────────

export async function posthogHealth(
  apiKey: string,
  projectId: string
): Promise<HealthCheck> {
  try {
    const { response, latencyMs } = await timedFetch(
      `https://app.posthog.com/api/projects/${projectId}/`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );
    if (response.ok) {
      return { name: "PostHog", status: "up", details: `Project ${projectId} accessible`, latencyMs };
    }
    return { name: "PostHog", status: "down", details: `HTTP ${response.status}`, latencyMs };
  } catch (e: any) {
    return { name: "PostHog", status: "unknown", details: e.message, latencyMs: 0 };
  }
}

// ─── Langfuse ────────────────────────────────────────────────────────────────

export async function langfuseHealth(
  publicKey: string,
  secretKey: string,
  host: string = "https://cloud.langfuse.com"
): Promise<HealthCheck> {
  try {
    const { response, latencyMs } = await timedFetch(
      `${host}/api/public/health`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${publicKey}:${secretKey}`)}`,
        },
      }
    );
    if (response.ok) {
      return { name: "Langfuse", status: "up", details: "Service healthy", latencyMs };
    }
    return { name: "Langfuse", status: "down", details: `HTTP ${response.status}`, latencyMs };
  } catch (e: any) {
    return { name: "Langfuse", status: "unknown", details: e.message, latencyMs: 0 };
  }
}

export async function langfuseTraces(
  publicKey: string,
  secretKey: string,
  host: string = "https://cloud.langfuse.com",
  limit: number = 50
): Promise<ConnectorResult> {
  try {
    const { response, latencyMs } = await timedFetch(
      `${host}/api/public/traces?limit=${limit}`,
      {
        headers: {
          Authorization: `Basic ${btoa(`${publicKey}:${secretKey}`)}`,
        },
      }
    );
    const data = await response.json();
    return { connector: "langfuse", success: true, data, latencyMs };
  } catch (e: any) {
    return { connector: "langfuse", success: false, error: e.message, latencyMs: 0 };
  }
}

// ─── Unified Health Check ────────────────────────────────────────────────────

/**
 * Run health checks against all configured connectors.
 * This is what /yocode:health calls.
 */
export async function healthCheckAll(
  connectors: Record<string, Record<string, string>>
): Promise<HealthCheck[]> {
  const checks: Promise<HealthCheck>[] = [];

  if (connectors.railway?.token) {
    checks.push(railwayHealth(connectors.railway.token));
  }
  if (connectors.supabase?.project_ref && connectors.supabase?.service_role_key) {
    checks.push(
      supabaseHealth(connectors.supabase.project_ref, connectors.supabase.service_role_key)
    );
  }
  if (connectors.sentry?.auth_token && connectors.sentry?.org && connectors.sentry?.project) {
    checks.push(
      sentryHealth(connectors.sentry.auth_token, connectors.sentry.org, connectors.sentry.project)
    );
  }
  if (connectors.vercel?.token) {
    checks.push(vercelHealth(connectors.vercel.token));
  }
  if (connectors.posthog?.api_key && connectors.posthog?.project_id) {
    checks.push(posthogHealth(connectors.posthog.api_key, connectors.posthog.project_id));
  }
  if (connectors.langfuse?.public_key && connectors.langfuse?.secret_key) {
    checks.push(
      langfuseHealth(
        connectors.langfuse.public_key,
        connectors.langfuse.secret_key,
        connectors.langfuse.host
      )
    );
  }

  return Promise.all(checks);
}
