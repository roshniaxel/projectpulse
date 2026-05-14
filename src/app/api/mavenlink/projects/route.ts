import { getMavenlinkConnector } from "@/lib/integrations/mavenlink";
import { requireDbUser } from "@/lib/auth-helpers";

export async function GET() {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  try {
    const connector = await getMavenlinkConnector(user.id);
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
