import { RealSlackConnector, type SlackCreds } from "./real";
import { DisconnectedSlackConnector } from "./disconnected";
import type { ISlackConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

export async function getSlackConnector(userId: string): Promise<ISlackConnector> {
  const creds = await getIntegrationCredentials(userId, "slack");
  if (!creds?.botToken) return new DisconnectedSlackConnector();
  return new RealSlackConnector(creds as SlackCreds);
}

export type { ISlackConnector } from "./connector";
