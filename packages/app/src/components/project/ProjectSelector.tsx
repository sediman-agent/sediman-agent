import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Plus, ChevronDown, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/useProjectStore';

const API_BASE = 'http://localhost:3001';

interface ServerProject {
  id: string;
  name: string;
  description?: string;
  headless: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectSelectorProps {
  className?: string;
  onProjectCreated?: (project: ServerProject) => void;
}

export function ProjectSelector({ className, onProjectCreated }: ProjectSelectorProps) {
  const projects = useProjectStore(state => state.projects);
  const activeProjectId = useProjectStore(state => state.activeProjectId);
  const createProject = useProjectStore(state => state.createProject);
  const setActiveProject = useProjectStore(state => state.setActiveProject);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingServer, setIsLoadingServer] = useState(false);
  const [serverProjects, setServerProjects] = useState<ServerProject[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load server projects on mount
  useEffect(() => {
    loadServerProjects();
  }, []);

  // Sync server projects with local store
  useEffect(() => {
    if (serverProjects.length > 0) {
      // Add server projects to local store if not already there
      serverProjects.forEach(serverProject => {
        const existsLocally = projects.find(p => p.id === serverProject.id);
        if (!existsLocally) {
          createProject(serverProject.name, serverProject.description || '');
        }
      });
    }
  }, [serverProjects]);

  const loadServerProjects = async () => {
    setIsLoadingServer(true);
    try {
      const response = await fetch(`${API_BASE}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        setServerProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingServer(false);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || serverProjects.find(p => p.id === activeProjectId);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowNewProject(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      // Create project on server
      const response = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectPath || `Project for ${newProjectName}`,
          headless: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const serverProject = result.project;

        // Create locally
        const localProject = createProject(newProjectName, newProjectPath || serverProject.description || '');
        setActiveProject(localProject.id);

        // Update server projects list
        setServerProjects(prev => [...prev, serverProject]);

        onProjectCreated?.(serverProject);

        setNewProjectName('');
        setNewProjectPath('');
        setShowNewProject(false);
        setIsOpen(false);
      } else {
        console.error('Failed to create project on server');
        // Create locally anyway
        const project = createProject(newProjectName, newProjectPath);
        setActiveProject(project.id);
        setNewProjectName('');
        setNewProjectPath('');
        setShowNewProject(false);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      // Create locally anyway on error
      const project = createProject(newProjectName, newProjectPath);
      setActiveProject(project.id);
      setNewProjectName('');
      setNewProjectPath('');
      setShowNewProject(false);
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          // If no projects, automatically open create form
          if (!isOpen && serverProjects.length === 0) {
            setShowNewProject(true);
          }
        }}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary hover:opacity-90 text-primary-foreground rounded transition-colors min-w-0 shadow-sm"
      >
        {isLoadingServer ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <FolderOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">
          {activeProject?.name || 'No Project'}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-background border border-border rounded shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Project list */}
          <div className="max-h-64 overflow-y-auto">
            {showNewProject ? (
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateProject();
                    }
                  }}
                />
                <input
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  placeholder="Description (optional)..."
                  className="w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || isCreating}
                    className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 rounded flex items-center justify-center gap-2"
                  >
                    {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewProject(false);
                      setNewProjectName('');
                      setNewProjectPath('');
                    }}
                    className="px-3 py-1.5 text-sm hover:bg-accent rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {filteredProjects.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'No projects found' : 'No projects yet'}
                  </div>
                ) : (
                  filteredProjects.map(project => {
                    const isActive = project.id === activeProjectId;
                    return (
                      <button
                        key={project.id}
                        onClick={() => {
                          setActiveProject(project.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors',
                          isActive && 'bg-accent'
                        )}
                      >
                        <FolderOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{project.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{project.path}</div>
                        </div>
                        {project.threads.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {project.threads.length} thread{project.threads.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}

                {/* New project button */}
                <button
                  onClick={() => setShowNewProject(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent/50 transition-colors border-t border-border"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>New Project</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
