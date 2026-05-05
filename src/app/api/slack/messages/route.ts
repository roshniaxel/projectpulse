import { type NextRequest } from "next/server";
import { getSlackConnector } from "@/lib/integrations/slack";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const connector = getSlackConnector();
    const activities = await connector.fetchActivities({ since: date });
    return Response.json({ activities });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Slack messages" },
      { status: 500 }
    );
  }
}
