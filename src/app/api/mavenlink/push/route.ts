import { type NextRequest } from "next/server";
import { getMavenlinkConnector } from "@/lib/integrations/mavenlink";
import type { TimeEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries: TimeEntry[] = body.entries;

    if (!entries?.length) {
      return Response.json({ error: "No entries provided" }, { status: 400 });
    }

    const connector = getMavenlinkConnector();
    const result = await connector.pushTimeEntries(entries);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to push to Mavenlink" },
      { status: 500 }
    );
  }
}
