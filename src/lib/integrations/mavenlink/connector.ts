import type { TimesheetPushConnector } from "../types";
import type { MavenlinkWorkspace, MavenlinkProject } from "./types";

export interface IMavenlinkConnector extends TimesheetPushConnector {
  fetchWorkspaces(): Promise<MavenlinkWorkspace[]>;
  fetchProjects(workspaceId?: string): Promise<MavenlinkProject[]>;
}
