"use client";

import { Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GenerationStep, TimesheetState } from "@/lib/types";

interface GenerateButtonProps {
  state: TimesheetState;
  steps: GenerationStep[];
  onGenerate: () => void;
}

export function GenerateButton({
  state,
  steps,
  onGenerate,
}: GenerateButtonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 mb-6">
        <Sparkles className="w-10 h-10 text-violet-600" />
      </div>

      <h2 className="text-2xl font-bold tracking-tight mb-2">
        Generate Your Timesheet
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Claude will analyze your captured activities and generate a draft timesheet grouped by ticket and project.
      </p>

      <Button
        size="lg"
        onClick={onGenerate}
        disabled={state === "generating"}
        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-12 px-8 text-base"
      >
        {state === "generating" ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Timesheet
          </>
        )}
      </Button>

      {/* Progress steps */}
      {state === "generating" && (
        <div className="mt-8 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.status === "done" ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : step.status === "active" ? (
                <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
              )}
              <span
                className={`text-sm ${
                  step.status === "done"
                    ? "text-emerald-600"
                    : step.status === "active"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
