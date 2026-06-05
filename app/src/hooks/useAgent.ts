/**
 * Improved agent hook with proper error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { getRPCClient } from '@/services/rpcClient';
import {
  createServiceContainer,
  type StreamCallbacks,
  type AgentStatus,
} from '@/services';
import {
  isAppError,
  getUserMessage,
} from '@/errors';

export interface UseAgentState {
  status: AgentStatus | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  result: string | null;
  steps: any[];
}

export interface UseAgentActions {
  run: (task: string, mode?: string) => Promise<void>;
  stream: (task: string, callbacks: StreamCallbacks, mode?: string) => Promise<void>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for interacting with the agent service
 * Provides improved error handling and type safety
 */
export function useAgent(): [UseAgentState, UseAgentActions] {
  const [state, setState] = useState<UseAgentState>({
    status: null,
    isLoading: false,
    isStreaming: false,
    error: null,
    result: null,
    steps: [],
  });

  const rpc = getRPCClient();
  const services = createServiceContainer(rpc);

  const refresh = useCallback(async () => {
    try {
      const status = await services.agent.getStatus();
      setState((prev) => ({ ...prev, status }));
    } catch (error) {
      console.error('Failed to refresh agent status:', error);
    }
  }, [services]);

  const run = useCallback(async (task: string, mode = 'manager') => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      result: null,
      steps: [],
    }));

    try {
      const result = await services.agent.run(task, mode);

      setState({
        status: null,
        isLoading: false,
        isStreaming: false,
        error: null,
        result: result.result,
        steps: result.steps,
      });
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to run task';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services]);

  const stream = useCallback(async (
    task: string,
    callbacks: StreamCallbacks,
    mode = 'manager'
  ) => {
    setState((prev) => ({
      ...prev,
      isStreaming: true,
      error: null,
      result: null,
      steps: [],
    }));

    let accumulatedResult = '';

    try {
      await services.agent.stream(task, {
        onChunk: (delta: string, phase: string | undefined) => {
          accumulatedResult += delta;
          callbacks.onChunk(delta, phase);
        },
        onProgress: callbacks.onProgress,
        onDone: () => {
          setState({
            status: null,
            isLoading: false,
            isStreaming: false,
            error: null,
            result: accumulatedResult,
            steps: [],
          });
          callbacks.onDone?.();
        },
        onError: (error: string) => {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error,
          }));
          callbacks.onError?.(error);
        },
      }, mode);
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to stream task';
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: message,
      }));
    }
  }, [services]);

  const cancel = useCallback(async () => {
    try {
      await services.agent.cancel();
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        isLoading: false,
      }));
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to cancel task';
      setState((prev) => ({
        ...prev,
        error: message,
      }));
    }
  }, [services]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Auto-refresh status on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return [
    state,
    {
      run,
      stream,
      cancel,
      refresh,
      clearError,
    },
  ];
}
