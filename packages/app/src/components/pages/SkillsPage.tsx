import { useState, useEffect, useMemo } from 'react';
import { Trash2, Search, Package, Code, X, Folder, ExternalLink, Circle, Square } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { ScrollArea } from '@/components/shared/ScrollArea';
import { Badge } from '@/components/shared/Badge';
import { type Skill } from '@/types';
import { cn } from '@/lib/utils';

interface ServerRecordingSession {
  id: string;
  name: string;
  startedAt: string;
}

interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  sessionName: string;
  frameCount: number;
}

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'installed' | 'available'>('all');
  const [showCode, setShowCode] = useState<string | null>(null);
  const [codeContent, setCodeContent] = useState<string>('');
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    sessionId: null,
    sessionName: '',
    frameCount: 0,
  });
  const [activeSessions, setActiveSessions] = useState<ServerRecordingSession[]>([]);

  const apiBaseUrl = 'http://localhost:3001';

  // Load skills from server
  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      }
    } catch (error) {
      console.error('Failed to load skills:', error);
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load active recording sessions
  const loadActiveSessions = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/record/active`);
      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load active sessions:', error);
    }
  };

  useEffect(() => {
    loadSkills();
    loadActiveSessions();
    const interval = setInterval(loadActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'installed' && skill.installed) ||
      (filter === 'available' && !skill.installed);

    return matchesSearch && matchesFilter;
  });

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    for (const skill of filteredSkills) {
      const category = skill.category || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(skill);
    }
    return groups;
  }, [filteredSkills]);

  const handleStartRecording = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/record/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Recording ${new Date().toLocaleTimeString()}` }),
      });
      if (response.ok) {
        const result = await response.json();
        setRecording({
          isRecording: true,
          sessionId: result.id,
          sessionName: result.name,
          frameCount: 0,
        });
        loadActiveSessions();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    if (!recording.sessionId) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/record/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: recording.sessionId }),
      });
      if (response.ok) {
        const result = await response.json();
        setRecording({
          isRecording: false,
          sessionId: null,
          sessionName: '',
          frameCount: 0,
        });
        loadActiveSessions();

        if (result.skillCreated) {
          loadSkills();
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handleViewSkillCode = async (skillName: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/skills/${encodeURIComponent(skillName)}`);
      if (response.ok) {
        const skill = await response.json();
        if (skill.skill) {
          setCodeContent(JSON.stringify(skill.skill, null, 2));
          setShowCode(skillName);
        }
      }
    } catch (error) {
      console.error('Failed to load skill code:', error);
    }
  };

  const handleDeleteSkill = async (skillName: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/skills/${encodeURIComponent(skillName)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadSkills();
      }
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  const handleInstallSkill = async (skillName: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/hub/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: skillName }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.installed) {
          // Reload skills after installation
          loadSkills();
        } else {
          console.error('Install failed:', result.message);
        }
      } else {
        console.error('Install request failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to install skill:', error);
    }
  };

  const installedCount = skills.filter((s) => s.installed).length;
  const availableCount = skills.filter((s) => !s.installed).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <PageHeader
        icon={Package}
        title="Skills"
        subtitle="Manage agent skills and recordings"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{skills.length}</span>
            </div>
            {activeSessions.length > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                <Circle className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">{activeSessions.length} recording</span>
              </div>
            )}
          </div>
        }
      />

      {/* Search & Filter */}
      <div className="p-6 border-b border-border bg-background space-y-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="pl-9"
            />
          </div>
          <Button
            variant={recording.isRecording ? 'destructive' : 'default'}
            onClick={recording.isRecording ? handleStopRecording : handleStartRecording}
            className="flex items-center gap-2"
          >
            {recording.isRecording ? (
              <>
                <Square className="w-4 h-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Circle className="w-4 h-4" />
                Start Recording
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-2 max-w-4xl mx-auto">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({skills.length})
          </Button>
          <Button
            variant={filter === 'installed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('installed')}
          >
            Installed ({installedCount})
          </Button>
          <Button
            variant={filter === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('available')}
          >
            Available ({availableCount})
          </Button>
        </div>
      </div>

      {/* Active Recording Sessions */}
      {activeSessions.length > 0 && (
        <div className="px-6 py-3 bg-primary/5 border-b border-primary/20">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Circle className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">
              Active Recording: {activeSessions[0]?.name}
            </span>
            <span className="text-xs text-muted-foreground">
              ({recording.frameCount} frames captured)
            </span>
          </div>
        </div>
      )}

      {/* Skills List */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredSkills.length > 0 ? (
            <>
              {/* Available Skills Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Available Skills ({filteredSkills.length})</h2>
                  {skills.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Folder className="w-4 h-4" />
                      {Object.keys(skillsByCategory).length} categories
                    </div>
                  )}
                </div>

                {/* Display by category */}
                {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      {category}
                      <span className="text-xs">({categorySkills.length})</span>
                    </h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      {categorySkills.map((skill, index) => (
                        <div
                          key={skill.name}
                          className={cn(
                            "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                            index !== categorySkills.length - 1 && "border-b border-border"
                          )}
                        >
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted flex-shrink-0">
                            {skill.source ? (
                              <ExternalLink className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <Package className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground truncate">{skill.name}</h4>
                              {skill.version && (
                                <Badge variant="info" className="text-xs">
                                  v{skill.version}
                                </Badge>
                              )}
                              {skill.source && (
                                <Badge variant="default" className="text-xs">
                                  {skill.source.split('/')[0]}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {skill.description}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {!skill.installed && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleInstallSkill(skill.name)}
                              >
                                <Package className="w-3 h-3 mr-1" />
                                Install
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSkillCode(skill.name)}
                            >
                              <Code className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSkill(skill.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery || filter !== 'all'
                  ? 'No skills found matching your criteria'
                  : 'No skills available. Start recording to create skills!'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Code View Modal */}
      {showCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCode(null)}>
          <div className="w-full max-w-3xl mx-4 bg-card rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Skill: {showCode}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(codeContent);
                  }}
                >
                  <Code className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCode(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh] bg-muted">
              <pre className="text-sm font-mono p-4 rounded-lg bg-background text-foreground overflow-x-auto">
                {codeContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
