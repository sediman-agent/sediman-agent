import { useState, useEffect } from 'react';
import { History, Trash2, Plus, MessageSquare, Search, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/elements/actions/Button';
import { Input } from '@/elements/form/Input';
import { Card, CardContent, CardDescription, CardTitle } from '@/elements/data/Card';
import { ScrollArea } from '@/elements/data/ScrollArea';
import { Badge } from '@/elements/feedback/Badge';
import { useChatStore } from '@/stores/useChatStore';

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
  status: 'active' | 'archived';
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  const conversations = useChatStore((state) => state.conversations);
  const createConversation = useChatStore((state) => state.createConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const activeConversationId = useChatStore((state) => state.activeConversationId);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      // Convert conversations to sessions format
      const sessionData: Session[] = conversations.map(conv => ({
        id: conv.id,
        title: conv.title || 'Untitled',
        createdAt: conv.createdAt instanceof Date ? conv.createdAt.toISOString() : conv.createdAt,
        updatedAt: conv.updatedAt instanceof Date ? conv.updatedAt.toISOString() : conv.updatedAt,
        messageCount: conv.messages.length,
        lastMessage: conv.messages[conv.messages.length - 1]?.content || '',
        status: conv.id === activeConversationId ? 'active' : 'archived'
      }));
      setSessions(sessionData);
    } catch {
      console.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSession = () => {
    const newConv = createConversation('New Session');
    selectConversation(newConv.id);
    // Navigate to agent page
    window.dispatchEvent(new CustomEvent('navigate-to-agent'));
  };

  const handleSelectSession = (sessionId: string) => {
    selectConversation(sessionId);
    // Navigate to agent page
    window.dispatchEvent(new CustomEvent('navigate-to-agent'));
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteSession = async (sessionId: string) => {
    if (confirmDeleteId !== sessionId) {
      setConfirmDeleteId(sessionId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    setConfirmDeleteId(null);
    deleteConversation(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch =
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.lastMessage && session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && session.status === 'active') ||
      (filter === 'archived' && session.status === 'archived');

    return matchesSearch && matchesFilter;
  });

  const activeCount = sessions.filter(s => s.status === 'active').length;
  const archivedCount = sessions.filter(s => s.status === 'archived').length;

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        icon={History}
        title="Sessions"
        subtitle="Manage chat sessions"
        actions={
          <Button size="sm" onClick={handleCreateSession}>
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        }
      />

      {/* Search & Filter */}
      <div className="p-6 border-b border-border bg-background space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({sessions.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={filter === 'archived' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('archived')}
          >
            Archived ({archivedCount})
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filter !== 'all' ? 'No sessions found' : 'No sessions yet'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Button size="sm" onClick={handleCreateSession}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Session
              </Button>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-6 space-y-3">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  session.status === 'active' ? 'border-primary' : ''
                }`}
                onClick={() => handleSelectSession(session.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate">{session.title}</CardTitle>
                          <Badge
                            variant={session.status === 'active' ? 'default' : 'info'}
                          className="text-xs"
                          >
                            {session.status}
                          </Badge>
                        </div>
                        {session.lastMessage && (
                          <CardDescription className="text-sm line-clamp-1 mt-1">
                            {session.lastMessage}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{session.messageCount} messages</div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant={confirmDeleteId === session.id ? 'destructive' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
