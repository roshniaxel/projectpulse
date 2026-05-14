---
name: logtime
description: Log time spent on a Jira ticket to ProjectPulse. Use when the user types `/logtime`, asks to "log time", "record time", "add time to a ticket", or wants to capture thinking/discussion/review/manual-testing time that wasn't auto-tracked by `track-time.sh`.
---

# /logtime — manual time logging via ProjectPulse

You are helping the user record a manual time entry. ProjectPulse's auto-tracker
captures Claude tool-call density (i.e. actual implementation time). The
`/logtime` skill is for everything that auto-tracking misses: thinking,
discussions about the ticket, code review, manual testing, designing the
approach, etc.

## How to invoke

The user can call this in two ways:

1. **One-shot with args** — `/logtime <TICKET> <DURATION> <DESCRIPTION>`
   - Example: `/logtime RGU-224 30m reviewed PR feedback`
   - Example: `/logtime RGU-224 1h 15m designed schema for time tracking`
   - Parse args greedily: first token is ticket key, second token (and an
     optional third if it's a unit) is duration, everything else is description.

2. **Conversational** — `/logtime` with no args. Ask in order:
   1. "Which ticket? (e.g. `RGU-224`, or `none` for unticketed time)"
   2. "How long? (e.g. `30m`, `1h 15m`)"
   3. "What did you spend the time on?"
   4. "Push this to Jira as a worklog now, or save as a draft for later review?
      (push / draft, default: draft)"

## Configuration

The skill reads three values, in priority order:

1. Environment variables in the current shell:
   - `PROJECTPULSE_API_BASE` (default: `http://localhost:3000`)
   - `INTERNAL_API_TOKEN`
   - `PROJECTPULSE_USER_EMAIL`
2. Config file at `~/.config/projectpulse/config` (shell-style `KEY=VALUE` lines)

If `INTERNAL_API_TOKEN` or `PROJECTPULSE_USER_EMAIL` is missing, tell the user:
> "ProjectPulse is not configured for `/logtime` yet. Run
> `~/projectpulse/scripts/install-logtime-skill.sh` (adjusting the path to
> wherever you cloned ProjectPulse), then try again."

## The actual call

Use the Bash tool to POST to ProjectPulse:

```bash
# Load config if env vars aren't set
[ -z "$INTERNAL_API_TOKEN" ] && [ -f ~/.config/projectpulse/config ] && \
  source ~/.config/projectpulse/config

API_BASE="${PROJECTPULSE_API_BASE:-http://localhost:3000}"

curl -sS -X POST "$API_BASE/api/time-entries" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: $INTERNAL_API_TOKEN" \
  -H "X-User-Email: $PROJECTPULSE_USER_EMAIL" \
  -d "$(cat <<EOF
{
  "ticketKey": "<TICKET or null>",
  "duration": "<DURATION>",
  "description": "<DESCRIPTION>",
  "source": "manual",
  "pushToJira": <true|false>
}
EOF
)"
```

Replace placeholders with the actual values. If the ticket is `none`, send
`"ticketKey": null` (omit ticketKey from the JSON).

## Reporting back

Parse the JSON response and tell the user:
- On success with `status: "logged"`:
  > "✅ Logged {durationLabel} to {ticketKey} (Jira worklog {worklogId})"
- On success with `status: "draft"`:
  > "📝 Saved {durationLabel} for {ticketKey} as a draft. Review at
  > http://localhost:3000/tools to push it to Jira when ready."
- On HTTP 401:
  > "Authentication failed. Check that `INTERNAL_API_TOKEN` in your
  > `~/.config/projectpulse/config` matches the value in ProjectPulse's `.env`."
- On HTTP 412 (Jira not connected) when push was requested:
  > "Saved as draft — couldn't push to Jira because Jira isn't connected. Open
  > http://localhost:3000/settings to connect it via OAuth."
- On other errors:
  > "Failed: {error}"

## Things to keep in mind

- **Idempotency:** every `/logtime` call creates a new `TimeEntry`. There's no
  dedupe by ticket+description, so warn the user if they seem to be running it
  twice in a row with the same args.
- **No estimate check:** unlike the auto-tracker's "start work" flow, `/logtime`
  doesn't prompt about missing estimates. The user is recording past time, not
  starting new work.
- **Duration format:** accept `30m`, `1h`, `1h 30m`, `45`, `45m`. A bare number
  is treated as minutes by the API. Don't accept `0.5h` — use `30m` instead.
- **The dev server must be running** at `PROJECTPULSE_API_BASE` for this to
  work. If `curl` fails to connect, tell the user to start ProjectPulse first.
