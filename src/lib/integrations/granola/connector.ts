import type { ActivityConnector } from "../types";

export interface IGranolaConnector extends ActivityConnector {
  importNotes(notes: string): Promise<import("@/lib/types").Activity[]>;
}
