import type { Activity } from "@/lib/types";
import type { ICalendarConnector } from "./connector";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "";

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Google token");
  const data = await res.json();
  return data.access_token;
}

function calculateDurationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export class RealCalendarConnector implements ICalendarConnector {
  readonly source = "google_calendar" as const;

  async testConnection() {
    try {
      const token = await getAccessToken();
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.ok ? { ok: true } : { ok: false, error: "Cannot access calendar" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchActivities(params: {
    since: string;
    until?: string;
  }): Promise<Activity[]> {
    const token = await getAccessToken();
    const timeMin = new Date(params.since).toISOString();
    const timeMax = params.until
      ? new Date(params.until).toISOString()
      : new Date(params.since + "T23:59:59Z").toISOString();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error("Failed to fetch calendar events");
    const data = await res.json();

    return (data.items || [])
      .filter((event: Record<string, unknown>) => event.status !== "cancelled")
      .map((event: Record<string, unknown>) => {
        const start = event.start as Record<string, string>;
        const end = event.end as Record<string, string>;
        const startTime = start?.dateTime || start?.date || "";
        const endTime = end?.dateTime || end?.date || "";
        const attendees = event.attendees as Array<Record<string, unknown>> | undefined;

        return {
          id: `gcal-${event.id}`,
          source: "google_calendar" as const,
          type: "meeting" as const,
          title: String(event.summary || "Untitled Event"),
          description: event.description ? String(event.description) : undefined,
          timestamp: startTime,
          metadata: {
            calendar: "Primary",
            attendees: String(attendees?.length || 1),
          },
          durationMinutes: startTime && endTime ? calculateDurationMinutes(startTime, endTime) : undefined,
        };
      });
  }
}
