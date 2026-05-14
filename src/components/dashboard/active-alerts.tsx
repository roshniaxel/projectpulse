"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "warning" | "high" | "critical";

interface Alert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  affectedTickets: string[];
}

const SEVERITY_ICONS: Record<Severity, React.ElementType> = {
  critical: AlertCircle,
  high: AlertTriangle,
  warning: Info,
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "text-red-600 bg-red-50",
  high: "text-orange-600 bg-orange-50",
  warning: "text-amber-600 bg-amber-50",
};

export function ActiveAlerts() {
  return (
    <Suspense fallback={<AlertsShell loading />}>
      <ActiveAlertsInner />
    </Suspense>
  );
}

function ActiveAlertsInner() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = queryString ? `?${queryString}` : "";
    fetch(`/api/alerts/generate${qs}`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAlerts(Array.isArray(d.alerts) ? d.alerts.slice(0, 3) : []);
      })
      .catch(() => !cancelled && setAlerts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  if (loading) return <AlertsShell loading />;
  if (!alerts || alerts.length === 0) return <AlertsShell />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-600" />
          Risk Alerts
        </CardTitle>
        <Link
          href="/alerts"
          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {alerts.map((alert) => {
            const Icon = SEVERITY_ICONS[alert.severity];
            return (
              <div
                key={alert.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-100"
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-md shrink-0",
                    SEVERITY_COLORS[alert.severity]
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {alert.description}
                  </p>
                  {alert.affectedTickets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {alert.affectedTickets.slice(0, 3).map((key) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="text-[9px] font-mono px-1.5 py-0"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsShell({ loading = false }: { loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-violet-600" />
          Risk Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center text-center py-4">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 text-violet-600 animate-spin mb-2" />
              <p className="text-xs text-muted-foreground">
                Claude is reviewing your sprint…
              </p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                <Info className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium">No active risks</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                Your sprint looks healthy. Re-runs automatically when the date
                filter changes.
              </p>
              <Link
                href="/alerts"
                className="mt-3 text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                Open Alerts
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
