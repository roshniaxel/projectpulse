"use client";

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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SOURCE_COLORS, SOURCE_NAMES, ACTIVITY_TYPE_CONFIG } from "@/lib/constants";
import { formatTime, formatRelativeTime } from "@/lib/utils";
import type { Activity, ActivityType } from "@/lib/types";

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

interface ActivityCardProps {
  activity: Activity;
  variant?: "compact" | "full";
}

export function ActivityCard({ activity, variant = "full" }: ActivityCardProps) {
  const Icon = ICON_MAP[activity.type] || FileEdit;
  const colors = SOURCE_COLORS[activity.source];
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type];

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate flex-1">{activity.title}</span>
        <Badge
          variant="outline"
          className={`text-[10px] shrink-0 ${colors.bg} ${colors.text}`}
        >
          {SOURCE_NAMES[activity.source]}
        </Badge>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatRelativeTime(activity.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <Card className={`p-4 border-l-4 ${colors.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge
          variant="outline"
          className={`text-[10px] ${colors.bg} ${colors.text}`}
        >
          {SOURCE_NAMES[activity.source]}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {typeConfig.label}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatTime(activity.timestamp)}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{activity.title}</p>
          {activity.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {activity.description}
            </p>
          )}
        </div>
      </div>

      {/* Metadata chips */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {activity.ticketKey && (
          <Badge variant="outline" className="text-xs">
            {activity.ticketKey}
          </Badge>
        )}
        {activity.durationMinutes && (
          <Badge variant="secondary" className="text-xs">
            {activity.durationMinutes} min
          </Badge>
        )}
        {activity.metadata.repo && (
          <span className="text-xs text-muted-foreground">
            {activity.metadata.repo}
          </span>
        )}
        {activity.metadata.channel && (
          <span className="text-xs text-muted-foreground">
            {activity.metadata.channel}
          </span>
        )}
      </div>
    </Card>
  );
}
