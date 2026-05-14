import { type NextRequest } from "next/server";
import { getSlackConnector } from "@/lib/integrations/slack";
import { requireDbUser, parseDateRange } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { from, to } = parseDateRange(request.nextUrl.searchParams);

  try {
    const connector = await getSlackConnector(user.id);
    const activities = await connector.fetchActivities({ since: from, until: to });
    return Response.json({ activities });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Slack messages" },
      { status: 500 }
    );
  }
}
