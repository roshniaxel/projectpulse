"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Group raw TimeEntry.source values into demo-friendly categories. The colors
// echo the existing per-source palette from SOURCE_COLORS but flattened so the
// chart legend stays readable.
const CATEGORY: Record<
  string,
  { label: string; color: string; bucket: string }
> = {
  claude_code: { bucket: "ai", label: "AI-assisted coding", color: "#8b5cf6" }, // violet-500
  manual: { bucket: "deep", label: "Deep work & review", color: "#3b82f6" }, // blue-500
  zoom: { bucket: "meetings", label: "Meetings", color: "#f59e0b" }, // amber-500
  google_calendar: { bucket: "meetings", label: "Meetings", color: "#f59e0b" },
  jira: { bucket: "jira", label: "Auto-logged time", color: "#10b981" }, // emerald-500
  mavenlink: { bucket: "other", label: "Other", color: "#64748b" }, // slate-500
  slack: { bucket: "comms", label: "Communication", color: "#a855f7" }, // purple-500
  granola: { bucket: "meetings", label: "Meetings", color: "#f59e0b" },
};

const FALLBACK = { bucket: "other", label: "Other", color: "#64748b" };

interface Slice {
  bucket: string;
  label: string;
  color: string;
  seconds: number;
}

export function ProductivityInsights() {
  return (
    <Suspense fallback={<InsightsShell loading />}>
      <ProductivityInsightsInner />
    </Suspense>
  );
}

function ProductivityInsightsInner() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [totals, setTotals] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = queryString ? `?${queryString}` : "";
    fetch(`/api/time-entries${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTotals(d.totalsBySource || {});
      })
      .catch(() => !cancelled && setTotals({}))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const { slices, totalSec } = useMemo(() => {
    if (!totals) return { slices: [] as Slice[], totalSec: 0 };
    // Merge sources that map to the same bucket (e.g. zoom + google_calendar → Meetings)
    const byBucket = new Map<string, Slice>();
    let total = 0;
    for (const [source, seconds] of Object.entries(totals)) {
      const meta = CATEGORY[source] || FALLBACK;
      total += seconds;
      const existing = byBucket.get(meta.bucket);
      if (existing) {
        existing.seconds += seconds;
      } else {
        byBucket.set(meta.bucket, {
          bucket: meta.bucket,
          label: meta.label,
          color: meta.color,
          seconds,
        });
      }
    }
    return {
      slices: Array.from(byBucket.values()).sort((a, b) => b.seconds - a.seconds),
      totalSec: total,
    };
  }, [totals]);

  if (loading) return <InsightsShell loading />;
  if (totalSec === 0) return <InsightsShell />;

  const chartData = slices.map((s) => ({
    name: s.label,
    value: Math.round((s.seconds / 3600) * 100) / 100,
    color: s.color,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-violet-600" />
          Productivity Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Donut chart */}
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                  formatter={(value: number) => [`${value}h`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gray-900">
                {(totalSec / 3600).toFixed(1)}h
              </span>
              <span className="text-[11px] text-muted-foreground">tracked</span>
            </div>
          </div>

          {/* Breakdown list */}
          <div className="space-y-2.5">
            {slices.map((s) => {
              const pct = totalSec > 0 ? (s.seconds / totalSec) * 100 : 0;
              const hours = (s.seconds / 3600).toFixed(1);
              return (
                <div key={s.bucket} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {s.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-gray-900">
                        {hours}h
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all")}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsShell({ loading = false }: { loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-violet-600" />
          Productivity Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center text-center py-8">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 text-violet-600 animate-spin mb-2" />
              <p className="text-xs text-muted-foreground">
                Aggregating tracked time…
              </p>
            </>
          ) : (
            <>
              <TrendingUp className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No tracked time in this range</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                Run <code className="text-[10px]">track-time.sh</code> or{" "}
                <code className="text-[10px]">/logtime</code> to start populating
                this chart.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
