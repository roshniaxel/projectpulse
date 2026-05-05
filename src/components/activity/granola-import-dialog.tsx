"use client";

import { useState } from "react";
import { NotebookPen, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Activity } from "@/lib/types";

interface GranolaImportDialogProps {
  onImport: (activities: Activity[]) => void;
}

export function GranolaImportDialog({ onImport }: GranolaImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!notes.trim()) {
      toast.error("Please paste your meeting notes");
      return;
    }

    setIsImporting(true);
    try {
      // Parse notes locally (could call API if Granola API is available)
      const lines = notes.split("\n").filter((l) => l.trim());
      const activities: Activity[] = [];
      let currentTitle = "";
      let currentDescription = "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) {
          if (currentTitle) {
            activities.push(createActivity(currentTitle, currentDescription));
          }
          currentTitle = trimmed.replace(/^#+\s*/, "");
          currentDescription = "";
        } else {
          currentDescription += (currentDescription ? "\n" : "") + trimmed;
        }
      }

      if (currentTitle) {
        activities.push(createActivity(currentTitle, currentDescription));
      }

      if (activities.length === 0 && notes.trim()) {
        activities.push(
          createActivity(
            notes.substring(0, 80) + (notes.length > 80 ? "..." : ""),
            notes
          )
        );
      }

      onImport(activities);
      toast.success(`Imported ${activities.length} meeting note${activities.length !== 1 ? "s" : ""}`);
      setNotes("");
      setOpen(false);
    } catch {
      toast.error("Failed to import notes");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50" />
        }
      >
        <NotebookPen className="w-3.5 h-3.5" />
        Import from Granola
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-teal-600" />
            Import Granola Notes
          </DialogTitle>
          <DialogDescription>
            Paste your Granola meeting notes below. Use # headings to separate different meetings.
          </DialogDescription>
        </DialogHeader>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`# Sprint Planning\nDiscussed priorities for next sprint...\n\n# 1:1 with Manager\nCareer growth discussion...`}
          className="w-full h-48 text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !notes.trim()}
            className="gap-1.5 bg-teal-600 hover:bg-teal-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Notes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function createActivity(title: string, description: string): Activity {
  return {
    id: `granola-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: "granola",
    type: "meeting_notes",
    title,
    description: description || undefined,
    timestamp: new Date().toISOString(),
    metadata: { tool: "Granola", type: "imported" },
  };
}
