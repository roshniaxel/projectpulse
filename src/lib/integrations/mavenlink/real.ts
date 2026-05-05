import type { TimeEntry, PushResult } from "@/lib/types";
import type { IMavenlinkConnector } from "./connector";
import type { MavenlinkWorkspace, MavenlinkProject } from "./types";

const API_TOKEN = process.env.MAVENLINK_API_TOKEN || "";
const BASE_URL = "https://api.mavenlink.com/api/v1";

async function mavenlinkFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Mavenlink API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export class RealMavenlinkConnector implements IMavenlinkConnector {
  readonly source = "mavenlink" as const;

  async testConnection() {
    try {
      await mavenlinkFetch("/workspaces.json?per_page=1");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchWorkspaces(): Promise<MavenlinkWorkspace[]> {
    const data = await mavenlinkFetch("/workspaces.json?per_page=50");
    const workspaces = data.workspaces || {};
    return Object.values(workspaces).map((w: unknown) => {
      const ws = w as Record<string, unknown>;
      return {
        id: String(ws.id),
        title: String(ws.title),
      };
    });
  }

  async fetchProjects(workspaceId?: string): Promise<MavenlinkProject[]> {
    const path = workspaceId
      ? `/workspaces.json?per_page=50&include=sub_workspaces&only=${workspaceId}`
      : `/workspaces.json?per_page=50`;
    const data = await mavenlinkFetch(path);
    const workspaces = data.workspaces || {};
    return Object.values(workspaces).map((w: unknown) => {
      const ws = w as Record<string, unknown>;
      return {
        id: String(ws.id),
        title: String(ws.title),
        workspaceId: workspaceId || String(ws.id),
      };
    });
  }

  async pushTimeEntries(entries: TimeEntry[]): Promise<PushResult> {
    const results: PushResult = {
      success: true,
      pushed: 0,
      failed: 0,
      errors: [],
      externalIds: [],
    };

    for (const entry of entries) {
      if (entry.status === "rejected") continue;

      try {
        const data = await mavenlinkFetch("/time_entries.json", {
          method: "POST",
          body: JSON.stringify({
            time_entry: {
              date_performed: new Date().toISOString().split("T")[0],
              time_in_minutes: Math.round(entry.hours * 60),
              notes: `[${entry.ticketKey || "General"}] ${entry.description}`,
              rate_in_cents: 0,
            },
          }),
        });

        const timeEntries = data.time_entries || {};
        const createdId = Object.keys(timeEntries)[0] || "unknown";

        results.pushed++;
        results.externalIds.push({
          entryId: entry.id,
          externalId: createdId,
        });
      } catch (e) {
        results.failed++;
        results.errors.push({
          entryId: entry.id,
          error: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }

    results.success = results.failed === 0;
    return results;
  }
}
