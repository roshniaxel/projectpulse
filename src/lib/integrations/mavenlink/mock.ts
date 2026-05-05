import type { TimeEntry, PushResult } from "@/lib/types";
import type { IMavenlinkConnector } from "./connector";
import type { MavenlinkWorkspace, MavenlinkProject } from "./types";

export class MockMavenlinkConnector implements IMavenlinkConnector {
  readonly source = "mavenlink" as const;

  async testConnection() {
    return { ok: true };
  }

  async fetchWorkspaces(): Promise<MavenlinkWorkspace[]> {
    return [
      { id: "ws-1", title: "Acme Corp" },
      { id: "ws-2", title: "Internal Projects" },
    ];
  }

  async fetchProjects(): Promise<MavenlinkProject[]> {
    return [
      { id: "mp-1", title: "Backend API Development", workspaceId: "ws-1" },
      { id: "mp-2", title: "Frontend Redesign", workspaceId: "ws-1" },
      { id: "mp-3", title: "Infrastructure Upgrades", workspaceId: "ws-2" },
    ];
  }

  async pushTimeEntries(entries: TimeEntry[]): Promise<PushResult> {
    // Simulate a 1s delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const validEntries = entries.filter((e) => e.status !== "rejected");
    return {
      success: true,
      pushed: validEntries.length,
      failed: 0,
      errors: [],
      externalIds: validEntries.map((e, i) => ({
        entryId: e.id,
        externalId: `mvl-${Date.now()}-${i}`,
      })),
    };
  }
}
