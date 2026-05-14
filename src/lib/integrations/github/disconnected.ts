import type { IGitHubConnector } from "./connector";

export class DisconnectedGitHubConnector implements IGitHubConnector {
  readonly source = "github" as const;
  async testConnection() {
    return { ok: false, error: "Not connected" };
  }
  async fetchRepos() {
    return [];
  }
  async fetchActivities() {
    return [];
  }
}
