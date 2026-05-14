#!/bin/bash
# ProjectPulse Active Time Tracker — DB-backed
#
# Pipes every tool call into ProjectPulse's /api/tool-sessions/tick endpoint,
# which stores ticks in SQLite. On stop, the API materializes a TimeEntry
# (status=draft) and — if the user has autoPushClaudeTime enabled — also
# pushes a Jira worklog.
#
# Required env vars (loaded from .env or shell):
#   PROJECTPULSE_API_BASE        e.g. http://localhost:3000
#   PROJECTPULSE_INTERNAL_TOKEN  matches INTERNAL_API_TOKEN in .env
#   PROJECTPULSE_USER_EMAIL      your @axelerant.com address
#
# Usage:
#   ./scripts/track-time.sh start RGU-224 "Description"
#   ./scripts/track-time.sh tick              # called by PostToolUse hook
#   ./scripts/track-time.sh stop              # ends session, creates TimeEntry
#   ./scripts/track-time.sh log               # alias for: stop --push
#   ./scripts/track-time.sh status

TRACK_FILE="/tmp/pp-track.json"
API_BASE="${PROJECTPULSE_API_BASE:-http://localhost:3000}"
TOKEN="${PROJECTPULSE_INTERNAL_TOKEN:-}"
USER_EMAIL="${PROJECTPULSE_USER_EMAIL:-}"

if [ -f .env ]; then
  # Pull values from .env if not already exported
  TOKEN="${TOKEN:-$(grep -E '^INTERNAL_API_TOKEN=' .env | cut -d= -f2- | tr -d '"')}"
  USER_EMAIL="${USER_EMAIL:-$(grep -E '^PROJECTPULSE_USER_EMAIL=' .env | cut -d= -f2- | tr -d '"')}"
fi

api_call() {
  local path="$1"
  local payload="$2"
  curl -s -X POST "$API_BASE$path" \
    -H "Content-Type: application/json" \
    -H "X-Internal-Token: $TOKEN" \
    -H "X-User-Email: $USER_EMAIL" \
    -d "$payload"
}

case "$1" in
  start)
    TICKET="${2:?Ticket key required (e.g. RGU-224)}"
    DESCRIPTION="${3:-Implementation work on $TICKET via Claude Code}"
    echo "{\"ticket\":\"$TICKET\",\"description\":\"$DESCRIPTION\"}" > "$TRACK_FILE"

    RESULT=$(api_call "/api/tool-sessions/tick" "{\"ticketKey\":\"$TICKET\",\"description\":\"$DESCRIPTION\"}")
    SESSION_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sessionId',''))" 2>/dev/null)

    if [ -z "$SESSION_ID" ]; then
      echo "⚠  Could not start session — check API_BASE / INTERNAL_TOKEN / USER_EMAIL"
      echo "   Response: $RESULT"
      exit 1
    fi

    echo "⏱  Tracking $TICKET (session $SESSION_ID)"
    echo "   Active time only — idle gaps > 3min are excluded"
    ;;

  tick)
    if [ -f "$TRACK_FILE" ]; then
      TICKET=$(python3 -c "import json; print(json.load(open('$TRACK_FILE'))['ticket'])" 2>/dev/null)
      [ -n "$TICKET" ] && api_call "/api/tool-sessions/tick" "{\"ticketKey\":\"$TICKET\"}" > /dev/null
    fi
    ;;

  stop|log)
    if [ ! -f "$TRACK_FILE" ]; then
      echo "No active timer"
      exit 1
    fi
    TICKET=$(python3 -c "import json; print(json.load(open('$TRACK_FILE'))['ticket'])")

    PUSH_FLAG="false"
    [ "$1" = "log" ] && PUSH_FLAG="true"

    RESULT=$(api_call "/api/tool-sessions/stop" "{\"ticketKey\":\"$TICKET\",\"pushToJira\":$PUSH_FLAG}")
    STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
    DURATION=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('durationLabel','?'))" 2>/dev/null)
    WORKLOG_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('worklogId') or '')" 2>/dev/null)

    if [ "$STATUS" = "logged" ]; then
      echo "✅ $TICKET — $DURATION pushed to Jira (worklog $WORKLOG_ID)"
    elif [ "$STATUS" = "draft" ]; then
      echo "📝 $TICKET — $DURATION saved as draft (approve from /tools to push to Jira)"
    else
      echo "❌ Stop failed: $RESULT"
      exit 1
    fi

    rm -f "$TRACK_FILE"
    ;;

  status)
    if [ ! -f "$TRACK_FILE" ]; then
      echo "No active timer"
      exit 0
    fi
    TICKET=$(python3 -c "import json; print(json.load(open('$TRACK_FILE'))['ticket'])")
    echo "⏱  Tracking $TICKET — run 'stop' to finalize, 'log' to push to Jira immediately"
    ;;

  *)
    echo "Usage: track-time.sh {start|tick|stop|log|status} [ticket-key] [description]"
    exit 1
    ;;
esac
