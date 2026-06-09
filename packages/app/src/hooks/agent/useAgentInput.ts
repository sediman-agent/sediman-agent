/**
 * useAgentInput Hook
 * Manages agent input state, history, and slash commands
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Navigation, MousePointer, Sparkles } from 'lucide-react';

export interface SlashCommand {
  id: string;
  label: string;
  icon: any;
  description: string;
  template: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'screenshot', label: 'Screenshot', icon: Camera, description: 'Take a screenshot', template: 'Take a screenshot of the current page' },
  { id: 'navigate', label: 'Navigate to URL', icon: Navigation, description: 'Navigate to a URL', template: 'Navigate to ' },
  { id: 'click', label: 'Click element', icon: MousePointer, description: 'Click an element on the page', template: 'Click on ' },
  { id: 'analyze', label: 'Analyze page', icon: Sparkles, description: 'Analyze the current page', template: 'Analyze this page and tell me about ' },
];

export interface UseAgentInputOptions {
  onSubmit?: (input: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export function useAgentInput(opts: UseAgentInputOptions = {}) {
  const { onSubmit, textareaRef } = opts;

  // Input state
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  // Input history for up/down arrow navigation
  const inputHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  // Slash command state
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandFilter, setSlashCommandFilter] = useState('');

  // Update input
  const updateInput = useCallback((value: string) => {
    setInput(value);

    // Check for slash command
    if (value.startsWith('/')) {
      const filter = value.slice(1);
      setSlashCommandFilter(filter);
      setShowSlashCommands(true);
    } else {
      setShowSlashCommands(false);
      setSlashCommandFilter('');
    }
  }, []);

  // Handle send
  const triggerSend = useCallback(async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    setSendError(false);

    try {
      // Add to history
      inputHistoryRef.current = [...inputHistoryRef.current, input];
      historyIndexRef.current = -1;

      // Call submit callback
      if (onSubmit) {
        await onSubmit(input);
      }

      setInput('');
    } catch (error) {
      console.error('[useAgentInput] Send failed:', error);
      setSendError(true);
      setTimeout(() => setSendError(false), 2000);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, onSubmit]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;

    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSend();
      return;
    }

    // Up/Down arrow for history navigation
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const history = inputHistoryRef.current;
      if (history.length === 0) return;

      e.preventDefault();
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current += 1;
        const newIndex = history.length - 1 - historyIndexRef.current;
        setInput(history[newIndex]);
      }

      // Move cursor to end
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      }, 0);
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      e.preventDefault();
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        const newIndex = history.length - 1 - historyIndexRef.current;
        setInput(history[newIndex]);
      } else if (historyIndexRef.current === 0) {
        historyIndexRef.current = -1;
        setInput('');
      }

      // Move cursor to end
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      }, 0);
    }

    // Escape to close slash commands
    if (e.key === 'Escape') {
      setShowSlashCommands(false);
      setSlashCommandFilter('');
    }
  }, [triggerSend]);

  // Select slash command
  const selectSlashCommand = useCallback((command: SlashCommand) => {
    setInput(command.template);
    setShowSlashCommands(false);
    setSlashCommandFilter('');

    // Focus textarea after selection
    if (textareaRef?.current) {
      textareaRef.current.focus();
    }
  }, [textareaRef]);

  // Filter slash commands
  const filteredSlashCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(slashCommandFilter.toLowerCase()) ||
    cmd.id.toLowerCase().includes(slashCommandFilter.toLowerCase())
  );

  // Clear input
  const clearInput = useCallback(() => {
    setInput('');
    setSendError(false);
  }, []);

  return {
    input,
    setInput: updateInput,
    isSending,
    sendError,
    triggerSend,
    clearInput,
    handleKeyDown,
    showSlashCommands,
    slashCommandFilter,
    filteredSlashCommands,
    selectSlashCommand,
    setShowSlashCommands
  };
}
