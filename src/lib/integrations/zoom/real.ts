import type { Activity } from "@/lib/types";
import type { IZoomConnector, ZoomMeeting } from "./connector";

const ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID || "";
const CLIENT_ID = process.env.ZOOM_CLIENT_ID || "";
const CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || "";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: ACCOUNT_ID,
    }),
  });

  if (!res.ok) throw new Error(`Zoom auth failed: ${res.status}`);
  const data = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

async function zoomFetch(path: string) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.zoom.us/v2${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Zoom API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export class RealZoomConnector implements IZoomConnector {
  readonly source = "zoom" as const;

  async testConnection() {
    try {
      await zoomFetch("/users/me");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchPastMeetings(params: { from: string; to?: string }): Promise<ZoomMeeting[]> {
    const to = params.to || new Date().toISOString().split("T")[0];
    // Get user's past meetings
    const data = await zoomFetch(
      `/users/me/meetings?type=previous_meetings&from=${params.from}&to=${to}&page_size=30`
    );

    return (data.meetings || []).map((m: Record<string, unknown>) => ({
      id: String(m.id),
      topic: String(m.topic || "Untitled Meeting"),
      startTime: String(m.start_time || ""),
      duration: Number(m.duration || 0),
      participants: Number(m.participants_count || 0),
      hostEmail: String(m.host_email || ""),
    }));
  }

  async fetchActivities(params: { since: string }): Promise<Activity[]> {
    const meetings = await this.fetchPastMeetings({ from: params.since });

    return meetings.map((m) => ({
      id: `zoom-${m.id}`,
      source: "zoom" as const,
      type: "zoom_call" as const,
      title: `${m.topic} — Zoom Call`,
      description: `Zoom meeting with ${m.participants} participants, ${m.duration} minutes`,
      timestamp: m.startTime,
      metadata: {
        meetingId: m.id,
        host: m.hostEmail,
        participants: String(m.participants),
      },
      durationMinutes: m.duration,
    }));
  }
}
