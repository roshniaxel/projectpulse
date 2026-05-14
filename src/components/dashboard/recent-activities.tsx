"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GitCommit,
  GitMerge,
  GitPullRequest,
  Eye,
  Video,
  FileEdit,
  ArrowRightLeft,
  MessageSquare,
  MessageCircle,
  NotebookPen,
  Headphones,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SOURCE_COLORS, SOURCE_NAMES } from "@/lib/constants";
import { formatTime } from "@/lib/utils";
import type { ActivityType, Activity } from "@/lib/types";

const ICON_MAP: Record<ActivityType, React.ElementType> = {
  commit: GitCommit,
  pr_merged: GitMerge,
  pr_opened: GitPullRequest,
  pr_review: Eye,
  meeting: Video,
  ticket_update: FileEdit,
  ticket_transition: ArrowRightLeft,
  message: MessageSquare,
  code_review_comment: MessageCircle,
  meeting_notes: NotebookPen,
  zoom_call: Video,
  slack_huddle: Headphones,
  ticket_time: Timer,
};

export function RecentActivities() {
  return (
    <Suspense fallback={null}>
      <RecentActivitiesInner />
    </Suspense>
  );
}

function RecentActivitiesInner() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/activities?${queryString}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setActivities((d.activities || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        <Link
          href="/activity"
          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No activity in this date range.
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = ICON_MAP[activity.type] || FileEdit;
              const colors = SOURCE_COLORS[activity.source];
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{activity.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${colors.bg} ${colors.text}`}
                    >
                      {SOURCE_NAMES[activity.source]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
