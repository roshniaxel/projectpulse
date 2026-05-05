import { RealGranolaConnector } from "./real";
import { MockGranolaConnector } from "./mock";
import type { IGranolaConnector } from "./connector";

export function getGranolaConnector(): IGranolaConnector {
  return process.env.USE_MOCK_GRANOLA === "true"
    ? new MockGranolaConnector()
    : new RealGranolaConnector();
}

export type { IGranolaConnector } from "./connector";
