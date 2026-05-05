import type { ActivityConnector } from "../types";
import type { JiraProject, JiraTicket, JiraEstimate } from "./types";

export interface IJiraConnector extends ActivityConnector {
  fetchProjects(): Promise<JiraProject[]>;
  fetchTickets(params: {
    projectKey: string;
    status?: string[];
    assignee?: string;
  }): Promise<JiraTicket[]>;
  getTicketEstimate(ticketKey: string): Promise<JiraEstimate | null>;
}
