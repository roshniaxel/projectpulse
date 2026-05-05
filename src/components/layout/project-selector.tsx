"use client";

import { useState } from "react";
import {
  ChevronDown,
  FolderKanban,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useProject } from "@/contexts/project-context";
import { cn } from "@/lib/utils";

export function ProjectSelector() {
  const { projects, selectedProject, setSelectedProject, isLoading } =
    useProject();
  const [open, setOpen] = useState(false);

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
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-56 p-1" align="start">
        <div className="space-y-0.5">
          {/* All Projects option */}
          <button
            className={cn(
              "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition-colors",
              !selectedProject && "bg-blue-50 text-blue-700"
            )}
            onClick={() => {
              setSelectedProject(null);
              setOpen(false);
            }}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">All Projects</span>
            {!selectedProject && <Check className="w-3.5 h-3.5" />}
          </button>

          <div className="h-px bg-border my-1" />

          {/* Project list */}
          {projects.map((project) => {
            const isSelected = selectedProject?.key === project.key;
            return (
              <button
                key={project.id}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 transition-colors",
                  isSelected && "bg-blue-50 text-blue-700"
                )}
                onClick={() => {
                  setSelectedProject(project);
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
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
