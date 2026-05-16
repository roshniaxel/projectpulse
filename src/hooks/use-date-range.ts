"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

// Use the browser's local timezone (not UTC) so "today" matches what the user
// sees on the wall clock. `toISOString().split("T")[0]` returns the UTC date,
// which rolls over to "yesterday" for any user east of UTC after their local
// midnight crosses 00:00 UTC.
function formatLocal(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function todayISO(): string {
  return formatLocal(new Date());
}

function daysAgoISO(days: number): string {
  return formatLocal(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export type DateRangePreset = "today" | "week" | "month" | "custom";

export function useDateRange() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") || daysAgoISO(7);
  const to = searchParams.get("to") || todayISO();

  const preset: DateRangePreset = useMemo(() => {
    if (from === todayISO() && to === todayISO()) return "today";
    if (from === daysAgoISO(7) && to === todayISO()) return "week";
    if (from === daysAgoISO(30) && to === todayISO()) return "month";
    return "custom";
  }, [from, to]);

  const setRange = useCallback(
    (nextFrom: string, nextTo: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", nextFrom);
      params.set("to", nextTo);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const setPreset = useCallback(
    (next: DateRangePreset) => {
      if (next === "today") setRange(todayISO(), todayISO());
      else if (next === "week") setRange(daysAgoISO(7), todayISO());
      else if (next === "month") setRange(daysAgoISO(30), todayISO());
    },
    [setRange]
  );

  return { from, to, preset, setRange, setPreset };
}
