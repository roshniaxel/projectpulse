import type { ICalendarConnector } from "./connector";

export class DisconnectedCalendarConnector implements ICalendarConnector {
  readonly source = "google_calendar" as const;
  async testConnection() {
    return { ok: false, error: "Not connected" };
  }
  async fetchActivities() {
    return [];
  }
}
