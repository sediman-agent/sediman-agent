import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Thread, ThreadMessage, ProjectFile, GitStatus } from '@/types/project';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;

  // Getters
  getActiveProject: () => Project | null;
  getActiveThread: () => Thread | null;

  // Project actions
  createProject: (name: string, path: string) => Project;
  deleteProject: (projectId: string) => void;
  setActiveProject: (projectId: string | null) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  syncProjectFromServer: (serverProject: any) => void;

  // Thread actions
  createThread: (projectId: string, title: string) => Thread;
  deleteThread: (projectId: string, threadId: string) => void;
  setActiveThread: (projectId: string, threadId: string) => void;
  addThreadMessage: (projectId: string, threadId: string, message: ThreadMessage) => void;
  updateThreadMessage: (projectId: string, threadId: string, messageId: string, updates: Partial<ThreadMessage>) => void;
  updateThreadStatus: (projectId: string, threadId: string, status: Thread['status']) => void;

  // File actions
  updateProjectFiles: (projectId: string, files: ProjectFile[]) => void;
  updateGitStatus: (projectId: string, gitStatus: GitStatus) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find(p => p.id === activeProjectId) || null;
      },

      getActiveThread: () => {
        const project = get().getActiveProject();
        if (!project?.activeThreadId) return null;
        return project.threads.find(t => t.id === project.activeThreadId) || null;
      },

      createProject: (name, path) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          name,
          path,
          createdAt: new Date(),
          updatedAt: new Date(),
          threads: [],
          files: [],
          gitBranch: 'main',
          gitStatus: 'clean',
        };

        set(state => ({
          projects: [...state.projects, newProject],
          activeProjectId: newProject.id,
        }));

        return newProject;
      },

      deleteProject: (projectId) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          activeProjectId: state.activeProjectId === projectId ? null : state.activeProjectId,
        }));
      },

      setActiveProject: (projectId) => {
        set({ activeProjectId: projectId });
      },

      updateProject: (projectId, updates) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }));
      },

      syncProjectFromServer: (serverProject) => {
        const projectData: Project = {
          id: serverProject.id,
          name: serverProject.name,
          path: serverProject.description || '',
          createdAt: new Date(serverProject.created_at),
          updatedAt: new Date(serverProject.updated_at),
          threads: [],
          files: [],
          gitBranch: 'main',
          gitStatus: 'clean',
        };

        set(state => {
          const exists = state.projects.find(p => p.id === projectData.id);
          if (exists) {
            // Update existing project
            return {
              projects: state.projects.map(p =>
                p.id === projectData.id ? { ...p, ...projectData, threads: p.threads } : p
              ),
            };
          } else {
            // Add new project
            return {
              projects: [...state.projects, projectData],
            };
          }
        });
      },

      createThread: (projectId, title) => {
        const newThread: Thread = {
          id: crypto.randomUUID(),
          title,
          status: 'idle',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
          relatedFiles: [],
        };

        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, threads: [...p.threads, newThread], activeThreadId: newThread.id, updatedAt: new Date() }
              : p
          ),
        }));

        return newThread;
      },

      deleteThread: (projectId, threadId) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  threads: p.threads.filter(t => t.id !== threadId),
                  activeThreadId: p.activeThreadId === threadId ? undefined : p.activeThreadId,
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
      },

      setActiveThread: (projectId, threadId) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, activeThreadId: threadId, updatedAt: new Date() }
              : p
          ),
        }));
      },

      addThreadMessage: (projectId, threadId, message) => {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;

            return {
              ...p,
              threads: p.threads.map(t => {
                if (t.id !== threadId) return t;

                return {
                  ...t,
                  messages: [...t.messages, message],
                  updatedAt: new Date(),
                };
              }),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      updateThreadMessage: (projectId, threadId, messageId, updates) => {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;

            return {
              ...p,
              threads: p.threads.map(t => {
                if (t.id !== threadId) return t;

                return {
                  ...t,
                  messages: t.messages.map(m =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                  updatedAt: new Date(),
                };
              }),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      updateThreadStatus: (projectId, threadId, status) => {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;

            return {
              ...p,
              threads: p.threads.map(t =>
                t.id === threadId ? { ...t, status, updatedAt: new Date() } : t
              ),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      updateProjectFiles: (projectId, files) => {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId
              ? { ...p, files, updatedAt: new Date() }
              : p
          ),
        }));
      },

      updateGitStatus: (projectId, gitStatus) => {
        set(state => ({
          projects: state.projects.map(p => {
            if (p.id !== projectId) return p;

            let gitStatusValue: Project['gitStatus'] = 'clean';
            if (gitStatus.conflicted.length > 0) {
              gitStatusValue = 'conflict';
            } else if (gitStatus.modified.length > 0 || gitStatus.staged.length > 0) {
              gitStatusValue = 'modified';
            } else if (gitStatus.ahead > 0 && gitStatus.behind > 0) {
              gitStatusValue = 'diverged';
            }

            return {
              ...p,
              gitBranch: gitStatus.branch,
              gitStatus: gitStatusValue,
              updatedAt: new Date(),
            };
          }),
        }));
      },
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);
