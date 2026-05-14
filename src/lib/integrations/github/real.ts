import type { Activity } from "@/lib/types";
import type { IGitHubConnector } from "./connector";

export type GitHubCreds = { apiToken: string };

// Matches Jira-style ticket keys: 1-10 uppercase letters, hyphen, digits.
// Captures the first occurrence in a commit message or branch name.
const TICKET_KEY_RE = /\b([A-Z]{1,10}-\d+)\b/;

type GitHubRepo = {
  owner: { login: string };
  name: string;
  pushed_at: string;
  fork: boolean;
};

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  author: { login: string } | null;
};

export class RealGitHubConnector implements IGitHubConnector {
  readonly source = "github" as const;
  private apiToken: string;
  private cachedUsername: string | null = null;

  constructor(creds: GitHubCreds) {
    this.apiToken = creds.apiToken;
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        Authorization: `token ${this.apiToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  private async getUsername(): Promise<string> {
    if (this.cachedUsername) return this.cachedUsername;
    const me = await this.fetch<{ login: string }>("/user");
    this.cachedUsername = me.login;
    return me.login;
  }

  async testConnection() {
    try {
      await this.getUsername();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown" };
    }
  }

  async fetchRepos(): Promise<
    Array<{ owner: string; name: string; pushedAt: string }>
  > {
    const repos = await this.fetch<GitHubRepo[]>(
      "/user/repos?sort=pushed&per_page=10&affiliation=owner,collaborator,organization_member"
    );
    return repos
      .filter((r) => !r.fork)
      .map((r) => ({
        owner: r.owner.login,
        name: r.name,
        pushedAt: r.pushed_at,
      }));
  }

  async fetchActivities(params: {
    since: string;
    until?: string;
  }): Promise<Activity[]> {
    const username = await this.getUsername();
    const repos = await this.fetchRepos();

    // Fetch commits in parallel across the user's top recent repos.
    // Per-repo limit kept low to bound latency on workspaces with many repos.
    const commitResults = await Promise.allSettled(
      repos.slice(0, 8).map(async (r) => {
        const sinceIso = new Date(params.since).toISOString();
        const untilIso = params.until
          ? new Date(
              new Date(params.until).getTime() + 24 * 60 * 60 * 1000 - 1
            ).toISOString()
          : undefined;
        const qs = new URLSearchParams({
          author: username,
          since: sinceIso,
          per_page: "15",
        });
        if (untilIso) qs.set("until", untilIso);
        const commits = await this.fetch<GitHubCommit[]>(
          `/repos/${r.owner}/${r.name}/commits?${qs.toString()}`
        );
        return { repo: `${r.owner}/${r.name}`, commits };
      })
    );

    const activities: Activity[] = [];
    for (const result of commitResults) {
      if (result.status !== "fulfilled") continue;
      for (const c of result.value.commits) {
        const firstLine = c.commit.message.split("\n")[0];
        const ticketMatch = c.commit.message.match(TICKET_KEY_RE);
        const ticketKey = ticketMatch ? ticketMatch[1] : undefined;
        activities.push({
          id: `github-${c.sha}`,
          source: "github",
          type: "commit",
          title: firstLine,
          description: `${result.value.repo} · ${c.sha.slice(0, 7)}`,
          timestamp: c.commit.author.date,
          metadata: {
            repo: result.value.repo,
            sha: c.sha,
            url: c.html_url,
            author: c.author?.login || c.commit.author.name,
          },
          ticketKey,
        });
      }
    }

    return activities;
  }
}
