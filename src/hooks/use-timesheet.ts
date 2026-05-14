"use client";

import { useState, useCallback } from "react";
import type { TimeEntry, TimesheetState, GenerationStep, JiraEstimate } from "@/lib/types";

const INITIAL_STEPS: GenerationStep[] = [
  { label: "Pulling time entries from the database...", status: "pending" },
  { label: "Claude is grouping and polishing entries...", status: "pending" },
  { label: "Checking Jira estimates...", status: "pending" },
  { label: "Draft ready!", status: "pending" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shape returned by POST /api/timesheet/generate
interface AIGeneratedEntry {
  ticketKey: string | null;
  ticketTitle: string;
  category: string;
  durationMinutes: number;
  status: "draft" | "approved" | "logged";
  sourceEntryIds: string[];
}
interface AIGeneratedDay {
  date: string;
  totalHours: number;
  summary: string;
  entries: AIGeneratedEntry[];
}
interface AIGeneratedTimesheet {
  summary: string;
  days: AIGeneratedDay[];
  sourceCount: number;
  error?: string;
}

export function useTimesheet() {
  const [state, setState] = useState<TimesheetState>("idle");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [steps, setSteps] = useState<GenerationStep[]>(INITIAL_STEPS);
  const [estimates, setEstimates] = useState<Record<string, JiraEstimate | null>>({});
  const [ticketsWithoutEstimates, setTicketsWithoutEstimates] = useState<string[]>([]);

  const generate = useCallback(async (searchParams?: string) => {
    setState("generating");
    const newSteps = INITIAL_STEPS.map((s) => ({ ...s }));

    // Step 1: pulling entries (synthetic — instant)
    newSteps[0].status = "active";
    setSteps([...newSteps]);
    await sleep(400);
    newSteps[0].status = "done";

    // Step 2: real Claude call — kick off, animate "active" while it runs
    newSteps[1].status = "active";
    setSteps([...newSteps]);

    const qs = searchParams ? `?${searchParams}` : "";
    let aiResult: AIGeneratedTimesheet | null = null;
    let aiError: string | null = null;
    try {
      const res = await fetch(`/api/timesheet/generate${qs}`, {
        method: "POST",
      });
      const data = (await res.json()) as AIGeneratedTimesheet;
      if (!res.ok) {
        aiError = data.error || `HTTP ${res.status}`;
      } else {
        aiResult = data;
      }
    } catch (e) {
      aiError = e instanceof Error ? e.message : "Network error";
    }

    newSteps[1].status = "done";
    setSteps([...newSteps]);

    // Flatten AI days → entries into the existing TimeEntry UI shape so the
    // rest of /timesheet renders unchanged. Each Claude-merged line becomes
    // one row; the contributing source IDs ride in `activities`.
    let generatedEntries: TimeEntry[] = [];
    if (aiResult && !aiError) {
      generatedEntries = aiResult.days.flatMap((day) =>
        day.entries.map((e, idx): TimeEntry => {
          const projectKey = e.ticketKey?.split("-")[0] ?? e.category;
          return {
            id: `ai-${day.date}-${idx}`,
            ticketKey: e.ticketKey || "",
            ticketTitle: e.ticketTitle,
            project: projectKey,
            description: e.ticketTitle,
            hours: Math.round((e.durationMinutes / 60) * 100) / 100,
            activities: e.sourceEntryIds,
            status: (e.status === "logged" ? "approved" : e.status) as TimeEntry["status"],
            editedByUser: false,
          };
        })
      );
    } else if (aiError) {
      // Surface the error in the steps panel so the user can debug
      newSteps[1].label = `Claude call failed: ${aiError}`;
      setSteps([...newSteps]);
    }
    setEntries(generatedEntries);

    // Step 3: check estimates
    newSteps[2].status = "active";
    setSteps([...newSteps]);

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

    newSteps[2].status = "done";
    newSteps[3].status = "done";
    setSteps([...newSteps]);

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
