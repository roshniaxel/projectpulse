"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOURCE_COLORS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import type { Integration } from "@/lib/types";
import {
  SquareKanban,
  GitBranch,
  CalendarDays,
  Hash,
  FolderClock,
  NotebookPen,
  Video,
} from "lucide-react";
import type { IntegrationSource } from "@/lib/types";

const SOURCE_ICONS: Record<IntegrationSource, React.ElementType> = {
  jira: SquareKanban,
  github: GitBranch,
  google_calendar: CalendarDays,
  slack: Hash,
  mavenlink: FolderClock,
  granola: NotebookPen,
  zoom: Video,
};

interface IntegrationCardProps {
  integration: Integration;
  connectMethod?: "oauth_redirect" | "auto_with_signin" | "paste_token";
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function IntegrationCard({
  integration,
  connectMethod = "paste_token",
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const Icon = SOURCE_ICONS[integration.source];
  const colors = SOURCE_COLORS[integration.source];
  const connectLabel =
    connectMethod === "oauth_redirect"
      ? "Connect with OAuth"
      : connectMethod === "auto_with_signin"
      ? "Auto-connected"
      : "Connect";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-lg ${colors.bg}`}
          >
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">
                {integration.displayName}
              </h3>
              {integration.connected ? (
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[10px]"
                >
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Not connected
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {integration.description}
            </p>
            {integration.connected && integration.accountLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                {integration.accountLabel}
                {integration.connectedAt &&
                  ` \u00b7 Connected ${formatRelativeTime(
                    integration.connectedAt
                  )}`}
              </p>
            )}
          </div>

          {/* Action */}
          <div className="shrink-0">
            {integration.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                className="text-xs"
              >
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={onConnect} className="text-xs">
                {connectLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
