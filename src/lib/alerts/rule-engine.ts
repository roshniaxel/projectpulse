// Deterministic risk detector — runs when ANTHROPIC_API_KEY isn't configured
// so the /alerts page still shows something useful. Same output shape as the
// AI version so the UI doesn't branch.

export type AlertSeverity = "warning" | "high" | "critical";

export interface RuleAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  description: string;
  affectedTickets: string[];
  suggestion: string;
  detectedAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

export interface RuleInput {
  tickets: Array<{
    key: string;
    summary: string;
    status: string;
    estimateSec: number | null;
    timeSpentSec: number | null;
    updated?: string;
  }>;
  trackedByTicket: Map<string, number>; // ticketKey → seconds
  totalTrackedSec: number;
  today: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 5;
const ESTIMATE_OVERAGE = 1.25; // tracked > 125% of estimate → missed
const SCOPE_CREEP_PCT = 0.4; // single ticket > 40% of week's time
const LOW_VELOCITY_HOURS = 5; // < 5h in 7d on in-progress tickets

const IN_PROGRESS_STATUSES = new Set(
  [
    "In Progress",
    "In Review",
    "Code Review",
    "In Development",
    "Doing",
    "Active",
  ].map((s) => s.toLowerCase())
);

function isInProgress(status: string): boolean {
  return IN_PROGRESS_STATUSES.has(status.toLowerCase());
}

function daysSince(iso: string | undefined, today: Date): number | null {
  if (!iso) return null;
  const ms = today.getTime() - new Date(iso).getTime();
  return Math.floor(ms / DAY_MS);
}

function hours(seconds: number): string {
  const h = Math.round((seconds / 3600) * 10) / 10;
  return `${h}h`;
}

export function detectAlerts(input: RuleInput): {
  summary: string;
  alerts: RuleAlert[];
} {
  const { tickets, trackedByTicket, totalTrackedSec, today } = input;
  const detectedAt = today.toISOString();
  const alerts: Omit<RuleAlert, "id" | "detectedAt" | "isRead" | "isDismissed">[] = [];

  // 1. Stalled tickets: in-progress, not updated in STALE_DAYS+
  for (const t of tickets) {
    if (!isInProgress(t.status)) continue;
    const since = daysSince(t.updated, today);
    if (since !== null && since >= STALE_DAYS) {
      alerts.push({
        severity: since >= 10 ? "critical" : since >= 7 ? "high" : "warning",
        type: "stuck_ticket",
        title: `${t.key} hasn't moved in ${since} days`,
        description: `${t.key} (${t.summary}) is in "${t.status}" but has had no Jira activity for ${since} days. Either it's blocked, abandoned, or the status is stale.`,
        affectedTickets: [t.key],
        suggestion: `Update ${t.key}'s status, add a blocker comment, or close it if abandoned.`,
      });
    }
  }

  // 2. Missed estimate: tracked time exceeds estimate by ESTIMATE_OVERAGE
  for (const t of tickets) {
    const est = t.estimateSec;
    if (!est || est < 60) continue;
    const trackedFromUs = trackedByTicket.get(t.key) || 0;
    const trackedFromJira = t.timeSpentSec || 0;
    const tracked = Math.max(trackedFromUs, trackedFromJira);
    if (tracked > est * ESTIMATE_OVERAGE) {
      const overagePct = Math.round(((tracked - est) / est) * 100);
      alerts.push({
        severity: overagePct >= 100 ? "critical" : "high",
        type: "missed_estimate",
        title: `${t.key} is ${overagePct}% over estimate`,
        description: `${t.key} (${t.summary}) was estimated at ${hours(est)} but ${hours(tracked)} has been tracked. That's ${overagePct}% over the original estimate.`,
        affectedTickets: [t.key],
        suggestion: `Re-estimate ${t.key} to ${hours(tracked * 1.1)} or split the remaining scope into a follow-up ticket.`,
      });
    }
  }

  // 3. No estimate: tracked time on ticket with no estimate set
  for (const [key, trackedSec] of trackedByTicket.entries()) {
    if (trackedSec < 30 * 60) continue; // ignore <30m
    const t = tickets.find((x) => x.key === key);
    if (!t) continue; // unknown ticket — surface as separate alert below
    const est = t.estimateSec;
    if (!est || est < 60) {
      alerts.push({
        severity: "warning",
        type: "no_estimate",
        title: `${t.key} has no estimate but ${hours(trackedSec)} tracked`,
        description: `${t.key} (${t.summary}) has had ${hours(trackedSec)} logged against it but no original estimate. Estimate accuracy can't be measured without one.`,
        affectedTickets: [t.key],
        suggestion: `Add a time estimate to ${t.key} in Jira — even a rough one.`,
      });
    }
  }

  // 4. Scope creep: a single ticket is eating > SCOPE_CREEP_PCT of the period
  if (totalTrackedSec > 4 * 3600) {
    for (const [key, trackedSec] of trackedByTicket.entries()) {
      const pct = trackedSec / totalTrackedSec;
      if (pct >= SCOPE_CREEP_PCT) {
        const t = tickets.find((x) => x.key === key);
        alerts.push({
          severity: pct >= 0.6 ? "high" : "warning",
          type: "scope_creep",
          title: `${key} consumed ${Math.round(pct * 100)}% of this period`,
          description: `${hours(trackedSec)} of ${hours(totalTrackedSec)} total went to ${key}${t ? ` (${t.summary})` : ""}. Worth checking if scope expanded.`,
          affectedTickets: [key],
          suggestion: `Review ${key}'s scope — if it grew, log a follow-up ticket; if it's normal, you may need a larger estimate next time.`,
        });
      }
    }
  }

  // 5. Low velocity: very little tracked total
  const inProgressCount = tickets.filter((t) => isInProgress(t.status)).length;
  if (inProgressCount >= 2 && totalTrackedSec / 3600 < LOW_VELOCITY_HOURS) {
    alerts.push({
      severity: "warning",
      type: "velocity_drop",
      title: `Only ${hours(totalTrackedSec)} tracked across ${inProgressCount} in-progress tickets`,
      description: `You have ${inProgressCount} tickets in progress but only ${hours(totalTrackedSec)} of work tracked in the period. Either the time isn't being captured, or progress is light.`,
      affectedTickets: tickets
        .filter((t) => isInProgress(t.status))
        .slice(0, 3)
        .map((t) => t.key),
      suggestion: `Use track-time.sh while coding, or /logtime to record manual time so this number reflects reality.`,
    });
  }

  // Rank by severity: critical > high > warning
  const severityRank: Record<AlertSeverity, number> = {
    critical: 0,
    high: 1,
    warning: 2,
  };
  alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const summary =
    alerts.length === 0
      ? `No risks detected. ${tickets.length} ticket${tickets.length === 1 ? "" : "s"} reviewed against ${hours(totalTrackedSec)} tracked time.`
      : `${alerts.length} risk${alerts.length === 1 ? "" : "s"} found across ${tickets.length} ticket${tickets.length === 1 ? "" : "s"} (${hours(totalTrackedSec)} tracked). ${alerts.filter((a) => a.severity === "critical").length} critical.`;

  return {
    summary,
    alerts: alerts.map((a, i) => ({
      ...a,
      id: `rule-${detectedAt}-${i}`,
      detectedAt,
      isRead: false,
      isDismissed: false,
    })),
  };
}
