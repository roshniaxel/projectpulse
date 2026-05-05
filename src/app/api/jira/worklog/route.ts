import { type NextRequest } from "next/server";

const BASE_URL = process.env.JIRA_BASE_URL || "";
const USER_EMAIL = process.env.JIRA_USER_EMAIL || "";
const API_TOKEN = process.env.JIRA_API_TOKEN || "";
const USE_MOCK = process.env.USE_MOCK_JIRA === "true";

function getAuthHeader(): string {
  return "Basic " + Buffer.from(`${USER_EMAIL}:${API_TOKEN}`).toString("base64");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ticketKey, timeSpent, description, started } = body;

  if (!ticketKey || !timeSpent) {
    return Response.json(
      { error: "ticketKey and timeSpent are required" },
      { status: 400 }
    );
  }

  // Mock mode — simulate success
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return Response.json({
      success: true,
      worklogId: `mock-wl-${Date.now()}`,
      ticketKey,
      timeSpent,
      message: `Logged ${timeSpent} to ${ticketKey}`,
    });
  }

  // Real mode — call Jira REST API
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

    if (started) {
      worklogBody.started = started;
    }

    const res = await fetch(
      `${BASE_URL}/rest/api/3/issue/${ticketKey}/worklog`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(worklogBody),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira API error: ${res.status} — ${err}`);
    }

    const data = await res.json();

    return Response.json({
      success: true,
      worklogId: data.id,
      ticketKey,
      timeSpent,
      message: `Logged ${timeSpent} to ${ticketKey}`,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to add worklog" },
      { status: 500 }
    );
  }
}
