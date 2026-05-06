"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProjectProvider } from "@/contexts/project-context";
import { IntegrationsProvider } from "@/contexts/integrations-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <IntegrationsProvider>
          <ProjectProvider>{children}</ProjectProvider>
        </IntegrationsProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}
