import type { Activity } from "@/lib/types";
import type { IGranolaConnector } from "./connector";

const TODAY = "2026-04-29";

const MOCK_GRANOLA_ACTIVITIES: Activity[] = [
  {
    id: "granola-1",
    source: "granola",
    type: "meeting_notes",
    title: "Sprint 14 Planning — AI Summary",
    description:
      "Key decisions: Prioritize PROJ-142 auth fix before new features. PROJ-145 moved to next sprint if blocked. Action items: Sarah to unblock PROJ-98, Alex to pick up PROJ-155.",
    timestamp: `${TODAY}T09:50:00Z`,
    metadata: { tool: "Granola", type: "meeting_notes" },
    durationMinutes: 45,
  },
  {
    id: "granola-2",
    source: "granola",
    type: "meeting_notes",
    title: "1:1 with Sarah — Key Takeaways",
    description:
      "Career growth: targeting senior promotion in Q3. Action items: complete migration design doc by May 5. Sarah to schedule skip-level with VP Eng.",
    timestamp: `${TODAY}T12:50:00Z`,
    metadata: { tool: "Granola", type: "meeting_notes" },
    durationMinutes: 30,
  },
];

export class MockGranolaConnector implements IGranolaConnector {
  readonly source = "granola" as const;

  async testConnection() {
    return { ok: true };
  }

  async fetchActivities(): Promise<Activity[]> {
    return MOCK_GRANOLA_ACTIVITIES;
  }

  async importNotes(notes: string): Promise<Activity[]> {
    return [
      {
        id: `granola-import-${Date.now()}`,
        source: "granola",
        type: "meeting_notes",
        title: notes.substring(0, 80) + (notes.length > 80 ? "..." : ""),
        description: notes,
        timestamp: new Date().toISOString(),
        metadata: { tool: "Granola", type: "imported" },
      },
    ];
  }
}
