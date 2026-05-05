#!/bin/bash
# ProjectPulse Active Time Tracker
# Tracks ACTUAL working time — only counts intervals where Claude is
# actively making tool calls. Idle gaps (user thinking, waiting) are excluded.
#
# How it works:
#   1. A PostToolUse hook appends a timestamp on every tool call
#   2. "stop" calculates active time: consecutive calls < 3min apart = working
#   3. Gaps > 3min are treated as idle and excluded
#
# Usage:
#   ./scripts/track-time.sh start RGU-224 "Description"
#   ./scripts/track-time.sh tick              # Called by hook on each tool call
#   ./scripts/track-time.sh stop              # Calculate active time
#   ./scripts/track-time.sh log               # Push to Jira
#   ./scripts/track-time.sh status            # Show current status

TRACK_FILE="/tmp/pp-track.json"
TICKS_FILE="/tmp/pp-track-ticks.log"
API_BASE="http://localhost:3000"
IDLE_THRESHOLD=180  # seconds — gap > 3 min = idle

case "$1" in
  start)
    TICKET="${2:?Ticket key required (e.g. RGU-224)}"
    DESCRIPTION="${3:-Implementation work on $TICKET via Claude Code}"

    # Clean previous session
    rm -f "$TICKS_FILE"

    # Write tracking metadata
    echo "{\"ticket\":\"$TICKET\",\"start\":$(date +%s),\"description\":\"$DESCRIPTION\"}" > "$TRACK_FILE"

    # Record first tick
    date +%s >> "$TICKS_FILE"

    echo "⏱  Tracking active time for $TICKET"
    echo "   (Only tool call time is counted — idle gaps excluded)"
    ;;

  tick)
    # Called by the PostToolUse hook on every tool call
    if [ -f "$TRACK_FILE" ]; then
      date +%s >> "$TICKS_FILE"
    fi
    ;;

  stop)
    if [ ! -f "$TRACK_FILE" ]; then
      echo "No active timer"
      exit 1
    fi

    TICKET=$(python3 -c "import json; print(json.load(open('$TRACK_FILE'))['ticket'])")

    # Calculate active time from tick log
    RESULT=$(python3 << 'PYEOF'
import json

ticks_file = "/tmp/pp-track-ticks.log"
track_file = "/tmp/pp-track.json"
idle_threshold = 180  # 3 minutes

try:
    with open(ticks_file) as f:
        ticks = sorted(int(line.strip()) for line in f if line.strip())
except FileNotFoundError:
    ticks = []

if len(ticks) < 2:
    # Only one tick or none — count minimum 1 minute
    active_seconds = 60
    wall_seconds = 60
else:
    active_seconds = 0
    wall_seconds = ticks[-1] - ticks[0]
    for i in range(1, len(ticks)):
        gap = ticks[i] - ticks[i-1]
        if gap <= idle_threshold:
            active_seconds += gap
        # else: idle gap, skip it

    # Minimum 60 seconds
    active_seconds = max(active_seconds, 60)

active_minutes = round(active_seconds / 60)
wall_minutes = round(wall_seconds / 60)
h = active_minutes // 60
m = active_minutes % 60
time_str = f"{h}h {m}m" if h > 0 else f"{m}m"
wall_h = wall_minutes // 60
wall_m = wall_minutes % 60
wall_str = f"{wall_h}h {wall_m}m" if wall_h > 0 else f"{wall_m}m"

# Update track file
with open(track_file) as f:
    data = json.load(f)

data["end"] = ticks[-1] if ticks else 0
data["active_minutes"] = active_minutes
data["wall_minutes"] = wall_minutes
data["time_spent"] = time_str
data["tick_count"] = len(ticks)

with open(track_file, "w") as f:
    json.dump(data, f)

print(f"TICKET={data['ticket']}")
print(f"ACTIVE={time_str}")
print(f"WALL={wall_str}")
print(f"TICKS={len(ticks)}")
PYEOF
    )

    eval "$RESULT"
    echo "⏱  Timer stopped for $TICKET"
    echo "   Active time: $ACTIVE (across $TICKS tool calls)"
    echo "   Wall time:   $WALL"
    echo "   Idle time excluded automatically"
    ;;

  log)
    if [ ! -f "$TRACK_FILE" ]; then
      echo "No tracked time to log"
      exit 1
    fi

    TICKET=$(python3 -c "import json; print(json.load(open('$TRACK_FILE'))['ticket'])")
    TIME_SPENT=$(python3 -c "import json; print(json.load(open('$TRACK_FILE')).get('time_spent','1m'))")
    ACTIVE_MIN=$(python3 -c "import json; print(json.load(open('$TRACK_FILE')).get('active_minutes', 0))")
    DESC=$(python3 -c "import json; print(json.load(open('$TRACK_FILE')).get('description','Claude Code implementation'))")
    TICKS=$(python3 -c "import json; print(json.load(open('$TRACK_FILE')).get('tick_count', 0))")

    if [ "$ACTIVE_MIN" = "0" ]; then
      echo "No active time recorded. Run 'stop' first."
      exit 1
    fi

    # Push to Jira
    RESULT=$(curl -s -X POST "$API_BASE/api/jira/worklog" \
      -H "Content-Type: application/json" \
      -d "{\"ticketKey\":\"$TICKET\",\"timeSpent\":\"$TIME_SPENT\",\"description\":\"$DESC ($TICKS tool calls tracked)\"}")

    SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))")

    if [ "$SUCCESS" = "True" ]; then
      echo "✅ Logged $TIME_SPENT (active) to $TICKET in Jira"
      rm -f "$TRACK_FILE" "$TICKS_FILE"
    else
      ERROR=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error', 'Unknown error'))")
      echo "❌ Failed: $ERROR"
    fi
    ;;

  status)
    if [ ! -f "$TRACK_FILE" ]; then
      echo "No active timer"
      exit 0
    fi

    TICKET=$(python3 -c "import json; print(json.load(open('$TRACK_FILE'))['ticket'])")
    END=$(python3 -c "import json; print(json.load(open('$TRACK_FILE')).get('end', 0))")
    TICK_COUNT=0
    if [ -f "$TICKS_FILE" ]; then
      TICK_COUNT=$(wc -l < "$TICKS_FILE" | tr -d ' ')
    fi

    if [ "$END" != "0" ]; then
      TIME_SPENT=$(python3 -c "import json; print(json.load(open('$TRACK_FILE')).get('time_spent','?'))")
      echo "⏹  $TICKET — $TIME_SPENT active ($TICK_COUNT tool calls) — ready to log"
    else
      NOW=$(date +%s)
      START=$(python3 -c "import json; print(json.load(open('$TRACK_FILE'))['start'])")
      WALL=$(( (NOW - START) / 60 ))
      echo "⏱  $TICKET — tracking ($TICK_COUNT tool calls so far, ${WALL}m wall time)"
    fi
    ;;

  *)
    echo "Usage: track-time.sh {start|stop|log|status} [ticket-key] [description]"
    echo ""
    echo "Commands:"
    echo "  start TICKET [desc]  Start tracking active time for a ticket"
    echo "  tick                 Record a tool call (called by hook automatically)"
    echo "  stop                 Calculate active time (excludes idle gaps > 3min)"
    echo "  log                  Push active time to Jira as a worklog"
    echo "  status               Show current tracking state"
    exit 1
    ;;
esac
