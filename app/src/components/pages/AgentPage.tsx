import { useEffect, useState, useRef } from 'react';
import { Monitor } from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useSandboxStore } from '@/stores/useSandboxStore';
import { getChatService } from '@/services/chatService';
import { Button } from '@/components/shared/Button';
import { Textarea } from '@/components/shared/Textarea';
import { ScrollArea } from '@/components/shared/ScrollArea';
import { MessageBubble } from '@/components/agent/MessageBubble';
import { cn } from '@/lib/utils';

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

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying'>('thinking');
  const [retryProgress, setRetryProgress] = useState<{ attempt: number; max: number; countdown: number } | null>(null);
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

  const handleSend = async () => {
    if (!input.trim() || !activeConversationId || isStreaming) return;

    const userMessage = input.trim();
    setInput('');

    addMessage(activeConversationId, {
      role: 'user',
      content: userMessage,
      status: 'done',
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

      await chatService.sendMessage(
        activeConversationId,
        userMessage,
        {
          onChunk: (delta, phase = 'responding') => {
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
          onProgress: (progress) => {
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
          onError: (error) => {
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

  const hasMessages = activeConversation?.messages && activeConversation.messages.length > 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: 'hsl(var(--background))', fontFamily: 'inherit' }}>
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className={cn(
          "mx-auto transition-all duration-200 w-full px-4",
          hasMessages ? "max-w-4xl py-4 space-y-3" : "max-w-2xl py-16"
        )} style={{ fontFamily: 'inherit', minHeight: 'calc(100vh - 180px)' }}>
          {hasMessages ? (
            activeConversation?.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-16">
              <h2 className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))', fontFamily: 'inherit' }}>
                New conversation
              </h2>
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}>
                Type a message below to get started.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Streaming status indicator */}
      {isStreaming && (
        <div className="px-4 pb-2">
          <div className="flex flex-col gap-1 text-xs" style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}>
            <div className="flex items-center gap-2">
              {streamingPhase === 'thinking' && (
                <>
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
                  <span>Thinking…</span>
                </>
              )}
              {streamingPhase === 'planning' && (
                <>
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
                  <span>Planning…</span>
                </>
              )}
              {streamingPhase === 'executing' && (
                <>
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
                  <span>Executing…</span>
                </>
              )}
              {streamingPhase === 'reflecting' && (
                <>
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
                  <span>Reflecting…</span>
                </>
              )}
              {streamingPhase === 'retrying' && retryProgress && (
                <>
                  <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
                  <span>Retrying ({retryProgress.attempt}/{retryProgress.max})…</span>
                </>
              )}
            </div>
            {retryProgress && retryProgress.countdown > 0 && (
              <div className="text-[10px] pl-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Retrying in {retryProgress.countdown.toFixed(1)}s…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        className="p-4 border-t"
        style={{ borderTop: '1px solid hsl(var(--border))', fontFamily: 'inherit', background: 'hsl(var(--background))' }}
      >
        <div className="max-w-4xl mx-auto">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              border: '1px solid hsl(var(--border))',
              borderRadius: '2px',
              fontFamily: 'inherit',
              fontSize: '13px',
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              minHeight: '60px',
              resize: 'none',
              width: '100%',
              padding: '12px'
            }}
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' }}>
              Press Enter to send
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSandbox}
                title="Toggle browser"
                style={{ background: 'transparent', border: '1px solid hsl(var(--border))', fontFamily: 'inherit', fontSize: '12px' }}
              >
                <Monitor className="w-3 h-3" />
                Browser
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                style={{
                  background: !input.trim() || isStreaming ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                  color: !input.trim() || isStreaming ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))',
                  border: '1px solid hsl(var(--border))',
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  padding: '8px 16px'
                }}
              >
                {isStreaming ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
