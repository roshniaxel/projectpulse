import { type NextRequest } from "next/server";
import { getJiraConnector } from "@/lib/integrations/jira";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { ticketKey } = await request.json();
  if (!ticketKey) {
    return Response.json({ error: "ticketKey is required" }, { status: 400 });
  }

  try {
    const connector = await getJiraConnector(user.id);
    const estimate = await connector.getTicketEstimate(ticketKey);
    const estimateSec = estimate?.originalEstimateSeconds ?? null;
    const hasEstimate = !!estimateSec && estimateSec > 0;

    try {
      await prisma.jiraTicketCache.upsert({
        where: { key: ticketKey },
        update: { estimateSec, lastSyncedAt: new Date() },
        create: { key: ticketKey, summary: ticketKey, estimateSec },
      });
    } catch {
      // ignore
    }

    return Response.json({
      ticketKey,
      hasEstimate,
      estimateSec,
      requiresEstimateConfirm: !hasEstimate,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to check estimate" },
      { status: 500 }
    );
  }
}
