# ProjectPulse

AI-Powered Auto Time Logger + Proactive Risk & Blocker Alerting System.

## Tech Stack
- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS v4 + shadcn/ui components
- PostgreSQL + Prisma ORM
- Anthropic Claude API for AI features
- NextAuth.js for authentication

## Quick Start
```bash
npm install
cp .env.example .env   # fill in API keys
npx prisma generate
npx prisma db push
npm run dev             # http://localhost:3000
```

## Project Structure
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components organized by feature (layout, dashboard, activity, timesheet, alerts, settings)
- `src/components/ui/` — shadcn/ui base components (do not edit directly)
- `src/lib/` — Shared utilities, types, constants, mock data, Claude AI client
- `src/lib/integrations/` — Integration connectors (Jira, GitHub, Calendar, Slack, Mavenlink, Granola, Zoom) with real + mock implementations
- `src/hooks/` — Custom React hooks
- `src/contexts/` — React context providers (ProjectProvider for Jira project selection)
- `prisma/` — Database schema

## Key Conventions
- Each integration has a connector interface with `RealConnector` and `MockConnector` — toggled via `USE_MOCK_*` env vars
- Integration source colors: Jira=blue, GitHub=emerald, Calendar=red, Slack=purple, Mavenlink=amber, Granola=teal, Zoom=sky
- Alert severity colors: warning=yellow, high=orange, critical=red
- AI-powered features use purple gradient accent (`from-violet-600 to-indigo-600`)
- All API routes are in `src/app/api/`
- Mock data in `src/lib/mock-data.ts` drives the demo — keep activity IDs consistent with timesheet entry references
- Using sonner for toasts (not shadcn toast — it's deprecated)
- Icons from lucide-react

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Claude API key
- `NEXTAUTH_SECRET` — NextAuth session secret
- `USE_MOCK_JIRA`, `USE_MOCK_GITHUB`, `USE_MOCK_CALENDAR`, `USE_MOCK_SLACK`, `USE_MOCK_MAVENLINK`, `USE_MOCK_GRANOLA`, `USE_MOCK_ZOOM` — set to "true" to use mock connectors
- `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` — Jira basic auth credentials
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — GitHub OAuth credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` — Google OAuth credentials
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` — Slack bot credentials
- `MAVENLINK_API_TOKEN`, `MAVENLINK_ACCOUNT_ID` — Mavenlink (Kantata) API credentials
- `GRANOLA_WEBHOOK_SECRET` — Granola webhook verification
- `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` — Zoom Server-to-Server OAuth

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx prisma studio` — Visual database browser
- `npx prisma db push` — Push schema changes to DB
