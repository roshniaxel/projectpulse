"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyTimeline } from "@/components/activity/daily-timeline";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { GranolaImportDialog } from "@/components/activity/granola-import-dialog";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { IntegrationSource, Activity } from "@/lib/types";

export default function ActivityPage() {
  const [selectedSources, setSelectedSources] = useState<IntegrationSource[]>(
    []
  );
  const [importedActivities, setImportedActivities] = useState<Activity[]>([]);

  const allActivities = useMemo(() => {
    return [...MOCK_ACTIVITIES, ...importedActivities].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [importedActivities]);

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
          <GranolaImportDialog onImport={handleGranolaImport} />
          <span className="text-sm text-muted-foreground">
            {filteredActivities.length} activities
          </span>
        </div>
      </div>

      {/* Filters */}
      <ActivityFilters
        selectedSources={selectedSources}
        onToggleSource={toggleSource}
      />

      {/* Timeline */}
      <DailyTimeline activities={filteredActivities} />
    </div>
  );
}
