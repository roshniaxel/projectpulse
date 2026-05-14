"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { IntegrationCard } from "@/components/settings/integration-card";
import { MavenlinkMapping } from "@/components/settings/mavenlink-mapping";
import { TimeTrackingPreferences } from "@/components/settings/time-tracking-preferences";
import { ConnectDialog } from "@/components/settings/connect-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useIntegrations } from "@/contexts/integrations-context";
import type { IntegrationSource } from "@/lib/types";
import { SOURCE_NAMES, CONNECT_METHOD } from "@/lib/constants";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const { integrations, refresh, disconnect } = useIntegrations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connectingSource, setConnectingSource] =
    useState<IntegrationSource | null>(null);

  // Handle OAuth callback flash params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("oauth_error");
    if (connected) {
      toast.success(`${SOURCE_NAMES[connected as IntegrationSource]} connected`);
      refresh();
      router.replace("/settings");
    } else if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      router.replace("/settings");
    }
  }, [searchParams, router, refresh]);

  const handleConnect = (source: IntegrationSource) => {
    const method = CONNECT_METHOD[source];
    if (method === "oauth_redirect") {
      // Jira → kick off the OAuth flow in the same tab
      window.location.href = `/api/integrations/${source}/oauth/start`;
    } else if (method === "auto_with_signin") {
      // Calendar inherits scopes from Google sign-in
      toast.info(
        "Google Calendar is connected during sign-in. Sign out and sign back in to grant Calendar access.",
        { duration: 6000 }
      );
    } else {
      // paste-token
      setConnectingSource(source);
    }
  };

  const handleDisconnect = async (source: IntegrationSource) => {
    await disconnect(source);
    toast.info(`${SOURCE_NAMES[source]} disconnected`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Integrations</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your tools to capture activities automatically. Until you connect a tool, no data from that source appears in your dashboard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              connectMethod={CONNECT_METHOD[integration.source]}
              onConnect={() => handleConnect(integration.source)}
              onDisconnect={() => handleDisconnect(integration.source)}
            />
          ))}
        </div>
      </div>

      {connectingSource && (
        <ConnectDialog
          source={connectingSource}
          open={!!connectingSource}
          onOpenChange={(o) => !o && setConnectingSource(null)}
          onConnected={refresh}
        />
      )}

      {integrations.find((i) => i.source === "mavenlink")?.connected && (
        <MavenlinkMapping />
      )}

      <TimeTrackingPreferences />

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
              Credentials are encrypted at rest using AES-256-GCM. Jira and Google Calendar use OAuth — we never see your password.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
