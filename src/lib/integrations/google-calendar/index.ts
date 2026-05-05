import { RealCalendarConnector } from "./real";
import { MockCalendarConnector } from "./mock";
import type { ICalendarConnector } from "./connector";

export function getCalendarConnector(): ICalendarConnector {
  return process.env.USE_MOCK_CALENDAR === "true"
    ? new MockCalendarConnector()
    : new RealCalendarConnector();
}

export type { ICalendarConnector } from "./connector";
