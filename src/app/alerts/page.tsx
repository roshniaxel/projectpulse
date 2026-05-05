"use client";

import { useState } from "react";
import { AlertCard } from "@/components/alerts/alert-card";
import { AlertDetailDialog } from "@/components/alerts/alert-detail-dialog";
import { MOCK_RISK_ALERTS } from "@/lib/mock-data";
import type { RiskAlert } from "@/lib/types";
import { toast } from "sonner";

export default function AlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = MOCK_RISK_ALERTS.filter(
    (a) => !dismissedIds.has(a.id)
  );

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    toast.success("Alert dismissed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Proactive Risk Alerts</h2>
        <p className="text-sm text-muted-foreground">
          AI-monitored risks and blockers across your sprint with suggested
          mitigations
        </p>
      </div>

      {/* Alert cards */}
      {visibleAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <p className="text-lg font-medium">All clear!</p>
          <p className="text-sm">No active risk alerts at this time</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visibleAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onClick={() => setSelectedAlert(alert)}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <AlertDetailDialog
        alert={selectedAlert}
        open={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
