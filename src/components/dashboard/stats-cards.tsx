"use client";

import {
  Activity,
  Clock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MOCK_STATS } from "@/lib/mock-data";

const stats = [
  {
    title: "Activities Captured",
    value: String(MOCK_STATS.activitiesCaptured),
    subtitle: "Today",
    icon: Activity,
    trend: "+3 from yesterday",
    trendPositive: true,
  },
  {
    title: "Hours Logged",
    value: MOCK_STATS.hoursLogged > 0 ? `${MOCK_STATS.hoursLogged}h` : "0h",
    subtitle: "Pending review",
    icon: Clock,
    trend: "Timesheet not submitted",
    trendPositive: false,
  },
  {
    title: "Active Alerts",
    value: String(MOCK_STATS.activeAlerts),
    subtitle: `${MOCK_STATS.criticalAlerts} critical`,
    icon: AlertTriangle,
    trend: null,
    trendPositive: false,
  },
  {
    title: "Sprint Progress",
    value: `${MOCK_STATS.sprintProgress}%`,
    subtitle: "Sprint 14",
    icon: TrendingUp,
    trend: null,
    trendPositive: true,
    showProgress: true,
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </span>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {stat.subtitle}
                </span>
                {stat.trend && (
                  <span
                    className={`text-xs font-medium ${
                      stat.trendPositive
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {stat.trend}
                  </span>
                )}
              </div>
              {stat.showProgress && (
                <Progress
                  value={MOCK_STATS.sprintProgress}
                  className="mt-3 h-1.5"
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
