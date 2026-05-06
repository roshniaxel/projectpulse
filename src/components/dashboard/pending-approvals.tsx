"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Pencil,
  Video,
  Headphones,
  Timer,
  Loader2,
  Clock,
  ArrowRight,
  FolderClock,
  SquareKanban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { SOURCE_COLORS, SOURCE_NAMES } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/project-context";
import { useIntegrations } from "@/contexts/integrations-context";
import type { PendingTimeEntry, PushResult, IntegrationSource } from "@/lib/types";

const TYPE_ICONS: Record<string, React.ElementType> = {
  zoom_call: Video,
  slack_huddle: Headphones,
  ticket_time: Timer,
  meeting: Video,
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function PendingApprovals() {
  const { selectedProject } = useProject();
  const { connectedSources } = useIntegrations();
  const [allEntries, setAllEntries] = useState<PendingTimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPushing, setIsPushing] = useState(false);
  const [isLoggingJira, setIsLoggingJira] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState("");

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/detect");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAllEntries(data.entries || []);
    } catch {
      // Silently fail — dashboard shouldn't break
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter by connected sources first, then by selected project
  const connectedEntries = allEntries.filter((e) =>
    connectedSources.includes(e.source as IntegrationSource)
  );
  const entries = selectedProject
    ? connectedEntries.filter((e) => {
        const key = selectedProject.key;
        const name = selectedProject.name.toLowerCase();
        if (e.ticketKey && e.ticketKey.startsWith(key + "-")) return true;
        if (e.project && (name.includes(e.project.toLowerCase()) || e.project.toLowerCase().includes(name))) return true;
        return false;
      })
    : connectedEntries;

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const approveEntry = (id: string) => {
    setAllEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "approved" as const } : e))
    );
  };

  const rejectEntry = (id: string) => {
    setAllEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "rejected" as const } : e))
    );
  };

  const startEdit = (entry: PendingTimeEntry) => {
    setEditingId(entry.id);
    setEditMinutes(String(entry.durationMinutes));
  };

  const saveEdit = (id: string) => {
    const mins = parseInt(editMinutes);
    if (mins > 0) {
      setAllEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, durationMinutes: mins } : e))
      );
    }
    setEditingId(null);
  };

  const approveAll = () => {
    setAllEntries((prev) =>
      prev.map((e) => (e.status === "pending" ? { ...e, status: "approved" as const } : e))
    );
  };

  const pushToMavenlink = async () => {
    const approved = entries.filter((e) => e.status === "approved");
    if (approved.length === 0) {
      toast.warning("No approved entries to push");
      return;
    }

    setIsPushing(true);
    try {
      // Convert PendingTimeEntry to TimeEntry shape for the push API
      const timeEntries = approved.map((e) => ({
        id: e.id,
        ticketKey: e.ticketKey || "",
        ticketTitle: e.title,
        project: e.project || "General",
        description: e.description,
        hours: Math.round((e.durationMinutes / 60) * 100) / 100,
        activities: [],
        status: "submitted" as const,
        editedByUser: false,
      }));

      const res = await fetch("/api/mavenlink/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: timeEntries }),
      });

      if (!res.ok) throw new Error("Push failed");
      const result: PushResult = await res.json();

      if (result.success) {
        setAllEntries((prev) =>
          prev.map((e) =>
            e.status === "approved" ? { ...e, status: "pushed" as const } : e
          )
        );
        toast.success("Pushed to Mavenlink", {
          description: `${result.pushed} time entries logged successfully`,
        });
      } else {
        toast.error(`${result.pushed} pushed, ${result.failed} failed`);
      }
    } catch (error) {
      toast.error("Failed to push to Mavenlink", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPushing(false);
    }
  };

  const logToJira = async () => {
    const approved = entries.filter((e) => e.status === "approved" && e.ticketKey);
    if (approved.length === 0) {
      toast.warning("No approved entries with ticket keys to log");
      return;
    }

    setIsLoggingJira(true);
    let success = 0;
    let failed = 0;

    for (const entry of approved) {
      const h = Math.floor(entry.durationMinutes / 60);
      const m = entry.durationMinutes % 60;
      const timeSpent = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;

      try {
        const res = await fetch("/api/jira/worklog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketKey: entry.ticketKey,
            timeSpent,
            description: entry.description,
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    if (failed === 0) {
      toast.success("Logged to Jira", {
        description: `${success} worklog${success > 1 ? "s" : ""} added to Jira tickets`,
      });
    } else {
      toast.error(`${success} logged, ${failed} failed`);
    }
    setIsLoggingJira(false);
  };

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const approvedCount = entries.filter((e) => e.status === "approved").length;
  const totalApprovedHours = entries
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + e.durationMinutes / 60, 0);
  const visibleEntries = entries.filter((e) => e.status !== "rejected" && e.status !== "pushed");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) return null;

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-white to-violet-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-600" />
            Auto-Detected Time
            {pendingCount > 0 && (
              <Badge className="bg-violet-100 text-violet-700 border-violet-300 text-[10px]">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={approveAll}
                className="text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Check className="w-3 h-3" />
                Approve All
              </Button>
            )}
            {approvedCount > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={logToJira}
                  disabled={isLoggingJira}
                  className="text-xs gap-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {isLoggingJira ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <SquareKanban className="w-3 h-3" />
                  )}
                  Log to Jira
                </Button>
                <Button
                  size="sm"
                  onClick={pushToMavenlink}
                  disabled={isPushing}
                  className="text-xs gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                >
                  {isPushing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FolderClock className="w-3 h-3" />
                  )}
                  Log {Math.round(totalApprovedHours * 10) / 10}h to Mavenlink
                </Button>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          We detected time from your Zoom calls, Slack huddles, and Jira tickets. Approve to log in Jira or Mavenlink.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {visibleEntries.map((entry) => {
            const Icon = TYPE_ICONS[entry.type] || Clock;
            const colors = SOURCE_COLORS[entry.source as IntegrationSource];
            const isEditing = editingId === entry.id;

            return (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  entry.status === "pending" && "bg-white border-gray-200",
                  entry.status === "approved" && "bg-emerald-50/50 border-emerald-200"
                )}
              >
                {/* Source icon */}
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", colors.bg)}>
                  <Icon className={cn("w-4 h-4", colors.text)} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{entry.title}</span>
                    <Badge variant="outline" className={cn("text-[10px]", colors.bg, colors.text, colors.border)}>
                      {SOURCE_NAMES[entry.source as IntegrationSource]}
                    </Badge>
                    {entry.ticketKey && (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {entry.ticketKey}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                </div>

                {/* Duration */}
                <div className="shrink-0 text-right">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        className="w-16 h-7 text-xs text-right"
                        min="1"
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                      <Button variant="ghost" size="icon-xs" onClick={() => saveEdit(entry.id)}>
                        <Check className="w-3 h-3 text-emerald-600" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">
                      {formatDuration(entry.durationMinutes)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {entry.status === "pending" && (
                    <>
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-xs" onClick={() => approveEntry(entry.id)} />}>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </TooltipTrigger>
                        <TooltipContent>Approve</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-xs" onClick={() => startEdit(entry)} />}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Edit duration</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<Button variant="ghost" size="icon-xs" onClick={() => rejectEntry(entry.id)} />}>
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </TooltipTrigger>
                        <TooltipContent>Reject</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  {entry.status === "approved" && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">
                      <Check className="w-2.5 h-2.5 mr-0.5" />
                      Approved
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pushed summary */}
        {entries.some((e) => e.status === "pushed") && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
            <FolderClock className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              {entries.filter((e) => e.status === "pushed").length} entries logged to Mavenlink
            </span>
            <ArrowRight className="w-3 h-3 text-amber-500 ml-auto" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
