import type { Activity, TimeEntry, PushResult, IntegrationSource } from "@/lib/types";

// Base interface all connectors implement
export interface BaseConnector {
  readonly source: IntegrationSource;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
}

// Read connector: pulls activities from external service
export interface ActivityConnector extends BaseConnector {
  fetchActivities(params: {
    since: string;
    until?: string;
    projectId?: string;
    projectIds?: string[];
    mineOnly?: boolean;
  }): Promise<Activity[]>;
}

// Write connector: pushes data to external service
export interface TimesheetPushConnector extends BaseConnector {
  pushTimeEntries(entries: TimeEntry[]): Promise<PushResult>;
}
