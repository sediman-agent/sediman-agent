import { Copy, Check } from 'lucide-react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      'flex gap-2 group',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'flex flex-col gap-0.5 max-w-[85%]',
        isUser && 'items-end'
      )}>
        <div
          className={cn(
            'relative border px-2 py-1',
            'text-xs leading-relaxed',
            'transition-colors duration-150',
            isUser
              ? 'border-border bg-primary text-primary-foreground'
              : 'border-border bg-muted text-foreground'
          )}
          style={{ fontFamily: 'inherit', borderRadius: '2px' }}
        >
          <div className="markdown-content prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                p: ({ children }) => <p className="my-0 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="my-0 space-y-0">{children}</ul>,
                ol: ({ children }) => <ol className="my-0 space-y-0">{children}</ol>,
              }}
            >
              {message.content || (isStreaming ? '▊' : '')}
            </ReactMarkdown>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              'absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
              isUser ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
            title="Copy"
          >
            {copied ? (
              <Check className="w-2.5 h-2.5" />
            ) : (
              <Copy className="w-2.5 h-2.5" />
            )}
          </button>

          {isStreaming && !isUser && <span className="typing-cursor" />}

          {message.status === 'error' && (
            <div className="mt-0.5 text-xs text-destructive">
              Failed to send
            </div>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && (
          <span className="text-[10px] text-muted-foreground px-0.5">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
    </div>
  );
}
