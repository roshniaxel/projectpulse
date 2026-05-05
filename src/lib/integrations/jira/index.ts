import { RealJiraConnector } from "./real";
import { MockJiraConnector } from "./mock";
import type { IJiraConnector } from "./connector";

export function getJiraConnector(): IJiraConnector {
  return process.env.USE_MOCK_JIRA === "true"
    ? new MockJiraConnector()
    : new RealJiraConnector();
}

export type { IJiraConnector } from "./connector";
