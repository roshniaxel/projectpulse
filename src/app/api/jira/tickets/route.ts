import { type NextRequest } from "next/server";
import { getJiraConnector } from "@/lib/integrations/jira";
import { getSessionUser, emailToJiraUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectKey = searchParams.get("projectKey");

  if (!projectKey) {
    return Response.json({ error: "projectKey is required" }, { status: 400 });
  }

  const statusParam = searchParams.get("status");
  const status = statusParam ? statusParam.split(",") : undefined;
  const allUsers = searchParams.get("all") === "true"; // Pass ?all=true to see all tickets

  const user = await getSessionUser();
  const jiraUserName = emailToJiraUser(user?.email);

  try {
    const connector = getJiraConnector();
    let tickets = await connector.fetchTickets({
      projectKey,
      status,
      assignee: !allUsers && jiraUserName ? jiraUserName : undefined,
    });

    // Client-side filter as fallback (mock connector doesn't filter by assignee in fetchTickets)
    if (!allUsers && jiraUserName) {
      tickets = tickets.filter(
        (t) => t.assignee === jiraUserName || !t.assignee
      );
    }

    return Response.json({ tickets });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
