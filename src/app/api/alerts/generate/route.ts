import { type NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser, parseDateRange } from "@/lib/auth-helpers";
import { tzToday } from "@/lib/date-range";
import { getJiraConnector } from "@/lib/integrations/jira";
import { detectAlerts } from "@/lib/alerts/rule-engine";

const AlertSchema = z.object({
  severity: z
    .enum(["warning", "high", "critical"])
    .describe("warning = nudge, high = needs attention, critical = blocking risk"),
  type: z.enum([
    "stuck_ticket",
    "velocity_drop",
    "unassigned_critical",
    "scope_creep",
    "blocked_dependency",
    "overdue_sprint_item",
    "missed_estimate",
    "no_estimate",
    "meeting_overload",
  ]),
  title: z.string().describe("Short headline, max ~80 chars"),
  description: z
    .string()
    .describe("2-3 sentence explanation grounded in the data provided"),
  affectedTickets: z
    .array(z.string())
    .describe("Jira ticket keys this alert relates to, e.g. ['RGU-250']"),
  suggestion: z
    .string()
    .describe("Concrete next action the engineer can take, 1 sentence"),
});

const AlertsResponseSchema = z.object({
  summary: z
    .string()
    .describe(
      "1-2 sentence overall assessment of the engineer's current sprint health"
    ),
  alerts: z
    .array(AlertSchema)
    .describe(
      "Ranked alerts, most critical first. Empty if no risks found — do not fabricate."
    ),
});

const SYSTEM_PROMPT = `You are a proactive engineering risk analyst.

You receive JSON containing:
1. The engineer's recent Jira tickets (assigned to them) with status, estimate, time tracked, last update date
2. Time entries the engineer has tracked over the period
3. Today's date

Your job: surface the 3-7 most important risks. Be specific. Cite ticket keys. Quote concrete numbers from the data. Rank by severity (critical first).

What to look for:
- **stuck_ticket**: in-progress tickets with no Jira activity for >5 days
- **missed_estimate**: tracked time exceeds Jira originalEstimate by >25%
- **no_estimate**: tickets with tracked time but no estimate set
- **scope_creep**: a single ticket eating >40% of the week's tracked time
- **velocity_drop**: very low tracked time across the period for in-progress work
- **unassigned_critical**: critical/highest priority tickets with no assignee
- **overdue_sprint_item**: tickets past their due date or sprint end

Hard rules:
1. **Never fabricate**. If the data doesn't support an alert, don't make one. Empty alerts array is a valid response.
2. Cite specific numbers ("12.5h tracked vs 4h estimate") not vague language.
3. Suggestions must be actionable in <5 min ("Update RGU-250 status", "Re-estimate RGU-217 to 16h").
4. Don't surface trivial issues — every alert should make the engineer act.`;

