"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHours } from "@/lib/utils";

type TimeEntryRow = {
  id: string;
  source: string;
  ticketKey: string | null;
  description: string | null;
  durationSec: number;
  status: string;
};

type Bucket = "all" | "draft" | "approved" | "logged";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-amber-300 text-amber-700 bg-amber-50",
  approved: "border-blue-300 text-blue-700 bg-blue-50",
  logged: "border-emerald-300 text-emerald-700 bg-emerald-50",
  rejected: "border-gray-300 text-gray-500 bg-gray-50",
};

// Exposed under the old name so the dashboard import doesn't churn.
export function PendingTimesheet() {
  return (
    <Suspense fallback={null}>
      <TrackedTimeInner />
    </Suspense>
  );
}

function TrackedTimeInner() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<Bucket>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/time-entries?${queryString}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        // Exclude rejected so the totals here always agree with the
        // Productivity Insights donut on the same page.
        const all = (d.entries || []).filter(
          (e: TimeEntryRow) => e.status !== "rejected"
        );
        setEntries(all);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  // Counts per bucket — surfaced in the tab labels so the user always sees
  // the full breakdown at a glance.
  const counts = useMemo(() => {
    const c = { all: entries.length, draft: 0, approved: 0, logged: 0 };
    for (const e of entries) {
      if (e.status === "draft") c.draft++;
      else if (e.status === "approved") c.approved++;
      else if (e.status === "logged") c.logged++;
    }
    return c;
  }, [entries]);

  const visible = useMemo(() => {
    if (bucket === "all") return entries;
    return entries.filter((e) => e.status === bucket);
  }, [entries, bucket]);

  const totalHours = visible.reduce((s, e) => s + e.durationSec / 3600, 0);
  const top = visible.slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Tracked Time</CardTitle>
        <Link
          href="/tools"
          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <Tabs
          value={bucket}
          onValueChange={(v) => setBucket(v as Bucket)}
          className="mb-4"
        >
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">All · {counts.all}</TabsTrigger>
            <TabsTrigger value="draft">Drafts · {counts.draft}</TabsTrigger>
            <TabsTrigger value="approved">
              Approved · {counts.approved}
            </TabsTrigger>
            <TabsTrigger value="logged">Logged · {counts.logged}</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-3 py-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="h-5 w-14 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse flex-1 max-w-[60%]" />
                </div>
                <div className="h-4 w-10 bg-gray-100 rounded animate-pulse ml-4" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {bucket === "all"
              ? "No tracked time in this date range. Use Claude Code or /logtime to start recording."
              : `No ${bucket} entries.`}
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {top.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.ticketKey && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {entry.ticketKey}
                        </Badge>
                      )}
                      <span className="text-sm font-medium truncate">
                        {entry.description || entry.source}
                      </span>
                      {bucket === "all" && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium shrink-0 ${STATUS_STYLES[entry.status] || ""}`}
                        >
                          {entry.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold ml-4 shrink-0">
                    {formatHours(entry.durationSec / 3600)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {visible.length} entr{visible.length === 1 ? "y" : "ies"}{" "}
                &middot; {formatHours(totalHours)} total
              </span>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Review
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
