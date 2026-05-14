"use client";

import Link from "next/link";
import { Link2Off, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { PendingTimesheet } from "@/components/dashboard/pending-timesheet";
import { ActiveAlerts } from "@/components/dashboard/active-alerts";
import { ProductivityInsights } from "@/components/dashboard/productivity-insights";
import { RecentActivities } from "@/components/dashboard/recent-activities";
import { useIntegrations } from "@/contexts/integrations-context";

export default function DashboardPage() {
  const { connectedSources } = useIntegrations();

  // Empty state when no tools connected
  if (connectedSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-100 mb-4">
          <Link2Off className="w-8 h-8 text-violet-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Welcome to ProjectPulse</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          Connect your tools to get started. ProjectPulse will auto-detect your time
          from Jira tickets, Zoom calls, Slack huddles, and calendar meetings.
        </p>
        <Link href="/settings">
          <Button className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
            <Settings className="w-4 h-4" />
            Connect Your Tools
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <StatsCards />

      {/* Productivity insights — donut + breakdown */}
      <ProductivityInsights />

      {/* Auto-detected time — approval queue */}
      <PendingApprovals />

      {/* Timesheet + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PendingTimesheet />
        </div>
        <div>
          <ActiveAlerts />
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivities />
    </div>
  );
}
