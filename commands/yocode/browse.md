---
name: browse
description: |
  Headless browser for QA, dogfooding, and automation. Persistent daemon
  with 100-200ms per-command performance after first load. Use for any
  browser interaction: navigate, click, fill forms, take screenshots.
allowed-tools:
  - Bash
  - Read
  - Write
---

# /yocode:browse

Headless browser daemon. First call starts Chromium (~3s), subsequent calls
execute in 100-200ms via a persistent HTTP daemon.

## Setup

Locate the browse binary:
```bash
B="${HOME}/.yocode/browse/dist/browse"
if [[ ! -f "$B" ]]; then
  echo "Browse binary not found. Run: cd ~/.yocode/browse && bun run build"
  exit 1
fi
```

## Core Commands

### Navigate
```bash
$B goto <url>              # Navigate to URL
$B back                    # Go back
$B forward                 # Go forward
$B reload                  # Reload page
```

### Read
```bash
$B text                    # Get page text
$B html                    # Get page HTML
$B snapshot                # Accessibility tree with @e refs
$B snapshot -i             # Interactive elements only
$B snapshot -c             # Compact (no empty nodes)
$B links                   # All links on page
$B forms                   # All forms on page
$B console                 # Console messages
$B network                 # Network requests
$B cookies                 # Cookies for current domain
$B url                     # Current URL
```

### Interact
```bash
$B click @e3               # Click element by ref
$B fill @e5 "text"         # Fill input field
$B select @e7 "option"     # Select dropdown value
$B type "text"             # Type text
$B press Enter             # Press key
$B scroll down 500         # Scroll
$B hover @e2               # Hover element
```

### Visual
```bash
$B screenshot              # Take screenshot
$B screenshot --path out.png  # Save to specific path
$B responsive 375 768 1024 1440  # Test at breakpoints
$B pdf                     # Generate PDF
```

### Tabs
```bash
$B tabs                    # List open tabs
$B newtab                  # Open new tab
$B tab 2                   # Switch to tab 2
$B closetab                # Close current tab
```

### Meta
```bash
$B status                  # Daemon status
$B stop                    # Stop daemon
$B restart                 # Restart daemon
```

## Ref System

The `snapshot` command outputs an accessibility tree with sequential refs:
- `@e1`, `@e2` — ARIA elements (buttons, links, inputs)
- `@c1`, `@c2` — Cursor-interactive elements (onclick, cursor:pointer)

Use refs in subsequent commands: `$B click @e3`, `$B fill @e5 "hello"`

Refs become stale after page navigation. Run `snapshot` again to refresh.

## Cookie Import

To test authenticated pages, import cookies from your real browser:
```bash
$B cookie-import-browser    # Interactive picker from Chrome/Arc/Brave
```

## Handoff Mode

For CAPTCHA or MFA, open visible Chrome with state preserved:
```bash
$B handoff                 # Opens headed Chrome — user solves challenge
$B resume                  # Returns control to headless mode
```
