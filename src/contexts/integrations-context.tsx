"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { IntegrationSource, Integration } from "@/lib/types";

// All available integrations (not connected by default)
const ALL_INTEGRATIONS: Integration[] = [
  {
    id: "int-jira",
    source: "jira",
    displayName: "Jira",
    description: "Track tickets, sprint progress, and team velocity",
    connected: false,
  },
  {
    id: "int-github",
    source: "github",
    displayName: "GitHub",
    description: "Monitor commits, pull requests, and code reviews",
    connected: false,
  },
  {
    id: "int-calendar",
    source: "google_calendar",
    displayName: "Google Calendar",
    description: "Capture meetings, standups, and sprint ceremonies",
    connected: false,
  },
  {
    id: "int-slack",
    source: "slack",
    displayName: "Slack",
    description: "Track project discussions and ticket-related threads",
    connected: false,
  },
  {
    id: "int-zoom",
    source: "zoom",
    displayName: "Zoom",
    description: "Auto-detect call duration and log time from meetings",
    connected: false,
  },
  {
    id: "int-mavenlink",
    source: "mavenlink",
    displayName: "Mavenlink",
    description: "Push approved timesheets and sync project hours",
    connected: false,
  },
  {
    id: "int-granola",
    source: "granola",
    displayName: "Granola",
    description: "Import AI meeting notes and action items",
    connected: false,
  },
];

function storageKey(email: string) {
  return `pp_integrations_${email}`;
}

interface IntegrationsContextValue {
  integrations: Integration[];
  connectedSources: IntegrationSource[];
  isConnected: (source: IntegrationSource) => boolean;
  connect: (source: IntegrationSource) => void;
  disconnect: (source: IntegrationSource) => void;
}

const IntegrationsContext = createContext<IntegrationsContextValue>({
  integrations: ALL_INTEGRATIONS,
  connectedSources: [],
  isConnected: () => false,
  connect: () => {},
  disconnect: () => {},
});

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const email = session?.user?.email || "";
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>({});

  // Load from localStorage on login
  useEffect(() => {
    if (!email) return;
    try {
      const saved = localStorage.getItem(storageKey(email));
      if (saved) {
        setConnectedMap(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [email]);

  // Persist to localStorage
  const persist = useCallback(
    (map: Record<string, boolean>) => {
      if (!email) return;
      localStorage.setItem(storageKey(email), JSON.stringify(map));
    },
    [email]
  );

  const connect = useCallback(
    (source: IntegrationSource) => {
      setConnectedMap((prev) => {
        const next = { ...prev, [source]: true };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const disconnect = useCallback(
    (source: IntegrationSource) => {
      setConnectedMap((prev) => {
        const next = { ...prev, [source]: false };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isConnected = useCallback(
    (source: IntegrationSource) => !!connectedMap[source],
    [connectedMap]
  );

  const connectedSources = Object.entries(connectedMap)
    .filter(([, v]) => v)
    .map(([k]) => k as IntegrationSource);

  // Build integrations list with live connection status
  const integrations: Integration[] = ALL_INTEGRATIONS.map((int) => ({
    ...int,
    connected: !!connectedMap[int.source],
    connectedAt: connectedMap[int.source] ? new Date().toISOString() : undefined,
    accountLabel: connectedMap[int.source] ? email : undefined,
  }));

  return (
    <IntegrationsContext.Provider
      value={{ integrations, connectedSources, isConnected, connect, disconnect }}
    >
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations() {
  return useContext(IntegrationsContext);
}
