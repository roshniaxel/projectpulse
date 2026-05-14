import type { IJiraConnector } from "./connector";

export class DisconnectedJiraConnector implements IJiraConnector {
  readonly source = "jira" as const;
  async testConnection() {
    return { ok: false, error: "Not connected" };
  }
  async fetchProjects() {
    return [];
  }
  async fetchAssignedProjects() {
    return [];
  }
  async fetchTickets() {
    return [];
  }
  async getTicketEstimate() {
    return null;
  }
  async getTicketSummary() {
    return null;
  }
  async fetchActivities() {
    return [];
  }
}
