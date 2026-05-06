# ProjectPulse

AI-Powered Auto Time Logger + Proactive Risk & Blocker Alerting System.

## Tech Stack
- Next.js 16 (App Router) with TypeScript
- Tailwind CSS v4 + shadcn/ui components
- SQLite + Prisma ORM (zero setup, file-based)
- Anthropic Claude API for AI features
- NextAuth.js v5 with Google OAuth (JWT sessions)

## Setup Guide (Local)

### Prerequisites
- Node.js 18+
- npm
- Google account (`@axelerant.com` for team access)

### 1. Clone & Install
```bash
git clone git@github.com:roshniaxel/projectpulse.git
cd projectpulse
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` and fill in:
```bash
# Required — Google OAuth (for login)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
AUTH_SECRET="run: openssl rand -base64 32"

# All mock flags default to "true" — app works out of the box with demo data
# Set to "false" + add credentials to use real integrations
```

> **Google OAuth credentials** are shared across the team. Ask the project admin for the Client ID and Secret. The OAuth app is set to Internal (Axelerant Workspace only), so any `@axelerant.com` account can log in.

### 3. Database Setup
```bash
npx prisma generate
npx prisma db push
```
This creates a local SQLite file at `prisma/dev.db`. No database server needed.

### 4. Start Dev Server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Sign In
- Click "Sign in with Google"
- Choose your `@axelerant.com` account
- You'll see only your own Jira tickets, timesheets, and activities

## How It Works

### Per-User Data
- Each user logs in with Google OAuth (account picker always shown)
- Your Google email maps to your Jira display name (e.g. `roshni.upadhyay@axelerant.com` → `Roshni Upadhyay`)
- API routes filter Jira tickets and activities by the logged-in user
- Calendar, Slack, and Zoom data is personal by default

### Auto-Detected Time
The dashboard shows auto-detected time entries from:
- **Zoom** — call duration from meeting history
- **Slack** — huddle duration
- **Jira** — time on tickets based on status transitions
- **Calendar** — meeting duration

Each entry can be approved/edited/rejected, then pushed to **Jira** (as worklog) or **Mavenlink**.

### Claude Code Time Tracking
When using Claude Code skills (e.g. `work-on-jira-ticket`), track active implementation time:
```bash
./scripts/track-time.sh start RGU-97 "Building Landing Page content type"
# ... Claude works ...
./scripts/track-time.sh stop    # Shows active time (excludes idle)
./scripts/track-time.sh log     # Pushes worklog to Jira
```

Add the PostToolUse hook for automatic tracking (run once):
```bash
cat > ~/.claude/projects/-Users-$(whoami)-$(pwd | tr '/' '-')/settings.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "command": "$(pwd)/scripts/track-time.sh tick"
      }
    ]
  }
}
EOF
```

## Project Structure
- `src/app/` — Next.js App Router pages and API routes
- `src/app/api/` — API routes (jira, calendar, slack, mavenlink, detect, activities)
- `src/app/login/` — Google OAuth login page
- `src/components/` — React components organized by feature (layout, dashboard, activity, timesheet, alerts, settings)
- `src/components/ui/` — shadcn/ui base components (do not edit directly)
- `src/lib/` — Shared utilities, types, constants, mock data, auth
- `src/lib/integrations/` — Integration connectors (Jira, GitHub, Calendar, Slack, Mavenlink, Granola, Zoom) with real + mock implementations
- `src/hooks/` — Custom React hooks
- `src/contexts/` — React context providers (ProjectProvider for Jira project selection)
- `prisma/` — Database schema (SQLite)
- `scripts/` — Time tracking shell scripts

## Key Conventions
- Each integration has a connector interface with `RealConnector` and `MockConnector` — toggled via `USE_MOCK_*` env vars
- Integration source colors: Jira=blue, GitHub=emerald, Calendar=red, Slack=purple, Mavenlink=amber, Granola=teal, Zoom=sky
- Alert severity colors: warning=yellow, high=orange, critical=red
- AI-powered features use purple gradient accent (`from-violet-600 to-indigo-600`)
- Mock data in `src/lib/mock-data.ts` drives the demo — real Jira data from axelerant.atlassian.net
- Using sonner for toasts (not shadcn toast — it's deprecated)
- Icons from lucide-react
- JWT sessions (no database needed for auth session management)

## Connecting Real Integrations

Set any `USE_MOCK_*` to `"false"` and add the corresponding credentials:

| Integration | Env Vars | How to Get |
|-------------|----------|------------|
| **Jira** | `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` | [id.atlassian.com](https://id.atlassian.com) → API tokens |
| **Slack** | `SLACK_BOT_TOKEN` | Create Slack app with `channels:history` scope |
| **Google Calendar** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Google Cloud Console → OAuth |
| **Zoom** | `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` | [marketplace.zoom.us](https://marketplace.zoom.us) → Server-to-Server OAuth app |
| **Mavenlink** | `MAVENLINK_API_TOKEN`, `MAVENLINK_ACCOUNT_ID` | Kantata settings → API tokens |

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx prisma studio` — Visual database browser
- `npx prisma db push` — Push schema changes to DB
- `npx prisma generate` — Regenerate Prisma client after schema changes
