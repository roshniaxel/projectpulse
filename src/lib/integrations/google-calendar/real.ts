import type { Activity } from "@/lib/types";
import type { ICalendarConnector } from "./connector";
import { updateAccessToken } from "@/lib/integration-credentials";
import { tzDayBoundsUtc } from "@/lib/date-range";

export type CalendarCreds = {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // unix seconds
};

function durationMinutes(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

export class RealCalendarConnector implements ICalendarConnector {
  readonly source = "google_calendar" as const;
  private userId: string;
  private accessToken: string;
  private refreshToken?: string;

  constructor(creds: CalendarCreds) {
    this.userId = creds.userId;
    this.accessToken = creds.accessToken;
    this.refreshToken = creds.refreshToken;
  }

  private async refreshAndPersist(): Promise<boolean> {
    if (!this.refreshToken) return false;
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    this.accessToken = data.access_token;
    await updateAccessToken(this.userId, "google_calendar", {
      accessToken: data.access_token,
      refreshToken: this.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    });
    return true;
  }

  private async authedFetch(url: string): Promise<Response> {
    let res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (res.status === 401 && (await this.refreshAndPersist())) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
    }
    return res;
  }

  async testConnection() {
    try {
      const res = await this.authedFetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary"
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
    // Interpret `since` / `until` as YYYY-MM-DD dates in the team's timezone
    // (see src/lib/date-range.ts). The earlier patch used UTC end-of-day, which
    // both clipped early-morning IST events on the start date and leaked
    // very-early next-IST-day events past the end date.
    const { startUtc: timeMin } = tzDayBoundsUtc(params.since);
    const { endUtc: timeMax } = tzDayBoundsUtc(params.until || params.since);

    const res = await this.authedFetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`
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
          durationMinutes:
            startTime && endTime ? durationMinutes(startTime, endTime) : undefined,
        };
      });
  }
}
