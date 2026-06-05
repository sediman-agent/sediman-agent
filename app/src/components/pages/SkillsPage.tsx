import { useState, useEffect } from 'react';
import { Download, Trash2, Search, Package, Clock, Code, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/Card';
import { ScrollArea } from '@/components/shared/ScrollArea';
import { SkeletonCard } from '@/components/shared/Skeleton';
import { type Skill } from '@/types';
import { skillRecordingService, RecordedSkill } from '@/services/skills';

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [recordedSkills, setRecordedSkills] = useState<RecordedSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'installed' | 'available' | 'recorded'>('all');
  const [showCode, setShowCode] = useState<RecordedSkill | null>(null);

  useEffect(() => {
    // Load skills
    const loadSkills = async () => {
      setIsLoading(true);
      try {
        // Load backend skills (existing code)
        setSkills([]);

        // Load recorded skills
        const recorded = skillRecordingService.getAllSkills();
        setRecordedSkills(recorded);
      } catch (error) {
        console.error('Failed to load skills:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSkills();

    // Listen for skill updates
    const handleSkillUpdate = () => {
      setRecordedSkills(skillRecordingService.getAllSkills());
    };

    skillRecordingService.on('recording-stopped', handleSkillUpdate);
    skillRecordingService.on('skill-imported', handleSkillUpdate);

    return () => {
      skillRecordingService.off('recording-stopped', handleSkillUpdate);
      skillRecordingService.off('skill-imported', handleSkillUpdate);
    };
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

  const filteredRecordedSkills = recordedSkills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch && (filter === 'all' || filter === 'recorded');
  });

  const handleInstall = (skillId: string) => {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.id === skillId ? { ...skill, installed: true } : skill
      )
    );
  };

  const handleUninstall = (skillId: string) => {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.id === skillId ? { ...skill, installed: false } : skill
      )
    );
  };

  const handleDeleteRecorded = (skillId: string) => {
    skillRecordingService.deleteSkill(skillId);
    setRecordedSkills(prev => prev.filter(s => s.id !== skillId));
  };

  const handleViewCode = (skill: RecordedSkill) => {
    setShowCode(skill);
  };

  const installedCount = skills.filter((s) => s.installed).length;
  const availableCount = skills.filter((s) => !s.installed).length;
  const recordedCount = recordedSkills.length;

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      {/* Header */}
      <PageHeader
        icon={Package}
        title="Skills"
        subtitle="Extend OpenSkynet capabilities"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{skills.length + recordedCount}</span>
            </div>
            {recordedCount > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{recordedCount} recorded</span>
              </div>
            )}
          </div>
        }
      />

      {/* Search & Filter */}
      <div className="p-6 border-b border-border bg-background space-y-4">
        <div className="relative max-w-3xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 max-w-3xl mx-auto">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({skills.length + recordedCount})
          </Button>
          {recordedCount > 0 && (
            <Button
              variant={filter === 'recorded' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('recorded')}
              className="text-blue-600 border-blue-200"
            >
              <Clock className="w-3 h-3 mr-1" />
              Recorded ({recordedCount})
            </Button>
          )}
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

      {/* Skills Grid */}
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} showAvatar={false} />
              ))}
            </div>
          ) : filteredRecordedSkills.length > 0 || filteredSkills.length > 0 ? (
            <>
              {/* Recorded Skills Section */}
              {filteredRecordedSkills.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                    Recorded Skills
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredRecordedSkills.map((skill) => (
                      <Card key={skill.id} className="group overflow-hidden" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--muted))' }}>
                                <Clock className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
                              </div>
                              <div className="min-w-0">
                                <CardTitle className="text-base truncate">{skill.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)' }}>
                                    {skill.actions.length} actions
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <CardDescription className="text-sm line-clamp-2 mt-2">
                            {skill.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                          {/* Category */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2.5 py-1 rounded-md border capitalize" style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--border))' }}>
                              {skill.category}
                            </span>
                            {skill.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2.5 py-1 rounded-md border"
                                style={{ background: 'hsl(var(--background))', color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Created date */}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(skill.createdAt).toLocaleDateString()}</span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleViewCode(skill)}
                            >
                              <Code className="w-3 h-3 mr-1" />
                              View Code
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecorded(skill.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Backend Skills Section */}
              {filteredSkills.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Available Skills</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredSkills.map((skill) => (
                      <Card key={skill.id} className="group overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{skill.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              v{skill.version}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-sm line-clamp-2 mt-2">
                      {skill.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {skill.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md border border-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Author */}
                    {skill.author && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span>by</span>
                        <span className="font-medium text-foreground">{skill.author}</span>
                      </div>
                    )}

                          {/* Action Button */}
                          <Button
                            variant={skill.installed ? 'outline' : 'default'}
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              skill.installed
                                ? handleUninstall(skill.id)
                                : handleInstall(skill.id)
                            }
                          >
                            {skill.installed ? (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Uninstall
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Install
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery || filter !== 'all'
                  ? 'No skills found matching your criteria'
                  : 'No skills available. Record your first skill using the browser!'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Code View Modal */}
      {showCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{showCode.name}</h3>
                <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{showCode.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCode(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
              </Button>
            </div>
            <div className="p-6 overflow-auto max-h-[60hv]" style={{ background: 'hsl(var(--muted))' }}>
              <pre className="text-sm font-mono p-4 rounded-lg overflow-x-auto" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
                {skillRecordingService.skillToExecutable(showCode)}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <Button
                variant="ghost"
                onClick={() => setShowCode(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const code = skillRecordingService.skillToExecutable(showCode);
                  navigator.clipboard.writeText(code);
                }}
              >
                <Code className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
