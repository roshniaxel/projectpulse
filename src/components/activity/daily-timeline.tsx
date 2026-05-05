"use client";

import { ActivityCard } from "./activity-card";
import { formatTime } from "@/lib/utils";
import { SOURCE_COLORS } from "@/lib/constants";
import type { Activity } from "@/lib/types";

interface DailyTimelineProps {
  activities: Activity[];
}

export function DailyTimeline({ activities }: DailyTimelineProps) {
  const sorted = [...activities].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No activities match the current filters
      </div>
    );
  }

  return (
    <div className="relative">
      {sorted.map((activity, index) => {
        const colors = SOURCE_COLORS[activity.source];
        const isLast = index === sorted.length - 1;

        return (
          <div key={activity.id} className="relative flex gap-4 pb-6">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200" />
            )}

            {/* Dot */}
            <div
              className={`relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shrink-0 ${colors.dot}`}
              style={{ boxShadow: "0 0 0 2px rgb(229 231 235)" }}
            />

            {/* Content */}
            <div className="flex-1 -mt-0.5">
              <span className="text-xs text-muted-foreground font-medium">
                {formatTime(activity.timestamp)}
              </span>
              <div className="mt-1">
                <ActivityCard activity={activity} variant="full" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
