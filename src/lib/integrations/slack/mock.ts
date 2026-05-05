import type { Activity } from "@/lib/types";
import type { ISlackConnector } from "./connector";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";

export class MockSlackConnector implements ISlackConnector {
  readonly source = "slack" as const;

  async testConnection() {
    return { ok: true };
  }

  async fetchChannels() {
    return [
      { id: "C001", name: "backend-team" },
      { id: "C002", name: "code-review" },
      { id: "C003", name: "general" },
    ];
  }

  async fetchActivities(): Promise<Activity[]> {
    return MOCK_ACTIVITIES.filter((a) => a.source === "slack");
  }
}
