"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
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
