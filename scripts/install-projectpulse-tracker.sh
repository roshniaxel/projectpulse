#!/usr/bin/env bash
# Install the ProjectPulse Claude Code time-tracking hook globally, so that
# every Claude Code project on this machine reports tool-call activity to
# ProjectPulse without per-project setup.
#
# What this does:
#   1. Copies scripts/track-time.sh → ~/.local/share/projectpulse/scripts/
#      (a stable location independent of where the repo is cloned)
#   2. Patches ~/.claude/settings.json to add a PostToolUse hook that calls
#      `track-time.sh tick` on every tool call. Idempotent — re-runs replace
#      our own entries but never touch unrelated hooks.
#   3. Writes ~/.config/projectpulse/config with the API base, internal token,
#      and the user's email. Same file the /logtime skill reads, so once this
#      is set up both auto-tracking AND /logtime work.
#   4. Verifies the API base is reachable.
#
# Prerequisites: bash, jq (the macOS default install does not include jq —
# `brew install jq` if it's missing). The installer checks and exits with
# instructions if jq is not available.
#
# Usage:
#   ./scripts/install-projectpulse-tracker.sh
#   ./scripts/install-projectpulse-tracker.sh --force   # overwrite existing config

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_SCRIPT="$REPO_DIR/scripts/track-time.sh"
INSTALL_DIR="$HOME/.local/share/projectpulse/scripts"
INSTALL_SCRIPT="$INSTALL_DIR/track-time.sh"
SETTINGS_FILE="$HOME/.claude/settings.json"
CONFIG_DIR="$HOME/.config/projectpulse"
CONFIG_FILE="$CONFIG_DIR/config"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# --- jq guard ----------------------------------------------------------------
if ! command -v jq >/dev/null 2>&1; then
  cat <<EOF
✖ jq is required but not installed.
  Install with:  brew install jq
  Then re-run this script.
EOF
  exit 1
fi

# --- 1. Copy the script ------------------------------------------------------
if [ ! -f "$SRC_SCRIPT" ]; then
  echo "✖ track-time.sh not found at $SRC_SCRIPT"
  exit 1
fi

echo "→ Installing track-time.sh to $INSTALL_SCRIPT"
mkdir -p "$INSTALL_DIR"
cp "$SRC_SCRIPT" "$INSTALL_SCRIPT"
chmod +x "$INSTALL_SCRIPT"
echo "  ✓ Copied"

# --- 2. Patch ~/.claude/settings.json ----------------------------------------
echo "→ Wiring PostToolUse hook into $SETTINGS_FILE"
mkdir -p "$(dirname "$SETTINGS_FILE")"

# Create an empty settings.json if it doesn't exist
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# Our hook entry, marked so we can recognise + replace it idempotently.
# The marker lives in the command path itself (.local/share/projectpulse/scripts/)
# so re-running the installer strips the prior entry rather than duplicating.
HOOK_CMD="$INSTALL_SCRIPT tick"

# jq:
#   1. Strip any existing hooks entries whose command points at our install
#      directory (idempotent re-run).
#   2. Append our PostToolUse hook in the canonical nested format.
TMP_FILE="$(mktemp)"
jq --arg cmd "$HOOK_CMD" --arg marker "$INSTALL_DIR" '
  # Strip our previous entries from each event array
  if .hooks then
    .hooks |= with_entries(
      .value |= map(
        .hooks |= map(select(.command | tostring | contains($marker) | not))
      )
      | .value |= map(select((.hooks // []) | length > 0))
    )
  else . end
  # Ensure the hooks tree exists
  | .hooks //= {}
  | .hooks.PostToolUse //= []
  # Append our matcher group
  | .hooks.PostToolUse += [
      {
        "matcher": ".*",
        "hooks": [
          { "type": "command", "command": $cmd }
        ]
      }
    ]
' "$SETTINGS_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$SETTINGS_FILE"
echo "  ✓ Hook added (or refreshed)"

# --- 3. Write ~/.config/projectpulse/config ----------------------------------
echo "→ Writing config to $CONFIG_FILE"

# Pull defaults from the repo's .env if present
ENV_FILE="$REPO_DIR/.env"
ENV_TOKEN=""
ENV_EMAIL=""
ENV_BASE="http://localhost:3000"
if [ -f "$ENV_FILE" ]; then
  ENV_TOKEN="$(grep -E '^INTERNAL_API_TOKEN=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)"
  ENV_EMAIL="$(grep -E '^PROJECTPULSE_USER_EMAIL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi

if [ -f "$CONFIG_FILE" ] && [ "$FORCE" -eq 0 ]; then
  echo "  ⚠ Config already exists at $CONFIG_FILE. Re-run with --force to overwrite, or edit it by hand."
else
  mkdir -p "$CONFIG_DIR"
  TOKEN="$ENV_TOKEN"
  if [ -z "$TOKEN" ]; then
    read -r -p "  INTERNAL_API_TOKEN (shared secret from ProjectPulse .env): " TOKEN
  fi
  EMAIL="$ENV_EMAIL"
  if [ -z "$EMAIL" ]; then
    read -r -p "  Your email (the one you sign in with): " EMAIL
  fi
  read -r -p "  ProjectPulse API base [$ENV_BASE]: " API_BASE
  API_BASE="${API_BASE:-$ENV_BASE}"

  cat > "$CONFIG_FILE" <<EOF
# ProjectPulse tracker config — generated $(date '+%Y-%m-%d %H:%M:%S')
PROJECTPULSE_API_BASE="$API_BASE"
INTERNAL_API_TOKEN="$TOKEN"
PROJECTPULSE_USER_EMAIL="$EMAIL"
EOF
  chmod 600 "$CONFIG_FILE"
  echo "  ✓ Wrote $CONFIG_FILE (mode 600)"
fi

# --- 4. Verify reachability --------------------------------------------------
source "$CONFIG_FILE"
echo "→ Checking $PROJECTPULSE_API_BASE"
if curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "$PROJECTPULSE_API_BASE/api/auth/session" 2>/dev/null | grep -qE '^(200|401)$'; then
  echo "  ✓ Reachable"
else
  echo "  ⚠ Could not reach $PROJECTPULSE_API_BASE — start the dev server (or deploy) before using the tracker."
fi

cat <<EOF

✓ Done.

Next steps:
  1. Restart Claude Code (settings load at session start)
  2. In any Claude Code project, start a session:
       \$ $INSTALL_SCRIPT start RGU-250 "Working on the auth refactor"
  3. Code as normal — every tool call auto-ticks
  4. When done:
       \$ $INSTALL_SCRIPT stop      # creates a draft TimeEntry
       \$ $INSTALL_SCRIPT log       # stop + push to Jira immediately

To uninstall:
  rm -rf $INSTALL_DIR
  Edit $SETTINGS_FILE and remove hook entries pointing at $INSTALL_DIR
  rm $CONFIG_FILE
EOF
