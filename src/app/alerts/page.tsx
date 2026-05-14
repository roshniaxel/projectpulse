"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Severity = "warning" | "high" | "critical";

interface Alert {
  id: string;
  severity: Severity;
  type: string;
  title: string;
  description: string;
  affectedTickets: string[];
  suggestion: string;
  detectedAt: string;
}

interface AlertsResponse {
  summary: string;
  alerts: Alert[];
  sourceCounts?: { jiraTickets: number; timeEntries: number };
  usage?: { inputTokens: number; outputTokens: number };
  mode?: "rule-based";
  error?: string;
}

const SEVERITY_STYLES: Record<
  Severity,
  { ring: string; bg: string; text: string; iconColor: string; label: string }
> = {
  critical: {
    ring: "ring-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
    iconColor: "text-red-600",
    label: "Critical",
  },
  high: {
    ring: "ring-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-700",
    iconColor: "text-orange-600",
    label: "High",
  },
  warning: {
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    iconColor: "text-amber-600",
    label: "Warning",
  },
};

const SEVERITY_ICONS: Record<Severity, React.ElementType> = {
  critical: AlertCircle,
  high: AlertTriangle,
  warning: Info,
};

export default function AlertsPage() {
  return (
    <Suspense
      fallback={<div className="text-sm text-muted-foreground">Loading…</div>}
    >
      <AlertsPageInner />
    </Suspense>
  );
}

function AlertsPageInner() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AlertsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = queryString ? `?${queryString}` : "";
      const res = await fetch(`/api/alerts/generate${qs}`, { method: "POST" });
      const data = (await res.json()) as AlertsResponse;
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setResult(data);
      if (data.alerts.length === 0) {
        toast.success("No risks detected", {
          description: data.summary,
        });
      } else {
        toast.success(
          `${data.alerts.length} risk${data.alerts.length === 1 ? "" : "s"} surfaced`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  // Auto-generate on first load if we don't have a result yet
  useEffect(() => {
    if (!result && !loading && !error) {
      generate();
    }
    // intentionally only on mount — re-trigger via the Refresh button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Proactive Risk Alerts
            {result?.mode === "rule-based" && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium border-gray-200 text-gray-600"
                title="Add ANTHROPIC_API_KEY to .env to enable AI-powered analysis"
              >
                Rule-based
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {result?.mode === "rule-based"
              ? "Deterministic rules over your Jira tickets and tracked time. Add an Anthropic API key to upgrade to Claude-powered analysis."
              : "Claude analyses your Jira tickets and tracked time to surface stalled tickets, missed estimates, and other risks."}
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Analysing…
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {loading && !result && (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-16">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-4" />
            <p className="text-sm font-medium">Claude is reviewing your sprint…</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pulling Jira tickets and tracked time, then ranking risks.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  Couldn&apos;t generate alerts
                </p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <>
          {/* Summary line */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 shrink-0">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{result.summary}</p>
                  {result.sourceCounts && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Analysed {result.sourceCounts.jiraTickets} Jira ticket
                      {result.sourceCounts.jiraTickets === 1 ? "" : "s"} and{" "}
                      {result.sourceCounts.timeEntries} time entr
                      {result.sourceCounts.timeEntries === 1 ? "y" : "ies"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert list */}
          {result.alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center text-center py-16">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 mb-3">
                  <Info className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium">No risks detected</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Claude reviewed your active tickets and found nothing
                  concerning. Refresh after your next standup or end-of-day to
                  re-analyse.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {result.alerts.map((alert) => {
                const Icon = SEVERITY_ICONS[alert.severity];
                const styles = SEVERITY_STYLES[alert.severity];
                return (
                  <Card key={alert.id} className={cn("ring-1", styles.ring)}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
                            styles.bg
                          )}
                        >
                          <Icon className={cn("w-5 h-5", styles.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold uppercase",
                                styles.text,
                                styles.bg
                              )}
                            >
                              {styles.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {alert.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">
                            {alert.title}
                          </h3>
                          <p className="text-sm text-gray-700 mb-2">
                            {alert.description}
                          </p>

                          {alert.affectedTickets.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {alert.affectedTickets.map((key) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-[10px] font-mono"
                                >
                                  {key}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-gray-50 border border-gray-100">
                            <Sparkles className="w-3.5 h-3.5 text-violet-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-gray-700">
                              <span className="font-medium">Suggested: </span>
                              {alert.suggestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {result.usage && (
            <p className="text-[10px] text-muted-foreground text-right">
              {result.usage.inputTokens.toLocaleString()} input ·{" "}
              {result.usage.outputTokens.toLocaleString()} output tokens
            </p>
          )}
        </>
      )}

      {!loading && !result && !error && (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-16">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-4">
              <Sparkles className="w-8 h-8 text-violet-600" />
            </div>
            <h3 className="text-base font-semibold mb-1">Ready to analyse</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Click Refresh above, or{" "}
              <Link
                href="/settings"
                className="text-violet-600 hover:underline"
              >
                connect Jira
              </Link>{" "}
              first if you haven&apos;t.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
