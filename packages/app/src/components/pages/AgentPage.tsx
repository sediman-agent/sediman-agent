import { useEffect, useState, useRef, useCallback } from 'react';
import { Monitor, Paperclip, X } from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { useAppStore } from '@/stores/useAppStore';
import { getChatService } from '@/services/chatService';
import { Button } from '@/components/shared/Button';
import { Textarea } from '@/components/shared/Textarea';
import { ScrollArea } from '@/components/shared/ScrollArea';
import { MessageBubble } from '@/components/agent/MessageBubble';
import { StreamingIndicator } from '@/components/agent/StreamingIndicator';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What can you do?',
  'Help me browse a website',
  'Analyze this PDF',
  'Extract data from this document',
  'Record a new skill',
];

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
}

export function AgentPage() {
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const activeConversation = useChatStore((state) => state.activeConversation);
  const createConversation = useChatStore((state) => state.createConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const addMessage = useChatStore((state) => state.addMessage);
  const setMessageStatus = useChatStore((state) => state.setMessageStatus);
  const appendToMessage = useChatStore((state) => state.appendToMessage);
  const toggleSandbox = useSandboxStore((state) => state.togglePanel);
  const model = useAppStore((state) => state.model);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying'>('thinking');
  const [retryProgress, setRetryProgress] = useState<{ attempt: number; max: number; countdown: number } | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversations.length === 0) {
      const conversation = createConversation('New Chat');
      selectConversation(conversation.id);
    } else if (!activeConversationId && conversations.length > 0) {
      selectConversation(conversations[0].id);
    }
  }, [conversations, activeConversationId, createConversation, selectConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConversation?.messages]);

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input.trim();
    if (!messageText || !activeConversationId || isStreaming) return;

    // Include file info in message if there are attachments
    let finalMessage = messageText;
    if (attachedFiles.length > 0) {
      const fileInfo = attachedFiles.map(f => `[${f.name}]`).join(', ');
      finalMessage = `${messageText}\n\nAttached files: ${fileInfo}`;
    }

    if (!overrideInput) {
      setInput('');
      setAttachedFiles([]);
    }

    addMessage(activeConversationId, {
      role: 'user',
      content: finalMessage,
      status: 'done',
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
    });

    addMessage(activeConversationId, {
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    setIsStreaming(true);
    setStreamingPhase('thinking');
    setRetryProgress(null);

    try {
      const chatService = getChatService();
      const messages = activeConversation?.messages || [];
      const lastMessage = messages[messages.length - 1];

      await chatService.runTask(
        finalMessage,
        {
          onChunk: (delta: string, phase = 'responding') => {
            if (phase === 'planning') {
              setStreamingPhase('planning');
            } else if (phase === 'executing') {
              setStreamingPhase('executing');
            } else if (phase === 'thinking') {
              setStreamingPhase('thinking');
            } else if (phase === 'reflecting') {
              setStreamingPhase('reflecting');
            }

            if (phase === 'planning' || phase === 'thinking' || phase === 'reflecting') {
              if (lastMessage) {
                appendToMessage(activeConversationId, lastMessage.id, delta);
              }
            } else if (phase === 'progress') {
              try {
                const progress = JSON.parse(delta);
                if (progress.retry) {
                  setStreamingPhase('retrying');
                  setRetryProgress({
                    attempt: progress.retry.attempt,
                    max: progress.retry.max,
                    countdown: progress.retry.countdown
                  });
                }
              } catch {
                if (lastMessage) {
                  appendToMessage(activeConversationId, lastMessage.id, delta);
                }
              }
            } else {
              if (lastMessage) {
                appendToMessage(activeConversationId, lastMessage.id, delta);
              }
            }
          },
          onProgress: (progress: { phase: string; detail?: string }) => {
            if (progress.phase === 'retrying') {
              setStreamingPhase('retrying');
              const detail = progress.detail || '';
              const match = detail.match(/attempt (\d+)\/(\d+)/);
              if (match) {
                setRetryProgress({
                  attempt: parseInt(match[1]),
                  max: parseInt(match[2]),
                  countdown: 0
                });
              }
            }
          },
          onDone: () => {
            if (lastMessage) {
              setMessageStatus(activeConversationId, lastMessage.id, 'done');
            }
            setIsStreaming(false);
            setRetryProgress(null);
          },
          onError: (error: string) => {
            if (lastMessage) {
              setMessageStatus(activeConversationId, lastMessage.id, 'error');
              appendToMessage(activeConversationId, lastMessage.id, `\n\nError: ${error}`);
            }
            setIsStreaming(false);
            setRetryProgress(null);
          },
        }
      );
    } catch (error) {
      setIsStreaming(false);
      setRetryProgress(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFilesUploaded = useCallback((files: AttachedFile[]) => {
    setAttachedFiles(files);
    setShowFileUpload(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isStreaming) {
      setIsDragOver(true);
    }
  }, [isStreaming]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isStreaming) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const newFiles: AttachedFile[] = Array.from(files).map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading' as const
      }));

      setAttachedFiles(prev => [...prev, ...newFiles]);
      setShowFileUpload(false);
    }
  }, [isStreaming]);

  const removeAttachment = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const hasMessages = activeConversation?.messages && activeConversation.messages.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background transition-all duration-200',
        isDragOver && 'ring-2 ring-primary ring-inset'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Main Chat Area */}
      <ScrollArea className="flex-1">
        <div
          ref={scrollRef}
          className={cn(
            "mx-auto transition-all duration-200 w-full px-4",
            hasMessages ? "max-w-4xl py-4 space-y-3" : "max-w-2xl py-16"
          )}
        >
          {hasMessages ? (
            activeConversation?.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-16">
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  New conversation
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag & drop PDFs, documents, or images to analyze, or try a suggestion below.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-sm">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="text-left text-xs px-3 py-2 rounded border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center p-8 bg-background border-2 border-primary rounded-xl shadow-lg">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Paperclip className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Drop files to analyze
            </h3>
            <p className="text-sm text-muted-foreground">
              PDFs, documents, images supported
            </p>
          </div>
        </div>
      )}

      {/* Streaming Indicator */}
      {isStreaming && (
        <StreamingIndicator phase={streamingPhase} retryProgress={retryProgress} />
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-background border border-input rounded-md text-sm"
                >
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(file.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File Upload Zone (Collapsible) */}
          {showFileUpload && (
            <div className="relative">
              <FileUploadZone
                onFilesUploaded={handleFilesUploaded}
                acceptedTypes={['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg']}
                maxSize={100}
              />
              <button
                onClick={() => setShowFileUpload(false)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Controls */}
          <div className="flex items-end gap-2">
            {/* File Upload Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
              disabled={isStreaming}
              className={cn(
                "flex-shrink-0",
                showFileUpload && "bg-accent"
              )}
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {/* Text Input */}
            <Textarea
              ref={textareaRef}
              placeholder="Type a message or drag & drop files..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="text-xs min-h-[60px] resize-none w-full p-3 rounded-sm border border-input bg-background text-foreground"
            />

            {/* Send Button */}
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              className={cn(
                "text-xs flex-shrink-0",
                !input.trim() || isStreaming
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              )}
            >
              {isStreaming ? 'Sending...' : 'Send'}
            </Button>

            {/* Browser Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSandbox}
              disabled={isStreaming}
              className="flex-shrink-0"
              title="Toggle browser"
            >
              <Monitor className="w-4 h-4" />
            </Button>
          </div>

          {/* Helper Text */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Enter to send</span>
              <span className="mx-1">·</span>
              <span>Shift+Enter for new line</span>
              {model && <span className="ml-2 text-muted-foreground/60">{model}</span>}
            </div>
            {attachedFiles.length > 0 && (
              <span>{attachedFiles.length} file(s) attached</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
