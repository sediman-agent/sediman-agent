/**
 * useProjectMessaging Hook
 * Manages project messages and streaming state
 */

import { useState, useCallback, useEffect } from 'react';
import type { ThreadMessage } from '@/types/project';

export function useProjectMessaging(initialMessages: ThreadMessage[] = []) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying'>('thinking');
  const [retryProgress, setRetryProgress] = useState<{ attempt: number; max: number; countdown: number } | null>(null);

  // Sync messages when initial messages change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Add message
  const addMessage = useCallback((message: ThreadMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Update message
  const updateMessage = useCallback((messageId: string, updates: Partial<ThreadMessage>) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  // Start streaming
  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setStreamingPhase('thinking');
  }, []);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingPhase('thinking');
    setRetryProgress(null);
  }, []);

  // Update streaming phase
  const updatePhase = useCallback((phase: typeof streamingPhase) => {
    setStreamingPhase(phase);
  }, []);

  // Update retry progress
  const updateRetryProgress = useCallback((progress: { attempt: number; max: number; countdown: number } | null) => {
    setRetryProgress(progress);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    streamingPhase,
    retryProgress,
    addMessage,
    updateMessage,
    clearMessages,
    startStreaming,
    stopStreaming,
    updatePhase,
    updateRetryProgress
  };
}
