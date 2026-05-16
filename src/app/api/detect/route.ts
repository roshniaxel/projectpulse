import { type NextRequest } from "next/server";
import { getZoomConnector } from "@/lib/integrations/zoom";
import { getJiraConnector } from "@/lib/integrations/jira";
import { getCalendarConnector } from "@/lib/integrations/google-calendar";
import { requireDbUser, parseDateRange } from "@/lib/auth-helpers";
import type { PendingTimeEntry } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { from, to } = parseDateRange(request.nextUrl.searchParams);

  try {
    const [zoom, jira, calendar] = await Promise.all([
      getZoomConnector(user.id),
      getJiraConnector(user.id),
      getCalendarConnector(user.id),
    ]);

    const entries: PendingTimeEntry[] = [];

    const [zoomResult, jiraResult, calendarResult] = await Promise.allSettled([
      zoom.fetchActivities({ since: from, until: to }),
      jira.fetchTickets({ projectKey: "", status: ["In Progress", "In Review"], mineOnly: true }),
      calendar.fetchActivities({ since: from, until: to }),
    ]);

    if (zoomResult.status === "fulfilled") {
      for (const activity of zoomResult.value) {
        if (activity.durationMinutes && activity.durationMinutes > 0) {
          entries.push({
            id: `pte-${activity.id}`,
            source: "zoom",
            type: "zoom_call",
            title: activity.title,
            description: activity.description || `Zoom meeting, ${activity.durationMinutes} minutes`,
            durationMinutes: activity.durationMinutes,
            detectedAt: activity.timestamp,
            project: "Meetings",
            metadata: activity.metadata,
            status: "pending",
          });
        }
      }
    }

    if (calendarResult.status === "fulfilled") {
      for (const activity of calendarResult.value) {
        if (activity.durationMinutes && activity.durationMinutes > 0) {
          const hasZoomDuplicate = entries.some(
            (e) =>
              e.source === "zoom" &&
              Math.abs(new Date(e.detectedAt).getTime() - new Date(activity.timestamp).getTime()) < 15 * 60 * 1000
          );
          if (!hasZoomDuplicate) {
            entries.push({
              id: `pte-${activity.id}`,
              source: "google_calendar",
              type: "meeting",
              title: activity.title,
              description: activity.description || `Calendar meeting, ${activity.durationMinutes} minutes`,
              durationMinutes: activity.durationMinutes,
              detectedAt: activity.timestamp,
              project: "Meetings",
              metadata: activity.metadata,
              status: "pending",
            });
          }
        }
      }
    }

    if (jiraResult.status === "fulfilled") {
      for (const ticket of jiraResult.value) {
        if (ticket.estimate?.timeSpentSeconds && ticket.estimate.timeSpentSeconds > 0) {
          const minutes = Math.round(ticket.estimate.timeSpentSeconds / 60);
          entries.push({
            id: `pte-jira-${ticket.key}`,
            source: "jira",
            type: "ticket_time",
            title: `${ticket.key} — ${ticket.summary}`,
            description: `${ticket.status} — ${Math.round(minutes / 60 * 10) / 10}h logged in Jira`,
            durationMinutes: minutes,
            detectedAt: new Date().toISOString(),
            ticketKey: ticket.key,
            project: ticket.projectKey,
            metadata: { status: ticket.status, assignee: ticket.assignee || "Unassigned" },
            status: "pending",
          });
        }
      }
    }

    entries.sort((a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime());

    return Response.json({ entries });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to detect time entries" },
      { status: 500 }
    );
  }
}
