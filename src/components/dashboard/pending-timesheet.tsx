"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_TIMESHEET_ENTRIES } from "@/lib/mock-data";
import { formatHours } from "@/lib/utils";

export function PendingTimesheet() {
  const totalHours = MOCK_TIMESHEET_ENTRIES.reduce(
    (sum, e) => sum + e.hours,
    0
  );
  const topEntries = MOCK_TIMESHEET_ENTRIES.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">
          Today&apos;s Timesheet
        </CardTitle>
        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
          Not submitted
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {entry.ticketKey && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {entry.ticketKey}
                    </Badge>
                  )}
                  <span className="text-sm font-medium truncate">
                    {entry.ticketTitle}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {entry.description}
                </p>
              </div>
              <span className="text-sm font-semibold ml-4 shrink-0">
                {formatHours(entry.hours)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {MOCK_TIMESHEET_ENTRIES.length} entries &middot;{" "}
            {formatHours(totalHours)} total
          </span>
          <Link
            href="/timesheet"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate & Review
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
