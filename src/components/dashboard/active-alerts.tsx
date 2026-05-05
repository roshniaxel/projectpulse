"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_RISK_ALERTS } from "@/lib/mock-data";
import { SEVERITY_COLORS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";

export function ActiveAlerts() {
  const alerts = MOCK_RISK_ALERTS.filter((a) => !a.isDismissed);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Risk Alerts</CardTitle>
        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50">
          {alerts.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const colors = SEVERITY_COLORS[alert.severity];
            return (
              <Link
                key={alert.id}
                href="/alerts"
                className="flex items-start gap-3 py-2 border-b border-border last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    alert.severity === "critical"
                      ? "bg-red-500"
                      : alert.severity === "high"
                      ? "bg-orange-500"
                      : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(alert.detectedAt)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${colors.bg} ${colors.text} ${colors.border}`}
                >
                  {alert.severity}
                </Badge>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <Link
            href="/alerts"
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            View all alerts
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
