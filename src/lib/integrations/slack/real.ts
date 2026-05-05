import type { Activity } from "@/lib/types";
import type { ISlackConnector } from "./connector";

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";

async function slackFetch(method: string, params?: Record<string, string>) {
  const url = new URL(`https://slack.com/api/${method}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${BOT_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Slack API error: ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack error: ${data.error}`);
  return data;
}

export class RealSlackConnector implements ISlackConnector {
  readonly source = "slack" as const;

  async testConnection() {
    try {
      await slackFetch("auth.test");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchChannels(): Promise<Array<{ id: string; name: string }>> {
    const data = await slackFetch("conversations.list", {
      types: "public_channel,private_channel",
      limit: "100",
    });
    return (data.channels || []).map((ch: Record<string, unknown>) => ({
      id: String(ch.id),
      name: String(ch.name),
    }));
  }

  async fetchActivities(params: {
    since: string;
  }): Promise<Activity[]> {
    const channels = await this.fetchChannels();
    const oldest = String(new Date(params.since).getTime() / 1000);
    const activities: Activity[] = [];

    // Fetch from up to 5 channels to avoid rate limits
    for (const channel of channels.slice(0, 5)) {
      try {
        const data = await slackFetch("conversations.history", {
          channel: channel.id,
          oldest,
          limit: "20",
        });

        for (const msg of data.messages || []) {
          if (msg.subtype === "bot_message") continue;
          const text = String(msg.text || "");
          if (text.length < 5) continue;

          activities.push({
            id: `slack-${msg.ts}`,
            source: "slack",
            type: "message",
            title: text.length > 100 ? text.substring(0, 97) + "..." : text,
            description: text,
            timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
            metadata: {
              channel: `#${channel.name}`,
              workspace: "Workspace",
            },
          });
        }
      } catch {
        // Skip channels we can't read
      }
    }

    return activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
