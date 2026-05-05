import { RealZoomConnector } from "./real";
import { MockZoomConnector } from "./mock";
import type { IZoomConnector } from "./connector";

export function getZoomConnector(): IZoomConnector {
  return process.env.USE_MOCK_ZOOM === "true"
    ? new MockZoomConnector()
    : new RealZoomConnector();
}

export type { IZoomConnector } from "./connector";
