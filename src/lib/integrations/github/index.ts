import { RealGitHubConnector, type GitHubCreds } from "./real";
import { DisconnectedGitHubConnector } from "./disconnected";
import type { IGitHubConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

export async function getGithubConnector(
  userId: string
): Promise<IGitHubConnector> {
  const creds = await getIntegrationCredentials(userId, "github");
  if (!creds?.apiToken) return new DisconnectedGitHubConnector();
  return new RealGitHubConnector(creds as GitHubCreds);
}

export type { IGitHubConnector } from "./connector";
