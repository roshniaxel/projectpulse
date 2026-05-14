import { RealZoomConnector, type ZoomCreds } from "./real";
import { DisconnectedZoomConnector } from "./disconnected";
import type { IZoomConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

export async function getZoomConnector(userId: string): Promise<IZoomConnector> {
  const creds = await getIntegrationCredentials(userId, "zoom");
  if (!creds?.accountId || !creds?.clientId || !creds?.clientSecret) {
    return new DisconnectedZoomConnector();
  }
  return new RealZoomConnector(creds as ZoomCreds);
}

export type { IZoomConnector } from "./connector";
