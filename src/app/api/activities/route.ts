import { type NextRequest } from "next/server";
import { getJiraConnector } from "@/lib/integrations/jira";
import { getCalendarConnector } from "@/lib/integrations/google-calendar";
import { getSlackConnector } from "@/lib/integrations/slack";
import { getGranolaConnector } from "@/lib/integrations/granola";
import type { Activity } from "@/lib/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const project = searchParams.get("project") || undefined;

  try {
    const [jiraActivities, calendarActivities, slackActivities, granolaActivities] =
      await Promise.allSettled([
        getJiraConnector().fetchActivities({ since: date, projectId: project }),
        getCalendarConnector().fetchActivities({ since: date }),
        getSlackConnector().fetchActivities({ since: date }),
        getGranolaConnector().fetchActivities({ since: date }),
      ]);

    const activities: Activity[] = [];

    if (jiraActivities.status === "fulfilled") activities.push(...jiraActivities.value);
    if (calendarActivities.status === "fulfilled") activities.push(...calendarActivities.value);
    if (slackActivities.status === "fulfilled") activities.push(...slackActivities.value);
    if (granolaActivities.status === "fulfilled") activities.push(...granolaActivities.value);

    // Sort by timestamp descending
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return Response.json({ activities });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
