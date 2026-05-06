"use client";

import { toast } from "sonner";
import { IntegrationCard } from "@/components/settings/integration-card";
import { MavenlinkMapping } from "@/components/settings/mavenlink-mapping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useIntegrations } from "@/contexts/integrations-context";
import type { IntegrationSource } from "@/lib/types";
import { SOURCE_NAMES } from "@/lib/constants";

export default function SettingsPage() {
  const { integrations, connect, disconnect } = useIntegrations();

  const handleConnect = (source: IntegrationSource) => {
    connect(source);
    toast.success(`${SOURCE_NAMES[source]} connected`, {
      description: "Activities from this tool will now appear in your dashboard",
    });
  };

  const handleDisconnect = (source: IntegrationSource) => {
    disconnect(source);
    toast.info(`${SOURCE_NAMES[source]} disconnected`);
  };

  return (
    <div className="space-y-6">
      {/* Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Integrations</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your tools to capture activities automatically.
          Only connected tools will show data in your dashboard and timesheet.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={() => handleConnect(integration.source)}
              onDisconnect={() => handleDisconnect(integration.source)}
            />
          ))}
        </div>
      </div>

      {/* Mavenlink Mapping — only show if Mavenlink is connected */}
      {integrations.find((i) => i.source === "mavenlink")?.connected && (
        <MavenlinkMapping />
      )}

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              ProjectPulse only reads activity metadata (titles, timestamps, ticket keys) from your connected tools. It does not access file contents, message bodies, or sensitive data.
            </p>
            <p>
              All data is processed locally and sent to Claude AI only for timesheet generation and risk analysis. No data is stored on third-party servers beyond what is needed for the current session.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
