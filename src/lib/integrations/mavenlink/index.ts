import { RealMavenlinkConnector } from "./real";
import { MockMavenlinkConnector } from "./mock";
import type { IMavenlinkConnector } from "./connector";

export function getMavenlinkConnector(): IMavenlinkConnector {
  return process.env.USE_MOCK_MAVENLINK === "true"
    ? new MockMavenlinkConnector()
    : new RealMavenlinkConnector();
}

export type { IMavenlinkConnector } from "./connector";
