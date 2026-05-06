"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Link2Off } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DailyTimeline } from "@/components/activity/daily-timeline";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { GranolaImportDialog } from "@/components/activity/granola-import-dialog";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";
import { useIntegrations } from "@/contexts/integrations-context";
import { formatDate } from "@/lib/utils";
import type { IntegrationSource, Activity } from "@/lib/types";

export default function ActivityPage() {
  const { connectedSources, isConnected } = useIntegrations();
  const [selectedSources, setSelectedSources] = useState<IntegrationSource[]>([]);
  const [importedActivities, setImportedActivities] = useState<Activity[]>([]);

  // Only show activities from connected sources
  const allActivities = useMemo(() => {
    const connected = [...MOCK_ACTIVITIES, ...importedActivities].filter(
      (a) => connectedSources.includes(a.source)
    );
    return connected.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [importedActivities, connectedSources]);

  const toggleSource = (source: IntegrationSource) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  const filteredActivities = useMemo(() => {
    if (selectedSources.length === 0) return allActivities;
    return allActivities.filter((a) => selectedSources.includes(a.source));
  }, [selectedSources, allActivities]);

  const handleGranolaImport = useCallback((activities: Activity[]) => {
    setImportedActivities((prev) => [...prev, ...activities]);
  }, []);

  // Empty state when no tools connected
  if (connectedSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
          <Link2Off className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold mb-1">No tools connected</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          Connect your Jira, Slack, Zoom, or Calendar in Settings to see your activities here.
        </p>
        <Link href="/settings">
          <Button>Go to Settings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {formatDate(new Date().toISOString())}
          </span>
          <Button variant="outline" size="icon-sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isConnected("granola") && (
            <GranolaImportDialog onImport={handleGranolaImport} />
          )}
          <span className="text-sm text-muted-foreground">
            {filteredActivities.length} activities
          </span>
        </div>
      </div>

      {/* Filters — only show connected sources */}
      <ActivityFilters
        selectedSources={selectedSources}
        onToggleSource={toggleSource}
        availableSources={connectedSources}
      />

      {/* Timeline */}
      <DailyTimeline activities={filteredActivities} />
    </div>
  );
}
