"use client";

import { useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CheckResult = {
  ticketKey: string;
  hasEstimate: boolean;
  estimateSec: number | null;
  requiresEstimateConfirm: boolean;
};

export function StartWorkDialog({
  ticketKey,
  ticketSummary,
  open,
  onOpenChange,
  onStarted,
}: {
  ticketKey: string;
  ticketSummary?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (ticketKey: string) => void;
}) {
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState("");
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [mode, setMode] = useState<"check" | "addEstimate">("check");

  // Lazily run the check whenever the dialog opens with this ticket
  if (open && !check && !loading) {
    setLoading(true);
    fetch("/api/jira/start-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketKey }),
    })
      .then((r) => r.json())
      .then((data: CheckResult) => setCheck(data))
      .catch(() => toast.error("Failed to check ticket estimate"))
      .finally(() => setLoading(false));
  }

  function reset() {
    setCheck(null);
    setEstimate("");
    setMode("check");
  }

  async function proceed() {
    // Kick off a ToolSession so the very first tick is captured immediately.
    try {
      await fetch("/api/tool-sessions/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketKey, description: `Start work on ${ticketKey}` }),
      });
      toast.success(`Started tracking ${ticketKey}`);
    } catch {
      toast.error("Started, but failed to record first tick");
    }
    onStarted(ticketKey);
    reset();
    onOpenChange(false);
  }

  async function saveEstimateAndProceed() {
    if (!estimate.trim()) {
      toast.error("Enter an estimate, e.g. '2h 30m'");
      return;
    }
    setSavingEstimate(true);
    try {
      const res = await fetch(`/api/jira/tickets/${ticketKey}/estimate/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalEstimate: estimate.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to set estimate");
      }
      toast.success(`Estimate set on ${ticketKey}`);
      proceed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set estimate");
    } finally {
      setSavingEstimate(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start work on {ticketKey}</DialogTitle>
          {ticketSummary && (
            <DialogDescription>{ticketSummary}</DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="text-sm text-muted-foreground py-4">
            Checking ticket estimate…
          </div>
        )}

        {!loading && check && check.hasEstimate && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
            <Clock className="w-4 h-4 mt-0.5 text-emerald-600" />
            <div>
              <div className="font-medium text-emerald-900">
                Estimate set: {Math.round((check.estimateSec || 0) / 36) / 100}h
              </div>
              <div className="text-emerald-700">
                Ready to start tracking time.
              </div>
            </div>
          </div>
        )}

        {!loading && check && !check.hasEstimate && mode === "check" && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600" />
            <div>
              <div className="font-medium text-amber-900">
                No estimate set on this ticket
              </div>
              <div className="text-amber-700">
                You can proceed without one, or add an estimate before starting.
              </div>
            </div>
          </div>
        )}

        {!loading && check && !check.hasEstimate && mode === "addEstimate" && (
          <div className="space-y-2">
            <Label htmlFor="estimate">Original estimate</Label>
            <Input
              id="estimate"
              placeholder="e.g. 2h 30m"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use Jira format: <code>1w 2d 3h 4m</code>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>

          {!loading && check && check.hasEstimate && (
            <Button onClick={proceed}>Start tracking</Button>
          )}

          {!loading && check && !check.hasEstimate && mode === "check" && (
            <>
              <Button variant="outline" onClick={() => setMode("addEstimate")}>
                Add estimate
              </Button>
              <Button onClick={proceed}>Proceed anyway</Button>
            </>
          )}

          {!loading && check && !check.hasEstimate && mode === "addEstimate" && (
            <Button onClick={saveEstimateAndProceed} disabled={savingEstimate}>
              {savingEstimate ? "Saving…" : "Save & start"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
