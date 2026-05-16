#!/usr/bin/env bash
# Logs everything a Claude Code hook receives — env vars, stdin payload,
# args. Append-only so multiple hook invocations stack up. Inspect with:
#   tail -f /tmp/projectpulse-hook-probe.log

LOG=/tmp/projectpulse-hook-probe.log

# Capture stdin (Claude Code passes JSON tool-input on stdin for hooks)
STDIN_DATA=""
if [ ! -t 0 ]; then
  STDIN_DATA="$(cat)"
fi

{
  echo "================================================================"
  echo "TIMESTAMP: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "HOOK_TYPE: ${1:-unknown}"
  echo "ARGS: $*"
  echo "PWD: $(pwd)"
  echo "---- ENV (CLAUDE_*) ----"
  env | grep -E '^CLAUDE_' | sort
  echo "---- STDIN ----"
  if [ -z "$STDIN_DATA" ]; then
    echo "(empty)"
  else
    echo "$STDIN_DATA"
  fi
  echo ""
} >> "$LOG"

# Always exit 0 — never block actual tool execution during the probe
exit 0
