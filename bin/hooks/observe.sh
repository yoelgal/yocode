#!/usr/bin/env bash
# yocode PostToolUse observer hook
# Watches for correction patterns, decisions, and errors.
# Pattern matching only — no LLM calls. Target: <50ms.
#
# The hook receives tool use details via environment variables set by Claude Code:
#   TOOL_NAME, TOOL_INPUT, TOOL_OUTPUT (when available)

set -euo pipefail

YOCODE_HOME="${HOME}/.yocode"
STAGING_DIR="${YOCODE_HOME}/.staging"
PROJECT_ROOT="$(pwd)"

# Read tool output from stdin if available
tool_output=$(cat 2>/dev/null || true)

# Quick exit for non-interesting tools
case "${TOOL_NAME:-}" in
  Read|Glob|Grep|TaskCreate|TaskUpdate|TaskGet|TaskList)
    exit 0
    ;;
esac

# ─── Correction Detection ────────────────────────────────────────────────────
# Look for patterns in recent conversation that indicate corrections.
# These get staged for review, not auto-committed to memory.

# We can't easily access conversation from a hook, but we can detect
# when the user rejects a tool call (indicated by empty/error output)
# or when an Edit/Write is immediately followed by another Edit/Write
# to the same file (likely a correction).

# For now, this hook tracks tool usage patterns for the dream cycle
# to analyze later. The real correction detection happens via the
# PreCompact hook which has conversation access.

TOOL_LOG="${YOCODE_HOME}/.tool-log"
mkdir -p "$(dirname "$TOOL_LOG")"

# Append tool usage (keep last 200 entries)
echo "$(date +%s)|${TOOL_NAME:-unknown}|${PROJECT_ROOT}" >> "$TOOL_LOG"

# Trim to last 200 lines
if [[ -f "$TOOL_LOG" ]]; then
  tail -200 "$TOOL_LOG" > "${TOOL_LOG}.tmp" && mv "${TOOL_LOG}.tmp" "$TOOL_LOG"
fi

# ─── Context Window Monitor ──────────────────────────────────────────────────
# Inspired by GSD's context window monitoring.
# Check if we can detect context pressure from Claude Code's environment.

# Claude Code exposes context metrics in some hook environments.
# If available, inject warnings at thresholds.

context_remaining="${CLAUDE_CONTEXT_REMAINING:-}"
if [[ -n "$context_remaining" ]]; then
  remaining_pct=$(echo "$context_remaining" | grep -oE '[0-9]+' | head -1)
  if [[ -n "$remaining_pct" ]]; then
    if [[ "$remaining_pct" -le 25 ]]; then
      echo "<yocode-warning level=\"critical\">"
      echo "Context window at ${remaining_pct}%. Prepare for context reset."
      echo "Consider committing current work and using /compact."
      echo "</yocode-warning>"
    elif [[ "$remaining_pct" -le 35 ]]; then
      echo "<yocode-warning level=\"warning\">"
      echo "Context window at ${remaining_pct}%. Avoid starting new complex work."
      echo "</yocode-warning>"
    fi
  fi
fi
