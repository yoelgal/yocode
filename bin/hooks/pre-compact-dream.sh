#!/usr/bin/env bash
# yocode PreCompact hook
# Before context compresses, capture important session state.
# Saves corrections log, recent tool activity, and git state.
# Target: <200ms execution time.

set -euo pipefail

YOCODE_HOME="${HOME}/.yocode"
SESSION_DIR="${YOCODE_HOME}/.sessions"
PROJECT_ROOT="$(pwd)"
TIMESTAMP=$(date +%s)
SESSION_FILE="${SESSION_DIR}/${TIMESTAMP}.md"

mkdir -p "$SESSION_DIR"

# ─── Capture Session State ────────────────────────────────────────────────────

{
  echo "---"
  echo "timestamp: ${TIMESTAMP}"
  echo "project: ${PROJECT_ROOT}"
  echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "---"
  echo ""
  echo "# Session Snapshot (pre-compact)"
  echo ""

  # Tool activity summary
  tool_log="${YOCODE_HOME}/.tool-log"
  if [[ -f "$tool_log" ]]; then
    # Count tools used this session (entries matching this project, last hour)
    one_hour_ago=$(( TIMESTAMP - 3600 ))
    session_tools=$(awk -F'|' -v cutoff="$one_hour_ago" -v proj="$PROJECT_ROOT" \
      '$1 > cutoff && $3 == proj {print $2}' "$tool_log" 2>/dev/null)
    tool_count=$(echo "$session_tools" | grep -c . 2>/dev/null || echo "0")

    echo "## Tool Activity"
    echo ""
    echo "${tool_count} tool calls this session."
    echo ""

    if [[ "$tool_count" -gt 0 ]]; then
      echo "### Most-used tools"
      echo '```'
      echo "$session_tools" | sort | uniq -c | sort -rn | head -10
      echo '```'
      echo ""
    fi
  fi

  # Correction signals
  corrections_log="${YOCODE_HOME}/.corrections-log"
  if [[ -f "$corrections_log" ]]; then
    one_hour_ago=$(( TIMESTAMP - 3600 ))
    correction_count=$(awk -F'|' -v cutoff="$one_hour_ago" '$1 > cutoff' "$corrections_log" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$correction_count" -gt 0 ]]; then
      echo "## Correction Signals"
      echo ""
      echo "${correction_count} potential correction(s) detected."
      echo "Review with \`/yocode:learn\` to stage any as permanent rules."
      echo ""
    fi
  fi

  # Staged memories pending review
  staging_dir="${YOCODE_HOME}/.staging"
  if [[ -d "$staging_dir" ]]; then
    staged_count=$(find "$staging_dir" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$staged_count" -gt 0 ]]; then
      echo "## Staged Memories"
      echo ""
      echo "${staged_count} memory rule(s) awaiting review."
      echo ""
    fi
  fi

  # Git state
  echo "## Git State"
  echo ""
  echo '```'
  cd "$PROJECT_ROOT" 2>/dev/null && git diff --stat HEAD 2>/dev/null || echo "No git changes"
  echo '```'
  echo ""

  # Recent commits (likely from this session)
  echo "## Recent Commits"
  echo ""
  echo '```'
  cd "$PROJECT_ROOT" 2>/dev/null && git log --oneline -10 2>/dev/null || echo "No git history"
  echo '```'

} > "$SESSION_FILE" 2>/dev/null

# ─── Trim Old Sessions ───────────────────────────────────────────────────────
# Keep last 30 session snapshots

if [[ -d "$SESSION_DIR" ]]; then
  file_count=$(find "$SESSION_DIR" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$file_count" -gt 30 ]]; then
    find "$SESSION_DIR" -name '*.md' -type f | sort | head -n $(( file_count - 30 )) | xargs rm -f 2>/dev/null || true
  fi
fi

# ─── Trim Corrections Log ────────────────────────────────────────────────────

corrections_log="${YOCODE_HOME}/.corrections-log"
if [[ -f "$corrections_log" ]]; then
  tail -200 "$corrections_log" > "${corrections_log}.tmp" 2>/dev/null && mv "${corrections_log}.tmp" "$corrections_log" 2>/dev/null || true
fi

echo "<yocode-compact>"
echo "Session state captured to ${SESSION_FILE}."
echo "Memories and corrections persist across compaction."
echo "</yocode-compact>"
