import type { ActivityConnector } from "../types";
import type { JiraProject, JiraTicket, JiraEstimate } from "./types";

export interface IJiraConnector extends ActivityConnector {
  fetchProjects(): Promise<JiraProject[]>;
  fetchAssignedProjects(): Promise<JiraProject[]>;
  fetchTickets(params: {
    projectKey: string;
    status?: string[];
    assignee?: string;
    assignedToMe?: boolean;
    mineOnly?: boolean;
  }): Promise<JiraTicket[]>;
  getTicketEstimate(ticketKey: string): Promise<JiraEstimate | null>;
  getTicketSummary(ticketKey: string): Promise<string | null>;
}
