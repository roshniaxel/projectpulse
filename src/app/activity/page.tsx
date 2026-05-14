"use client";

import { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Link2Off } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DailyTimeline } from "@/components/activity/daily-timeline";
import { ActivityFilters } from "@/components/activity/activity-filters";
import { GranolaImportDialog } from "@/components/activity/granola-import-dialog";
import { useIntegrations } from "@/contexts/integrations-context";
import type { IntegrationSource, Activity } from "@/lib/types";

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <ActivityPageInner />
    </Suspense>
  );
}

function ActivityPageInner() {
  const { connectedSources, isConnected, loading: integrationsLoading } = useIntegrations();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const [selectedSources, setSelectedSources] = useState<IntegrationSource[]>([]);
  const [importedActivities, setImportedActivities] = useState<Activity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connectedSources.length === 0) {
      setActivities([]);
      return;
    }
    setLoading(true);
    fetch(`/api/activities?${queryString}`)
      .then((r) => r.json())
      .then((d) => setActivities(d.activities || []))
      .catch(() => toast.error("Failed to load activities"))
      .finally(() => setLoading(false));
  }, [queryString, connectedSources.length]);

  const allActivities = useMemo(() => {
    return [...activities, ...importedActivities].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [activities, importedActivities]);

  const toggleSource = (source: IntegrationSource) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const filteredActivities = useMemo(() => {
    if (selectedSources.length === 0) return allActivities;
    return allActivities.filter((a) => selectedSources.includes(a.source));
  }, [selectedSources, allActivities]);

  const handleGranolaImport = useCallback((items: Activity[]) => {
    setImportedActivities((prev) => [...prev, ...items]);
  }, []);

  if (!integrationsLoading && connectedSources.length === 0) {
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
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {loading ? "Loading…" : `${filteredActivities.length} activities`}
        </span>
        <div className="flex items-center gap-2">
          {isConnected("granola") && (
            <GranolaImportDialog onImport={handleGranolaImport} />
          )}
        </div>
      </div>

      <ActivityFilters
        selectedSources={selectedSources}
        onToggleSource={toggleSource}
        availableSources={connectedSources}
      />

      <DailyTimeline activities={filteredActivities} />
    </div>
  );
}
