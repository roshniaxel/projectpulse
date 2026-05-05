import { getJiraConnector } from "@/lib/integrations/jira";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  try {
    const connector = getJiraConnector();
    const estimate = await connector.getTicketEstimate(key);
    return Response.json({ ticketKey: key, estimate });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch estimate" },
      { status: 500 }
    );
  }
}
