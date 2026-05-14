import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser, parseDateRange } from "@/lib/auth-helpers";
import { resolveToolSessionUser } from "@/lib/tool-session-auth";
import { getJiraConnector } from "@/lib/integrations/jira";

function parseDurationSpec(spec: string): number {
  // "1h 30m", "45m", "2h", "90"  → seconds. Bare numbers treated as minutes.
  const trimmed = spec.trim();
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed) * 60;
  let total = 0;
  for (const m of trimmed.matchAll(/(\d+)\s*([hmsd])/gi)) {
    const n = parseInt(m[1]);
    const u = m[2].toLowerCase();
    if (u === "h") total += n * 3600;
    else if (u === "m") total += n * 60;
    else if (u === "s") total += n;
    else if (u === "d") total += n * 8 * 3600;
  }
  return total;
}

function secondsToJiraSpec(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { from, to } = parseDateRange(request.nextUrl.searchParams);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setDate(toDate.getDate() + 1);

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: user.id,
      startedAt: { gte: fromDate, lt: toDate },
    },
    orderBy: { startedAt: "desc" },
  });

  // Exclude rejected entries from the by-source totals — those are entries the
  // user explicitly marked as "not real time" and shouldn't skew productivity
  // breakdowns. Drafts/approved/logged all count.
  const totalsBySource: Record<string, number> = {};
  for (const e of entries) {
    if (e.status === "rejected") continue;
    totalsBySource[e.source] = (totalsBySource[e.source] || 0) + e.durationSec;
  }

  return Response.json({
    entries,
    totalsBySource,
    rangeFrom: from,
    rangeTo: to,
  });
}

// Create a manual time entry. Accepts both the browser session and the
// X-Internal-Token + X-User-Email header pair, so the /logtime Claude Code
// skill can hit this endpoint from any project's shell.
export async function POST(request: NextRequest) {
  const authUser = await resolveToolSessionUser(request);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    ticketKey,
    description,
    source = "manual",
    duration, // e.g. "30m", "1h 15m"
    durationMinutes, // alternative to duration spec
    pushToJira = false,
  } = body;

  let durationSec = 0;
  if (typeof duration === "string") durationSec = parseDurationSpec(duration);
  else if (typeof durationMinutes === "number") durationSec = durationMinutes * 60;

  if (!durationSec || durationSec < 60) {
    return Response.json(
      { error: "Provide duration (e.g. '30m', '1h 15m') or durationMinutes >= 1" },
      { status: 400 }
    );
  }

  // When no description was supplied but a ticket key was, fetch the ticket
  // summary from Jira so the entry reads "Migrated Jira search to /search/jql"
  // instead of "Work on RGU-250". Falls back to a generic label if Jira isn't
  // connected or the ticket doesn't exist.
  let resolvedDescription: string | null = description || null;
  if (!resolvedDescription && ticketKey) {
    try {
      const jira = await getJiraConnector(authUser.userId);
      const summary = await jira.getTicketSummary(ticketKey);
      resolvedDescription = summary || `Work on ${ticketKey}`;
    } catch {
      resolvedDescription = `Work on ${ticketKey}`;
    }
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - durationSec * 1000);

  const entry = await prisma.timeEntry.create({
    data: {
      userId: authUser.userId,
      source,
      ticketKey: ticketKey || null,
      description: resolvedDescription,
      startedAt,
      endedAt: now,
      durationSec,
      status: "draft",
    },
  });

  let pushed = false;
  let worklogId: string | null = null;

  if (pushToJira && ticketKey) {
    const origin = new URL(request.url).origin;
    try {
      const res = await fetch(`${origin}/api/jira/worklog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || "",
          "x-internal-token": process.env.INTERNAL_API_TOKEN || "",
          "x-user-email": authUser.email,
        },
        body: JSON.stringify({
          ticketKey,
          timeSpent: secondsToJiraSpec(durationSec),
          description: resolvedDescription || `Time logged via /logtime`,
          timeEntryId: entry.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        worklogId = data.worklogId;
        pushed = true;
      }
    } catch {
      // entry stays as draft
    }
  }

  return Response.json({
    timeEntryId: entry.id,
    ticketKey: entry.ticketKey,
    durationSec,
    durationLabel: secondsToJiraSpec(durationSec),
    status: pushed ? "logged" : "draft",
    worklogId,
  });
}

export async function PATCH(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { id, status } = await request.json();
  if (!id || !status) {
    return Response.json({ error: "id and status required" }, { status: 400 });
  }
  if (!["draft", "approved", "rejected"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.timeEntry.update({
    where: { id, userId: user.id },
    data: { status },
  });
  return Response.json({ entry: updated });
}
