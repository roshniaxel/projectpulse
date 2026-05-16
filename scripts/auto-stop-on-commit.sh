#!/usr/bin/env bash
# Auto-stop-on-commit hook for ProjectPulse.
#
# Wired in ~/.claude/settings.json as a PostToolUse hook with matcher "Bash".
# Reads PostToolUse JSON on stdin; if the Bash command was a `git commit` /
# `gh pr create` containing a ticket key, and a ProjectPulse session is
# active for the same ticket, stops the session and pushes the worklog to
# Jira (`track-time.sh log`).
#
# Always exits 0 — must never block tool execution.
#
# Debug log: /tmp/projectpulse-auto-stop.log
# Dry run:   PROJECTPULSE_AUTO_STOP_DRY_RUN=1 to log decisions without
#            actually invoking track-time.sh.

set -u

LOG="/tmp/projectpulse-auto-stop.log"
TRACK_FILE="/tmp/pp-track.json"
TRACK_SCRIPT="${PROJECTPULSE_TRACK_SCRIPT:-$HOME/.local/share/projectpulse/scripts/track-time.sh}"
CONFIG="${PROJECTPULSE_CONFIG:-$HOME/.config/projectpulse/config}"
DRY_RUN="${PROJECTPULSE_AUTO_STOP_DRY_RUN:-0}"

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

# Bail fast if no active session — nothing to stop.
if [ ! -f "$TRACK_FILE" ]; then
  exit 0
fi

# Capture stdin (Claude Code passes JSON for hooks)
STDIN_DATA=""
if [ ! -t 0 ]; then
  STDIN_DATA="$(cat)"
fi
[ -z "$STDIN_DATA" ] && exit 0

# Need jq to parse. Fail silently if missing.
if ! command -v jq >/dev/null 2>&1; then
  log "jq missing — cannot parse hook payload, skipping"
  exit 0
fi

TOOL_NAME=$(printf '%s' "$STDIN_DATA" | jq -r '.tool_name // empty' 2>/dev/null)
[ "$TOOL_NAME" = "Bash" ] || exit 0

CMD=$(printf '%s' "$STDIN_DATA" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0

# Detect commit-like actions. Match git commit (with -m / -am / --message /
# --amend / -F) and gh pr create (the title or body usually has the ticket).
# We don't match plain `git commit` with no flags because that opens an editor
# and we have no message to inspect.
is_commit_action() {
  case "$1" in
    *"git commit"*-m*|*"git commit"*-am*|*"git commit"*-M*|*"git commit"*--message*|*"git commit"*--amend*|*"git commit"*-F*)
      return 0 ;;
    *"gh pr create"*)
      return 0 ;;
    *)
      return 1 ;;
  esac
}

is_commit_action "$CMD" || exit 0

# Extract first ticket-key pattern (uppercase project key, dash, digits).
TICKET=$(printf '%s' "$CMD" | grep -oE '[A-Z][A-Z0-9]+-[0-9]+' | head -1)
if [ -z "$TICKET" ]; then
  log "commit-like cmd but no ticket key, skipping"
  exit 0
fi

# Compare against active session's ticket. If they differ, don't stop —
# the active session probably belongs to a different work stream.
ACTIVE_TICKET=$(jq -r '.ticket // empty' "$TRACK_FILE" 2>/dev/null)
if [ -n "$ACTIVE_TICKET" ] && [ "$ACTIVE_TICKET" != "$TICKET" ]; then
  log "ticket mismatch: active=$ACTIVE_TICKET, commit=$TICKET — skipping"
  exit 0
fi

# Source config + bridge env var name. install-projectpulse-tracker.sh writes
# INTERNAL_API_TOKEN to the config, but track-time.sh reads it as
# PROJECTPULSE_INTERNAL_TOKEN. The hook runs in an env that doesn't inherit
# the user's shell rc, so we have to load it ourselves.
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
fi
export PROJECTPULSE_API_BASE="${PROJECTPULSE_API_BASE:-}"
export PROJECTPULSE_INTERNAL_TOKEN="${PROJECTPULSE_INTERNAL_TOKEN:-${INTERNAL_API_TOKEN:-}}"
export PROJECTPULSE_USER_EMAIL="${PROJECTPULSE_USER_EMAIL:-}"

if [ "$DRY_RUN" = "1" ]; then
  log "[dry-run] would stop $TICKET via $TRACK_SCRIPT log"
  exit 0
fi

if [ ! -x "$TRACK_SCRIPT" ]; then
  log "track-time.sh not found or not executable at $TRACK_SCRIPT — skipping"
  exit 0
fi

log "committing $TICKET — running track-time.sh log"
RESULT=$("$TRACK_SCRIPT" log 2>&1) || true
log "result: $RESULT"

exit 0
