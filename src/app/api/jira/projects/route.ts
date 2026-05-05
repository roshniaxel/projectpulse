import { getJiraConnector } from "@/lib/integrations/jira";

export async function GET() {
  try {
    const connector = getJiraConnector();
    const projects = await connector.fetchProjects();
    return Response.json({ projects });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Jira projects" },
      { status: 500 }
    );
  }
}
