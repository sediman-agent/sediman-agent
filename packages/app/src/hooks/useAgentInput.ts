import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Navigation, MousePointer, Sparkles } from 'lucide-react';

export interface SlashCommand {
  id: string;
  label: string;
  icon: any;
  description: string;
  template: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'screenshot', label: 'Screenshot', icon: Camera, description: 'Take a screenshot', template: 'Take a screenshot of the current page' },
  { id: 'navigate', label: 'Navigate to URL', icon: Navigation, description: 'Navigate to a URL', template: 'Navigate to ' },
  { id: 'click', label: 'Click element', icon: MousePointer, description: 'Click an element on the page', template: 'Click on ' },
  { id: 'analyze', label: 'Analyze page', icon: Sparkles, description: 'Analyze the current page', template: 'Analyze this page and tell me about ' },
];

interface UseAgentInputOptions {
  onSend?: (messageText: string) => void;
  disabled?: boolean;
}

interface UseAgentInputReturn {
  // State
  input: string;
  setInput: (value: string) => void;
  attachedFiles: AttachedFile[];
  setAttachedFiles: (files: AttachedFile[]) => void;
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  showSlashCommands: boolean;
  setShowSlashCommands: (show: boolean) => void;
  slashCommandFilter: string;
  setSlashCommandFilter: (value: string) => void;
  filteredSlashCommands: SlashCommand[];
  isSending: boolean;
  sendError: boolean;

  // Refs
  textareaRef: React.RefObject<HTMLTextAreaElement>;

  // Handlers
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  selectSlashCommand: (command: SlashCommand) => void;

  // Actions
  triggerSend: () => Promise<void>;
  resetSendError: () => void;
}

export function useAgentInput(options: UseAgentInputOptions = {}): UseAgentInputReturn {
  const { onSend, disabled } = options;

  // Input state
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandFilter, setSlashCommandFilter] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  // Cross-browser auto-resize for textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const autoResize = () => {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.max(36, Math.min(scrollHeight, 200));
      textarea.style.height = `${newHeight}px`;
    };

    autoResize();
    textarea.addEventListener('input', autoResize);
    return () => textarea.removeEventListener('input', autoResize);
  }, [input]);

  // Reset error shake animation after it plays
  useEffect(() => {
    if (sendError) {
      const timeout = setTimeout(() => setSendError(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [sendError]);

  // Filtered slash commands
  const filteredSlashCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(slashCommandFilter.toLowerCase())
  );

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;

    // Enter to send (unless Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Slash command detection
    if (e.key === '/' && input === '' && !showSlashCommands) {
      setShowSlashCommands(true);
      setSlashCommandFilter('');
      return;
    }

    // Escape to close slash commands
    if (e.key === 'Escape' && showSlashCommands) {
      setShowSlashCommands(false);
      setSlashCommandFilter('');
      return;
    }

    // Up arrow for input history
    if (e.key === 'ArrowUp' && !showSlashCommands) {
      e.preventDefault();
      const history = inputHistoryRef.current;
      if (history.length > 0) {
        const newIndex = Math.min(historyIndexRef.current + 1, history.length - 1);
        historyIndexRef.current = newIndex;
        setInput(history[history.length - 1 - newIndex]);
      }
      return;
    }

    // Down arrow for input history
    if (e.key === 'ArrowDown' && !showSlashCommands) {
      e.preventDefault();
      const history = inputHistoryRef.current;
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        setInput(history[history.length - 1 - historyIndexRef.current]);
      } else if (historyIndexRef.current === 0) {
        historyIndexRef.current = -1;
        setInput('');
      }
      return;
    }

    // Tab to complete slash command
    if (e.key === 'Tab' && showSlashCommands) {
      e.preventDefault();
      if (filteredSlashCommands.length > 0) {
        selectSlashCommand(filteredSlashCommands[0]);
      }
      return;
    }
  }, [disabled, input, showSlashCommands, filteredSlashCommands]);

  // Send handler
  const handleSendFunc = useCallback(async () => {
    const messageText = input.trim();
    if (!messageText || disabled) {
      if (!messageText) {
        setSendError(true);
      }
      return;
    }

    // Add to input history
    inputHistoryRef.current = [...inputHistoryRef.current, messageText].slice(-20);
    historyIndexRef.current = -1;

    setIsSending(true);
    setSendError(false);

    setInput('');
    setAttachedFiles([]);

    // Call the onSend callback if provided
    if (onSend) {
      await onSend(messageText);
    }

    setIsSending(false);
  }, [input, disabled, onSend]);

  // Create a stable reference to handleSend
  const handleSend = useCallback(() => {
    handleSendFunc();
  }, [handleSendFunc]);

  // Slash command selection
  const selectSlashCommand = useCallback((command: SlashCommand) => {
    setInput(command.template);
    setShowSlashCommands(false);
    setSlashCommandFilter('');
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(command.template.length, command.template.length);
    }, 0);
  }, []);

  // Smart paste handling
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setAttachedFiles(prev => [...prev, {
            id: crypto.randomUUID(),
            name: `pasted-image-${Date.now()}.png`,
            size: file.size,
            type: file.type,
            status: 'uploading' as const
          }]);
        }
        return;
      }
    }

    const pastedText = e.clipboardData.getData('text');
    if (pastedText.match(/^https?:\/\//)) {
      console.log('[useAgentInput] URL pasted:', pastedText);
    }
  }, []);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    // No-op for now, could add visual state if needed
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;

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
  }, [disabled]);

  const resetSendError = useCallback(() => {
    setSendError(false);
  }, []);

  const updateSlashCommandFilter = useCallback((value: string) => {
    setSlashCommandFilter(value);
  }, []);

  return {
    // State
    input,
    setInput,
    attachedFiles,
    setAttachedFiles,
    showFileUpload,
    setShowFileUpload,
    showSlashCommands,
    setShowSlashCommands,
    slashCommandFilter,
    setSlashCommandFilter,
    filteredSlashCommands,
    isSending,
    sendError,

    // Refs
    textareaRef,

    // Handlers
    handleKeyDown,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    selectSlashCommand,

    // Actions
    triggerSend: handleSendFunc,
    resetSendError,
  };
}
