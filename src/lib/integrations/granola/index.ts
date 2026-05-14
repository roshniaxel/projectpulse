import { RealGranolaConnector } from "./real";
import { DisconnectedGranolaConnector } from "./disconnected";
import type { IGranolaConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

export async function getGranolaConnector(
  userId: string
): Promise<IGranolaConnector> {
  const creds = await getIntegrationCredentials(userId, "granola");
  if (!creds?.webhookSecret) return new DisconnectedGranolaConnector();
  return new RealGranolaConnector();
}

export type { IGranolaConnector } from "./connector";
