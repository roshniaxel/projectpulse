import type { ISlackConnector } from "./connector";

export class DisconnectedSlackConnector implements ISlackConnector {
  readonly source = "slack" as const;
  async testConnection() {
    return { ok: false, error: "Not connected" };
  }
  async fetchChannels() {
    return [];
  }
  async fetchActivities() {
    return [];
  }
}
