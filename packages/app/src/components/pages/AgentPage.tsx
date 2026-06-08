import { useState, useRef, useEffect } from 'react';
import { Monitor, Paperclip, Send, AlertTriangle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useRPCConnection } from '@/hooks/useRPCConnection';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useChatStore } from '@/stores/useChatStore';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { useAppStore } from '@/stores/useAppStore';
import { getChatService } from '@/services/chatService';
import { FileUploadZone } from '@/elements/form/FileUploadZone';
import { StreamingIndicator } from '@/components/agent/StreamingIndicator';
import { thinkTagParser } from '@/utils/thinkTagParser';
import type { Message } from '@/types';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
}

export function AgentPage() {
  const { createConversation, selectConversation, addMessage, updateMessage, appendToMessage, conversations } = useChatStore();
  const setOpenSandbox = useSandboxStore((state) => state.setOpen);
  const model = useAppStore((state) => state.model);
  const provider = useAppStore((state) => state.provider);
  const agentStatus = useAppStore((state) => state.agentStatus);

  // Enable connection checking
  useRPCConnection();

  // Force connection status to true (backend is running)
  useEffect(() => {
    if (!agentStatus.rpcConnected) {
      fetch('http://localhost:3001/api/health')
        .then(res => {
          if (res.ok) {
            // Update store to show connected
            const setAgentStatus = useAppStore.getState().setAgentStatus;
            setAgentStatus({ rpcConnected: true });
          }
        })
        .catch(err => {
          console.log('Connection check failed:', err);
        });
    }
  }, [agentStatus.rpcConnected]);

  // State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying'>('thinking');
  const [currentAction, setCurrentAction] = useState<string | undefined>();
  const [currentDetail, setCurrentDetail] = useState<string | undefined>();
  const [retryProgress, setRetryProgress] = useState<{ attempt: number; max: number; countdown: number } | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedThinkingMessages, setExpandedThinkingMessages] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tool call history for better visibility
  const [toolCallHistory, setToolCallHistory] = useState<Array<{ action: string; detail: string; status: 'pending' | 'success' | 'error', timestamp: number }>>([]);

  // Use messages directly from store - no local state duplication
  const activeConversation = conversations.find(c => c.id === conversationId);
  const messages = activeConversation?.messages || [];

  // Initialize conversation on mount
  useEffect(() => {
    // Only set if not already set
    if (!conversationId) {
      const existingConvos = conversations;
      if (existingConvos.length > 0) {
        // Use the most recently updated conversation
        const sortedConvos = [...existingConvos].sort((a, b) => {
          const aTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          const bTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          return bTime - aTime;
        });
        const latestConv = sortedConvos[0];
        setConversationId(latestConv.id);
        selectConversation(latestConv.id);
      } else {
        // Only create new if no conversations exist
        const newConv = createConversation('New Chat');
        setConversationId(newConv.id);
        selectConversation(newConv.id);
      }
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText || !conversationId || isStreaming) return;

    if (!agentStatus.rpcConnected) {
      // Add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageText,
        status: 'done',
        timestamp: new Date(),
      };
      addMessage(conversationId, userMsg);

      // Add error message
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Backend disconnected. Run: bun run backend',
        status: 'error',
        timestamp: new Date(),
      };
      addMessage(conversationId, errorMsg);

      setInput('');
      return;
    }

    setInput('');
    setAttachedFiles([]);

    // Add user message
    const userMsgId = crypto.randomUUID();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: messageText,
      status: 'done',
      timestamp: new Date(),
    };
    addMessage(conversationId, userMsg);

    // Add assistant streaming message
    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: new Date(),
    };
    addMessage(conversationId, assistantMsg);

    setIsStreaming(true);
    setStreamingPhase('thinking');
    setRetryProgress(null);
    setToolCallHistory([]);

    try {
      const chatService = getChatService();

      await chatService.runTask(messageText, {
        onChunk: (delta: string, phase = 'responding') => {
          if (phase === 'planning') setStreamingPhase('planning');
          else if (phase === 'executing') setStreamingPhase('executing');
          else if (phase === 'thinking') setStreamingPhase('thinking');
          else if (phase === 'reflecting') setStreamingPhase('reflecting');

          // Check if chunk contains cumulative content and only append the new part
          const currentMessage = useChatStore.getState().conversations
            .find(c => c.id === conversationId)
            ?.messages.find(m => m.id === assistantMsgId);

          if (currentMessage && currentMessage.content && delta.startsWith(currentMessage.content)) {
            // Chunk contains previous content, only append the new part
            const newContent = delta.substring(currentMessage.content.length);
            appendToMessage(conversationId, assistantMsgId, newContent);
          } else {
            // Chunk is incremental or first chunk, append directly
            appendToMessage(conversationId, assistantMsgId, delta);
          }
        },
        onProgress: (progress: { phase: string; detail?: string; action?: string; url?: string; observation?: string; success?: boolean }) => {
          // Debug logging - show full object structure
          console.log('[AgentPage] Progress event:', JSON.stringify(progress, null, 2));

          // Update current action and detail for StreamingIndicator
          setCurrentAction(progress.action);
          setCurrentDetail(progress.detail || progress.observation);

          // Track tool calls in history
          if (progress.action && progress.phase === 'executing') {
            const existingToolCall = toolCallHistory.find(
              tc => tc.action === progress.action && Math.abs(Date.now() - tc.timestamp) < 5000
            );

            if (!existingToolCall) {
              // Add new tool call to history
              setToolCallHistory(prev => [...prev, {
                action: progress.action || 'unknown',
                detail: progress.detail || '',
                status: 'pending' as const,
                timestamp: Date.now()
              }]);
            }

            // When tool completes successfully, update its status
            if (progress.success !== undefined) {
              setToolCallHistory(prev => prev.map(tc => {
                if (tc.action === progress.action && tc.status === 'pending') {
                  return {
                    ...tc,
                    status: progress.success ? 'success' : 'error',
                    detail: progress.observation || progress.detail || ''
                  };
                }
                return tc;
              }));
            }
          }

          // Auto-open browser panel when agent uses browser tools
          if (progress.phase === 'planning' || progress.phase === 'executing') {
            const action = progress.action?.toLowerCase() || '';
            const detail = progress.detail?.toLowerCase() || '';

            console.log('[AgentPage] Checking browser action:', { action, detail });

            // Check if this is a browser-related action
            const isBrowserAction =
              action.includes('navigate') ||
              action.includes('click') ||
              action.includes('screenshot') ||
              action.includes('browser') ||
              action.includes('snapshot') ||
              action.includes('extract') ||
              detail.includes('navigate') ||
              detail.includes('browser') ||
              progress.url;

            console.log('[AgentPage] Is browser action?', isBrowserAction);

            if (isBrowserAction) {
              // Open browser panel if not already open
              const isOpen = useSandboxStore.getState().isOpen;
              console.log('[AgentPage] Browser panel isOpen:', isOpen);
              if (!isOpen) {
                console.log('[AgentPage] Opening browser panel...');
                setOpenSandbox(true);
              }

              // Parse URL from browser_navigate detail and update tab
              if (action === 'browser_navigate' && progress.detail) {
                try {
                  const detailObj = JSON.parse(progress.detail);
                  if (detailObj.url) {
                    console.log('[AgentPage] Server navigated to:', detailObj.url);
                    // Import BrowserService and notify of server navigation
                    import('@/services/BrowserService').then(({ browserService }) => {
                      browserService.serverNavigated(detailObj.url);
                    });
                  }
                } catch (e) {
                  console.log('[AgentPage] Failed to parse browser detail:', e);
                }
              }
            }
          }

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
        onDone: (_result) => {
          // Get the current message
          const currentMessage = useChatStore.getState().conversations
            .find(c => c.id === conversationId)
            ?.messages.find(m => m.id === assistantMsgId);

          if (currentMessage && !currentMessage.content && _result?.result) {
            // No chunks were received, use the result directly
            // Parse the result to extract thinking and visible content
            const parsed = thinkTagParser.parse(_result.result);
            updateMessage(conversationId, assistantMsgId, {
              content: parsed.visible,
              thinking: parsed.thinking || undefined,
              status: 'done',
            });
          } else if (currentMessage && currentMessage.content) {
            // Chunks were received, parse the accumulated content to extract thinking
            const parsed = thinkTagParser.parse(currentMessage.content);
            updateMessage(conversationId, assistantMsgId, {
              content: parsed.visible,
              thinking: parsed.thinking || undefined,
              status: 'done',
            });
          } else {
            // Mark as done even if no content
            updateMessage(conversationId, assistantMsgId, {
              status: 'done',
            });
          }

          setIsStreaming(false);
          setRetryProgress(null);
        },
        onError: (error: string) => {
          updateMessage(conversationId, assistantMsgId, {
            status: 'error',
            content: `Error: ${error}`,
          });
          setIsStreaming(false);
          setRetryProgress(null);
        },
      },
      { model, provider }
      );
    } catch (error) {
      console.error('Send error:', error);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isStreaming) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isStreaming) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setAttachedFiles(Array.from(files).map(f => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        type: f.type,
        status: 'uploading' as const
      })));
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-black"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Connection Warning */}
      {!agentStatus.rpcConnected && (
        <div className="flex items-center justify-between px-4 py-2 bg-red-500 text-white">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Backend disconnected. Run: bun run backend</span>
          </div>
          <button onClick={() => window.location.reload()} className="text-sm underline">
            Retry
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-4xl mx-auto">
          {!hasMessages ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">New chat</h1>
                <p className="text-gray-500 dark:text-gray-400">Send a message to start</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                
                // Parse thinking content from message (works during streaming too)
                const parsedThinking = thinkTagParser.parse(message.content);
                const displayContent = parsedThinking.visible;
                const displayThinking = message.thinking || parsedThinking.thinking;
                
                // For streaming, only show partial think content
                const effectiveThinking = message.status === 'streaming' 
                  ? (parsedThinking.thinking || null)
                  : displayThinking;

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
                      {/* Thinking section - collapsible */}
                      {effectiveThinking && (
                        <div className="mb-4 border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                          <button
                            onClick={() => {
                              setExpandedThinkingMessages(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(message.id)) {
                                  newSet.delete(message.id);
                                } else {
                                  newSet.add(message.id);
                                }
                                return newSet;
                              });
                            }}
                            className="w-full px-4 py-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                          >
                            {expandedThinkingMessages.has(message.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-medium">Reasoning</span>
                            <span className="text-xs text-amber-500">
                              ({effectiveThinking.length} chars)
                            </span>
                          </button>
                          {expandedThinkingMessages.has(message.id) && (
                            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950 border-t border-amber-200 dark:border-amber-800">
                              <pre className="whitespace-pre-wrap text-sm text-amber-800 dark:text-amber-300 font-mono">
                                {effectiveThinking}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main content */}
                      {displayContent ? (
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                            {displayContent}
                          </ReactMarkdown>
                        </div>
                      ) : message.status === 'streaming' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-sm text-gray-400">Thinking...</span>
                        </div>
                      ) : message.status === 'error' && message.content ? (
                        <div className="mt-2 text-sm text-red-500">
                          {message.content}
                        </div>
                      ) : null}
                    </div>

                    {displayContent && (
                      <button
                        onClick={() => navigator.clipboard.writeText(displayContent)}
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

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-8">
            <Paperclip className="w-12 h-12 mb-4" />
            <p className="text-sm">Drop files to attach</p>
          </div>
        </div>
      )}

      {/* Streaming Indicator */}
      {isStreaming && <StreamingIndicator phase={streamingPhase} retryProgress={retryProgress} action={currentAction} detail={currentDetail} toolCallHistory={toolCallHistory} />}

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs">
                  <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => setAttachedFiles(prev => prev.filter(f => f.id !== file.id))} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showFileUpload && (
            <div className="relative mb-3">
              <FileUploadZone
                onFilesUploaded={(files) => {
                  setAttachedFiles(files);
                  setShowFileUpload(false);
                }}
                acceptedTypes={['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg']}
                maxSize={100}
              />
              <button onClick={() => setShowFileUpload(false)} className="absolute top-2 right-2 p-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              disabled={isStreaming}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-500"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder="Message..."
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
                    setOpenSandbox(true);
                  }}
                  disabled={isStreaming}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-500"
                  title="Open browser"
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
            {provider && model && <span>{provider} • {model}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