export async function POST(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const useAI = !!process.env.ANTHROPIC_API_KEY;
  const searchParams = request.nextUrl.searchParams;
  const { from, to } = parseDateRange(searchParams);
  const projectFilter = searchParams.get("project");
  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  // Pull both signal sources in parallel. Time entries are filtered by
  // project key prefix (e.g. ticketKey starts with "RGU-") when ?project= set.
  const [timeEntries, jira] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: user.id,
        status: { not: "rejected" },
        startedAt: { gte: fromDate, lte: toDate },
        ...(projectFilter
          ? { ticketKey: { startsWith: `${projectFilter}-` } }
          : {}),
      },
      orderBy: { startedAt: "asc" },
    }),
    getJiraConnector(user.id),
  ]);

  // Roll up tracked time per ticket
  const trackedByTicket = new Map<string, number>();
  for (const e of timeEntries) {
    if (!e.ticketKey) continue;
    trackedByTicket.set(
      e.ticketKey,
      (trackedByTicket.get(e.ticketKey) || 0) + e.durationSec
    );
  }
  const totalTrackedSec = timeEntries.reduce((sum, e) => sum + e.durationSec, 0);

  // Pull Jira tickets assigned to the user, recent + currently-relevant
  let jiraTickets: Array<{
    key: string;
    summary: string;
    status: string;
    estimateSec: number | null;
    timeSpentSec: number | null;
    updated?: string;
  }> = [];
  try {
    // When the user has picked a specific project via ?project=, only pull
    // tickets from that project. Otherwise pull from their top 5 assigned
    // projects (capped to keep latency reasonable).
    const projectsToQuery = projectFilter
      ? [{ key: projectFilter }]
      : (await jira.fetchAssignedProjects()).slice(0, 5);
    const ticketLists = await Promise.allSettled(
      projectsToQuery.map((p) =>
        jira.fetchTickets({
          projectKey: p.key,
          assignedToMe: true,
        })
      )
    );
    for (const result of ticketLists) {
      if (result.status === "fulfilled") {
        for (const t of result.value) {
          jiraTickets.push({
            key: t.key,
            summary: t.summary,
            status: t.status,
            updated: t.updated,
            estimateSec: t.estimate?.originalEstimateSeconds ?? null,
            timeSpentSec: t.estimate?.timeSpentSeconds ?? null,
          });
        }
      }
    }
    // Cap to keep the prompt manageable
    jiraTickets = jiraTickets.slice(0, 40);
  } catch {
    // Disconnected Jira → no tickets; Claude will see empty array and respond accordingly
  }

  // If there's literally nothing to analyse, short-circuit
  if (jiraTickets.length === 0 && timeEntries.length === 0) {
    return Response.json({
      summary:
        "Not enough signal yet — connect Jira and start tracking time to see risk alerts.",
      alerts: [],
      sourceCounts: { jiraTickets: 0, timeEntries: 0 },
    });
  }

  // Rule-based fallback when ANTHROPIC_API_KEY isn't configured. Same response
  // shape as the AI path so the UI doesn't branch.
  if (!useAI) {
    const result = detectAlerts({
      tickets: jiraTickets,
      trackedByTicket,
      totalTrackedSec,
      today: new Date(),
    });
    return Response.json({
      ...result,
      sourceCounts: {
        jiraTickets: jiraTickets.length,
        timeEntries: timeEntries.length,
      },
      mode: "rule-based",
    });
  }

  const today = tzToday();
  const userPrompt = `Today's date: ${today}
Analysis period: ${from} → ${to}
Engineer: ${user.email}

Jira tickets assigned to this engineer (${jiraTickets.length} total):
${JSON.stringify(jiraTickets, null, 2)}

Tracked time by ticket over the period:
${JSON.stringify(
  Array.from(trackedByTicket.entries()).map(([key, sec]) => ({
    ticketKey: key,
    hoursTracked: Math.round((sec / 3600) * 10) / 10,
  })),
  null,
  2
)}

Total tracked time across all tickets: ${Math.round((totalTrackedSec / 3600) * 10) / 10}h

Surface the most important risks.`;

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: zodOutputFormat(AlertsResponseSchema),
      },
    });

    if (!response.parsed_output) {
      return Response.json(
        { error: "Claude returned an unparseable response. Try again." },
        { status: 502 }
      );
    }

    // Stamp each alert with an ID + detection timestamp so the UI has stable keys
    const detectedAt = new Date().toISOString();
    const stamped = response.parsed_output.alerts.map((a, i) => ({
      ...a,
      id: `ai-${detectedAt}-${i}`,
      detectedAt,
      isRead: false,
      isDismissed: false,
    }));

    return Response.json({
      summary: response.parsed_output.summary,
      alerts: stamped,
      sourceCounts: {
        jiraTickets: jiraTickets.length,
        timeEntries: timeEntries.length,
      },
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (error) {
    console.error("[/api/alerts/generate] error:", error);
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is invalid. Check .env." },
        { status: 500 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Anthropic API rate limit hit. Wait a moment and try again." },
        { status: 429 }
      );
    }
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate alerts",
      },
      { status: 500 }
    );
  }
}
