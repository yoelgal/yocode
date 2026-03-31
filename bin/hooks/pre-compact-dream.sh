#!/usr/bin/env bash
# yocode PreCompact hook
# Before context compresses, capture important session state.
# Target: <200ms execution time.
#
# This is the last chance to save context before it's lost to compaction.

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

  # What files were touched this session? Use tool log
  tool_log="${YOCODE_HOME}/.tool-log"
  if [[ -f "$tool_log" ]]; then
    echo "## Tool Activity"
    echo ""
    echo "$(wc -l < "$tool_log" | tr -d ' ') tool calls this session."
    echo ""

    # Most-used tools
    echo "### Most-used tools"
    echo '```'
    awk -F'|' '{print $2}' "$tool_log" | sort | uniq -c | sort -rn | head -10
    echo '```'
    echo ""
  fi

  # Git changes since session start
  echo "## Uncommitted Changes"
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

} > "$SESSION_FILE"

# ─── Trim Old Sessions ───────────────────────────────────────────────────────
# Keep last 50 session snapshots

if [[ -d "$SESSION_DIR" ]]; then
  file_count=$(find "$SESSION_DIR" -name '*.md' -type f | wc -l | tr -d ' ')
  if [[ "$file_count" -gt 50 ]]; then
    # Delete oldest files beyond 50
    find "$SESSION_DIR" -name '*.md' -type f | sort | head -n $(( file_count - 50 )) | xargs rm -f
  fi
fi

echo "<yocode-compact>"
echo "Session state captured. Context is being compressed."
echo "Important memories and decisions persist across compaction."
echo "</yocode-compact>"
