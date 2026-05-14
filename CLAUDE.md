# ProjectPulse

AI-Powered Auto Time Logger + Proactive Risk & Blocker Alerting System.

## Tech Stack
- Next.js 16 (App Router) with TypeScript
- Tailwind CSS v4 + shadcn/ui (base-ui) components
- PostgreSQL + Prisma ORM (Neon free tier works for both local and prod)
- NextAuth.js v5 with Google OAuth (JWT sessions)
- Anthropic Claude API (for AI features — wired into roadmap, not yet shipped)

## Setup Guide (Local)

### Prerequisites
- Node.js 18+
- npm
- A Google account (`@axelerant.com` for team access)
- A Postgres database — easiest path: free account at [neon.tech](https://neon.tech) (takes ~2 min, gives you a connection string)

### 1. Clone & install
```bash
git clone git@github.com:roshniaxel/projectpulse.git
cd projectpulse
npm install
```

### 2. Create `.env`
```bash
cp .env.example .env
```

Fill in:
```bash
# Required — Postgres connection string. Get one free at neon.tech (~2 min):
#   1. neon.tech → Sign up → Create project
#   2. Copy the "Connection string" (starts with postgres://...)
DATABASE_URL="postgres://user:pass@host.neon.tech/db?sslmode=require"

# Required — Google OAuth (sign-in + Calendar in one step)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Required — JWT signing + AES-256 key for encrypted credentials. Pick once.
AUTH_SECRET="$(openssl rand -base64 32)"

# Required if you want the Jira "Connect with OAuth" button to work.
# Create an app at developer.atlassian.com — see step 2a below.
ATLASSIAN_CLIENT_ID=""
ATLASSIAN_CLIENT_SECRET=""

# Optional — only for scripts/track-time.sh shell tracker
INTERNAL_API_TOKEN="$(openssl rand -hex 32)"
PROJECTPULSE_USER_EMAIL="you@axelerant.com"
```

> **Google OAuth credentials are shared across the team.** Ask the project admin. The OAuth app is *Internal* (Axelerant workspace only), so any `@axelerant.com` account can log in.
>
> ⚠ Don't rotate `AUTH_SECRET` after users have connected integrations — it's the key that decrypts their stored tokens. Rotating breaks existing connections.

### 2a. Create the Atlassian OAuth app (one-time, ~5 min)

This is what makes the "Connect with OAuth" button work. Only one team member needs to do this — the resulting client ID/secret go in everyone's `.env`.

1. Go to https://developer.atlassian.com/console/myapps/
2. **Create app** → **OAuth 2.0 integration**
3. **Permissions** → add the **Jira API** (do **not** add Jira Service Management; we don't need it)
4. Click into the Jira API row → pick one scope mode:
   - **Classic scopes** (simpler, default in our code): `read:jira-work`, `read:jira-user`, `write:jira-work`
   - OR **Granular scopes**: `read:project:jira`, `read:issue:jira`, `read:issue-meta:jira`, `read:user:jira`, `read:issue.time-tracking:jira`, `read:issue.worklog:jira`, `write:issue.worklog:jira`, `write:issue.time-tracking:jira`
5. **User identity API** → enable `offline_access` (required for refresh tokens)
6. **Authorization** → add callback URL: `http://localhost:3000/api/integrations/jira/oauth/callback` (add your prod URL too when you deploy)
7. **Settings** → copy the **Client ID** and **Secret** → paste into `.env` as `ATLASSIAN_CLIENT_ID` and `ATLASSIAN_CLIENT_SECRET`

> ⚠ If you chose **granular** scopes in step 4, also set `ATLASSIAN_SCOPE_MODE="granular"` in `.env`. Otherwise leave it empty (defaults to classic).
>
> ⚠ Atlassian rejects the OAuth flow if you request a scope the app doesn't have, so the code's scope list and the console's selection must match exactly.

### 2b. Enable Google Calendar scope on the existing Google OAuth client

In Google Cloud Console → APIs & Services → OAuth consent screen → **Scopes**, add `.../auth/calendar.readonly`. The client ID and secret you already use for sign-in are reused — no second OAuth app needed.

If users were already signed in before this scope was added, they need to **sign out and sign back in** to grant the Calendar permission.

### 3. Create the database tables
```bash
npx prisma generate
npx prisma db push
```
The first command builds the Prisma client. The second creates all tables in your Postgres database. You can re-run `db push` anytime the schema changes.

> Same `DATABASE_URL` works for local dev and Vercel — Neon's connection pooling handles both. No separate dev/prod databases needed for hackathon scope.

### 4. Start the dev server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Sign in
- Click **Sign in with Google**
- Pick your `@axelerant.com` account
- You'll land on the empty Dashboard with a "Connect Your Tools" CTA

### 6. Connect tools

Each tool uses one of three flows:

| Tool | How to connect | Where to get creds (if paste-token) |
|---|---|---|
| **Jira** | OAuth redirect (one click) | — |
| **Google Calendar** | Auto — connected during Google sign-in | — |
| **GitHub** | Paste API token | github.com → Settings → Developer settings → Personal access tokens |
| **Slack** | Paste bot token (xoxb-…) | Slack app → OAuth & Permissions → Bot User OAuth Token |
| **Zoom** | Paste accountId + clientId + clientSecret | marketplace.zoom.us → Server-to-Server OAuth app |
| **Mavenlink** | Paste accountId + apiToken | Kantata → Settings → API & Integrations |
| **Granola** | Paste webhook secret | Granola webhook config |

**For Jira:** Settings → **Connect with OAuth** → redirected to Atlassian → click **Accept** → bounced back, Connected ✓. No token pasting.

**For Calendar:** if you signed in after Calendar scope was added (step 2b), it's already connected. If not, sign out + back in.

**For everything else:** Settings → **Connect** → paste into the dialog. All credentials are encrypted with AES-256-GCM before storage. Until a tool is connected, it returns no data — every page shows an empty state with a CTA back to Settings.

### 7. (Optional) Hook up Claude Code time tracking
For automatic ticking from Claude Code tool calls:
```bash
mkdir -p ~/.claude/projects/-Users-$(whoami)-$(pwd | tr '/' '-')
cat > ~/.claude/projects/-Users-$(whoami)-$(pwd | tr '/' '-')/settings.json <<EOF
{
  "hooks": {
    "PostToolUse": [
      { "matcher": ".*", "command": "$(pwd)/scripts/track-time.sh tick" }
    ]
  }
}
EOF
```

### 8. (Optional) Install the `/logtime` skill globally
So you can manually log time from any Claude Code project (not just ProjectPulse):
```bash
./scripts/install-logtime-skill.sh
```
Installs to `~/.claude/skills/logtime/SKILL.md` + writes config to `~/.config/projectpulse/config`. After restarting Claude Code, `/logtime` works in every project.

## Testing the app (smoke test)

After setup, walk through this to verify everything works end-to-end.

### Test 1 — auth + empty states
1. Visit http://localhost:3000 → redirects you to `/login`
2. Sign in with `@axelerant.com` Google
3. Dashboard shows **"Welcome to ProjectPulse — Connect Your Tools"** (empty state ✓)
4. Visit `/activity` → same empty state
5. Visit `/tools` → bar chart says "No time tracked yet"

### Test 2 — connect Jira via OAuth
1. Settings → **Connect with OAuth** on the Jira card
2. Browser redirects to https://auth.atlassian.com/authorize?...
3. Click **Accept** to grant ProjectPulse access to your Jira workspace
4. Bounced back to Settings → toast says "Jira connected", card flips to Connected
5. Go to `/activity` → your real Jira tickets should now appear
6. Reload `/` → "Recent Activity" card lists your tickets

If the OAuth dance fails, check `?oauth_error=…` in the URL after redirect — the error code tells you why (e.g. `invalid_state`, `no_jira_workspace`).

### Test 3 — Tools Time + auto-tracking
1. Open `/tools`
2. Type `RGU-224` (or any real ticket key from your project) in the input → **Start work**
3. Dialog appears:
   - With estimate → green "Ready to start tracking"
   - Without estimate → amber warning + "Proceed anyway" / "Add estimate" buttons
4. Click **Proceed anyway** → toast confirms session started

In another terminal:
```bash
./scripts/track-time.sh tick   # simulate a tool call
./scripts/track-time.sh tick
./scripts/track-time.sh stop   # finalizes; entry shows up on /tools as a draft
```

Reload `/tools` → you should see:
- A bar in the chart under "Claude Code"
- A draft entry row with the ticket key
- Buttons: ✓ approve · ✈ push to Jira · ✗ reject

Click ✈ to push the worklog to Jira; status flips to **logged**.

### Test 4 — auto-push toggle
1. Settings → "Time Tracking" card → check "Auto-push Claude Code time to Jira"
2. Run another `track-time.sh start … stop`
3. Entry on `/tools` immediately shows **logged** (skips the draft step)

### Test 5 — per-user isolation
1. Open an incognito window → sign in with a different `@axelerant.com` account
2. Settings shows no connected tools (each user has their own connections)
3. `/tools` is empty for this user even though the other user has entries

### Test 6 — date filter
1. Top bar → click the date picker → pick "Last 30 days"
2. URL updates to `?from=…&to=…`
3. `/activity` and `/tools` both reflect the new range
4. Custom range works via the two date inputs at the bottom of the popover

### Test 7 — disconnect
1. Settings → **Disconnect** on Jira
2. `/activity` flips back to the empty-state CTA
3. Toggle ✗ confirms the `UserIntegration` row is deleted (verify with `npx prisma studio`)

### Test 8 — `/logtime` skill
1. Run `./scripts/install-logtime-skill.sh` (one-time)
2. Restart Claude Code
3. In *any* project (not just this one) type:
   ```
   /logtime RGU-224 30m reviewed PR feedback
   ```
4. You should get back: `📝 Saved 30m for RGU-224 as a draft…`
5. Reload http://localhost:3000/tools → the draft entry appears under `manual`
6. Try the conversational variant: type `/logtime` with no args → Claude asks for ticket, duration, description, push/draft

### Inspecting state
```bash
npx prisma studio   # opens visual DB browser at localhost:5555
```
- `User` — your auth row, plus `autoPushClaudeTime`
- `UserIntegration` — your connections (`accessToken` and `metadata.enc` are ciphertext)
- `TimeEntry` — every tracked block
- `ToolSession` — in-progress and finalized tracking sessions
- `JiraTicketCache` — cached estimates

## How It Works

### Authentication
- Sign-in via Google OAuth (NextAuth v5, JWT sessions — no DB lookup on each request).
- API routes use one of three helpers in `src/lib/auth-helpers.ts`:
  - `requireSessionUser()` — for routes that only need email/name
  - `requireDbUser()` — upserts a `User` row + returns the DB id; use before any FK write
  - `resolveToolSessionUser(request)` — accepts either the session cookie *or* `X-Internal-Token` + `X-User-Email` headers (used by `scripts/track-time.sh`)

### Per-user integration credentials
- `UserIntegration` table keyed by `(userId, source)`.
- `accessToken` holds the *primary* credential (e.g. Jira `apiToken`) encrypted as AES-256-GCM base64.
- `metadata.enc` holds the *other* credentials (Jira `baseUrl` + `email`, Zoom `accountId`, etc.) encrypted as a single JSON blob.
- Key is derived from `AUTH_SECRET` via SHA-256 (`src/lib/crypto.ts`).
- `CREDENTIAL_SCHEMA` in `src/lib/integration-credentials.ts` declares the fields each tool needs; the `ConnectDialog` reads it to render the form.

### Connector factories
- `getJiraConnector(userId)` (and the other six) are **async** and per-user:
  1. Look up the user's `UserIntegration` row
  2. Decrypt the creds
  3. Return either `RealJiraConnector` (configured with those creds) or `DisconnectedJiraConnector` (returns `[]` for everything)
- API routes always pass `userId` — no global env tokens, no mock fallback.

### Auto-detected time
The `/api/detect` endpoint aggregates entries from connected tools:
- **Zoom** call duration → `PendingTimeEntry`
- **Calendar** meetings → `PendingTimeEntry`
- **Jira** tickets with `timeSpent > 0` → `PendingTimeEntry`

Each entry can be approved/edited/rejected, then pushed to Jira (worklog) or Mavenlink.

### Claude Code time tracking — two complementary pieces

**A. Auto-tracker (`scripts/track-time.sh`)** — captures *implementation* time: density of Claude tool calls while it's actively writing/editing/running things.

```bash
./scripts/track-time.sh start RGU-97 "Building Landing Page content type"
# ... Claude works (each tool call → POST /api/tool-sessions/tick) ...
./scripts/track-time.sh stop    # finalizes session; creates TimeEntry as draft
./scripts/track-time.sh log     # short for: stop + force push to Jira immediately
./scripts/track-time.sh status  # show in-progress timer
```
- Idle gaps > 3 minutes between ticks are excluded from `activeSeconds`.
- Minimum 1 minute per session.
- On `stop`, a `TimeEntry` is created with `status=draft`. If `User.autoPushClaudeTime` is true (or `--push` flag), it also POSTs to `/api/jira/worklog` and flips to `logged`.

**B. `/logtime` skill** — captures *everything else*: thinking, code review, discussions about the ticket, manual testing, designing the approach. Anything the auto-tracker missed.

Install once (works in every project after that):
```bash
./scripts/install-logtime-skill.sh
```
This copies `.claude-skills/logtime/SKILL.md` to `~/.claude/skills/logtime/SKILL.md`, writes `~/.config/projectpulse/config` with your API base + internal token + email, and verifies the dev server is reachable.

Use in any project:
```
/logtime                                       # conversational — Claude asks for ticket, duration, description
/logtime RGU-224 30m reviewed PR feedback      # one-shot
/logtime RGU-224 1h 15m designed schema        # accepts "1h 15m" durations
```
Each `/logtime` call hits `POST /api/time-entries`, which creates a `TimeEntry` with `source=manual` and (optionally) pushes a Jira worklog.

### Division of labor

| Captures | How | Where it shows up |
|---|---|---|
| Actual implementation (tool-call density) | `track-time.sh start/stop` | `/tools` page, `source=claude_code` |
| Thinking, discussion, code review, manual testing | `/logtime` skill | `/tools` page, `source=manual` |
| Auto-detected meetings (Zoom, Calendar) | `/api/detect` from connected tools | `/tools` page, `source=zoom`/`google_calendar` |

## Project Structure
- `src/app/` — Next.js App Router pages + API routes
- `src/app/api/` — API routes:
  - `integrations`, `integrations/[source]` — list/connect/disconnect paste-token tools
  - `integrations/jira/oauth/{start,callback}` — Atlassian OAuth 2.0 flow
  - `jira/*` — projects, tickets, start-work, worklog, estimate (all use the user's OAuth creds via `src/lib/jira-rest.ts`)
  - `activities`, `detect`, `calendar/events`, `slack/messages`, `mavenlink/*`
  - `time-entries` — list/approve/reject
  - `tool-sessions/{tick,stop}` — Claude Code time stream
  - `user/preferences` — auto-push toggle
- `src/app/login/` — Google sign-in page
- `src/app/tools/` — Tools Time dashboard (bar chart + entries list)
- `src/components/` — UI by feature: `layout/`, `dashboard/`, `activity/`, `timesheet/`, `alerts/`, `settings/`, `jira/`
- `src/components/ui/` — shadcn/ui base components (don't edit directly)
- `src/lib/` — `auth-helpers.ts`, `crypto.ts`, `integration-credentials.ts`, `jira-rest.ts`, `tool-session-auth.ts`, `prisma.ts`, types, constants
- `src/lib/oauth/atlassian.ts` — Atlassian OAuth 2.0 helpers (authorize URL, token exchange, refresh, accessible resources)
- `src/lib/integrations/<tool>/` — connector per tool: `real.ts`, `disconnected.ts`, `connector.ts` (interface), `index.ts` (async factory)
- `src/hooks/` — `use-date-range.ts`, `use-timesheet.ts`
- `src/contexts/` — `integrations-context.tsx` (DB-backed), `project-context.tsx`
- `prisma/schema.prisma` — DB schema (User, UserIntegration, TimeEntry, ToolSession, JiraTicketCache, NextAuth tables)
- `scripts/track-time.sh` — auto time tracker (calls the API on every Claude tool call)
- `scripts/install-logtime-skill.sh` — installs the `/logtime` skill globally
- `.claude-skills/logtime/SKILL.md` — source for the `/logtime` skill (copied to `~/.claude/skills/logtime/SKILL.md` by the installer)

## Key Conventions
- Connector factory pattern: `getXConnector(userId)` is async. Real connector takes creds in constructor; Disconnected returns `[]`. **No global env tokens, no mock fallback.**
- Integration source colors: Jira=blue, GitHub=emerald, Calendar=red, Slack=purple, Mavenlink=amber, Granola=teal, Zoom=sky.
- Alert severity colors: warning=yellow, high=orange, critical=red.
- AI-powered surfaces use the violet→indigo gradient (`from-violet-600 to-indigo-600`).
- Sonner for toasts (not shadcn toast — deprecated).
- Icons from `lucide-react`.
- JWT sessions — auth doesn't touch the DB on every request, so always `requireDbUser()` before writes that need a foreign key.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (also regenerates Prisma client)
- `npm run lint` — ESLint
- `npm run db:push` — push schema changes to the DB
- `npm run db:studio` — visual DB browser
- `npx prisma generate` — regenerate Prisma client after schema changes (runs automatically on `npm install` and `npm run build`)

## Deploying to Vercel

The app is built to run on Vercel out of the box:

1. **Push the repo to GitHub** (Vercel deploys from there)
2. **Vercel → New Project → Import the repo**
3. In **Settings → Environment Variables**, add (Production *and* Preview):
   ```
   DATABASE_URL            # your Neon connection string (same one as local is fine)
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   AUTH_SECRET             # MUST match the value used when you encrypted creds
   ATLASSIAN_CLIENT_ID
   ATLASSIAN_CLIENT_SECRET
   ```
4. **Update OAuth callback allowlists** to include the Vercel URL alongside localhost:
   - Atlassian app → Authorization → add `https://your-app.vercel.app/api/integrations/jira/oauth/callback`
   - Google OAuth client → Authorized redirect URIs → add `https://your-app.vercel.app/api/auth/callback/google`
5. **Push to main** — Vercel auto-deploys
6. **First-time setup on the deployed URL:** sign in once so the schema knows your user, then connect tools from `/settings`

### Notes
- `postinstall` runs `prisma generate` so the client is always built before `next build`
- `AUTH_SECRET` doubles as the encryption key for stored OAuth tokens. If you rotate it in Vercel, every stored connection becomes undecryptable — users will need to reconnect each tool
- Neon's free tier supports both local dev and prod from a single project; just use the same connection string
- The deployed app supports any number of users — each user signs in with their own Google account, authorizes their own Jira workspace, and sees only their own data

## Roadmap

### ✅ Shipped (foundation + time tracking + per-user integrations)
**Phase 1 — DB schema:** `TimeEntry`, `ToolSession`, `JiraTicketCache`, `User.autoPushClaudeTime`.

**Phase 2 — Per-user enforcement:** every API route returns 401 without a session; all DB queries scoped by `userId`.

**Phase 3 — Global date filter:** top-bar picker, URL params `?from=&to=`, applies to every listing route.

**Phase 4 — No-estimate prompt:** `POST /api/jira/start-work` checks the estimate. `StartWorkDialog` offers "proceed anyway" / "add estimate" / "cancel".

**Phase 5 — Claude Code → DB → Jira:** `scripts/track-time.sh` now hits `/api/tool-sessions/{tick,stop}`. Sessions materialize into `TimeEntry`s as drafts; auto-push toggle in Settings flips them to `logged` immediately.

**Phase 6 — `/tools` dashboard:** per-tool bar chart, entries list with approve/reject/push-to-Jira, "Start work" input that uses the no-estimate dialog.

**Phase 7 — Per-user integration credentials:**
- AES-256-GCM encryption (`src/lib/crypto.ts`)
- `UserIntegration` rows replace global env tokens
- `CREDENTIAL_SCHEMA` + generic `ConnectDialog` for paste-token tools
- `POST/DELETE /api/integrations/[source]`, `GET /api/integrations`
- All 7 connectors refactored to take creds in constructor
- `getXConnector(userId)` is async, returns `DisconnectedConnector` (empty data) if not connected
- `USE_MOCK_*` env vars deleted; no mock fallback anywhere
- Empty-state CTAs on Dashboard, Activity, Tools, Alerts when nothing is connected

**Phase 8 — OAuth for Jira + Calendar (no token pasting):**
- Atlassian OAuth 2.0 (3LO) — `GET /api/integrations/jira/oauth/start` + `.../callback`
- Stores `accessToken` + `refreshToken` + `cloudId` per user, encrypted
- Jira connector uses `api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...` + bearer token
- 401 → refresh-token retry, with the new token persisted automatically
- Google Calendar uses scope-on-signin — Calendar permission requested during the existing Google OAuth, tokens saved to `UserIntegration` in the NextAuth `signIn` callback
- Settings UI dispatches by `CONNECT_METHOD`: `oauth_redirect` (Jira), `auto_with_signin` (Calendar), `paste_token` (everything else)

**Phase 9 — Postgres + Vercel-ready:**
- Switched Prisma datasource from SQLite to PostgreSQL (Neon free tier works for both dev and prod)
- Added `postinstall: prisma generate` + folded into `npm run build` so Vercel builds cleanly
- Deployment guide in CLAUDE.md → env vars + OAuth callback allowlist updates

**Phase 10 — `/logtime` Claude Code skill (manual time entry):**
- `POST /api/time-entries` accepts `{ ticketKey, duration, description, pushToJira? }`; auto-tracked vs manual entries live in the same table, distinguished by `source`
- Skill source: `.claude-skills/logtime/SKILL.md`; installer at `scripts/install-logtime-skill.sh`
- Installer copies to `~/.claude/skills/`, writes `~/.config/projectpulse/config`, verifies API reachability — one install, works in every project
- Conversational and one-shot invocations both supported (`/logtime` or `/logtime RGU-224 30m description`)
- Division of labor locked in: `track-time.sh` captures implementation (tool-call density); `/logtime` captures thinking/review/discussion/manual-testing — both surface in `/tools` with different `source` values

### 🔜 Remaining
- **Claude AI on Timesheet** — replace the simulated generation animation with a real Claude call that groups `TimeEntry` rows into a draft timesheet
- **Claude AI on Alerts** — surface stalled tickets, missed estimates, meeting-heavy days
- **OAuth for Slack/GitHub/Zoom** — currently paste-token, could move to OAuth following the same pattern as Atlassian
- **GitHub connector** has a stub schema entry but no real connector class yet
- **Polish** — loading skeletons, error boundaries, end-to-end tests
- **Demo prep** — seeded TimeEntry rows + backup demo video

### Locked-in decisions
- Claude Code time pushes to Jira **as drafts** by default. User approves from `/tools`. Toggle in Settings.
- Missing estimate is a **warning with "proceed anyway"**, not a hard block.
- Date filter is **global** — one picker in the top bar, URL-synced.
- `/tools` is a separate page, not merged into Dashboard.
- Integration credentials are stored **per-user, encrypted**. No global env tokens.
- Tools default to **disconnected** — nothing shows in the UI until the user explicitly connects.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Dashboard stays empty after connecting | Date filter may exclude today. Click the date picker in the top bar → "Today" or "Last 7 days". |
| `/tools` shows nothing | No `TimeEntry` rows yet. Run `./scripts/track-time.sh start TICKET; tick; stop`, or use the "Start work" button on `/tools`. |
| `track-time.sh` says "Could not start session" | `.env` is missing `INTERNAL_API_TOKEN` or `PROJECTPULSE_USER_EMAIL`, or dev server isn't running on port 3000. |
| Jira worklog push returns 412 | Jira isn't connected for this user. Settings → Connect Jira. |
| "Configuration error" on login | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SECRET` missing from `.env`. |
| Integrations all show as disconnected after rotating `AUTH_SECRET` | Expected. The old credentials in the DB can't be decrypted with the new key. Re-connect each tool. |
| Build error `useSearchParams must be wrapped in suspense` | Wrap the component in `<Suspense fallback={…}>`. Used in `tools/page.tsx` and the top-bar `DateRangePicker`. |
| "Connect with OAuth" on Jira returns "Atlassian OAuth is not configured" | `ATLASSIAN_CLIENT_ID` / `ATLASSIAN_CLIENT_SECRET` missing from `.env`. Run through setup step 2a. |
| Jira OAuth callback shows `?oauth_error=invalid_state` | The 10-minute state cookie expired or the user opened the authorize URL across two browsers. Click Connect again from Settings in the same browser. |
| Jira OAuth callback shows `?oauth_error=no_jira_workspace` | The OAuth token has no accessible Jira workspace. Make sure the Atlassian app has the Jira API permission enabled (not just Confluence). |
| Calendar isn't connecting on sign-in | Calendar scope wasn't added to the Google OAuth client. Add `.../auth/calendar.readonly` in Google Cloud Console → Scopes, then sign out + back in. |
| `/logtime` says "ProjectPulse is not configured" | Run `./scripts/install-logtime-skill.sh` (use `--force` to overwrite existing config). Restart Claude Code afterward. |
| `/logtime` returns 401 | The `INTERNAL_API_TOKEN` in `~/.config/projectpulse/config` doesn't match the one in ProjectPulse's `.env`. Re-run the installer or edit the config file by hand. |
| `/logtime` fails with "could not reach $PROJECTPULSE_API_BASE" | The dev server isn't running. Start it with `npm run dev`. |
