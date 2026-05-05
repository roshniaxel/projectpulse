"use client";

import { useState, useCallback } from "react";
import type { TimeEntry, TimesheetState, GenerationStep, JiraEstimate } from "@/lib/types";
import { MOCK_TIMESHEET_ENTRIES } from "@/lib/mock-data";

const INITIAL_STEPS: GenerationStep[] = [
  { label: "Analyzing 15 activities...", status: "pending" },
  { label: "Grouping by ticket and project...", status: "pending" },
  { label: "Checking estimates...", status: "pending" },
  { label: "Draft ready!", status: "pending" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useTimesheet() {
  const [state, setState] = useState<TimesheetState>("idle");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [steps, setSteps] = useState<GenerationStep[]>(INITIAL_STEPS);
  const [estimates, setEstimates] = useState<Record<string, JiraEstimate | null>>({});
  const [ticketsWithoutEstimates, setTicketsWithoutEstimates] = useState<string[]>([]);

  const generate = useCallback(async () => {
    setState("generating");
    const newSteps = [...INITIAL_STEPS];

    // Animate through steps
    for (let i = 0; i < newSteps.length; i++) {
      newSteps[i] = { ...newSteps[i], status: "active" };
      if (i > 0) {
        newSteps[i - 1] = { ...newSteps[i - 1], status: "done" };
      }
      setSteps([...newSteps]);
      await sleep(800);
    }

    // Mark last step done
    newSteps[newSteps.length - 1] = {
      ...newSteps[newSteps.length - 1],
      status: "done",
    };
    setSteps([...newSteps]);

    await sleep(400);

    const generatedEntries = MOCK_TIMESHEET_ENTRIES.map((e) => ({ ...e }));
    setEntries(generatedEntries);

    // Check estimates for all ticket entries
    const ticketKeys = generatedEntries
      .map((e) => e.ticketKey)
      .filter((k) => k && k.length > 0);

    const uniqueKeys = [...new Set(ticketKeys)];
    const estimateMap: Record<string, JiraEstimate | null> = {};
    const missing: string[] = [];

    await Promise.allSettled(
      uniqueKeys.map(async (key) => {
        try {
          const res = await fetch(`/api/jira/tickets/${key}/estimate`);
          if (res.ok) {
            const data = await res.json();
            estimateMap[key] = data.estimate;
            if (!data.estimate || !data.estimate.originalEstimateSeconds) {
              missing.push(key);
            }
          } else {
            estimateMap[key] = null;
            missing.push(key);
          }
        } catch {
          estimateMap[key] = null;
          missing.push(key);
        }
      })
    );

    setEstimates(estimateMap);
    setTicketsWithoutEstimates(missing);
    setState("draft");
  }, []);

  const updateEntry = useCallback(
    (id: string, updates: Partial<TimeEntry>) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...updates, editedByUser: true } : e
        )
      );
    },
    []
  );

  const approveEntry = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "approved" as const } : e))
    );
  }, []);

  const rejectEntry = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "rejected" as const } : e))
    );
  }, []);

  const submit = useCallback(async () => {
    setState("submitting");
    await sleep(1200);
    setEntries((prev) =>
      prev.map((e) =>
        e.status !== "rejected" ? { ...e, status: "submitted" as const } : e
      )
    );
    setState("submitted");
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setEntries([]);
    setSteps(INITIAL_STEPS);
    setEstimates({});
    setTicketsWithoutEstimates([]);
  }, []);

  const markPushed = useCallback((externalIds: Array<{ entryId: string; externalId: string }>) => {
    const now = new Date().toISOString();
    setEntries((prev) =>
      prev.map((e) => {
        const match = externalIds.find((x) => x.entryId === e.id);
        return match ? { ...e, externalId: match.externalId, pushedAt: now } : e;
      })
    );
  }, []);

  const totalHours = entries
    .filter((e) => e.status !== "rejected")
    .reduce((sum, e) => sum + e.hours, 0);

  return {
    state,
    entries,
    steps,
    totalHours,
    estimates,
    ticketsWithoutEstimates,
    generate,
    updateEntry,
    approveEntry,
    rejectEntry,
    submit,
    reset,
    markPushed,
  };
}
