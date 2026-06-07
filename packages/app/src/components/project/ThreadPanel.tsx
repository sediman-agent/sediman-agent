import { useState } from 'react';
import { Plus, Trash2, Play, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/stores/useProjectStore';
import type { Thread } from '@/types/project';

interface ThreadPanelProps {
  className?: string;
}

export function ThreadPanel({ className }: ThreadPanelProps) {
  const activeProject = useProjectStore(state => state.getActiveProject());
  const createThread = useProjectStore(state => state.createThread);
  const deleteThread = useProjectStore(state => state.deleteThread);
  const setActiveThread = useProjectStore(state => state.setActiveThread);

  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  if (!activeProject) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        <p>No active project</p>
      </div>
    );
  }

  const handleCreateThread = () => {
    const thread = createThread(activeProject.id, `Thread ${activeProject.threads.length + 1}`);
    setExpandedThreads(prev => new Set(prev).add(thread.id));
  };

  const getStatusIcon = (status: Thread['status']) => {
    switch (status) {
      case 'running':
        return <Play className="w-3 h-3 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const toggleExpanded = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-bold uppercase tracking-wider">Threads</span>
        <button
          onClick={handleCreateThread}
          className="p-1 hover:bg-accent rounded"
          title="Create new thread"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {activeProject.threads.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No threads yet</p>
            <p className="text-xs mt-1">Create a thread to start working</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeProject.threads.map(thread => {
              const isActive = thread.id === activeProject.activeThreadId;
              const isExpanded = expandedThreads.has(thread.id);

              return (
                <div key={thread.id} className="group">
                  {/* Thread header */}
                  <button
                    onClick={() => {
                      setActiveThread(activeProject.id, thread.id);
                      toggleExpanded(thread.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors',
                      isActive && 'bg-accent'
                    )}
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    {getStatusIcon(thread.status)}
                    <span className="flex-1 text-xs truncate">{thread.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {thread.messages.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(activeProject.id, thread.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-opacity"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>

                  {/* Expanded messages preview */}
                  {isExpanded && (
                    <div className="pl-9 pr-3 pb-2 space-y-1">
                      {thread.messages.slice(-3).map(msg => (
                        <div
                          key={msg.id}
                          className="text-xs text-muted-foreground truncate opacity-70"
                        >
                          <span className="font-medium">{msg.role}:</span> {msg.content}
                        </div>
                      ))}
                      {thread.messages.length > 3 && (
                        <div className="text-xs text-muted-foreground opacity-50">
                          ... and {thread.messages.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="border-t border-border p-2">
        <button
          onClick={handleCreateThread}
          className="w-full px-3 py-2 text-xs bg-primary text-primary-foreground hover:opacity-90 rounded"
        >
          New Thread
        </button>
      </div>
    </div>
  );
}
