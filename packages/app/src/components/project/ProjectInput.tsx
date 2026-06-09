/**
 * ProjectInput Component
 * Input area for project chat with browser toggle
 */

import { forwardRef, useEffect, useRef } from 'react';
import { Send, Monitor, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStartBrowser?: () => void;
  onToggleBrowser?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  browserActive?: boolean;
  projectName?: string;
  placeholder?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const ProjectInput = forwardRef<HTMLTextAreaElement, ProjectInputProps>(
  ({
    value,
    onChange,
    onSend,
    onStartBrowser,
    onToggleBrowser,
    disabled = false,
    isStreaming = false,
    browserActive = false,
    projectName = 'project',
    placeholder = `Message ${projectName}...`,
    textareaRef,
    onKeyDown
  }, ref) => {
    const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
    const activeTextareaRef = textareaRef || internalTextareaRef;

    // Auto-resize textarea
    useEffect(() => {
      const textarea = activeTextareaRef.current;
      if (!textarea) return;

      const autoResize = () => {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.max(44, Math.min(scrollHeight, 128));
        textarea.style.height = `${newHeight}px`;
      };

      autoResize();

      textarea.addEventListener('input', autoResize);
      return () => {
        textarea.removeEventListener('input', autoResize);
      };
    }, [activeTextareaRef]);

    return (
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Attachment button */}
            <button
              disabled={isStreaming}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-500"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={activeTextareaRef}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={disabled || isStreaming}
                className="w-full min-h-[44px] max-h-32 resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black px-3 py-2.5 pr-20 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-50"
                rows={1}
              />

              {/* Action buttons */}
              <div className="absolute right-2 bottom-2 flex items-center gap-0.5">
                {/* Browser toggle */}
                <button
                  onClick={() => {
                    if (!browserActive && onStartBrowser) {
                      onStartBrowser();
                    }
                    if (onToggleBrowser) {
                      onToggleBrowser();
                    }
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

                {/* Send button */}
                <button
                  onClick={onSend}
                  disabled={!value.trim() || isStreaming}
                  className="p-1.5 bg-black dark:bg-white text-white dark:text-black hover:opacity-80 disabled:opacity-30"
                  title="Send"
                >
                  {isStreaming ? '...' : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Shift + Enter for new line</span>
            <div className="flex items-center gap-2">
              {browserActive && <span className="text-green-500">● Browser Active</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProjectInput.displayName = 'ProjectInput';
