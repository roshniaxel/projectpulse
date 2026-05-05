"use client";

import { IntegrationCard } from "@/components/settings/integration-card";
import { MavenlinkMapping } from "@/components/settings/mavenlink-mapping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { MOCK_INTEGRATIONS } from "@/lib/mock-data";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Integrations */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Integrations</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your tools to capture activities automatically
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_INTEGRATIONS.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </div>

      {/* Mavenlink Mapping */}
      <MavenlinkMapping />

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
