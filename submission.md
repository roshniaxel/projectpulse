# ProjectPulse — Hackathon Submission

## ✅ Problem you Solved

Engineers and consultants at agencies like Axelerant lose **30–45 minutes every day** to time-tracking overhead: tab-switching to Jira, remembering what they actually did, manually adding worklogs. The honest alternative is worse — timesheets filled from memory at end-of-week → **inaccurate billing and lost revenue**.

Adjacent pain:
- Each person juggles **7+ tools** (Jira, GitHub, Calendar, Slack, Zoom, Mavenlink, Granola) with no unified view of where the day went.
- Project managers find out about **stalled tickets and blown estimates at standup**, not before — too late to course-correct.
- Manual logging interrupts flow during the actual engineering work it's meant to measure.

## ✅ Your Solution

**ProjectPulse — AI-powered auto time logger + proactive risk & blocker alerting.**

The engineer never types a worklog. ProjectPulse captures time three ways and lets Claude do the synthesis:

1. **Auto-tracker (`track-time.sh`)** — measures Claude Code *implementation* time via tool-call density. Idle gaps > 3 min are excluded, so the number is honest.
2. **Auto-stop-on-commit hook** — when Claude runs `git commit -m "RGU-224: …"`, the active session is finalised and pushed to Jira automatically. **Zero manual action to log a session.**
3. **`/logtime` Claude Code skill** — one command captures the *non-implementation* time (thinking, code review, discussion, manual testing). Works in any project after a one-shot install.

On top of that:
- **AI Timesheet** (Claude Sonnet 4.6) — groups raw `TimeEntry` rows into polished daily logs + a weekly narrative, with rule-based fallback when no API key is configured.
- **AI Alerts** — Claude analyses Jira tickets + tracked time to flag stalled work, missed estimates, scope creep, and velocity risks.
- **Productivity Insights donut** — shows the day split across AI-assisted / deep work / meetings / auto-logged / comms.
- **7 integrations, per-user, encrypted** — Jira (OAuth 2.0), Google Calendar (scope-on-signin), GitHub, Mavenlink, Granola live today; Slack + Zoom code is built and waiting on workspace-admin approval.

Security baked in: AES-256-GCM per-user credentials, per-user JWT sessions, Jira JQL scoped to `currentUser()`, Slack filtered to the caller's member ID, timezone-correct date math (`Asia/Kolkata` default).

## ✅ Demo / Artifacts

- **Live link:** `[fill in Vercel URL]`
- **Repo:** https://github.com/roshniaxel/projectpulse
- **Loom walkthrough:** `[fill in Loom URL]` — 5-minute end-to-end walkthrough following the 9-step demo script in `CLAUDE.md → Demo Submission → Demo walkthrough`.
- **Tech:** Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · PostgreSQL + Prisma · NextAuth v5 · Anthropic Claude Sonnet 4.6 · Deployed on Vercel + Neon.

What you'll see in the demo: fresh sign-in → connect Jira via one-click OAuth → make a real change in Claude Code → `git commit` → the entry **lands in Jira automatically** → run `/logtime` from a separate project to capture review time → open `/timesheet` for the AI-generated daily log → open `/alerts` for AI-surfaced risks.

## ✅ Business Impact ⭐

**Time recovered, per engineer:**
- ~30 min/day saved on time-tracking ceremony × 220 working days = **~110 hours/year per engineer.**
- At a $50/hr loaded cost, that's **~$5,500/engineer/year in recovered productive time.**

**Revenue recovered:**
- Industry studies put under-logged consultancy time at **5–15% of billable hours.** Even at the low end, an engineer billing $100k/year leaves **~$5,000/year on the table** in un-invoiced work. ProjectPulse closes that gap because every Claude Code session and every `/logtime` call becomes a Jira worklog with one keystroke.

**At Axelerant's scale (~250 engineers):**
- Conservative blended savings of **~$10k/engineer/year → ~$2.5M/year** between recovered time and recovered billing.
- **Earlier risk signal** — AI alerts surface stalled tickets *before* standup, not at it. Catching one scope blowup per quarter on a typical $50k engagement pays for the rollout many times over.

**Qualitative wins:**
- No more "what did I do yesterday?" friction → engineers stay in flow.
- PMs get a real-time risk view instead of weekly retro pain.
- Compliance: encrypted per-user creds means no shared workspace tokens floating in env files.

## ✅ Could this be adopted beyond the hackathon?

**Yes — and it was built that way from day one.**

Architecturally:
- **Multi-tenant by construction.** Every API route is scoped by `userId`; every integration credential is encrypted per user. There is no shared admin token anywhere.
- **OAuth-first** for the highest-friction integration (Jira's 3LO with refresh-token retry). Slack/GitHub/Zoom follow the same pattern when we move them off paste-token.
- **Deployable in 10 minutes** to Vercel + Neon's free tier (Postgres connection-pooled, `postinstall` regenerates Prisma client). Setup guide in `CLAUDE.md` walks any new team through it end-to-end.

Three concrete adoption paths:

1. **Internal Axelerant rollout (immediate).** Every engineer signs in with their `@axelerant.com` Google account, connects their own Jira workspace via one click, installs the tracker hook once with `./scripts/install-projectpulse-tracker.sh`. The auto-stop-on-commit hook means **adoption requires zero behaviour change** — just commit with the ticket key in the message (which engineers already do).
2. **SaaS for other agencies / consultancies** (the natural next step). Same codebase, add a billing layer, complete the OAuth flows for Slack/GitHub/Zoom, productise. The market is every agency that bills by the hour and uses Jira — which is most of them.
3. **Open-source the tracker + `/logtime` skill** as standalone tools for the broader Claude Code community, with ProjectPulse as the hosted backend.

The expensive parts — multi-user auth, encrypted credential storage, per-user OAuth, AI-powered synthesis — are already done. What remains for production rollout is operational, not architectural: Slack/Zoom workspace approvals, observability, billing.
