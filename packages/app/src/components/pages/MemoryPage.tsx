import { useState, useEffect } from 'react';
import { Database, Trash2, Search, Clock, Tag } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/elements/actions/Button';
import { Input } from '@/elements/form/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/elements/data/Card';
import { ScrollArea } from '@/elements/data/ScrollArea';
import { Badge } from '@/elements/feedback/Badge';
import { toast } from 'sonner';

interface MemoryEntry {
  id: string;
  content: string;
  timestamp: string;
  type: string;
  importance?: number;
  metadata?: Record<string, unknown>;
}

export function MemoryPage() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/memory', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch {
      console.log('Server not available');
      setMemories([
        {
          id: '1',
          content: 'Example: User asked about Python test migration',
          timestamp: new Date().toISOString(),
          type: 'conversation',
          importance: 0.8,
          metadata: { category: 'task' }
        },
        {
          id: '2',
          content: 'Example: Fixed Electron build errors',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'development',
          importance: 0.9,
          metadata: { category: 'bug-fix' }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/memory/${id}`, {
        method: 'DELETE',
      });
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch {
      console.error('Failed to delete memory');
    }
  };

  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    try {
      await fetch('http://localhost:3001/api/memory/clear', {
        method: 'POST',
      });
      setMemories([]);
      toast.success('All memories cleared');
    } catch {
      console.error('Failed to clear memories');
      toast.error('Failed to clear memories');
    }
  };

  const filteredMemories = memories.filter(memory =>
    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    memory.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMemories = filteredMemories.reduce((acc, memory) => {
    const type = memory.type || 'general';
    if (!acc[type]) acc[type] = [];
    acc[type].push(memory);
    return acc;
  }, {} as Record<string, MemoryEntry[]>);

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        icon={Database}
        title="Memory"
        subtitle="Agent memory and context"
        actions={
          <Button
            variant={confirmClear ? 'destructive' : 'outline'}
            size="sm"
            onClick={handleClear}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {confirmClear ? 'Confirm Clear All' : 'Clear All'}
          </Button>
        }
      />

      {/* Search */}
      <div className="px-6 py-4 border-b border-border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Database className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No memories found' : 'No memories yet'}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{memories.length}</div>
                  <div className="text-xs text-muted-foreground">Total Memories</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {Object.keys(groupedMemories).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Types</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {memories.filter(m => (m.importance || 0) > 0.7).length}
                  </div>
                  <div className="text-xs text-muted-foreground">High Importance</div>
                </CardContent>
              </Card>
            </div>

            {/* Grouped Memories */}
            {Object.entries(groupedMemories).map(([type, typeMemories]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                    {type}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({typeMemories.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {typeMemories.map((memory) => (
                    <Card
                      key={memory.id}
                      className="group cursor-pointer hover:border-primary/50"
                      onClick={() => setSelectedMemory(memory)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{memory.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="info">{type}</Badge>
                              {memory.importance && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(memory.importance * 100)}% importance
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(memory.timestamp).toLocaleString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(memory.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedMemory(null)}>
          <div className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Memory Details</CardTitle>
                    <CardDescription>
                      {selectedMemory.type} • {new Date(selectedMemory.timestamp).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMemory(null)}>
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <p className="text-sm bg-muted p-3 rounded-md">{selectedMemory.content}</p>
                </div>
                {selectedMemory.importance && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Importance</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${selectedMemory.importance * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(selectedMemory.importance * 100)}%
                      </span>
                    </div>
                  </div>
                )}
                {selectedMemory.metadata && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Metadata</label>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedMemory.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
