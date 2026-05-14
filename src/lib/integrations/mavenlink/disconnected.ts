import type { IMavenlinkConnector } from "./connector";
import type { PushResult } from "@/lib/types";

export class DisconnectedMavenlinkConnector implements IMavenlinkConnector {
  readonly source = "mavenlink" as const;
  async testConnection() {
    return { ok: false, error: "Not connected" };
  }
  async fetchWorkspaces() {
    return [];
  }
  async fetchProjects() {
    return [];
  }
  async pushTimeEntries(): Promise<PushResult> {
    return {
      success: false,
      pushed: 0,
      failed: 0,
      errors: [{ entryId: "*", error: "Mavenlink is not connected" }],
      externalIds: [],
    };
  }
}
