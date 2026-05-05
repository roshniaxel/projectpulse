"use client";

import { Button } from "@/components/ui/button";
import { SOURCE_COLORS, SOURCE_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { IntegrationSource } from "@/lib/types";

const SOURCES: IntegrationSource[] = [
  "jira",
  "github",
  "google_calendar",
  "slack",
  "zoom",
  "mavenlink",
  "granola",
];

interface ActivityFiltersProps {
  selectedSources: IntegrationSource[];
  onToggleSource: (source: IntegrationSource) => void;
}

export function ActivityFilters({
  selectedSources,
  onToggleSource,
}: ActivityFiltersProps) {
  const allSelected = selectedSources.length === 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground mr-1">
        Filter:
      </span>
      <Button
        variant={allSelected ? "default" : "outline"}
        size="sm"
        onClick={() => {
          // Clear all filters to show all
          SOURCES.forEach((s) => {
            if (selectedSources.includes(s)) onToggleSource(s);
          });
        }}
        className="text-xs"
      >
        All
      </Button>
      {SOURCES.map((source) => {
        const colors = SOURCE_COLORS[source];
        const isActive = selectedSources.includes(source);
        return (
          <Button
            key={source}
            variant="outline"
            size="sm"
            onClick={() => onToggleSource(source)}
            className={cn(
              "text-xs transition-colors",
              isActive && `${colors.bg} ${colors.text} ${colors.border}`
            )}
          >
            <div className={`w-2 h-2 rounded-full ${colors.dot} mr-1.5`} />
            {SOURCE_NAMES[source]}
          </Button>
        );
      })}
    </div>
  );
}
