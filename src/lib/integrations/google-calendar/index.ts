import { RealCalendarConnector, type CalendarCreds } from "./real";
import { DisconnectedCalendarConnector } from "./disconnected";
import type { ICalendarConnector } from "./connector";
import { getIntegrationCredentials } from "@/lib/integration-credentials";

export async function getCalendarConnector(
  userId: string
): Promise<ICalendarConnector> {
  // Google Calendar is connected during Google sign-in (scope-on-signin).
  // accessToken comes from the OAuth flow; refreshToken is in metadata.
  const creds = await getIntegrationCredentials(userId, "google_calendar");
  if (!creds?.accessToken) return new DisconnectedCalendarConnector();
  return new RealCalendarConnector({
    userId,
    accessToken: creds.accessToken,
    refreshToken: creds.refreshToken,
    expiresAt: creds.expiresAt ? Number(creds.expiresAt) : undefined,
  } as CalendarCreds);
}

export type { ICalendarConnector } from "./connector";
