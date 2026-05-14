import { RealJiraConnector, type JiraCreds } from "./real";
import { DisconnectedJiraConnector } from "./disconnected";
import type { IJiraConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

export async function getJiraConnector(userId: string): Promise<IJiraConnector> {
  // Jira uses Atlassian OAuth: accessToken + refreshToken + cloudId.
  const creds = await getIntegrationCredentials(userId, "jira");
  if (!creds?.accessToken || !creds?.refreshToken || !creds?.cloudId) {
    return new DisconnectedJiraConnector();
  }
  return new RealJiraConnector({
    userId,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    cloudId: creds.cloudId,
  } as JiraCreds);
}

export type { IJiraConnector } from "./connector";
