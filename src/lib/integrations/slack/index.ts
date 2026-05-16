import { RealSlackConnector, type SlackCreds } from "./real";
import { DisconnectedSlackConnector } from "./disconnected";
import type { ISlackConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

// `userEmail` is used to resolve the caller's Slack member ID so the activity
// feed surfaces only their own messages, not every channel member's. If
// omitted, the connector treats activities as empty (safer than leaking).
export async function getSlackConnector(
  userId: string,
  userEmail?: string
): Promise<ISlackConnector> {
  const creds = await getIntegrationCredentials(userId, "slack");
  if (!creds?.botToken) return new DisconnectedSlackConnector();
  return new RealSlackConnector({ ...(creds as SlackCreds), userEmail });
}

export type { ISlackConnector } from "./connector";
