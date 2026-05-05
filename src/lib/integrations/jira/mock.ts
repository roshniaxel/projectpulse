import type { Activity } from "@/lib/types";
import type { IJiraConnector } from "./connector";
import type { JiraProject, JiraTicket, JiraEstimate } from "./types";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";

const MOCK_PROJECTS: JiraProject[] = [
  { id: "13630", key: "RGU", name: "Regent's University/Managed" },
  { id: "12534", key: "AMS", name: "Axelerant/skillexai" },
  { id: "12717", key: "LDT", name: "Axelerant/L&D Training" },
];

const MOCK_TICKETS: JiraTicket[] = [
  {
    key: "RGU-224",
    summary: "Spike - Migration (Address multiple scenarios)",
    status: "In Progress",
    assignee: "Roshni Upadhyay",
    projectKey: "RGU",
    estimate: null, // No estimate — will trigger warning
  },
  {
    key: "RGU-100",
    summary: "Setup Subject Page content type",
    status: "To Do",
    assignee: "Roshni Upadhyay",
    projectKey: "RGU",
    estimate: {
      originalEstimateSeconds: 18000,
      remainingEstimateSeconds: 18000,
      timeSpentSeconds: 0,
    },
  },
  {
    key: "AMS-495",
    summary: "BUG: Combination of certificate and skill filters is not functioning correctly",
    status: "To Do",
    assignee: "Roshni Upadhyay",
    projectKey: "AMS",
    estimate: {
      originalEstimateSeconds: 28800,
      remainingEstimateSeconds: 28800,
      timeSpentSeconds: 0,
    },
  },
  {
    key: "LDT-812",
    summary: "CSS Alternatives & Type Safety",
    status: "In Review",
    assignee: "Roshni Upadhyay",
    projectKey: "LDT",
    estimate: {
      originalEstimateSeconds: 28800,
      remainingEstimateSeconds: 28800,
      timeSpentSeconds: 0,
    },
  },
  {
    key: "LDT-811",
    summary: "Advanced React Components and Hooks",
    status: "In Review",
    assignee: "Roshni Upadhyay",
    projectKey: "LDT",
    estimate: {
      originalEstimateSeconds: 28800,
      remainingEstimateSeconds: 28800,
      timeSpentSeconds: 0,
    },
  },
];

export class MockJiraConnector implements IJiraConnector {
  readonly source = "jira" as const;

  async testConnection() {
    return { ok: true };
  }

  async fetchProjects(): Promise<JiraProject[]> {
    return MOCK_PROJECTS;
  }

  async fetchTickets(params: {
    projectKey: string;
    status?: string[];
  }): Promise<JiraTicket[]> {
    let tickets = MOCK_TICKETS.filter((t) => t.projectKey === params.projectKey);
    if (params.status?.length) {
      tickets = tickets.filter((t) => params.status!.includes(t.status));
    }
    return tickets;
  }

  async getTicketEstimate(ticketKey: string): Promise<JiraEstimate | null> {
    const ticket = MOCK_TICKETS.find((t) => t.key === ticketKey);
    return ticket?.estimate ?? null;
  }

  async fetchActivities(params: {
    since: string;
    projectId?: string;
  }): Promise<Activity[]> {
    let activities = MOCK_ACTIVITIES.filter((a) => a.source === "jira");
    if (params.projectId) {
      activities = activities.filter(
        (a) => a.ticketKey?.startsWith(params.projectId!)
      );
    }
    return activities;
  }
}
