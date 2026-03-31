---
name: setup-cookies
description: |
  Import cookies from your real Chromium browser into the headless browse
  session. Use before QA testing authenticated pages. Detects Chrome, Arc,
  Brave, and Edge. Decrypts via macOS Keychain.
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# /yocode:setup-cookies

Import cookies from your real browser so the headless browse daemon can
access authenticated pages (dashboards, admin panels, logged-in flows).

## How It Works

The browse daemon includes a cookie import system that:
1. Detects installed Chromium browsers (Chrome, Arc, Brave, Edge)
2. Reads their cookie database (SQLite)
3. Decrypts cookies via macOS Keychain (requires one-time approval)
4. Opens an interactive picker at `localhost` where you select which domains to import
5. Imports selected cookies into the Playwright browser context

## Process

### Step 1: Check Browse Daemon

```bash
B="${HOME}/.yocode/browse/dist/browse"
if [[ ! -f "$B" ]]; then
  echo "Browse binary not found. Build it first:"
  echo "  cd ~/.yocode/browse && bun install && bun run build"
  exit 1
fi
```

### Step 2: Detect Browsers

```bash
$B cookie-import-browser
```

This will:
- Scan for installed Chromium-based browsers
- List detected browsers with their cookie database paths
- Open an interactive picker UI in your default browser
- You select which domains to import (e.g., your app's domain, auth provider)

### Step 3: Verify

After importing, verify cookies are active:

```bash
$B goto <your-authenticated-url>
$B cookies
```

Check that the session cookies are present and the page loads authenticated.

### Step 4: Test

Navigate to an authenticated page to confirm:

```bash
$B goto <your-dashboard-url>
$B snapshot -i
```

If you see the authenticated content (not a login page), cookies are working.

## Security Notes

- Cookie decryption requires macOS Keychain access — you'll see a system prompt
  the first time asking for permission. This is expected.
- Imported cookies are stored in the Playwright browser context (memory only).
  They persist as long as the browse daemon is running (30-min idle timeout).
- Cookies are NOT written to disk or stored anywhere persistent.
- After daemon restart, you'll need to re-import.

## Supported Browsers

| Browser | macOS | Linux | Windows |
|---------|-------|-------|---------|
| Chrome | Yes | Planned | No |
| Arc | Yes | N/A | N/A |
| Brave | Yes | Planned | No |
| Edge | Yes | Planned | No |

## When to Use

- Before running `/yocode:qa` on authenticated pages
- Before running `/yocode:design-review` on logged-in flows
- Before any browse session that needs auth state
- After the browse daemon restarts (cookies are in-memory only)
