import { RealSlackConnector } from "./real";
import { MockSlackConnector } from "./mock";
import type { ISlackConnector } from "./connector";

export function getSlackConnector(): ISlackConnector {
  return process.env.USE_MOCK_SLACK === "true"
    ? new MockSlackConnector()
    : new RealSlackConnector();
}

export type { ISlackConnector } from "./connector";
