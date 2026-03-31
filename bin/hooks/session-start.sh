#!/usr/bin/env bash
# yocode SessionStart hook
# Loads L0 memories, injects axioms, checks dream trigger.
# Target: <100ms execution time.

set -euo pipefail

YOCODE_HOME="${HOME}/.yocode"
GLOBAL_MEMORY="${YOCODE_HOME}/memory/global"
PROJECT_ROOT="$(pwd)"
PROJECT_MEMORY="${PROJECT_ROOT}/.yocode/memory"

output=""

# ─── Load Axioms ──────────────────────────────────────────────────────────────

axioms_dir="${YOCODE_HOME}/axioms"
if [[ -d "$axioms_dir" ]]; then
  for axiom in "$axioms_dir"/*.md; do
    [[ -f "$axiom" ]] || continue
    # Strip frontmatter, keep body
    content=$(sed -n '/^---$/,/^---$/!p' "$axiom" | head -30)
    if [[ -n "$content" ]]; then
      output+="$content"$'\n\n'
    fi
  done
fi

# ─── Load L0: Global Index ───────────────────────────────────────────────────

global_index="${GLOBAL_MEMORY}/index.md"
if [[ -f "$global_index" ]]; then
  output+="$(cat "$global_index")"$'\n\n'
fi

# ─── Load L0: Project Index ──────────────────────────────────────────────────

project_index="${PROJECT_MEMORY}/index.md"
if [[ -f "$project_index" ]]; then
  output+="$(cat "$project_index")"$'\n\n'
fi

# ─── Load User Profile ───────────────────────────────────────────────────────

profile="${GLOBAL_MEMORY}/profile.md"
if [[ -f "$profile" ]]; then
  # Only inject if profile has been populated (not just the template)
  if grep -q "^_Generated during" "$profile" 2>/dev/null; then
    : # Skip template
  else
    content=$(sed -n '/^---$/,/^---$/!p' "$profile" | head -20)
    output+="$content"$'\n\n'
  fi
fi

# ─── Check Dream Trigger ─────────────────────────────────────────────────────

dream_state="${YOCODE_HOME}/.dream-state"
if [[ -f "$dream_state" ]]; then
  last_dream=$(cat "$dream_state" 2>/dev/null | head -1)
  session_count=$(cat "$dream_state" 2>/dev/null | tail -1)
  now=$(date +%s)
  day_ago=$(( now - 86400 ))

  if [[ -n "$last_dream" && -n "$session_count" ]]; then
    if [[ "$last_dream" -lt "$day_ago" && "$session_count" -ge 5 ]]; then
      output+=$'\n> **Dream cycle available.** Run `/yocode:dream` to consolidate memories.\n'
    fi
  fi
fi

# ─── Increment Session Counter ───────────────────────────────────────────────

if [[ -f "$dream_state" ]]; then
  last_dream=$(head -1 "$dream_state")
  count=$(tail -1 "$dream_state")
  echo "$last_dream" > "$dream_state"
  echo "$(( count + 1 ))" >> "$dream_state"
else
  mkdir -p "$(dirname "$dream_state")"
  echo "$(date +%s)" > "$dream_state"
  echo "1" >> "$dream_state"
fi

# ─── Context Bracket Detection ────────────────────────────────────────────────
# Adapts memory injection verbosity based on remaining context.
# FRESH (70%+): lean injection, trust recent context
# MODERATE (40-70%): reinforce key rules
# DEPLETED (15-40%): heavy reinforcement, include axioms in full
# CRITICAL (<15%): suggest compaction

context_pct="${CLAUDE_CONTEXT_REMAINING_PERCENT:-100}"
if [[ "$context_pct" =~ ^[0-9]+$ ]]; then
  if [[ "$context_pct" -le 15 ]]; then
    output+=$'\n<yocode-bracket level="CRITICAL">\n'
    output+="Context is critically low (${context_pct}%). Run /compact now."$'\n'
    output+="Commit any uncommitted work first."$'\n'
    output+=$'</yocode-bracket>\n'
  elif [[ "$context_pct" -le 40 ]]; then
    output+=$'\n<yocode-bracket level="DEPLETED">\n'
    output+="Context at ${context_pct}%. Reinforcing key rules."$'\n'
    # Re-inject axioms in full for depleted context
    if [[ -d "$axioms_dir" ]]; then
      for axiom in "$axioms_dir"/*.md; do
        [[ -f "$axiom" ]] || continue
        content=$(sed -n '/^---$/,/^---$/!p' "$axiom" | head -15)
        if [[ -n "$content" ]]; then
          output+="$content"$'\n'
        fi
      done
    fi
    output+=$'</yocode-bracket>\n'
  elif [[ "$context_pct" -le 70 ]]; then
    output+=$'\n<yocode-bracket level="MODERATE" />\n'
  fi
  # FRESH (70%+): no extra injection, lean context
fi

# ─── Output ───────────────────────────────────────────────────────────────────

if [[ -n "$output" ]]; then
  echo "<yocode-context>"
  echo "$output"
  echo "</yocode-context>"
fi
