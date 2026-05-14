"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDateRange } from "@/hooks/use-date-range";

function formatShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DateRangePicker() {
  const { from, to, preset, setRange, setPreset } = useDateRange();

  const label =
    preset === "today"
      ? "Today"
      : preset === "week"
      ? "Last 7 days"
      : preset === "month"
      ? "Last 30 days"
      : `${formatShort(from)} — ${formatShort(to)}`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant={preset === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset("today")}
            >
              Today
            </Button>
            <Button
              variant={preset === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset("week")}
            >
              7 days
            </Button>
            <Button
              variant={preset === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset("month")}
            >
              30 days
            </Button>
          </div>
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground">
              Custom range
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">From</span>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setRange(e.target.value, to)}
                  className="w-full h-8 px-2 text-sm rounded-md border border-input bg-background"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">To</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setRange(from, e.target.value)}
                  className="w-full h-8 px-2 text-sm rounded-md border border-input bg-background"
                />
              </label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
