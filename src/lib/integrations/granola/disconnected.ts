import type { IGranolaConnector } from "./connector";

export class DisconnectedGranolaConnector implements IGranolaConnector {
  readonly source = "granola" as const;
  async testConnection() {
    return { ok: false, error: "Not connected" };
  }
  async fetchActivities() {
    return [];
  }
  async importNotes() {
    return [];
  }
}
