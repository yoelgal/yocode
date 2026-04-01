#!/usr/bin/env bash
#
# yocode installer
#
# Usage:
#   git clone https://github.com/yoelgal/yocode.git ~/.yocode && ~/.yocode/install.sh
#
# Or have Claude Code run this for you — just paste the setup prompt
# from the README.
#

set -euo pipefail

YOCODE_HOME="${HOME}/.yocode"
CLAUDE_DIR="${HOME}/.claude"
CLAUDE_SETTINGS="${CLAUDE_DIR}/settings.json"
COMMANDS_DIR="${CLAUDE_DIR}/commands"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  yocode installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Step 1: Verify yocode repo ──────────────────────────────────────────────

if [[ ! -f "${YOCODE_HOME}/ARCHITECTURE.md" ]]; then
  echo "Error: yocode repo not found at ${YOCODE_HOME}"
  echo "Clone it first: git clone https://github.com/yoelgal/yocode.git ${YOCODE_HOME}"
  exit 1
fi

echo "✓ Found yocode at ${YOCODE_HOME}"

# ─── Step 2: Create directory structure ──────────────────────────────────────

mkdir -p "${YOCODE_HOME}/memory/global/axioms"
mkdir -p "${YOCODE_HOME}/memory/global/rules"
mkdir -p "${YOCODE_HOME}/memory/stacks"
mkdir -p "${YOCODE_HOME}/bin/hooks"
mkdir -p "${YOCODE_HOME}/agents"
mkdir -p "${YOCODE_HOME}/.sessions"
mkdir -p "${YOCODE_HOME}/.staging"
mkdir -p "${CLAUDE_DIR}/commands/yocode"

echo "✓ Created directory structure"

# ─── Step 3: Copy agents ─────────────────────────────────────────────────────
# (Skip if repo was cloned directly to ~/.yocode — files are already in place)

echo "✓ Agent definitions in place"

# ─── Step 4: Copy axioms to memory/global/axioms/ ────────────────────────────

for axiom in "${YOCODE_HOME}/axioms/"*.md; do
  [[ -f "$axiom" ]] || continue
  dest="${YOCODE_HOME}/memory/global/axioms/$(basename "$axiom")"
  # Only copy if source and dest differ
  if [[ "$(realpath "$axiom" 2>/dev/null)" != "$(realpath "$dest" 2>/dev/null)" ]]; then
    cp "$axiom" "$dest"
  fi
done
echo "✓ Installed axioms"

# ─── Step 5: Install hooks ───────────────────────────────────────────────────

chmod +x "${YOCODE_HOME}/bin/hooks/"*.sh
echo "✓ Hooks ready"

# ─── Step 6: Install slash commands ──────────────────────────────────────────

# Symlink commands directory so updates propagate automatically
mkdir -p "${COMMANDS_DIR}"
if [[ -L "${COMMANDS_DIR}/yocode" || -d "${COMMANDS_DIR}/yocode" ]]; then
  rm -rf "${COMMANDS_DIR}/yocode"
fi
ln -sf "${YOCODE_HOME}/commands/yocode" "${COMMANDS_DIR}/yocode"
echo "✓ Installed slash commands → ${COMMANDS_DIR}/yocode"

# ─── Step 7: Register hooks in Claude settings ──────────────────────────────

if [[ ! -f "$CLAUDE_SETTINGS" ]]; then
  mkdir -p "$CLAUDE_DIR"
  echo '{}' > "$CLAUDE_SETTINGS"
fi

# Use a simple approach: if hooks aren't already registered, add them.
# We check for the yocode session-start hook as a sentinel.
if ! grep -q "session-start.sh" "$CLAUDE_SETTINGS" 2>/dev/null; then
  # Backup existing settings
  cp "$CLAUDE_SETTINGS" "${CLAUDE_SETTINGS}.backup.$(date +%s)"

  # Merge hooks using a small inline script
  # This preserves existing hooks while adding yocode's
  MERGE_SCRIPT='
    const fs = require("fs");
    const settings = JSON.parse(fs.readFileSync(process.argv[2], "utf-8"));
    const newHooks = JSON.parse(fs.readFileSync(process.argv[3], "utf-8"));

    if (!settings.hooks) settings.hooks = {};

    for (const [event, eventEntries] of Object.entries(newHooks.hooks)) {
      if (!settings.hooks[event]) settings.hooks[event] = [];
      for (const entry of eventEntries) {
        // Check if this hook command is already registered
        const cmd = entry.hooks[0].command;
        const exists = settings.hooks[event].some(e =>
          e.hooks && e.hooks.some(h => h.command === cmd)
        );
        if (!exists) settings.hooks[event].push(entry);
      }
    }

    fs.writeFileSync(process.argv[2], JSON.stringify(settings, null, 2));
  '

  if command -v bun &>/dev/null; then
    bun -e "$MERGE_SCRIPT" -- "$CLAUDE_SETTINGS" "${YOCODE_HOME}/templates/hooks-config.json"
    echo "✓ Registered hooks in Claude settings"
  elif command -v node &>/dev/null; then
    node -e "$MERGE_SCRIPT" -- "$CLAUDE_SETTINGS" "${YOCODE_HOME}/templates/hooks-config.json"
    echo "✓ Registered hooks in Claude settings"
  else
    echo "⚠ Neither bun nor node found. Add hooks manually from:"
    echo "  ${YOCODE_HOME}/templates/hooks-config.json"
  fi
else
  echo "✓ Hooks already registered"
fi

# ─── Step 8: Initialize global memory ────────────────────────────────────────

# Files are already in place from the cloned repo
echo "✓ Global memory in place"

# Initialize dream state
if [[ ! -f "${YOCODE_HOME}/.dream-state" ]]; then
  echo "$(date +%s)" > "${YOCODE_HOME}/.dream-state"
  echo "0" >> "${YOCODE_HOME}/.dream-state"
fi

echo "✓ Initialized global memory"

# ─── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  yocode installed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Available commands:"
echo "  /yocode:plan      — Structured planning with Assumptions Mode"
echo "  /yocode:execute   — Wave execution with parallel agents"
echo "  /yocode:ship      — Full shipping pipeline"
echo "  /yocode:qa        — Systematic QA with health scores"
echo "  /yocode:review    — Pre-landing code review"
echo "  /yocode:debug     — Systematic debugging"
echo "  /yocode:onboard   — Analyze codebase and seed memory"
echo "  /yocode:dream     — Memory consolidation"
echo "  ...and 12 more. Type /yocode: in Claude Code to see all."
echo ""
echo "Next: Open Claude Code in a project and run /yocode:onboard"
echo ""
