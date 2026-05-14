import { type NextRequest } from "next/server";
import { resolveToolSessionUser } from "@/lib/tool-session-auth";
import { prisma } from "@/lib/prisma";
import { loadJiraCreds, jiraFetch } from "@/lib/jira-rest";

function parseTimeSpent(spec: string): number {
  let total = 0;
  const matches = spec.matchAll(/(\d+)\s*([hmsd])/g);
  for (const m of matches) {
    const n = parseInt(m[1]);
    const unit = m[2];
    if (unit === "h") total += n * 3600;
    else if (unit === "m") total += n * 60;
    else if (unit === "s") total += n;
    else if (unit === "d") total += n * 8 * 3600;
  }
  return total;
}

export async function POST(request: NextRequest) {
  const authUser = await resolveToolSessionUser(request);
  if (!authUser) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { ticketKey, timeSpent, description, started, timeEntryId } = body;

  if (!ticketKey || !timeSpent) {
    return Response.json(
      { error: "ticketKey and timeSpent are required" },
      { status: 400 }
    );
  }

  const durationSec = parseTimeSpent(timeSpent);
  const now = new Date();
  const startedAt = started
    ? new Date(started)
    : new Date(now.getTime() - durationSec * 1000);

  const creds = await loadJiraCreds(authUser.userId);
  if (!creds) {
    return Response.json(
      { error: "Jira is not connected. Connect it from Settings." },
      { status: 412 }
    );
  }

  let worklogId: string;
  try {
    const worklogBody: Record<string, unknown> = {
      timeSpent,
      comment: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: description || `Time logged via ProjectPulse`,
              },
            ],
          },
        ],
      },
    };
    if (started) worklogBody.started = started;

    const res = await jiraFetch({
      userId: authUser.userId,
      creds,
      path: `/issue/${ticketKey}/worklog`,
      init: { method: "POST", body: JSON.stringify(worklogBody) },
    });
    if (!res.ok) {
      throw new Error(`Jira API error: ${res.status} — ${await res.text()}`);
    }
    const data = await res.json();
    worklogId = data.id;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to add worklog" },
      { status: 500 }
    );
  }

  try {
    if (timeEntryId) {
      await prisma.timeEntry.update({
        where: { id: timeEntryId, userId: authUser.userId },
        data: { status: "logged", jiraWorklogId: worklogId },
      });
    } else {
      await prisma.timeEntry.create({
        data: {
          userId: authUser.userId,
          source: "jira",
          ticketKey,
          description: description || null,
          startedAt,
          endedAt: now,
          durationSec,
          status: "logged",
          jiraWorklogId: worklogId,
        },
      });
    }
  } catch {
    // Best-effort persistence.
  }

  return Response.json({
    success: true,
    worklogId,
    ticketKey,
    timeSpent,
    message: `Logged ${timeSpent} to ${ticketKey}`,
  });
}
