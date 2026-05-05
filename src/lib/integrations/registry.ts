import { getJiraConnector } from "./jira";
import { getCalendarConnector } from "./google-calendar";
import { getSlackConnector } from "./slack";
import { getMavenlinkConnector } from "./mavenlink";
import { getGranolaConnector } from "./granola";
import { getZoomConnector } from "./zoom";

export function getConnectors() {
  return {
    jira: getJiraConnector(),
    google_calendar: getCalendarConnector(),
    slack: getSlackConnector(),
    mavenlink: getMavenlinkConnector(),
    granola: getGranolaConnector(),
    zoom: getZoomConnector(),
  } as const;
}
