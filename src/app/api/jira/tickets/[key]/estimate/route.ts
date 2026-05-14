import { getJiraConnector } from "@/lib/integrations/jira";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { key } = await params;

  try {
    const connector = await getJiraConnector(user.id);
    const estimate = await connector.getTicketEstimate(key);

    try {
      await prisma.jiraTicketCache.upsert({
        where: { key },
        update: {
          estimateSec: estimate?.originalEstimateSeconds ?? null,
          lastSyncedAt: new Date(),
        },
        create: {
          key,
          summary: key,
          estimateSec: estimate?.originalEstimateSeconds ?? null,
        },
      });
    } catch {
      // ignore cache errors
    }

    return Response.json({ ticketKey: key, estimate });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch estimate" },
      { status: 500 }
    );
  }
}
