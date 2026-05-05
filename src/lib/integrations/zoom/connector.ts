import type { ActivityConnector } from "../types";

export interface ZoomMeeting {
  id: string;
  topic: string;
  startTime: string;
  duration: number; // minutes
  participants: number;
  hostEmail: string;
}

export interface IZoomConnector extends ActivityConnector {
  fetchPastMeetings(params: { from: string; to?: string }): Promise<ZoomMeeting[]>;
}
