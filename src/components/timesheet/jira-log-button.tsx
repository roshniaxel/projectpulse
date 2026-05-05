"use client";

import { useState } from "react";
import { SquareKanban, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TimeEntry } from "@/lib/types";

interface JiraLogButtonProps {
  entries: TimeEntry[];
}

function hoursToJiraFormat(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function JiraLogButton({ entries }: JiraLogButtonProps) {
  const [isLogging, setIsLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  // Only entries with ticket keys can be logged to Jira
  const loggableEntries = entries.filter(
    (e) => e.ticketKey && e.status === "submitted"
  );

  if (loggableEntries.length === 0) return null;

  if (logged) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 text-emerald-600">
        <CheckCircle className="w-4 h-4" />
        Logged to Jira
      </Button>
    );
  }

  const handleLog = async () => {
    setIsLogging(true);
    let successCount = 0;
    let failCount = 0;

    for (const entry of loggableEntries) {
      try {
        const res = await fetch("/api/jira/worklog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketKey: entry.ticketKey,
            timeSpent: hoursToJiraFormat(entry.hours),
            description: entry.description,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.success("Logged to Jira", {
        description: `${successCount} worklog${successCount > 1 ? "s" : ""} added to Jira tickets`,
      });
      setLogged(true);
    } else {
      toast.error(`${successCount} logged, ${failCount} failed`);
    }

    setIsLogging(false);
  };

  const totalHours = loggableEntries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLog}
      disabled={isLogging}
      className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
    >
      {isLogging ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Logging...
        </>
      ) : (
        <>
          <SquareKanban className="w-4 h-4" />
          Log {hoursToJiraFormat(totalHours)} to Jira
        </>
      )}
    </Button>
  );
}
