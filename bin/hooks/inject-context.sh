#!/usr/bin/env bash
# yocode UserPromptSubmit hook
# Injects relevant L1 memories based on keywords in the user's message.
# Also classifies intent for mode-aware context injection.
# Target: <50ms execution time.
#
# Receives the user's prompt via stdin from Claude Code.

set -euo pipefail

YOCODE_HOME="${HOME}/.yocode"
YOCODE_CLI="${YOCODE_HOME}/bin/yocode.ts"

# Read user prompt from stdin
user_prompt=$(cat)

# Quick exit if prompt is very short
if [[ ${#user_prompt} -lt 10 ]]; then
  exit 0
fi

# Check CLI exists
if [[ ! -f "$YOCODE_CLI" ]]; then
  exit 0
fi

output=""

# ─── Extract Keywords from Prompt ─────────────────────────────────────────────
# Pull significant words (4+ chars, lowercase, unique) as keywords for L1 matching

keywords=$(echo "$user_prompt" | tr '[:upper:]' '[:lower:]' | tr -cs '[:alpha:]' '\n' | awk 'length >= 4' | sort -u | head -20 | tr '\n' ' ')

if [[ -n "$keywords" ]]; then
  # Call CLI for L1 memory injection
  l1_output=$(bun run "$YOCODE_CLI" memory load-l1 $keywords 2>/dev/null || true)

  if [[ -n "$l1_output" ]]; then
    output+="$l1_output"$'\n'
  fi
fi

# ─── Intent Classification ────────────────────────────────────────────────────
# Classify the message so Claude can adapt behavior without announcing mode changes

intent_json=$(bun run "$YOCODE_CLI" intent "$user_prompt" 2>/dev/null || true)

if [[ -n "$intent_json" ]]; then
  mode=$(echo "$intent_json" | grep -o '"mode":"[^"]*"' | head -1 | cut -d'"' -f4)
  confidence=$(echo "$intent_json" | grep -o '"confidence":"[^"]*"' | head -1 | cut -d'"' -f4)

  # Only inject mode hint if confidence is medium or high
  if [[ "$confidence" == "high" || "$confidence" == "medium" ]]; then
    if [[ -n "$mode" && "$mode" != "explore" ]]; then
      output+="<yocode-intent mode=\"$mode\" confidence=\"$confidence\" />"$'\n'
    fi
  fi
fi

# ─── Output ───────────────────────────────────────────────────────────────────

if [[ -n "$output" ]]; then
  echo "<yocode-memory>"
  echo "$output"
  echo "</yocode-memory>"
fi
