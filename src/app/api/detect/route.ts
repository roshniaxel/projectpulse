import { type NextRequest } from "next/server";
import { getZoomConnector } from "@/lib/integrations/zoom";
import { getSlackConnector } from "@/lib/integrations/slack";
import { getJiraConnector } from "@/lib/integrations/jira";
import { getCalendarConnector } from "@/lib/integrations/google-calendar";
import type { PendingTimeEntry } from "@/lib/types";
import { MOCK_PENDING_ENTRIES } from "@/lib/mock-data";

// In mock mode, return mock pending entries
// In real mode, poll all sources and generate pending entries
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
  const useMock = process.env.USE_MOCK_ZOOM === "true"; // If any mock is on, use mock pipeline

  if (useMock) {
    return Response.json({ entries: MOCK_PENDING_ENTRIES });
  }

  try {
    const entries: PendingTimeEntry[] = [];

    // 1. Detect Zoom calls
    const [zoomResult, slackResult, jiraResult, calendarResult] = await Promise.allSettled([
      getZoomConnector().fetchActivities({ since: date }),
      getSlackConnector().fetchActivities({ since: date }),
      getJiraConnector().fetchTickets({ projectKey: "", status: ["In Progress", "In Review"] }),
      getCalendarConnector().fetchActivities({ since: date }),
    ]);

    // Zoom meetings → pending entries
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

    // Calendar meetings → pending entries (if not already a Zoom call)
    if (calendarResult.status === "fulfilled") {
      for (const activity of calendarResult.value) {
        if (activity.durationMinutes && activity.durationMinutes > 0) {
          // Skip if a Zoom entry with similar time already exists
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

    // Jira tickets with time spent → pending entries
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

    // Sort by detected time
    entries.sort((a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime());

    return Response.json({ entries });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to detect time entries" },
      { status: 500 }
    );
  }
}
