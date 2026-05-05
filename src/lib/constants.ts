import type { IntegrationSource, ActivityType, AlertSeverity } from "./types";

// Integration source colors — badges, timeline dots, borders
export const SOURCE_COLORS: Record<
  IntegrationSource,
  { bg: string; text: string; border: string; dot: string }
> = {
  jira: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  github: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  google_calendar: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  slack: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  mavenlink: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  granola: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    dot: "bg-teal-500",
  },
  zoom: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
};

// Source display names
export const SOURCE_NAMES: Record<IntegrationSource, string> = {
  jira: "Jira",
  github: "GitHub",
  google_calendar: "Calendar",
  slack: "Slack",
  mavenlink: "Mavenlink",
  granola: "Granola",
  zoom: "Zoom",
};

// Alert severity colors
export const SEVERITY_COLORS: Record<
  AlertSeverity,
  { bg: string; text: string; border: string; icon: string }
> = {
  warning: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-200",
    icon: "text-yellow-500",
  },
  high: {
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
    icon: "text-orange-500",
  },
  critical: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    icon: "text-red-500",
  },
};

// Activity type configuration
export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string }
> = {
  commit: { label: "Commit", icon: "GitCommit" },
  pr_merged: { label: "PR Merged", icon: "GitMerge" },
  pr_opened: { label: "PR Opened", icon: "GitPullRequest" },
  pr_review: { label: "Code Review", icon: "Eye" },
  meeting: { label: "Meeting", icon: "Video" },
  ticket_update: { label: "Ticket Updated", icon: "FileEdit" },
  ticket_transition: { label: "Status Changed", icon: "ArrowRightLeft" },
  message: { label: "Message", icon: "MessageSquare" },
  code_review_comment: { label: "Review Comment", icon: "MessageCircle" },
  meeting_notes: { label: "Meeting Notes", icon: "NotebookPen" },
  zoom_call: { label: "Zoom Call", icon: "Video" },
  slack_huddle: { label: "Slack Huddle", icon: "Headphones" },
  ticket_time: { label: "Ticket Time", icon: "Timer" },
};

// Sidebar navigation items
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Timesheet", href: "/timesheet", icon: "Clock" },
  { label: "Alerts", href: "/alerts", icon: "AlertTriangle" },
  { label: "Activity", href: "/activity", icon: "Activity" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;
