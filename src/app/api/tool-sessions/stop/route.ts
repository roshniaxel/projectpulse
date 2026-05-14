import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveToolSessionUser } from "@/lib/tool-session-auth";

type StopBody = {
  ticketKey?: string;
  tool?: string;
  pushToJira?: boolean; // override the user's autoPushClaudeTime setting
};

function secondsToJiraSpec(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export async function POST(request: NextRequest) {
  const auth = await resolveToolSessionUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: StopBody = await request.json().catch(() => ({}));
  const tool = body.tool || "claude_code";
  const ticketKey = body.ticketKey || null;

  const session = await prisma.toolSession.findFirst({
    where: { userId: auth.userId, tool, ticketKey, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (!session) {
    return Response.json({ error: "No active session" }, { status: 404 });
  }

  const endedAt = new Date();
  const activeSeconds = Math.max(60, session.activeSeconds); // minimum 1 minute

  // Materialize a TimeEntry from the session
  const timeEntry = await prisma.timeEntry.create({
    data: {
      userId: auth.userId,
      source: "claude_code",
      ticketKey,
      description: session.description,
      startedAt: session.startedAt,
      endedAt,
      durationSec: activeSeconds,
      status: "draft",
    },
  });

  await prisma.toolSession.update({
    where: { id: session.id },
    data: { endedAt, activeSeconds },
  });

  // Auto-push to Jira if the user has opted in, the override says yes,
  // and we have a ticket to log against.
  const userPrefs = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { autoPushClaudeTime: true },
  });
  const shouldPush =
    !!ticketKey &&
    (body.pushToJira ?? userPrefs?.autoPushClaudeTime ?? false);

  let pushed = false;
  let worklogId: string | null = null;

  if (shouldPush) {
    const origin = new URL(request.url).origin;
    const timeSpent = secondsToJiraSpec(activeSeconds);
    try {
      const res = await fetch(`${origin}/api/jira/worklog`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward auth so the internal call resolves the same user
          cookie: request.headers.get("cookie") || "",
          "x-internal-token": process.env.INTERNAL_API_TOKEN || "",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({
          ticketKey,
          timeSpent,
          description: session.description || `Claude Code session — ${activeSeconds}s active`,
          timeEntryId: timeEntry.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        worklogId = data.worklogId;
        pushed = true;
      }
    } catch {
      // ignore — entry stays as draft
    }
  }

  return Response.json({
    timeEntryId: timeEntry.id,
    activeSeconds,
    durationLabel: secondsToJiraSpec(activeSeconds),
    status: pushed ? "logged" : "draft",
    worklogId,
  });
}
