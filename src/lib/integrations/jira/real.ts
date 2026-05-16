import type { Activity } from "@/lib/types";
import type { IJiraConnector } from "./connector";
import type { JiraProject, JiraTicket, JiraEstimate } from "./types";
import { refreshAccessToken } from "@/lib/oauth/atlassian";
import { updateAccessToken } from "@/lib/integration-credentials";

export type JiraCreds = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  cloudId: string;
  expiresAt?: number;
};

export class RealJiraConnector implements IJiraConnector {
  readonly source = "jira" as const;
  private userId: string;
  private accessToken: string;
  private refreshToken: string;
  private cloudId: string;

  constructor(creds: JiraCreds) {
    this.userId = creds.userId;
    this.accessToken = creds.accessToken;
    this.refreshToken = creds.refreshToken;
    this.cloudId = creds.cloudId;
  }

  private async refreshTokenAndPersist(): Promise<void> {
    const tokens = await refreshAccessToken(this.refreshToken);
    this.accessToken = tokens.access_token;
    // Atlassian rotates refresh tokens on each use; capture the new one.
    if (tokens.refresh_token) this.refreshToken = tokens.refresh_token;
    await updateAccessToken(this.userId, "jira", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
    });
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = `https://api.atlassian.com/ex/jira/${this.cloudId}/rest/api/3${path}`;
    const doFetch = (token: string) =>
      fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });

    let res = await doFetch(this.accessToken);
    if (res.status === 401) {
      // Token expired — refresh once and retry.
      try {
        await this.refreshTokenAndPersist();
        res = await doFetch(this.accessToken);
      } catch {
        // fall through; the original 401 will be reported
      }
    }
    return res;
  }

  private async fetchJson(path: string, init?: RequestInit) {
    const res = await this.fetch(path, init);
    if (!res.ok) {
      throw new Error(`Jira API error: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }

  async testConnection() {
    try {
      await this.fetchJson("/myself");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchProjects(): Promise<JiraProject[]> {
    // Order by most-recently-active so the projects the user actually works
    // on appear first — alphabetical ordering pushes them past maxResults
    // for users in workspaces with many projects.
    const data = await this.fetchJson(
      "/project/search?maxResults=100&orderBy=-lastIssueUpdatedTime"
    );
    return (data.values || []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      key: String(p.key),
      name: String(p.name),
      avatarUrl: (p.avatarUrls as Record<string, string>)?.["48x48"] || undefined,
    }));
  }

  // Projects where the user has tickets they're assigned to or reported.
  // Dedupes by project key. Falls back empty if the user has no such tickets.
  async fetchAssignedProjects(): Promise<JiraProject[]> {
    const jql =
      "(assignee = currentUser() OR reporter = currentUser()) ORDER BY updated DESC";
    const data = await this.fetchJson(
      `/search/jql?jql=${encodeURIComponent(jql)}&maxResults=100&fields=project`
    );
    const seen = new Map<string, JiraProject>();
    for (const issue of (data.issues || []) as Record<string, unknown>[]) {
      const fields = issue.fields as Record<string, unknown> | undefined;
      const project = fields?.project as Record<string, unknown> | undefined;
      if (!project) continue;
      const key = String(project.key);
      if (seen.has(key)) continue;
      seen.set(key, {
        id: String(project.id),
        key,
        name: String(project.name),
        avatarUrl: (project.avatarUrls as Record<string, string>)?.["48x48"] || undefined,
      });
    }
    return Array.from(seen.values());
  }

  async fetchTickets(params: {
    projectKey: string;
    status?: string[];
    assignee?: string;
    assignedToMe?: boolean;
    mineOnly?: boolean;
  }): Promise<JiraTicket[]> {
    let jql = params.projectKey ? `project = "${params.projectKey}"` : "";
    if (params.status?.length) {
      jql += jql
        ? ` AND status IN (${params.status.map((s) => `"${s}"`).join(",")})`
        : `status IN (${params.status.map((s) => `"${s}"`).join(",")})`;
    }
    // Prefer JQL's currentUser() function for "me" — works regardless of
    // display-name variations and respects Jira's accountId model post-GDPR.
    if (params.assignedToMe) {
      jql += jql ? ` AND assignee = currentUser()` : `assignee = currentUser()`;
    } else if (params.assignee) {
      jql += jql ? ` AND assignee = "${params.assignee}"` : `assignee = "${params.assignee}"`;
    }
    // "Mine" = either currently assigned OR has my worklogs. Keeps historical
    // worked-on tickets even after they're reassigned, while excluding
    // tickets I've never touched but happen to be in-progress in the workspace.
    if (params.mineOnly) {
      const mine = "(assignee = currentUser() OR worklogAuthor = currentUser())";
      jql += jql ? ` AND ${mine}` : mine;
    }
    jql += " ORDER BY updated DESC";

    const data = await this.fetchJson(
      `/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee,timetracking,project,updated`
    );

    return (data.issues || []).map((issue: Record<string, unknown>) => {
      const fields = issue.fields as Record<string, unknown>;
      const timetracking = fields.timetracking as Record<string, unknown> | undefined;
      const status = fields.status as Record<string, unknown>;
      const assignee = fields.assignee as Record<string, unknown> | null;
      const project = fields.project as Record<string, unknown> | undefined;

      return {
        key: String(issue.key),
        summary: String(fields.summary),
        status: String((status as Record<string, unknown>)?.name || "Unknown"),
        assignee: assignee ? String(assignee.displayName) : undefined,
        projectKey: params.projectKey || String(project?.key || ""),
        updated: fields.updated ? String(fields.updated) : undefined,
        estimate: timetracking
          ? {
              originalEstimateSeconds:
                (timetracking.originalEstimateSeconds as number) || null,
              remainingEstimateSeconds:
                (timetracking.remainingEstimateSeconds as number) || null,
              timeSpentSeconds: (timetracking.timeSpentSeconds as number) || null,
            }
          : null,
      };
    });
  }

  async getTicketSummary(ticketKey: string): Promise<string | null> {
    try {
      const data = await this.fetchJson(`/issue/${ticketKey}?fields=summary`);
      const summary = (data.fields as Record<string, unknown>)?.summary;
      return summary ? String(summary) : null;
    } catch {
      return null;
    }
  }

  async getTicketEstimate(ticketKey: string): Promise<JiraEstimate | null> {
    try {
      const data = await this.fetchJson(`/issue/${ticketKey}?fields=timetracking`);
      const timetracking = (data.fields as Record<string, unknown>)?.timetracking as
        | Record<string, unknown>
        | undefined;
      if (!timetracking) return null;
      return {
        originalEstimateSeconds:
          (timetracking.originalEstimateSeconds as number) || null,
        remainingEstimateSeconds:
          (timetracking.remainingEstimateSeconds as number) || null,
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
    projectIds?: string[];
    mineOnly?: boolean;
  }): Promise<Activity[]> {
    let jql = `updated >= "${params.since}"`;
    if (params.until) jql += ` AND updated <= "${params.until}"`;
    if (params.projectId) {
      jql += ` AND project = "${params.projectId}"`;
    } else if (params.projectIds && params.projectIds.length > 0) {
      const list = params.projectIds.map((k) => `"${k}"`).join(",");
      jql += ` AND project IN (${list})`;
    }
    // Restrict to tickets the current user actually has a stake in — assignee,
    // reporter, or has logged worklog time. Otherwise activity feeds leak
    // teammates' ticket updates from any project we share with them.
    if (params.mineOnly) {
      jql +=
        " AND (assignee = currentUser() OR reporter = currentUser() OR worklogAuthor = currentUser())";
    }
    jql += " ORDER BY updated DESC";

    const data = await this.fetchJson(
      `/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee,updated`
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
          assignee: String(
            (fields.assignee as Record<string, unknown>)?.displayName || "Unassigned"
          ),
        },
        ticketKey: String(issue.key),
      };
    });
  }
}
