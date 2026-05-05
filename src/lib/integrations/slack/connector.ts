import type { ActivityConnector } from "../types";

export interface ISlackConnector extends ActivityConnector {
  fetchChannels(): Promise<Array<{ id: string; name: string }>>;
}
