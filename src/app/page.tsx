import { StatsCards } from "@/components/dashboard/stats-cards";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { PendingTimesheet } from "@/components/dashboard/pending-timesheet";
import { ActiveAlerts } from "@/components/dashboard/active-alerts";
import { RecentActivities } from "@/components/dashboard/recent-activities";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <StatsCards />

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
