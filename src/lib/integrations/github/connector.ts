import type { ActivityConnector } from "../types";

export interface IGitHubConnector extends ActivityConnector {
  fetchRepos(): Promise<Array<{ owner: string; name: string; pushedAt: string }>>;
}
