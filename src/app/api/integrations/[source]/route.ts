import { type NextRequest } from "next/server";
import { requireDbUser } from "@/lib/auth-helpers";
import {
  CREDENTIAL_SCHEMA,
  saveIntegrationCredentials,
  disconnectIntegration,
} from "@/lib/integration-credentials";
import type { IntegrationSource } from "@/lib/types";

const PASTE_TOKEN_SOURCES = Object.keys(CREDENTIAL_SCHEMA) as IntegrationSource[];
// Tools that can be disconnected — covers both paste-token and OAuth tools.
const ALL_SOURCES: IntegrationSource[] = [
  "jira",
  "github",
  "google_calendar",
  "slack",
  "zoom",
  "mavenlink",
  "granola",
];

function parseSource(raw: string, allowed: IntegrationSource[]): IntegrationSource | null {
  return (allowed as string[]).includes(raw) ? (raw as IntegrationSource) : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { source: rawSource } = await params;
  const source = parseSource(rawSource, PASTE_TOKEN_SOURCES);
  if (!source) {
    return Response.json(
      { error: "Unknown integration or this tool uses OAuth instead" },
      { status: 400 }
    );
  }

  const values = await request.json();
  try {
    await saveIntegrationCredentials(user.id, source, values);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to save credentials" },
      { status: 400 }
    );
  }

  return Response.json({ source, connected: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { user, unauthorized } = await requireDbUser();
  if (unauthorized) return unauthorized;

  const { source: rawSource } = await params;
  const source = parseSource(rawSource, ALL_SOURCES);
  if (!source) {
    return Response.json({ error: "Unknown integration" }, { status: 400 });
  }

  await disconnectIntegration(user.id, source);
  return Response.json({ source, connected: false });
}
