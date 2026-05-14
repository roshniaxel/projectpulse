import type { Activity } from "@/lib/types";
import type { IZoomConnector, ZoomMeeting } from "./connector";

export type ZoomCreds = {
  accountId: string;
  clientId: string;
  clientSecret: string;
};

export class RealZoomConnector implements IZoomConnector {
  readonly source = "zoom" as const;
  private creds: ZoomCreds;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(creds: ZoomCreds) {
    this.creds = creds;
  }

  private async accessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }
    const credentials = Buffer.from(
      `${this.creds.clientId}:${this.creds.clientSecret}`
    ).toString("base64");
    const res = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "account_credentials",
        account_id: this.creds.accountId,
      }),
    });
    if (!res.ok) throw new Error(`Zoom auth failed: ${res.status}`);
    const data = await res.json();
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  }

  private async fetch(path: string) {
    const token = await this.accessToken();
    const res = await fetch(`https://api.zoom.us/v2${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Zoom API error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async testConnection() {
    try {
      await this.fetch("/users/me");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchPastMeetings(params: {
    from: string;
    to?: string;
  }): Promise<ZoomMeeting[]> {
    const to = params.to || new Date().toISOString().split("T")[0];
    const data = await this.fetch(
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
