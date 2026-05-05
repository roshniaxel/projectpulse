import type { Activity } from "@/lib/types";
import type { IZoomConnector, ZoomMeeting } from "./connector";

const TODAY = "2026-04-29";

const MOCK_ZOOM_MEETINGS: ZoomMeeting[] = [
  {
    id: "87654321",
    topic: "Sprint 14 Planning",
    startTime: `${TODAY}T09:00:00Z`,
    duration: 45,
    participants: 8,
    hostEmail: "sarah@acme-corp.com",
  },
  {
    id: "87654322",
    topic: "1:1 with Sarah (EM)",
    startTime: `${TODAY}T12:15:00Z`,
    duration: 30,
    participants: 2,
    hostEmail: "you@acme-corp.com",
  },
  {
    id: "87654323",
    topic: "Backend Architecture Review",
    startTime: `${TODAY}T16:00:00Z`,
    duration: 60,
    participants: 6,
    hostEmail: "sarah@acme-corp.com",
  },
];

export class MockZoomConnector implements IZoomConnector {
  readonly source = "zoom" as const;

  async testConnection() {
    return { ok: true };
  }

  async fetchPastMeetings(): Promise<ZoomMeeting[]> {
    return MOCK_ZOOM_MEETINGS;
  }

  async fetchActivities(): Promise<Activity[]> {
    return MOCK_ZOOM_MEETINGS.map((m) => ({
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
