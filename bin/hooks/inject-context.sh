#!/usr/bin/env bash
# yocode UserPromptSubmit hook
# Injects relevant L1 memories based on keywords in the user's message.
# Target: <50ms execution time.
#
# Receives the user's prompt via stdin from Claude Code hooks system.

set -euo pipefail

YOCODE_HOME="${HOME}/.yocode"
STACKS_MEMORY="${YOCODE_HOME}/memory/stacks"
PROJECT_ROOT="$(pwd)"
PROJECT_MEMORY="${PROJECT_ROOT}/.yocode/memory"

# Read user prompt from stdin (Claude Code passes it)
user_prompt=$(cat)

# Quick exit if prompt is very short (single word, greeting, etc.)
if [[ ${#user_prompt} -lt 15 ]]; then
  exit 0
fi

output=""

# ─── Extract Keywords ─────────────────────────────────────────────────────────
# Simple: lowercase, split on spaces/punctuation, match against known stacks

prompt_lower=$(echo "$user_prompt" | tr '[:upper:]' '[:lower:]')

# ─── L1: Load Matching Stack Memories ─────────────────────────────────────────

if [[ -d "$STACKS_MEMORY" ]]; then
  for stack_dir in "$STACKS_MEMORY"/*/; do
    [[ -d "$stack_dir" ]] || continue
    stack_name=$(basename "$stack_dir")

    # Check if stack name appears in prompt
    if echo "$prompt_lower" | grep -qw "$stack_name" 2>/dev/null; then
      # Load all rules from this stack
      for rule in "$stack_dir"/*.md "$stack_dir"/rules/*.md; do
        [[ -f "$rule" ]] || continue
        [[ "$(basename "$rule")" == "index.md" ]] && continue

        # Strip frontmatter
        content=$(sed -n '/^---$/,/^---$/!p' "$rule" | head -20)
        if [[ -n "$content" ]]; then
          output+="[${stack_name}] ${content}"$'\n\n'
        fi
      done
    fi
  done
fi

# ─── L1: Load Matching Project Rules ─────────────────────────────────────────

if [[ -d "$PROJECT_MEMORY/rules" ]]; then
  for rule in "$PROJECT_MEMORY/rules"/*.md; do
    [[ -f "$rule" ]] || continue

    # Check if any keyword from the rule appears in the prompt
    # Read the keywords from frontmatter
    keywords=$(sed -n '/^keywords:/{ s/^keywords: *\[//; s/\].*//; s/,/ /g; p; }' "$rule" 2>/dev/null)

    for kw in $keywords; do
      kw_clean=$(echo "$kw" | tr -d '[:space:]"'"'" | tr '[:upper:]' '[:lower:]')
      if echo "$prompt_lower" | grep -qw "$kw_clean" 2>/dev/null; then
        content=$(sed -n '/^---$/,/^---$/!p' "$rule" | head -20)
        if [[ -n "$content" ]]; then
          output+="[project] ${content}"$'\n\n'
        fi
        break
      fi
    done
  done
fi

# ─── Output ───────────────────────────────────────────────────────────────────

if [[ -n "$output" ]]; then
  echo "<yocode-memory>"
  echo "$output"
  echo "</yocode-memory>"
fi
