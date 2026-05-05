"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MavenlinkWorkspace, MavenlinkProject, MavenlinkProjectMapping } from "@/lib/types";

function loadMappings(): MavenlinkProjectMapping[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("pp_mavenlink_mappings");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveMappings(mappings: MavenlinkProjectMapping[]) {
  localStorage.setItem("pp_mavenlink_mappings", JSON.stringify(mappings));
}

export function MavenlinkMapping() {
  const [workspaces, setWorkspaces] = useState<MavenlinkWorkspace[]>([]);
  const [projects, setProjects] = useState<MavenlinkProject[]>([]);
  const [mappings, setMappings] = useState<MavenlinkProjectMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMappings(loadMappings());

    fetch("/api/mavenlink/projects")
      .then((res) => res.json())
      .then((data) => {
        setWorkspaces(data.workspaces || []);
        setProjects(data.projects || []);
      })
      .catch(() => {
        toast.error("Failed to load Mavenlink projects");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const addMapping = () => {
    setMappings((prev) => [
      ...prev,
      { jiraProjectKey: "", mavenlinkWorkspaceId: "", mavenlinkProjectId: "" },
    ]);
  };

  const updateMapping = (index: number, updates: Partial<MavenlinkProjectMapping>) => {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  };

  const removeMapping = (index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    saveMappings(mappings);
    toast.success("Mavenlink mappings saved");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
            <span className="text-amber-700 text-xs font-bold">M</span>
          </div>
          Mavenlink Project Mapping
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Map Jira project keys to Mavenlink workspaces for timesheet push
        </p>
      </CardHeader>
      <CardContent>
        {mappings.length > 0 && (
          <div className="rounded-lg border overflow-hidden mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jira Project Key</TableHead>
                  <TableHead>Mavenlink Workspace</TableHead>
                  <TableHead>Mavenlink Project</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <input
                        type="text"
                        value={mapping.jiraProjectKey}
                        onChange={(e) =>
                          updateMapping(i, { jiraProjectKey: e.target.value })
                        }
                        placeholder="e.g. PROJ"
                        className="w-full text-sm border rounded px-2 py-1"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={mapping.mavenlinkWorkspaceId}
                        onChange={(e) =>
                          updateMapping(i, { mavenlinkWorkspaceId: e.target.value })
                        }
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        <option value="">Select workspace...</option>
                        {workspaces.map((ws) => (
                          <option key={ws.id} value={ws.id}>
                            {ws.title}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        value={mapping.mavenlinkProjectId}
                        onChange={(e) =>
                          updateMapping(i, { mavenlinkProjectId: e.target.value })
                        }
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        <option value="">Select project...</option>
                        {projects
                          .filter(
                            (p) =>
                              !mapping.mavenlinkWorkspaceId ||
                              p.workspaceId === mapping.mavenlinkWorkspaceId
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeMapping(i)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addMapping} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Mapping
          </Button>
          {mappings.length > 0 && (
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              Save Mappings
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
