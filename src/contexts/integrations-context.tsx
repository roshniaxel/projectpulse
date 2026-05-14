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

const ALL_INTEGRATIONS: Omit<Integration, "connected">[] = [
  {
    id: "int-jira",
    source: "jira",
    displayName: "Jira",
    description: "Track tickets, sprint progress, and team velocity",
  },
  {
    id: "int-github",
    source: "github",
    displayName: "GitHub",
    description: "Monitor commits, pull requests, and code reviews",
  },
  {
    id: "int-calendar",
    source: "google_calendar",
    displayName: "Google Calendar",
    description: "Capture meetings, standups, and sprint ceremonies",
  },
  {
    id: "int-slack",
    source: "slack",
    displayName: "Slack",
    description: "Track project discussions and ticket-related threads",
  },
  {
    id: "int-zoom",
    source: "zoom",
    displayName: "Zoom",
    description: "Auto-detect call duration and log time from meetings",
  },
  {
    id: "int-mavenlink",
    source: "mavenlink",
    displayName: "Mavenlink",
    description: "Push approved timesheets and sync project hours",
  },
  {
    id: "int-granola",
    source: "granola",
    displayName: "Granola",
    description: "Import AI meeting notes and action items",
  },
];

type ConnectionMap = Record<string, { connectedAt: string | null }>;

interface IntegrationsContextValue {
  integrations: Integration[];
  connectedSources: IntegrationSource[];
  isConnected: (source: IntegrationSource) => boolean;
  hasAnyConnection: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  disconnect: (source: IntegrationSource) => Promise<void>;
}

const IntegrationsContext = createContext<IntegrationsContextValue>({
  integrations: ALL_INTEGRATIONS.map((i) => ({ ...i, connected: false })),
  connectedSources: [],
  isConnected: () => false,
  hasAnyConnection: false,
  loading: false,
  refresh: async () => {},
  disconnect: async () => {},
});

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const email = session?.user?.email || "";
  const [connections, setConnections] = useState<ConnectionMap>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!email) {
      setConnections({});
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        const map: ConnectionMap = {};
        for (const c of data.connections || []) {
          map[c.source] = { connectedAt: c.connectedAt };
        }
        setConnections(map);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (status === "loading") return;
    refresh();
  }, [refresh, status]);

  const disconnect = useCallback(
    async (source: IntegrationSource) => {
      const res = await fetch(`/api/integrations/${source}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConnections((prev) => {
          const next = { ...prev };
          delete next[source];
          return next;
        });
      }
    },
    []
  );

  const isConnected = useCallback(
    (source: IntegrationSource) => !!connections[source],
    [connections]
  );

  const integrations: Integration[] = ALL_INTEGRATIONS.map((int) => ({
    ...int,
    connected: !!connections[int.source],
    connectedAt: connections[int.source]?.connectedAt || undefined,
    accountLabel: connections[int.source] ? email : undefined,
  }));

  const connectedSources = Object.keys(connections) as IntegrationSource[];
  const hasAnyConnection = connectedSources.length > 0;

  return (
    <IntegrationsContext.Provider
      value={{
        integrations,
        connectedSources,
        isConnected,
        hasAnyConnection,
        loading,
        refresh,
        disconnect,
      }}
    >
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations() {
  return useContext(IntegrationsContext);
}
