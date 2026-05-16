import type { Activity } from "@/lib/types";
import type { ISlackConnector } from "./connector";
import { tzDayBoundsUtc } from "@/lib/date-range";

export type SlackCreds = { botToken: string; userEmail?: string };

export class RealSlackConnector implements ISlackConnector {
  readonly source = "slack" as const;
  private botToken: string;
  private userEmail?: string;
  // Cached Slack member ID for `userEmail`. `null` = lookup failed (missing
  // scope, no matching account, etc.) so we don't retry every request.
  private cachedMyId: string | null | undefined = undefined;

  constructor(creds: SlackCreds) {
    this.botToken = creds.botToken;
    this.userEmail = creds.userEmail;
  }

  // Resolve the logged-in ProjectPulse user to a Slack member ID via
  // `users.lookupByEmail`. Requires the bot token to have the
  // `users:read.email` scope — without it Slack returns missing_scope, in
  // which case we return null and the caller treats the feed as empty (better
  // to show nothing than leak other people's messages).
  private async resolveMyId(): Promise<string | null> {
    if (this.cachedMyId !== undefined) return this.cachedMyId;
    if (!this.userEmail) {
      this.cachedMyId = null;
      return null;
    }
    try {
      const data = await this.fetch("users.lookupByEmail", {
        email: this.userEmail,
      });
      this.cachedMyId = String((data.user as { id?: string })?.id || "") || null;
    } catch {
      this.cachedMyId = null;
    }
    return this.cachedMyId;
  }

  private async fetch(method: string, params?: Record<string, string>) {
    const url = new URL(`https://slack.com/api/${method}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.botToken}` },
    });
    if (!res.ok) throw new Error(`Slack API error: ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return data;
  }

  async testConnection() {
    try {
      await this.fetch("auth.test");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  async fetchChannels(): Promise<Array<{ id: string; name: string }>> {
    const data = await this.fetch("conversations.list", {
      types: "public_channel,private_channel",
      limit: "100",
    });
    return (data.channels || []).map((ch: Record<string, unknown>) => ({
      id: String(ch.id),
      name: String(ch.name),
    }));
  }

  async fetchActivities(params: { since: string }): Promise<Activity[]> {
    // Refuse to fan out if we can't tell which messages belong to the logged-in
    // user. Pre-scoping fix the bot's token would surface every channel
    // member's messages.
    const myId = await this.resolveMyId();
    if (!myId) return [];

    const channels = await this.fetchChannels();
    // Slack `oldest` is a unix-seconds timestamp. Anchor to start-of-day in
    // the team's TZ, not UTC midnight — otherwise we miss early-morning IST
    // messages on the `since` day.
    const oldest = String(
      new Date(tzDayBoundsUtc(params.since).startUtc).getTime() / 1000
    );
    const activities: Activity[] = [];

    for (const channel of channels.slice(0, 5)) {
      try {
        const data = await this.fetch("conversations.history", {
          channel: channel.id,
          oldest,
          limit: "20",
        });

        for (const msg of data.messages || []) {
          if (msg.subtype === "bot_message") continue;
          if (String(msg.user || "") !== myId) continue;
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
        // skip
      }
    }

    return activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
