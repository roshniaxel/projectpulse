import { type NextRequest } from "next/server";
import { getJiraConnector } from "@/lib/integrations/jira";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectKey = searchParams.get("projectKey");

  if (!projectKey) {
    return Response.json({ error: "projectKey is required" }, { status: 400 });
  }

  const statusParam = searchParams.get("status");
  const status = statusParam ? statusParam.split(",") : undefined;

  try {
    const connector = getJiraConnector();
    const tickets = await connector.fetchTickets({ projectKey, status });
    return Response.json({ tickets });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
