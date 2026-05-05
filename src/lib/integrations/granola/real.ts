import type { Activity } from "@/lib/types";
import type { IGranolaConnector } from "./connector";

// Granola does not have a public API yet.
// This connector supports manual import of meeting notes
// and can be extended with webhook support when available.

export class RealGranolaConnector implements IGranolaConnector {
  readonly source = "granola" as const;

  async testConnection() {
    // No API to test — always return ok for manual import mode
    return { ok: true };
  }

  async fetchActivities(): Promise<Activity[]> {
    // No polling API available — activities come from importNotes or webhooks
    return [];
  }

  async importNotes(notes: string): Promise<Activity[]> {
    // Parse pasted meeting notes into activities
    const lines = notes.split("\n").filter((l) => l.trim());
    const activities: Activity[] = [];
    let currentTitle = "";
    let currentDescription = "";

    for (const line of lines) {
      const trimmed = line.trim();
      // Lines starting with # or ## are meeting titles
      if (trimmed.startsWith("#")) {
        if (currentTitle) {
          activities.push(this.createActivity(currentTitle, currentDescription));
        }
        currentTitle = trimmed.replace(/^#+\s*/, "");
        currentDescription = "";
      } else {
        currentDescription += (currentDescription ? "\n" : "") + trimmed;
      }
    }

    // Last meeting
    if (currentTitle) {
      activities.push(this.createActivity(currentTitle, currentDescription));
    }

    // If no headings found, treat the whole thing as one note
    if (activities.length === 0 && notes.trim()) {
      activities.push(
        this.createActivity(
          notes.substring(0, 80) + (notes.length > 80 ? "..." : ""),
          notes
        )
      );
    }

    return activities;
  }

  private createActivity(title: string, description: string): Activity {
    return {
      id: `granola-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: "granola",
      type: "meeting_notes",
      title,
      description: description || undefined,
      timestamp: new Date().toISOString(),
      metadata: { tool: "Granola", type: "meeting_notes" },
    };
  }
}
