import type { IZoomConnector } from "./connector";

export class DisconnectedZoomConnector implements IZoomConnector {
  readonly source = "zoom" as const;
  async testConnection() {
    return { ok: false, error: "Not connected" };
  }
  async fetchPastMeetings() {
    return [];
  }
  async fetchActivities() {
    return [];
  }
}
