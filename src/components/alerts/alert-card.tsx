"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_COLORS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import type { RiskAlert } from "@/lib/types";

const ALERT_TYPE_LABELS: Record<string, string> = {
  stuck_ticket: "Stuck Ticket",
  velocity_drop: "Velocity Drop",
  unassigned_critical: "Unassigned Critical",
  scope_creep: "Scope Creep",
  blocked_dependency: "Blocked Dependency",
  overdue_sprint_item: "Overdue Item",
};

interface AlertCardProps {
  alert: RiskAlert;
  onClick?: () => void;
}

export function AlertCard({ alert, onClick }: AlertCardProps) {
  const colors = SEVERITY_COLORS[alert.severity];

  return (
    <Card
      className={`p-5 border-t-4 cursor-pointer hover:shadow-md transition-shadow ${colors.border}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Badge
          variant="outline"
          className={`text-[10px] uppercase font-bold ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {alert.severity}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {ALERT_TYPE_LABELS[alert.type] || alert.type}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatRelativeTime(alert.detectedAt)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold mb-2">{alert.title}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {alert.description}
      </p>

      {/* Affected tickets */}
      <div className="flex items-center gap-2 mb-3">
        {alert.affectedTickets.map((ticket) => (
          <Badge key={ticket} variant="outline" className="text-xs font-mono">
            {ticket}
          </Badge>
        ))}
      </div>

      {/* Suggestion preview */}
      <div className="text-sm text-violet-600 font-medium">
        View AI recommendation &rarr;
      </div>
    </Card>
  );
}
