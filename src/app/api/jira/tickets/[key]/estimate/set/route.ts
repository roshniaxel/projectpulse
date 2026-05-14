import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { loadJiraCreds, jiraFetch } from "@/lib/jira-rest";

function parseTimeSpec(spec: string): number {
  let total = 0;
  for (const m of spec.matchAll(/(\d+)\s*([hmsd])/g)) {
    const n = parseInt(m[1]);
    const u = m[2];
    if (u === "h") total += n * 3600;
    else if (u === "m") total += n * 60;
    else if (u === "s") total += n;
    else if (u === "d") total += n * 8 * 3600;
  }
  return total;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { key } = await params;
  const { originalEstimate } = await request.json();

  if (!originalEstimate) {
    return Response.json({ error: "originalEstimate is required" }, { status: 400 });
  }
  const estimateSec = parseTimeSpec(originalEstimate);
  if (!estimateSec) {
    return Response.json(
      { error: "Invalid time format (use e.g. '2h 30m')" },
      { status: 400 }
    );
  }

  const creds = await loadJiraCreds(user.id);
  if (!creds) {
    return Response.json(
      { error: "Jira is not connected. Connect it from Settings." },
      { status: 412 }
    );
  }

  try {
    const res = await jiraFetch({
      userId: user.id,
      creds,
      path: `/issue/${key}`,
      init: {
        method: "PUT",
        body: JSON.stringify({
          fields: { timetracking: { originalEstimate } },
        }),
      },
    });
    if (!res.ok) {
      throw new Error(`Jira API error: ${res.status} — ${await res.text()}`);
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to set estimate" },
      { status: 500 }
    );
  }

  try {
    await prisma.jiraTicketCache.upsert({
      where: { key },
      update: { estimateSec, lastSyncedAt: new Date() },
      create: { key, summary: key, estimateSec },
    });
  } catch {
    // ignore
  }

  return Response.json({ ticketKey: key, estimateSec, originalEstimate });
}
