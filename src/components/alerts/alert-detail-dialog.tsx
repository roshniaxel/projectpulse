"use client";

import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEVERITY_COLORS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import type { RiskAlert } from "@/lib/types";

interface AlertDetailDialogProps {
  alert: RiskAlert | null;
  open: boolean;
  onClose: () => void;
  onDismiss?: (id: string) => void;
}

export function AlertDetailDialog({
  alert,
  open,
  onClose,
  onDismiss,
}: AlertDetailDialogProps) {
  if (!alert) return null;

  const colors = SEVERITY_COLORS[alert.severity];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          {/* Severity badge + time */}
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {alert.severity}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Detected {formatRelativeTime(alert.detectedAt)}
            </span>
          </div>
          <DialogTitle>{alert.title}</DialogTitle>
        </DialogHeader>

        {/* Description */}
        <DialogDescription>{alert.description}</DialogDescription>

        {/* Affected items */}
        <div>
          <h4 className="text-sm font-medium mb-2">Affected Items</h4>
          <div className="flex items-center gap-2">
            {alert.affectedTickets.map((ticket) => (
              <Badge
                key={ticket}
                variant="outline"
                className="text-xs font-mono"
              >
                {ticket}
              </Badge>
            ))}
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <h4 className="text-sm font-semibold text-violet-900">
              AI Recommendation
            </h4>
          </div>
          {alert.suggestedAction && (
            <p className="text-sm font-medium text-violet-800 mb-2">
              Suggested: {alert.suggestedAction}
            </p>
          )}
          <p className="text-sm text-violet-700">{alert.suggestion}</p>
        </div>

        {/* Actions */}
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" />}
            onClick={() => {
              if (onDismiss && alert) onDismiss(alert.id);
              onClose();
            }}
          >
            Dismiss Alert
          </DialogClose>
          <DialogClose
            render={
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700" />
            }
            onClick={onClose}
          >
            {alert.suggestedAction || "Take Action"}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
