#!/usr/bin/env bash
# Install the /logtime Claude Code skill globally so it works in any project.
#
# What this does:
#   1. Copies .claude-skills/logtime/SKILL.md → ~/.claude/skills/logtime/SKILL.md
#   2. Writes ~/.config/projectpulse/config with API base, token, and email
#   3. Verifies the dev server is reachable
#
# Re-run safely — it overwrites the skill file but won't clobber existing
# config values unless you pass --force.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_SRC="$REPO_DIR/.claude-skills/logtime/SKILL.md"
SKILL_DST_DIR="$HOME/.claude/skills/logtime"
SKILL_DST="$SKILL_DST_DIR/SKILL.md"
LEGACY_SKILL_DST="$HOME/.claude/skills/logtime.skill.md"
CONFIG_DIR="$HOME/.config/projectpulse"
CONFIG_FILE="$CONFIG_DIR/config"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

# Pull defaults from the repo's .env if present
ENV_FILE="$REPO_DIR/.env"
ENV_TOKEN=""
ENV_EMAIL=""
ENV_BASE="http://localhost:3000"
if [ -f "$ENV_FILE" ]; then
  ENV_TOKEN="$(grep -E '^INTERNAL_API_TOKEN=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)"
  ENV_EMAIL="$(grep -E '^PROJECTPULSE_USER_EMAIL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' || true)"
fi

echo "→ Installing /logtime skill"

if [ ! -f "$SKILL_SRC" ]; then
  echo "✖ Skill source not found at $SKILL_SRC"
  exit 1
fi

mkdir -p "$SKILL_DST_DIR"
cp "$SKILL_SRC" "$SKILL_DST"
echo "  ✓ Copied skill → $SKILL_DST"

# Remove any prior flat-file install — Claude Code only recognises the
# <skill-name>/SKILL.md layout, so a stale logtime.skill.md alongside the
# new folder is harmless but confusing.
if [ -f "$LEGACY_SKILL_DST" ]; then
  rm -f "$LEGACY_SKILL_DST"
  echo "  ✓ Removed legacy $LEGACY_SKILL_DST"
fi

echo "→ Writing config to $CONFIG_FILE"

if [ -f "$CONFIG_FILE" ] && [ "$FORCE" -eq 0 ]; then
  echo "  ⚠ Config already exists. Re-run with --force to overwrite, or edit by hand."
else
  mkdir -p "$CONFIG_DIR"

  # Prompt for token if not in .env
  TOKEN="$ENV_TOKEN"
  if [ -z "$TOKEN" ]; then
    read -r -p "  INTERNAL_API_TOKEN (from ProjectPulse .env): " TOKEN
  fi

  # Prompt for email
  EMAIL="$ENV_EMAIL"
  if [ -z "$EMAIL" ]; then
    read -r -p "  Your email (the one you sign in with): " EMAIL
  fi

  # API base
  read -r -p "  ProjectPulse API base [$ENV_BASE]: " API_BASE
  API_BASE="${API_BASE:-$ENV_BASE}"

  cat > "$CONFIG_FILE" <<EOF
# ProjectPulse /logtime config — generated $(date '+%Y-%m-%d %H:%M:%S')
PROJECTPULSE_API_BASE="$API_BASE"
INTERNAL_API_TOKEN="$TOKEN"
PROJECTPULSE_USER_EMAIL="$EMAIL"
EOF
  chmod 600 "$CONFIG_FILE"
  echo "  ✓ Wrote $CONFIG_FILE (mode 600)"
fi

# Verify reachability
source "$CONFIG_FILE"
echo "→ Checking $PROJECTPULSE_API_BASE"
if curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "$PROJECTPULSE_API_BASE/api/auth/session" 2>/dev/null | grep -qE '^(200|401)$'; then
  echo "  ✓ Reachable"
else
  echo "  ⚠ Could not reach $PROJECTPULSE_API_BASE — start the dev server with 'npm run dev' before using /logtime."
fi

echo ""
echo "Done. Restart Claude Code if it's running, then type /logtime in any project."
echo "Usage:"
echo "  /logtime                                  # conversational"
echo "  /logtime RGU-224 30m reviewed PR feedback # one-shot"
