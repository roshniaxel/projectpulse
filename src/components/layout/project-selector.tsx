"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  FolderKanban,
  Check,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useProject } from "@/contexts/project-context";
import { cn } from "@/lib/utils";
import type { JiraProject } from "@/lib/types";

export function ProjectSelector() {
  const { projects, selectedProject, setSelectedProject, isLoading } =
    useProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Sync URL ?project= into context once the project list is loaded
  // (so reloads / shared links restore the filter).
  const urlProjectKey = searchParams.get("project");
  useEffect(() => {
    if (!projects.length) return;
    if (urlProjectKey) {
      const found = projects.find((p) => p.key === urlProjectKey);
      if (found && found.key !== selectedProject?.key) {
        setSelectedProject(found);
      }
    } else if (selectedProject) {
      setSelectedProject(null);
    }
    // selectedProject intentionally excluded — context updates should not
    // re-trigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlProjectKey, projects]);

  const selectProject = (project: JiraProject | null) => {
    setSelectedProject(project);
    const params = new URLSearchParams(searchParams.toString());
    if (project) params.set("project", project.key);
    else params.delete("project");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
    );
  }, [projects, query]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="hidden sm:inline">Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs font-medium max-w-[200px]"
          />
        }
      >
        <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
        <span className="truncate">
          {selectedProject ? selectedProject.name : "All Projects"}
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        {/* Search input — shows when there's enough projects to scroll through */}
        {projects.length > 5 && (
          <div className="relative mb-1 px-1 pt-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              autoFocus
              className="w-full pl-7 pr-2 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {/* All Projects option — only when not searching */}
          {!query && (
            <>
              <button
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition-colors",
                  !selectedProject && "bg-blue-50 text-blue-700"
                )}
                onClick={() => {
                  selectProject(null);
                  setOpen(false);
                }}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">All Projects</span>
                {!selectedProject && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="h-px bg-border my-1" />
            </>
          )}

          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              No projects match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((project) => {
              const isSelected = selectedProject?.key === project.key;
              return (
                <button
                  key={project.id}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition-colors",
                    isSelected && "bg-blue-50 text-blue-700"
                  )}
                  onClick={() => {
                    selectProject(project);
                    setOpen(false);
                  }}
                >
                  <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                    {project.key.substring(0, 2)}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {project.key}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
