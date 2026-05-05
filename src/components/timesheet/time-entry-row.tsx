"use client";

import { useState } from "react";
import { Check, X, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "@/lib/types";

interface TimeEntryRowProps {
  entry: TimeEntry;
  onUpdate: (updates: Partial<TimeEntry>) => void;
  onApprove: () => void;
  onReject: () => void;
  hasEstimateWarning?: boolean;
}

export function TimeEntryRow({
  entry,
  onUpdate,
  onApprove,
  onReject,
  hasEstimateWarning,
}: TimeEntryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(entry.description);
  const [editHours, setEditHours] = useState(String(entry.hours));

  const handleSave = () => {
    onUpdate({
      description: editDesc,
      hours: parseFloat(editHours) || entry.hours,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDesc(entry.description);
    setEditHours(String(entry.hours));
    setIsEditing(false);
  };

  const statusStyles = {
    draft: "",
    approved: "bg-emerald-50/50",
    rejected: "bg-red-50/50 opacity-60",
    submitted: "bg-emerald-50/50",
  };

  return (
    <TableRow className={cn(statusStyles[entry.status], isEditing && "bg-blue-50/50")}>
      {/* Ticket */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          {entry.ticketKey ? (
            <Badge variant="outline" className="text-xs font-mono">
              {entry.ticketKey}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">General</span>
          )}
          {hasEstimateWarning && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">No time estimate in Jira</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* Project */}
      <TableCell className="text-sm text-muted-foreground">
        {entry.project}
      </TableCell>

      {/* Description */}
      <TableCell>
        {isEditing ? (
          <Input
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="text-sm h-8"
          />
        ) : (
          <p
            className={cn(
              "text-sm line-clamp-2",
              entry.status === "rejected" && "line-through"
            )}
          >
            {entry.description}
            {entry.editedByUser && (
              <span className="ml-1.5 text-[10px] text-amber-600 font-medium">
                edited
              </span>
            )}
          </p>
        )}
      </TableCell>

      {/* Hours */}
      <TableCell className="text-right">
        {isEditing ? (
          <Input
            type="number"
            step="0.25"
            min="0"
            max="12"
            value={editHours}
            onChange={(e) => setEditHours(e.target.value)}
            className="text-sm h-8 w-20 text-right ml-auto"
          />
        ) : (
          <span
            className={cn(
              "text-sm font-semibold",
              entry.editedByUser && "text-amber-600"
            )}
          >
            {entry.hours}h
          </span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="icon-xs" onClick={handleSave}>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={handleCancel}>
                <X className="w-3.5 h-3.5 text-red-600" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onApprove}
                disabled={entry.status === "approved" || entry.status === "submitted"}
              >
                <Check
                  className={cn(
                    "w-3.5 h-3.5",
                    entry.status === "approved" || entry.status === "submitted"
                      ? "text-emerald-500"
                      : "text-muted-foreground hover:text-emerald-600"
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsEditing(true)}
                disabled={entry.status === "submitted"}
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onReject}
                disabled={entry.status === "submitted"}
              >
                <X
                  className={cn(
                    "w-3.5 h-3.5",
                    entry.status === "rejected"
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-600"
                  )}
                />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
