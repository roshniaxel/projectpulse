"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TimeTrackingPreferences() {
  const [autoPush, setAutoPush] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((d) => setAutoPush(!!d.autoPushClaudeTime))
      .catch(() => toast.error("Failed to load preferences"))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setAutoPush(next);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPushClaudeTime: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        next
          ? "Claude Code time will auto-push to Jira"
          : "Claude Code time will be saved as drafts"
      );
    } catch {
      setAutoPush(!next);
      toast.error("Failed to update preference");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              Auto-push Claude Code time to Jira
            </div>
            <div className="text-xs text-muted-foreground">
              When on, time tracked by <code>scripts/track-time.sh</code> is logged as a Jira worklog the moment the session ends. When off, entries land in the Tools Time page as drafts for you to approve.
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoPush}
            disabled={loading || saving}
            onChange={(e) => toggle(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300"
          />
        </label>
      </CardContent>
    </Card>
  );
}
