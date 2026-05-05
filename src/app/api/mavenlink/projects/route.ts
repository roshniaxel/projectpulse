import { getMavenlinkConnector } from "@/lib/integrations/mavenlink";

export async function GET() {
  try {
    const connector = getMavenlinkConnector();
    const [workspaces, projects] = await Promise.all([
      connector.fetchWorkspaces(),
      connector.fetchProjects(),
    ]);
    return Response.json({ workspaces, projects });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Mavenlink projects" },
      { status: 500 }
    );
  }
}
