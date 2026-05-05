import { type NextRequest } from "next/server";
import { getCalendarConnector } from "@/lib/integrations/google-calendar";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const connector = getCalendarConnector();
    const activities = await connector.fetchActivities({ since: date });
    return Response.json({ activities });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
