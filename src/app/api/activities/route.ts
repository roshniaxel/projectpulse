import { type NextRequest } from "next/server";
import { getJiraConnector } from "@/lib/integrations/jira";
import { getCalendarConnector } from "@/lib/integrations/google-calendar";
import { getSlackConnector } from "@/lib/integrations/slack";
import { getGranolaConnector } from "@/lib/integrations/granola";
import { getGithubConnector } from "@/lib/integrations/github";
import { requireDbUser, parseDateRange } from "@/lib/auth-helpers";
import type { Activity } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const searchParams = request.nextUrl.searchParams;
  const { from, to } = parseDateRange(searchParams);
  const project = searchParams.get("project") || undefined;

  const [jira, calendar, slack, granola, github] = await Promise.all([
    getJiraConnector(user.id),
    getCalendarConnector(user.id),
    getSlackConnector(user.id, user.email),
    getGranolaConnector(user.id),
    getGithubConnector(user.id),
  ]);

  // When no specific project is picked, scope Jira to the user's own projects
  // (those they're assignee or reporter on). Avoids dumping the entire
  // workspace's recently-updated tickets onto the activity feed.
  let userProjectKeys: string[] | undefined;
  if (!project) {
    try {
      const assigned = await jira.fetchAssignedProjects();
      if (assigned.length > 0) {
        userProjectKeys = assigned.map((p) => p.key);
      }
    } catch {
      // If we can't fetch the list, fall back to the (unfiltered) activity feed
    }
  }

  try {
    const [jiraActivities, calendarActivities, slackActivities, granolaActivities, githubActivities] =
      await Promise.allSettled([
        jira.fetchActivities({
          since: from,
          until: to,
          projectId: project,
          projectIds: userProjectKeys,
          mineOnly: true,
        }),
        calendar.fetchActivities({ since: from, until: to }),
        slack.fetchActivities({ since: from, until: to }),
        granola.fetchActivities({ since: from, until: to }),
        github.fetchActivities({ since: from, until: to }),
      ]);

    const activities: Activity[] = [];
    if (jiraActivities.status === "fulfilled") activities.push(...jiraActivities.value);
    if (calendarActivities.status === "fulfilled") activities.push(...calendarActivities.value);
    if (slackActivities.status === "fulfilled") activities.push(...slackActivities.value);
    if (granolaActivities.status === "fulfilled") activities.push(...granolaActivities.value);
    if (githubActivities.status === "fulfilled") activities.push(...githubActivities.value);

    // If the user filtered to a specific project, drop GitHub commits whose
    // mapped ticket key doesn't belong to that project. Commits with no
    // detected ticket key still appear under the unfiltered feed but are
    // hidden when filtering — keeps the project view tight.
    let filteredByProject = activities;
    if (project) {
      filteredByProject = activities.filter(
        (a) =>
          a.source !== "github" ||
          (a.ticketKey && a.ticketKey.startsWith(`${project}-`))
      );
    }

    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;

    const userActivities = filteredByProject
      .filter((a) => {
        const ts = new Date(a.timestamp).getTime();
        return ts >= fromMs && ts <= toMs;
      });

    userActivities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return Response.json({ activities: userActivities });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
