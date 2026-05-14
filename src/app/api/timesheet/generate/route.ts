import { type NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/prisma";
import { requireDbUser, parseDateRange } from "@/lib/auth-helpers";

const TimesheetEntrySchema = z.object({
  ticketKey: z
    .string()
    .nullable()
    .describe("Jira key like 'RGU-224' or null for non-ticket time"),
  ticketTitle: z
    .string()
    .describe(
      "Polished one-line description in past tense engineer voice (e.g. 'Migrated Jira search to /search/jql endpoint')"
    ),
  category: z.enum([
    "development",
    "review",
    "meeting",
    "design",
    "research",
    "communication",
    "other",
  ]),
  durationMinutes: z.number().int().describe("Sum of merged source durations"),
  status: z.enum(["draft", "approved", "logged"]),
  sourceEntryIds: z
    .array(z.string())
    .describe("IDs of TimeEntry rows merged into this line"),
});

const TimesheetSchema = z.object({
  summary: z
    .string()
    .describe("2-3 sentence narrative of the work period, professional tone"),
  days: z.array(
    z.object({
      date: z.string().describe("YYYY-MM-DD"),
      totalHours: z.number(),
      summary: z.string().describe("1-2 sentence summary of the day"),
      entries: z.array(TimesheetEntrySchema),
    })
  ),
});

const SYSTEM_PROMPT = `You are an expert engineering timesheet assistant.

You receive raw TimeEntry rows captured automatically from Jira, Claude Code sessions, manual /logtime entries, Zoom calls, and Google Calendar meetings. Your job is to produce a polished, submittable timesheet draft.

Rules:
1. **Merge** entries that describe the same logical task within a day (e.g. several Claude Code ticks on RGU-224 within hours → one merged line). Sum their durations and combine sourceEntryIds.
2. **Polish descriptions** into past-tense engineer voice. Be specific. Examples: "Migrated Jira search to /search/jql endpoint", "Reviewed PR feedback on auth refactor", "Pair-programmed schema design with Alex".
3. **Preserve ticket keys** exactly as given. If the source entry has no ticketKey, leave it null.
4. **Categorize** every line.
5. **Status precedence**: if any source entry is 'logged' → 'logged'; else if any 'approved' → 'approved'; else 'draft'.
6. **Per-day totals**: sum durationMinutes / 60.
7. **Be faithful**: never invent work that isn't in the source rows. If a description is sparse, polish what's there — don't fabricate.
8. Sort days ascending (oldest first), entries within a day by start time (chronological).`;

export async function POST(request: NextRequest) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY not set in .env. Get a key from https://console.anthropic.com/settings/keys",
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const { from, to } = parseDateRange(searchParams);
  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const project = searchParams.get("project");
  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: user.id,
      status: { not: "rejected" },
      startedAt: { gte: fromDate, lte: toDate },
      ...(project ? { ticketKey: { startsWith: `${project}-` } } : {}),
    },
    orderBy: { startedAt: "asc" },
  });

  if (entries.length === 0) {
    return Response.json({
      summary: "No time tracked in this date range.",
      days: [],
      sourceCount: 0,
    });
  }

  const userPrompt = `Generate a polished timesheet from these ${entries.length} TimeEntry rows for ${user.email} (${from} → ${to}):

${JSON.stringify(
  entries.map((e) => ({
    id: e.id,
    source: e.source,
    ticketKey: e.ticketKey,
    description: e.description,
    startedAt: e.startedAt.toISOString(),
    durationMinutes: Math.round(e.durationSec / 60),
    status: e.status,
  })),
  null,
  2
)}`;

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: zodOutputFormat(TimesheetSchema),
      },
    });

    if (!response.parsed_output) {
      return Response.json(
        { error: "Claude returned an unparseable response. Try again." },
        { status: 502 }
      );
    }

    return Response.json({
      ...response.parsed_output,
      sourceCount: entries.length,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (error) {
    console.error("[/api/timesheet/generate] error:", error);
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
          error instanceof Error ? error.message : "Failed to generate timesheet",
      },
      { status: 500 }
    );
  }
}
