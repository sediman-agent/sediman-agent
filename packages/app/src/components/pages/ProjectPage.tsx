import { useState, useRef, useEffect } from 'react';
import { Monitor, Paperclip, Send, Columns, Loader2, Globe, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRPCConnection } from '@/hooks/useRPCConnection';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useProjectStore } from '@/stores/useProjectStore';
import { useAppStore } from '@/stores/useAppStore';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { getChatService } from '@/services/chatService';
import { ProjectSelector } from '@/components/project/ProjectSelector';
import { ThreadPanel } from '@/components/project/ThreadPanel';
import { VisualDiff } from '@/components/project/VisualDiff';
import { ContextWindow } from '@/components/project/ContextWindow';
import { GitStatus } from '@/components/project/GitStatus';
import { StreamingIndicator } from '@/components/agent/StreamingIndicator';
import type { ThreadMessage, ProjectFile } from '@/types/project';

const API_BASE = 'http://localhost:3001';

interface ServerProject {
  id: string;
  name: string;
  description?: string;
  headless: boolean;
  created_at: string;
  updated_at: string;
}

export function ProjectPage() {
  const activeProject = useProjectStore(state => state.getActiveProject());
  const activeThread = useProjectStore(state => state.getActiveThread());
  const createThread = useProjectStore(state => state.createThread);
  const setActiveThread = useProjectStore(state => state.setActiveThread);
  const addThreadMessage = useProjectStore(state => state.addThreadMessage);
  const updateThreadMessage = useProjectStore(state => state.updateThreadMessage);
  const updateThreadStatus = useProjectStore(state => state.updateThreadStatus);
  const updateProjectFiles = useProjectStore(state => state.updateProjectFiles);

  const agentStatus = useAppStore(state => state.agentStatus);
  const model = useAppStore(state => state.model);
  const provider = useAppStore(state => state.provider);

  const sandboxOpen = useSandboxStore(state => state.isOpen);
  const sandboxActive = useSandboxStore(state => state.isActive);
  const toggleSandbox = useSandboxStore(state => state.togglePanel);
  const setIsActive = useSandboxStore(state => state.setIsActive);

  useRPCConnection();

  // Local state
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying'>('thinking');
  const [retryProgress, setRetryProgress] = useState<{ attempt: number; max: number; countdown: number } | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'chat' | 'diff'>('split');
  const [contextUsed, setContextUsed] = useState(0);
  const [contextMax] = useState(200000);
  const [serverProjects, setServerProjects] = useState<ServerProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isStartingBrowser, setIsStartingBrowser] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load projects from server
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const response = await fetch(`${API_BASE}/api/projects`);
        if (response.ok) {
          const data = await response.json();
          setServerProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Sync messages from active thread
  useEffect(() => {
    if (activeThread) {
      setMessages(activeThread.messages);
    } else if (activeProject) {
      // Create initial thread if none exists
      const thread = createThread(activeProject.id, 'Main Thread');
      setActiveThread(activeProject.id, thread.id);
    }
  }, [activeProject?.id, activeThread?.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Simulate context usage
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setContextUsed(prev => Math.min(prev + 1000, contextMax));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText || !activeProject || !activeThread || isStreaming) return;

    if (!agentStatus.rpcConnected) {
      // Add user message
      const userMsg: ThreadMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageText,
        status: 'done',
        timestamp: new Date(),
      };
      addThreadMessage(activeProject.id, activeThread.id, userMsg);
      setMessages(prev => [...prev, userMsg]);

      // Add error message
      const errorMsg: ThreadMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Backend disconnected. Run: bun run backend',
        status: 'error',
        timestamp: new Date(),
      };
      addThreadMessage(activeProject.id, activeThread.id, errorMsg);
      setMessages(prev => [...prev, errorMsg]);

      setInput('');
      return;
    }

    setInput('');

    // Add user message
    const userMsgId = crypto.randomUUID();
    const userMsg: ThreadMessage = {
      id: userMsgId,
      role: 'user',
      content: messageText,
      status: 'done',
      timestamp: new Date(),
    };
    addThreadMessage(activeProject.id, activeThread.id, userMsg);
    setMessages(prev => [...prev, userMsg]);

    // Add assistant streaming message
    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ThreadMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: new Date(),
      phase: 'thinking',
    };
    addThreadMessage(activeProject.id, activeThread.id, assistantMsg);
    setMessages(prev => [...prev, assistantMsg]);

    setIsStreaming(true);
    setStreamingPhase('thinking');
    setRetryProgress(null);

    try {
      const chatService = getChatService();

      await chatService.runTask(messageText, {
        onChunk: (delta: string, phase = 'responding') => {
          console.log('Chunk received:', delta.substring(0, 50), 'Phase:', phase);

          if (phase === 'planning') setStreamingPhase('planning');
          else if (phase === 'executing') {
            setStreamingPhase('executing');
            // Simulate file changes
            if (Math.random() > 0.8) {
              const mockFiles: ProjectFile[] = [
                {
                  path: 'src/App.tsx',
                  status: 'modified',
                  content: '// Modified content\n' + delta,
                  originalContent: '// Original content\n',
                },
              ];
              updateProjectFiles(activeProject.id, mockFiles);
              setShowDiff(true);
            }
          }
          else if (phase === 'thinking') setStreamingPhase('thinking');
          else if (phase === 'reflecting') setStreamingPhase('reflecting');

          // Update local message
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + delta, phase: streamingPhase }
              : msg
          ));

          // Update store
          updateThreadMessage(activeProject.id, activeThread.id, assistantMsgId, {
            content: messages.find(m => m.id === assistantMsgId)?.content + delta || delta,
            phase: streamingPhase,
          });
        },
        onProgress: (progress: { phase: string; detail?: string }) => {
          if (progress.phase === 'retrying') {
            setStreamingPhase('retrying');
            const match = progress.detail?.match(/attempt (\d+)\/(\d+)/);
            if (match) {
              setRetryProgress({
                attempt: parseInt(match[1]),
                max: parseInt(match[2]),
                countdown: 0
              });
            }
          }
        },
        onDone: (result) => {
          console.log('Stream done with result:', result);

          if (result?.result) {
            updateThreadMessage(activeProject.id, activeThread.id, assistantMsgId, {
              content: result.result,
              status: 'done',
            });
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: result.result, status: 'done' as const }
                : msg
            ));
          } else {
            updateThreadMessage(activeProject.id, activeThread.id, assistantMsgId, {
              status: 'done',
            });
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, status: 'done' as const }
                : msg
            ));
          }

          updateThreadStatus(activeProject.id, activeThread.id, 'completed');
          setIsStreaming(false);
          setRetryProgress(null);
        },
        onError: (error: string) => {
          console.error('Stream error:', error);
          updateThreadMessage(activeProject.id, activeThread.id, assistantMsgId, {
            status: 'error',
            content: messages.find(m => m.id === assistantMsgId)?.content + `\n\nError: ${error}`,
          });
          updateThreadStatus(activeProject.id, activeThread.id, 'failed');
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsgId
              ? { ...msg, status: 'error' as const, content: msg.content + `\n\nError: ${error}` }
              : msg
          ));
          setIsStreaming(false);
          setRetryProgress(null);
        },
      },
      { model, provider }
      );
    } catch (error) {
      console.error('Send error:', error);
      updateThreadStatus(activeProject.id, activeThread.id, 'failed');
      setIsStreaming(false);
      setRetryProgress(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter allows default behavior (new line)
  };

  const handleStartBrowser = async () => {
    if (!activeProject || isStartingBrowser) return;

    setIsStartingBrowser(true);
    try {
      // Start browser on server
      const response = await fetch(`${API_BASE}/api/projects/${activeProject.id}/browser/start`, {
        method: 'POST',
      });

      if (response.ok) {
        // Open sandbox panel
        toggleSandbox();
        setIsActive(true);
      }
    } catch (error) {
      console.error('Failed to start browser:', error);
    } finally {
      setIsStartingBrowser(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Project Selected</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create or select a project to get started</p>

          {isLoadingProjects ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading projects...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Plus className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-foreground">Create your first project</h3>
                    <p className="text-xs text-muted-foreground">Projects organize your conversations and files</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Trigger project selector and create new project
                    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true });
                    window.dispatchEvent(event);
                  }}
                  className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground hover:opacity-90 rounded flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </button>
                <p className="text-xs text-muted-foreground mt-2">
                  Or click the project selector in the header
                </p>
              </div>

              {serverProjects.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Available projects:</p>
                  <div className="space-y-2">
                    {serverProjects.map(project => (
                      <button
                        key={project.id}
                        onClick={() => {
                          // Select this project
                          useProjectStore.getState().syncProjectFromServer(project);
                          useProjectStore.getState().setActiveProject(project.id);
                        }}
                        className="block w-full max-w-xs mx-auto px-4 py-2 text-sm bg-accent hover:bg-accent/80 rounded"
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0;
  const changedFiles = activeProject.files.filter(f => f.status !== 'deleted');
  const browserActive = sandboxOpen && sandboxActive;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <ProjectSelector />
          <div className="flex items-center gap-2">
            {browserActive ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600 dark:text-green-400">Browser Active</span>
              </div>
            ) : (
              <button
                onClick={handleStartBrowser}
                disabled={isStartingBrowser}
                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-muted hover:bg-muted/70 rounded transition-colors disabled:opacity-50"
              >
                {isStartingBrowser ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
                {isStartingBrowser ? 'Starting...' : 'Start Browser'}
              </button>
            )}
          </div>
          <GitStatus />
        </div>
        <div className="flex items-center gap-4">
          {showDiff && changedFiles.length > 0 && (
            <button
              onClick={() => setViewMode(viewMode === 'diff' ? 'split' : 'diff')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'diff' ? 'bg-accent' : 'hover:bg-accent/50'
              )}
              title="Toggle diff view"
            >
              <Columns className="w-4 h-4" />
            </button>
          )}
          <ContextWindow used={contextUsed} max={contextMax} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread panel */}
        <div className="w-64 border-r border-border">
          <ThreadPanel />
        </div>

        {/* Chat/Diff area */}
        {viewMode === 'split' ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto" ref={scrollRef}>
              <div className="max-w-4xl mx-auto">
                {!hasMessages ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {activeThread?.title || 'New Thread'}
                      </h1>
                      <p className="text-gray-500 dark:text-gray-400">
                        Send a message to start working on {activeProject.name}
                      </p>
                      {!browserActive && (
                        <button
                          onClick={handleStartBrowser}
                          disabled={isStartingBrowser}
                          className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
                        >
                          {isStartingBrowser ? 'Starting Browser...' : 'Start Browser'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {messages.map((message) => {
                      const isUser = message.role === 'user';

                      return (
                        <div key={message.id} className="p-8">
                          <div className="mb-3">
                            <span className={`text-xs font-bold uppercase tracking-widest ${
                              isUser ? 'text-gray-400' : 'text-blue-500'
                            }`}>
                              {isUser ? 'You' : 'Assistant'}
                            </span>
                          </div>

                          <div className="text-gray-900 dark:text-white leading-relaxed">
                            {message.content ? (
                              <div className="prose prose-gray dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : message.status === 'streaming' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-sm text-gray-400">Thinking...</span>
                              </div>
                            ) : null}

                            {message.status === 'error' && (
                              <div className="mt-2 text-sm text-red-500">
                                {message.content}
                              </div>
                            )}
                          </div>

                          {message.content && (
                            <button
                              onClick={() => navigator.clipboard.writeText(message.content)}
                              className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 uppercase tracking-wide"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Diff panel */}
            {showDiff && changedFiles.length > 0 && (
              <div className="w-96 border-l border-border">
                <VisualDiff
                  files={changedFiles}
                  onClose={() => setShowDiff(false)}
                />
              </div>
            )}
          </>
        ) : viewMode === 'diff' ? (
          <div className="flex-1">
            <VisualDiff files={changedFiles} onClose={() => setShowDiff(false)} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" ref={scrollRef}>
            {/* Chat only view */}
          </div>
        )}
      </div>

      {/* Streaming Indicator */}
      {isStreaming && <StreamingIndicator phase={streamingPhase} retryProgress={retryProgress} />}

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              disabled={isStreaming}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-500"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder={`Message ${activeProject.name}...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                className="w-full min-h-[44px] max-h-32 resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black px-3 py-2.5 pr-20 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-0.5">
                <button
                  onClick={() => {
                    if (!browserActive) {
                      handleStartBrowser();
                    }
                    toggleSandbox();
                  }}
                  disabled={isStreaming}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    browserActive
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
                  )}
                  title={browserActive ? 'Browser active' : 'Toggle browser'}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="p-1.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-80 disabled:opacity-30"
                  title="Send"
                >
                  {isStreaming ? '...' : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Shift + Enter for new line</span>
            <div className="flex items-center gap-2">
              {browserActive && <span className="text-green-500">● Browser Active</span>}
              {provider && model && <span>{provider} • {model}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
