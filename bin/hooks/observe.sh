#!/usr/bin/env bash
# yocode PostToolUse observer hook
# Watches for correction patterns, logs tool usage, monitors context pressure.
# Pattern matching only — no LLM calls. Target: <50ms.
#
# Claude Code passes hook context via environment variables and stdin.

set -euo pipefail

YOCODE_HOME="${HOME}/.yocode"
YOCODE_CLI="${YOCODE_HOME}/bin/yocode.ts"
PROJECT_ROOT="$(pwd)"

# Read tool output from stdin if available
tool_output=$(cat 2>/dev/null || true)

# Quick exit for non-interesting tools
tool_name="${TOOL_NAME:-}"
case "$tool_name" in
  Read|Glob|Grep|TaskCreate|TaskUpdate|TaskGet|TaskList|TaskStop|TaskOutput)
    exit 0
    ;;
esac

# ─── Tool Usage Logging ──────────────────────────────────────────────────────

TOOL_LOG="${YOCODE_HOME}/.tool-log"
mkdir -p "$(dirname "$TOOL_LOG")"

echo "$(date +%s)|${tool_name:-unknown}|${PROJECT_ROOT}" >> "$TOOL_LOG" 2>/dev/null || true

# Trim to last 500 lines
if [[ -f "$TOOL_LOG" ]]; then
  tail -500 "$TOOL_LOG" > "${TOOL_LOG}.tmp" 2>/dev/null && mv "${TOOL_LOG}.tmp" "$TOOL_LOG" 2>/dev/null || true
fi

# ─── Correction Detection ────────────────────────────────────────────────────
# Detect patterns that suggest the user corrected Claude's approach.
# These get staged as potential memory rules.
#
# Signals we can detect from tool context:
# 1. Edit immediately after a Write to the same file (user fixing AI output)
# 2. Tool rejection (empty output or error on a Write/Edit)
# 3. Consecutive edits to the same file (iterating on a fix)

if [[ -f "$TOOL_LOG" ]]; then
  last_two=$(tail -2 "$TOOL_LOG" 2>/dev/null)
  line_count=$(echo "$last_two" | wc -l | tr -d ' ')

  if [[ "$line_count" -ge 2 ]]; then
    prev_tool=$(echo "$last_two" | head -1 | cut -d'|' -f2)
    curr_tool=$(echo "$last_two" | tail -1 | cut -d'|' -f2)

    # Pattern: Write followed by Edit = potential correction
    if [[ "$prev_tool" == "Write" && "$curr_tool" == "Edit" ]]; then
      # Log as potential correction signal
      echo "$(date +%s)|correction_signal|write_then_edit|${PROJECT_ROOT}" >> "${YOCODE_HOME}/.corrections-log" 2>/dev/null || true
    fi

    # Pattern: Edit followed by Edit on same file = iterating on fix
    if [[ "$prev_tool" == "Edit" && "$curr_tool" == "Edit" ]]; then
      echo "$(date +%s)|correction_signal|repeated_edit|${PROJECT_ROOT}" >> "${YOCODE_HOME}/.corrections-log" 2>/dev/null || true
    fi
  fi
fi

# ─── Context Window Monitor ──────────────────────────────────────────────────
# Claude Code may expose context metrics in hook environment.

context_remaining="${CLAUDE_CONTEXT_REMAINING_PERCENT:-}"
if [[ -n "$context_remaining" ]]; then
  remaining_pct=$(echo "$context_remaining" | grep -oE '[0-9]+' | head -1)
  if [[ -n "$remaining_pct" ]]; then
    if [[ "$remaining_pct" -le 25 ]]; then
      echo "<yocode-warning level=\"critical\">"
      echo "Context window at ${remaining_pct}%. Prepare for context reset."
      echo "Consider committing current work and running /compact."
      echo "</yocode-warning>"
    elif [[ "$remaining_pct" -le 35 ]]; then
      echo "<yocode-warning level=\"warning\">"
      echo "Context window at ${remaining_pct}%. Avoid starting new complex work."
      echo "</yocode-warning>"
    fi
  fi
fi
