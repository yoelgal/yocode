---
name: connect
description: |
  Wire up a production connector. Use when setting up monitoring
  for a project's infrastructure.
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# /yocode:connect

Set up a production connector for this project.

## Process

### Step 1: Detect Available Systems

Scan the project for infrastructure references:
```bash
# Check for deployment configs, SDK imports, env vars
```

Present detected systems and ask which to connect.

### Step 2: Collect Auth

For each selected connector, ask for the required credentials:
- Show what's needed (e.g., "Railway needs: API token and project ID")
- Link to where they can find each credential
- Accept input (will be stored in gitignored connectors.json)

### Step 3: Verify Connection

For each connector, make a test API call to verify credentials work:
```bash
# Example: Railway
curl -s -H "Authorization: Bearer $TOKEN" \
  https://backboard.railway.app/graphql/v2 \
  -d '{"query":"{ me { name } }"}' | head -1
```

### Step 4: Save Config

Write to `.yocode/connectors.json` (gitignored):
```json
{
  "environments": ["production"],
  "connectors": {
    "[name]": { "[field]": "[value]" }
  }
}
```

### Step 5: Confirm

Report which connectors are active and what capabilities are available.
Suggest: "Run `/yocode:health` to verify everything works."
