import { getJiraConnector } from "@/lib/integrations/jira";
import { requireDbUser } from "@/lib/auth-helpers";
import type { JiraProject } from "@/lib/types";

// Module-level cache keyed by userId. Jira's /project/search + /search/jql
// pair takes 1–4s for users in big workspaces, and the project list barely
// changes minute-to-minute. 5-minute TTL is plenty fresh for a working demo.
type CacheEntry = { data: JiraProject[]; expiresAt: number };
const projectCache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

export async function GET() {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const cached = projectCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ projects: cached.data, cached: true });
  }

  try {
    const connector = await getJiraConnector(user.id);
    // Default to projects where the user has assigned/reported tickets.
    // If the user has none, fall back to all browsable projects so the
    // dropdown isn't empty for someone who just joined a workspace.
    let projects = await connector.fetchAssignedProjects();
    if (projects.length === 0) {
      projects = await connector.fetchProjects();
    }
    projectCache.set(user.id, {
      data: projects,
      expiresAt: Date.now() + TTL_MS,
    });
    return Response.json({ projects });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Jira projects" },
      { status: 500 }
    );
  }
}
