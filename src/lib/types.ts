// Integration source identifiers
export type IntegrationSource = "jira" | "github" | "google_calendar" | "slack" | "mavenlink" | "granola" | "zoom";

// Integration connection state
export interface Integration {
  id: string;
  source: IntegrationSource;
  displayName: string;
  description: string;
  connected: boolean;
  connectedAt?: string;
  accountLabel?: string;
}

// Activity types from various integrations
export type ActivityType =
  | "commit"
  | "pr_merged"
  | "pr_review"
  | "pr_opened"
  | "meeting"
  | "ticket_update"
  | "ticket_transition"
  | "message"
  | "code_review_comment"
  | "meeting_notes"
  | "zoom_call"
  | "slack_huddle"
  | "ticket_time";

// A single captured activity signal
export interface Activity {
  id: string;
  source: IntegrationSource;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string; // ISO datetime
  metadata: Record<string, string>;
  ticketKey?: string;
  durationMinutes?: number;
}

// A single timesheet entry (generated or edited)
export interface TimeEntry {
  id: string;
  ticketKey: string;
  ticketTitle: string;
  project: string;
  description: string;
  hours: number;
  activities: string[]; // IDs of source activities
  status: "draft" | "approved" | "rejected" | "submitted";
  editedByUser: boolean;
  externalId?: string; // Mavenlink time entry ID after push
  pushedAt?: string; // ISO datetime of when pushed to Mavenlink
}

// Jira project
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl?: string;
}

// Jira ticket
export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  estimate: JiraEstimate | null;
  projectKey: string;
  updated?: string;
}

// Jira time estimate
export interface JiraEstimate {
  originalEstimateSeconds: number | null;
  remainingEstimateSeconds: number | null;
  timeSpentSeconds: number | null;
}

// Mavenlink workspace
export interface MavenlinkWorkspace {
  id: string;
  title: string;
}

// Mavenlink project
export interface MavenlinkProject {
  id: string;
  title: string;
  workspaceId: string;
}

// Mapping between Jira project and Mavenlink workspace/project
export interface MavenlinkProjectMapping {
  jiraProjectKey: string;
  mavenlinkWorkspaceId: string;
  mavenlinkProjectId: string;
}

// Result of pushing time entries to an external system
export interface PushResult {
  success: boolean;
  pushed: number;
  failed: number;
  errors: Array<{ entryId: string; error: string }>;
  externalIds: Array<{ entryId: string; externalId: string }>;
}

// Auto-detected pending time entry awaiting user approval
export interface PendingTimeEntry {
  id: string;
  source: IntegrationSource;
  type: ActivityType;
  title: string;
  description: string;
  durationMinutes: number;
  detectedAt: string; // ISO datetime
  ticketKey?: string;
  project?: string;
  metadata: Record<string, string>;
  status: "pending" | "approved" | "rejected" | "pushed";
}

// Alert severity levels
export type AlertSeverity = "warning" | "high" | "critical";

// Risk alert types
export type AlertType =
  | "stuck_ticket"
  | "velocity_drop"
  | "unassigned_critical"
  | "scope_creep"
  | "blocked_dependency"
  | "overdue_sprint_item";

// A risk alert
export interface RiskAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  description: string;
  affectedTickets: string[];
  detectedAt: string;
  suggestion: string;
  suggestedAction?: string;
  isRead: boolean;
  isDismissed: boolean;
}

// Timesheet generation state machine
export type TimesheetState =
  | "idle"
  | "generating"
  | "draft"
  | "submitting"
  | "submitted";

// Generation progress steps
export interface GenerationStep {
  label: string;
  status: "pending" | "active" | "done";
}
