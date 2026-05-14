import { type NextRequest } from "next/server";
import { getJiraConnector } from "@/lib/integrations/jira";
import { requireDbUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  const projectKey = searchParams.get("projectKey");

  if (!projectKey) {
    return Response.json({ error: "projectKey is required" }, { status: 400 });
  }

  const statusParam = searchParams.get("status");
  const status = statusParam ? statusParam.split(",") : undefined;
  const allUsers = searchParams.get("all") === "true";

  try {
    const connector = await getJiraConnector(user.id);
    const tickets = await connector.fetchTickets({
      projectKey,
      status,
      assignedToMe: !allUsers,
    });

    return Response.json({ tickets });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
