"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { JiraProject } from "@/lib/types";

interface ProjectContextValue {
  projects: JiraProject[];
  selectedProject: JiraProject | null;
  setSelectedProject: (project: JiraProject | null) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  selectedProject: null,
  setSelectedProject: () => {},
  isLoading: true,
  error: null,
  refetch: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jira/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      const fetchedProjects: JiraProject[] = data.projects || [];
      setProjects(fetchedProjects);

      // Restore last selection from localStorage
      const savedKey = localStorage.getItem("pp_selected_project");
      if (savedKey) {
        const found = fetchedProjects.find((p) => p.key === savedKey);
        if (found) setSelectedProject(found);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Persist selection
  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem("pp_selected_project", selectedProject.key);
    } else {
      localStorage.removeItem("pp_selected_project");
    }
  }, [selectedProject]);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        isLoading,
        error,
        refetch: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
