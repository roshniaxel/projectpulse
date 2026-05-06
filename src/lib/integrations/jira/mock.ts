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
    key: "RGU-97",
    summary: "Setup Landing Page content type",
    status: "In Progress",
    assignee: "Roshni Upadhyay",
    projectKey: "RGU",
    estimate: {
      originalEstimateSeconds: 10800,
      remainingEstimateSeconds: 10800,
      timeSpentSeconds: 0,
    },
  },
  {
    key: "RGU-96",
    summary: "Setup Standard Content Page content type",
    status: "To Do",
    assignee: "Roshni Upadhyay",
    projectKey: "RGU",
    estimate: {
      originalEstimateSeconds: 10800,
      remainingEstimateSeconds: 10800,
      timeSpentSeconds: 0,
    },
  },
  {
    key: "RGU-100",
    summary: "Setup Subject Page content type",
    status: "Code Review",
    assignee: "Panshul Khurana",
    projectKey: "RGU",
    estimate: {
      originalEstimateSeconds: 18000,
      remainingEstimateSeconds: 18000,
      timeSpentSeconds: 0,
    },
  },
  {
    key: "RGU-224",
    summary: "Spike - Migration (Address multiple scenarios)",
    status: "Code Review",
    assignee: "Panshul Khurana",
    projectKey: "RGU",
    estimate: null, // No estimate — triggers warning
  },
  {
    key: "RGU-178",
    summary: "US-GRC-01 Section Heading with eyebrow text, title",
    status: "In Progress",
    assignee: "Sabreena Khursheed",
    projectKey: "RGU",
    estimate: null, // No estimate — triggers warning
  },
  {
    key: "RGU-149",
    summary: "US-HDR-02 Right Pill — Apply Now, Search & Hamburger",
    status: "Code Review",
    assignee: "Sabreena Khursheed",
    projectKey: "RGU",
    estimate: {
      originalEstimateSeconds: 180000,
      remainingEstimateSeconds: 180000,
      timeSpentSeconds: 0,
    },
  },
  {
    key: "RGU-237",
    summary: "US-GRC-08 - Upcoming Events Block",
    status: "Open",
    assignee: undefined, // Unassigned
    projectKey: "RGU",
    estimate: null,
  },
  {
    key: "RGU-242",
    summary: "Playwright Automation testing integration",
    status: "Open",
    assignee: undefined, // Unassigned
    projectKey: "RGU",
    estimate: null,
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
    let tickets = params.projectKey
      ? MOCK_TICKETS.filter((t) => t.projectKey === params.projectKey)
      : MOCK_TICKETS;
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
