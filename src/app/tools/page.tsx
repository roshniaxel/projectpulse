"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SOURCE_COLORS, SOURCE_NAMES } from "@/lib/constants";
import type { IntegrationSource } from "@/lib/types";
import { Check, X, Send, Sparkles, Play } from "lucide-react";
import { StartWorkDialog } from "@/components/jira/start-work-dialog";

type TimeEntry = {
  id: string;
  source: string;
  ticketKey: string | null;
  description: string | null;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  status: "draft" | "approved" | "logged" | "rejected";
  jiraWorklogId: string | null;
};

type Response = {
  entries: TimeEntry[];
  totalsBySource: Record<string, number>;
  rangeFrom: string;
  rangeTo: string;
};

function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatTimeSpec(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <ToolsPageInner />
    </Suspense>
  );
}

function ToolsPageInner() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [startKey, setStartKey] = useState("");
  const [startOpen, setStartOpen] = useState(false);

  const queryString = searchParams.toString();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/time-entries?${queryString}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Failed to load time entries"))
      .finally(() => setLoading(false));
  }, [queryString]);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    try {
      const res = await fetch("/api/time-entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { entry } = await res.json();
      setData((d) =>
        d ? { ...d, entries: d.entries.map((e) => (e.id === id ? entry : e)) } : d
      );
      toast.success(`Entry ${status}`);
    } catch {
      toast.error("Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function pushToJira(entry: TimeEntry) {
    if (!entry.ticketKey) {
      toast.error("Entry has no Jira ticket");
      return;
    }
    setBusyId(entry.id);
    try {
      const res = await fetch("/api/jira/worklog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketKey: entry.ticketKey,
          timeSpent: formatTimeSpec(entry.durationSec),
          description: entry.description || `Time tracked via ${entry.source}`,
          started: entry.startedAt,
          timeEntryId: entry.id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setData((d) =>
        d
          ? {
              ...d,
              entries: d.entries.map((e) =>
                e.id === entry.id
                  ? { ...e, status: "logged", jiraWorklogId: data.worklogId }
                  : e
              ),
            }
          : d
      );
      toast.success(`Logged to ${entry.ticketKey}`);
    } catch {
      toast.error("Push to Jira failed");
    } finally {
      setBusyId(null);
    }
  }

  const totalSec = data
    ? Object.values(data.totalsBySource).reduce((a, b) => a + b, 0)
    : 0;
  const maxSourceSec = data
    ? Math.max(1, ...Object.values(data.totalsBySource))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tools Time</h2>
          <p className="text-sm text-muted-foreground">
            Every minute tracked across your tools — review drafts, approve them, push to Jira.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="RGU-224"
            value={startKey}
            onChange={(e) => setStartKey(e.target.value.toUpperCase())}
            className="w-32 h-9"
          />
          <Button
            size="sm"
            disabled={!startKey.trim()}
            onClick={() => setStartOpen(true)}
          >
            <Play className="w-4 h-4 mr-1" />
            Start work
          </Button>
        </div>
      </div>

      {startKey && (
        <StartWorkDialog
          ticketKey={startKey}
          open={startOpen}
          onOpenChange={setStartOpen}
          onStarted={() => setStartKey("")}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Time per tool</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-sm text-muted-foreground py-6">Loading…</div>
          )}
          {!loading && data && totalSec === 0 && (
            <div className="text-sm text-muted-foreground py-6">
              No time tracked in this range yet. Start a Claude Code session with{" "}
              <code className="text-xs">scripts/track-time.sh start TICKET</code> to populate this view.
            </div>
          )}
          {!loading && data && totalSec > 0 && (
            <div className="space-y-3">
              <div className="text-3xl font-semibold">{formatHours(totalSec)}</div>
              <div className="space-y-2 pt-2">
                {Object.entries(data.totalsBySource)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, seconds]) => {
                    const colors =
                      SOURCE_COLORS[source as IntegrationSource] ||
                      SOURCE_COLORS.jira;
                    const widthPct = (seconds / maxSourceSec) * 100;
                    return (
                      <div key={source} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-muted-foreground">
                          {SOURCE_NAMES[source as IntegrationSource] || source}
                        </div>
                        <div className="flex-1 h-6 bg-muted rounded relative overflow-hidden">
                          <div
                            className={`h-full ${colors.dot}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-sm font-medium tabular-nums">
                          {formatHours(seconds)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && data && data.entries.length === 0 && (
            <div className="text-sm text-muted-foreground py-6">
              No entries in this range.
            </div>
          )}
          {!loading && data && data.entries.length > 0 && (
            <div className="divide-y divide-border">
              {data.entries.map((e) => {
                const colors =
                  SOURCE_COLORS[e.source as IntegrationSource] || SOURCE_COLORS.jira;
                const isClaudeCode = e.source === "claude_code";
                return (
                  <div key={e.id} className="py-3 flex items-center gap-3">
                    <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
                      {isClaudeCode && <Sparkles className="w-3 h-3 mr-1" />}
                      {SOURCE_NAMES[e.source as IntegrationSource] || e.source}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {e.ticketKey && (
                          <span className="text-blue-600 mr-2">{e.ticketKey}</span>
                        )}
                        {e.description || "(no description)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.startedAt).toLocaleString()} · {formatHours(e.durationSec)}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        e.status === "logged"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : e.status === "approved"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : e.status === "rejected"
                          ? "bg-gray-100 text-gray-600 border-gray-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {e.status}
                    </Badge>
                    {e.status !== "logged" && e.status !== "rejected" && (
                      <div className="flex items-center gap-1">
                        {e.status === "draft" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === e.id}
                            onClick={() => updateStatus(e.id, "approved")}
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        {e.ticketKey && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === e.id}
                            onClick={() => pushToJira(e)}
                            title={`Push ${formatHours(e.durationSec)} to ${e.ticketKey} as a Jira worklog`}
                            className="gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Log in Jira
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === e.id}
                          onClick={() => updateStatus(e.id, "rejected")}
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
