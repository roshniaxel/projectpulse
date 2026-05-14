import { RealMavenlinkConnector, type MavenlinkCreds } from "./real";
import { DisconnectedMavenlinkConnector } from "./disconnected";
import type { IMavenlinkConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

export async function getMavenlinkConnector(
  userId: string
): Promise<IMavenlinkConnector> {
  const creds = await getIntegrationCredentials(userId, "mavenlink");
  if (!creds?.apiToken || !creds?.accountId) {
    return new DisconnectedMavenlinkConnector();
  }
  return new RealMavenlinkConnector(creds as MavenlinkCreds);
}

export type { IMavenlinkConnector } from "./connector";
