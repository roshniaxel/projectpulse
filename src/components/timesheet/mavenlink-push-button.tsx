"use client";

import { useState } from "react";
import { FolderClock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TimeEntry, PushResult } from "@/lib/types";

interface MavenlinkPushButtonProps {
  entries: TimeEntry[];
  onPushComplete: (result: PushResult) => void;
}

export function MavenlinkPushButton({
  entries,
  onPushComplete,
}: MavenlinkPushButtonProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [pushed, setPushed] = useState(false);

  const submittedEntries = entries.filter((e) => e.status === "submitted");
  const alreadyPushed = submittedEntries.every((e) => e.pushedAt);

  if (alreadyPushed && pushed) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 text-emerald-600">
        <CheckCircle className="w-4 h-4" />
        Pushed to Mavenlink
      </Button>
    );
  }

  const handlePush = async () => {
    setIsPushing(true);
    try {
      const res = await fetch("/api/mavenlink/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: submittedEntries }),
      });

      if (!res.ok) throw new Error("Push failed");

      const result: PushResult = await res.json();

      if (result.success) {
        toast.success("Pushed to Mavenlink", {
          description: `${result.pushed} time entries synced successfully`,
        });
        setPushed(true);
        onPushComplete(result);
      } else {
        toast.error("Partial push to Mavenlink", {
          description: `${result.pushed} pushed, ${result.failed} failed`,
        });
        onPushComplete(result);
      }
    } catch (error) {
      toast.error("Failed to push to Mavenlink", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePush}
      disabled={isPushing || submittedEntries.length === 0}
      className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
    >
      {isPushing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Pushing...
        </>
      ) : (
        <>
          <FolderClock className="w-4 h-4" />
          Push to Mavenlink
        </>
      )}
    </Button>
  );
}
