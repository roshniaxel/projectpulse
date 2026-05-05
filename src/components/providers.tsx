"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/contexts/project-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ProjectProvider>{children}</ProjectProvider>
    </TooltipProvider>
  );
}
