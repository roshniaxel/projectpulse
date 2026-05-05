"use client";

import { formatHours } from "@/lib/utils";
import type { TimeEntry } from "@/lib/types";

interface TimesheetSummaryProps {
  entries: TimeEntry[];
  totalHours: number;
}

export function TimesheetSummary({ entries, totalHours }: TimesheetSummaryProps) {
  const approved = entries.filter((e) => e.status === "approved").length;
  const rejected = entries.filter((e) => e.status === "rejected").length;
  const draft = entries.filter((e) => e.status === "draft").length;

  // Group hours by project
  const projectHours = entries
    .filter((e) => e.status !== "rejected")
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.project] = (acc[e.project] || 0) + e.hours;
      return acc;
    }, {});

  return (
    <div className="flex items-center justify-between py-4 px-6 bg-white rounded-lg border">
      <div className="flex items-center gap-6">
        <div>
          <span className="text-2xl font-bold">{formatHours(totalHours)}</span>
          <span className="text-sm text-muted-foreground ml-1">total</span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-4 text-sm">
          {Object.entries(projectHours).map(([project, hours]) => (
            <span key={project} className="text-muted-foreground">
              <span className="font-medium text-foreground">{project}</span>{" "}
              {formatHours(hours)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {approved > 0 && (
          <span className="text-emerald-600">{approved} approved</span>
        )}
        {draft > 0 && <span>{draft} draft</span>}
        {rejected > 0 && (
          <span className="text-red-600">{rejected} rejected</span>
        )}
      </div>
    </div>
  );
}
