import type { Activity } from "@/lib/types";
import type { ICalendarConnector } from "./connector";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";

export class MockCalendarConnector implements ICalendarConnector {
  readonly source = "google_calendar" as const;

  async testConnection() {
    return { ok: true };
  }

  async fetchActivities(): Promise<Activity[]> {
    return MOCK_ACTIVITIES.filter((a) => a.source === "google_calendar");
  }
}
