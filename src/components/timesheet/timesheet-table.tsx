"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeEntryRow } from "./time-entry-row";
import type { TimeEntry } from "@/lib/types";

interface TimesheetTableProps {
  entries: TimeEntry[];
  onUpdateEntry: (id: string, updates: Partial<TimeEntry>) => void;
  onApproveEntry: (id: string) => void;
  onRejectEntry: (id: string) => void;
  ticketsWithoutEstimates?: string[];
}

export function TimesheetTable({
  entries,
  onUpdateEntry,
  onApproveEntry,
  onRejectEntry,
  ticketsWithoutEstimates = [],
}: TimesheetTableProps) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Ticket</TableHead>
            <TableHead className="w-[120px]">Project</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[80px] text-right">Hours</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TimeEntryRow
              key={entry.id}
              entry={entry}
              onUpdate={(updates) => onUpdateEntry(entry.id, updates)}
              onApprove={() => onApproveEntry(entry.id)}
              onReject={() => onRejectEntry(entry.id)}
              hasEstimateWarning={
                !!entry.ticketKey &&
                ticketsWithoutEstimates.includes(entry.ticketKey)
              }
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
