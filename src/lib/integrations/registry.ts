import { getJiraConnector } from "./jira";
import { getCalendarConnector } from "./google-calendar";
import { getSlackConnector } from "./slack";
import { getMavenlinkConnector } from "./mavenlink";
import { getGranolaConnector } from "./granola";
import { getZoomConnector } from "./zoom";
import { getGithubConnector } from "./github";

export async function getConnectors(userId: string) {
  const [jira, google_calendar, slack, mavenlink, granola, zoom, github] = await Promise.all([
    getJiraConnector(userId),
    getCalendarConnector(userId),
    getSlackConnector(userId),
    getMavenlinkConnector(userId),
    getGranolaConnector(userId),
    getZoomConnector(userId),
    getGithubConnector(userId),
  ]);
  return { jira, google_calendar, slack, mavenlink, granola, zoom, github } as const;
}
