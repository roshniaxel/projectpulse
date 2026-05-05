import type { Activity } from "@/lib/types";
import type { IJiraConnector } from "./connector";
import type { JiraProject, JiraTicket, JiraEstimate } from "./types";

const BASE_URL = process.env.JIRA_BASE_URL || "";
const USER_EMAIL = process.env.JIRA_USER_EMAIL || "";
const API_TOKEN = process.env.JIRA_API_TOKEN || "";

function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${USER_EMAIL}:${API_TOKEN}`).toString("base64");
}

async function jiraFetch(path: string) {
  const res = await fetch(`${BASE_URL}/rest/api/3${path}`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Jira API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export class RealJiraConnector implements IJiraConnector {
  readonly source = "jira" as const;

  async testConnection() {
    try {
      await jiraFetch("/myself");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchProjects(): Promise<JiraProject[]> {
    const data = await jiraFetch("/project/search?maxResults=50&orderBy=name");
    return (data.values || []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      key: String(p.key),
      name: String(p.name),
      avatarUrl: (p.avatarUrls as Record<string, string>)?.["48x48"] || undefined,
    }));
  }

  async fetchTickets(params: {
    projectKey: string;
    status?: string[];
    assignee?: string;
  }): Promise<JiraTicket[]> {
    let jql = `project = "${params.projectKey}"`;
    if (params.status?.length) {
      jql += ` AND status IN (${params.status.map((s) => `"${s}"`).join(",")})`;
    }
    if (params.assignee) {
      jql += ` AND assignee = "${params.assignee}"`;
    }
    jql += " ORDER BY updated DESC";

    const data = await jiraFetch(
      `/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee,timetracking`
    );

    return (data.issues || []).map((issue: Record<string, unknown>) => {
      const fields = issue.fields as Record<string, unknown>;
      const timetracking = fields.timetracking as Record<string, unknown> | undefined;
      const status = fields.status as Record<string, unknown>;
      const assignee = fields.assignee as Record<string, unknown> | null;

      return {
        key: String(issue.key),
        summary: String(fields.summary),
        status: String((status as Record<string, unknown>)?.name || "Unknown"),
        assignee: assignee ? String(assignee.displayName) : undefined,
        projectKey: params.projectKey,
        estimate: timetracking
          ? {
              originalEstimateSeconds: (timetracking.originalEstimateSeconds as number) || null,
              remainingEstimateSeconds: (timetracking.remainingEstimateSeconds as number) || null,
              timeSpentSeconds: (timetracking.timeSpentSeconds as number) || null,
            }
          : null,
      };
    });
  }

  async getTicketEstimate(ticketKey: string): Promise<JiraEstimate | null> {
    try {
      const data = await jiraFetch(`/issue/${ticketKey}?fields=timetracking`);
      const timetracking = (data.fields as Record<string, unknown>)?.timetracking as Record<string, unknown> | undefined;
      if (!timetracking) return null;
      return {
        originalEstimateSeconds: (timetracking.originalEstimateSeconds as number) || null,
        remainingEstimateSeconds: (timetracking.remainingEstimateSeconds as number) || null,
        timeSpentSeconds: (timetracking.timeSpentSeconds as number) || null,
      };
    } catch {
      return null;
    }
  }

  async fetchActivities(params: {
    since: string;
    until?: string;
    projectId?: string;
  }): Promise<Activity[]> {
    let jql = `updated >= "${params.since}"`;
    if (params.until) jql += ` AND updated <= "${params.until}"`;
    if (params.projectId) jql += ` AND project = "${params.projectId}"`;
    jql += " ORDER BY updated DESC";

    const data = await jiraFetch(
      `/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee,updated`
    );

    return (data.issues || []).map((issue: Record<string, unknown>) => {
      const fields = issue.fields as Record<string, unknown>;
      const status = fields.status as Record<string, unknown>;
      return {
        id: `jira-${issue.key}`,
        source: "jira" as const,
        type: "ticket_update" as const,
        title: `${issue.key} — ${fields.summary}`,
        description: `Status: ${(status as Record<string, unknown>)?.name}`,
        timestamp: String(fields.updated),
        metadata: {
          status: String((status as Record<string, unknown>)?.name || ""),
          assignee: String((fields.assignee as Record<string, unknown>)?.displayName || "Unassigned"),
        },
        ticketKey: String(issue.key),
      };
    });
  }
}
