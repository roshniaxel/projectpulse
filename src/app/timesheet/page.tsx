"use client";

import { useEffect, useMemo } from "react";
import {
  CheckCircle,
  RotateCcw,
  Send,
  Loader2,
  SquareKanban,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTimesheet } from "@/hooks/use-timesheet";
import { useProject } from "@/contexts/project-context";
import { GenerateButton } from "@/components/timesheet/generate-button";
import { TimesheetTable } from "@/components/timesheet/timesheet-table";
import { TimesheetSummary } from "@/components/timesheet/timesheet-summary";
import { MavenlinkPushButton } from "@/components/timesheet/mavenlink-push-button";
import { JiraLogButton } from "@/components/timesheet/jira-log-button";
import { formatDate, formatHours } from "@/lib/utils";

export default function TimesheetPage() {
  const { selectedProject } = useProject();
  const {
    state,
    entries,
    steps,
    totalHours,
    ticketsWithoutEstimates,
    generate,
    updateEntry,
    approveEntry,
    rejectEntry,
    submit,
    reset,
    markPushed,
  } = useTimesheet();

  // Filter entries by selected project
  const filteredEntries = useMemo(() => {
    if (!selectedProject) return entries;
    const key = selectedProject.key;
    const name = selectedProject.name.toLowerCase();
    return entries.filter((e) => {
      // Match by ticket key prefix (e.g. "RGU-" matches RGU-224)
      if (e.ticketKey && e.ticketKey.startsWith(key + "-")) return true;
      // Match by project name (partial — "Regent's University" matches "Regent's University/Managed")
      if (e.project && (name.includes(e.project.toLowerCase()) || e.project.toLowerCase().includes(name))) return true;
      return false;
    });
  }, [entries, selectedProject]);

  const filteredTotalHours = filteredEntries
    .filter((e) => e.status !== "rejected")
    .reduce((sum, e) => sum + e.hours, 0);

  // Show estimate warning toast when draft is ready
  useEffect(() => {
    if (state === "draft" && ticketsWithoutEstimates.length > 0) {
      toast.warning("Missing time estimates", {
        description: `${ticketsWithoutEstimates.join(", ")} ${ticketsWithoutEstimates.length === 1 ? "has" : "have"} no Jira time estimate. Consider adding estimates before logging time.`,
        duration: 8000,
      });
    }
  }, [state, ticketsWithoutEstimates]);

  const handleSubmit = async () => {
    await submit();
    toast.success("Timesheet submitted successfully", {
      description: `${formatHours(totalHours)} logged across ${entries.filter((e) => e.status !== "rejected").length} entries`,
    });
  };

  // Idle & Generating states
  if (state === "idle" || state === "generating") {
    return (
      <GenerateButton state={state} steps={steps} onGenerate={generate} />
    );
  }

  // Submitted state
  if (state === "submitted") {
    const submittedEntries = entries.filter((e) => e.status === "submitted");
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-100 mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Timesheet Submitted
        </h2>
        <p className="text-muted-foreground text-center max-w-md mb-2">
          {formatHours(totalHours)} logged across {submittedEntries.length}{" "}
          entries for {formatDate(new Date().toISOString())}
        </p>

        {/* Log to Jira + Mavenlink push */}
        <div className="mt-4 flex items-center gap-3">
          <JiraLogButton entries={entries} />
          <MavenlinkPushButton
            entries={entries}
            onPushComplete={(result) => {
              markPushed(result.externalIds);
            }}
          />
        </div>

        <Button variant="outline" onClick={reset} className="mt-6">
          <RotateCcw className="w-4 h-4 mr-2" />
          Generate New Timesheet
        </Button>
      </div>
    );
  }

  // Draft & Submitting states
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Timesheet Draft</h2>
            <Badge
              variant="outline"
              className="border-violet-300 text-violet-700 bg-violet-50"
            >
              Draft
            </Badge>
            {selectedProject && (
              <Badge
                variant="outline"
                className="border-blue-300 text-blue-700 bg-blue-50"
              >
                <SquareKanban className="w-3 h-3 mr-1" />
                {selectedProject.name}
              </Badge>
            )}
            {ticketsWithoutEstimates.length > 0 && (
              <Badge
                variant="outline"
                className="border-amber-300 text-amber-700 bg-amber-50"
              >
                {ticketsWithoutEstimates.length} missing estimate{ticketsWithoutEstimates.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(new Date().toISOString())} &middot;{" "}
            {selectedProject
              ? `${filteredEntries.length} of ${entries.length} entries`
              : `Generated from ${entries.reduce((sum, e) => sum + e.activities.length, 0)} activities`}
          </p>
        </div>
      </div>

      {/* Table — show filtered entries */}
      <TimesheetTable
        entries={filteredEntries}
        onUpdateEntry={updateEntry}
        onApproveEntry={approveEntry}
        onRejectEntry={rejectEntry}
        ticketsWithoutEstimates={ticketsWithoutEstimates}
      />

      {/* Summary */}
      <TimesheetSummary entries={filteredEntries} totalHours={filteredTotalHours} />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={state === "submitting"}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
        >
          {state === "submitting" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Timesheet
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
