import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveToolSessionUser } from "@/lib/tool-session-auth";

const IDLE_THRESHOLD_SEC = 180; // 3 minutes — gaps larger than this are excluded

type TickBody = {
  ticketKey?: string;
  description?: string;
  tool?: string; // defaults to "claude_code"
};

// Append a tool-call timestamp to the active ToolSession for this (user, ticket).
// Creates a session if none exists. Idempotent: each call records one tick.
export async function POST(request: NextRequest) {
  const auth = await resolveToolSessionUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: TickBody = await request.json().catch(() => ({}));
  const tool = body.tool || "claude_code";
  const ticketKey = body.ticketKey || null;

  // Find the open session for this user + ticket, or create one.
  let session = await prisma.toolSession.findFirst({
    where: { userId: auth.userId, tool, ticketKey, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  const now = Math.floor(Date.now() / 1000);

  if (!session) {
    session = await prisma.toolSession.create({
      data: {
        userId: auth.userId,
        tool,
        ticketKey,
        description: body.description || null,
        ticks: [now],
        activeSeconds: 0,
      },
    });
    return Response.json({ sessionId: session.id, activeSeconds: 0, ticks: 1 });
  }

  const ticks = Array.isArray(session.ticks) ? (session.ticks as number[]) : [];
  const lastTick = ticks[ticks.length - 1] ?? now;
  const gap = now - lastTick;
  const nextActive =
    session.activeSeconds + (gap > 0 && gap <= IDLE_THRESHOLD_SEC ? gap : 0);

  const updated = await prisma.toolSession.update({
    where: { id: session.id },
    data: {
      ticks: [...ticks, now],
      activeSeconds: nextActive,
    },
  });

  return Response.json({
    sessionId: updated.id,
    activeSeconds: updated.activeSeconds,
    ticks: ticks.length + 1,
  });
}
