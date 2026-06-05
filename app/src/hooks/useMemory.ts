/**
 * Improved memory hook with proper error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { getRPCClient } from '@/services/rpcClient';
import {
  createServiceContainer,
  type MemoryData,
} from '@/services';
import { isAppError, getUserMessage } from '@/errors';

export interface UseMemoryState {
  data: MemoryData | null;
  isLoading: boolean;
  error: string | null;
  searchResults: any[];
  system: string;
  stats: any;
}

export interface UseMemoryActions {
  get: () => Promise<void>;
  add: (target: 'memory' | 'user', content: string) => Promise<void>;
  replace: (target: 'memory' | 'user', oldEntry: string, newEntry: string) => Promise<void>;
  remove: (target: 'memory' | 'user', entry: string) => Promise<void>;
  search: (query: string, limit?: number) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for interacting with the memory service
 */
export function useMemory(): [UseMemoryState, UseMemoryActions] {
  const [state, setState] = useState<UseMemoryState>({
    data: null,
    isLoading: false,
    error: null,
    searchResults: [],
    system: 'file',
    stats: null,
  });

  const rpc = getRPCClient();
  const services = createServiceContainer(rpc);

  const get = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await services.memory.get();
      setState((prev) => ({
        ...prev,
        data,
        isLoading: false,
      }));
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to get memory';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services]);

  const add = useCallback(async (target: 'memory' | 'user', content: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await services.memory.add(target, content);
      // Refresh after adding
      await get();
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to add memory';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services, get]);

  const replace = useCallback(async (
    target: 'memory' | 'user',
    oldEntry: string,
    newEntry: string
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await services.memory.replace(target, oldEntry, newEntry);
      // Refresh after replacing
      await get();
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to replace memory';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services, get]);

  const remove = useCallback(async (target: 'memory' | 'user', entry: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await services.memory.remove(target, entry);
      // Refresh after removing
      await get();
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to remove memory';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services, get]);

  const search = useCallback(async (query: string, limit = 5) => {
    if (!query.trim()) {
      setState((prev) => ({ ...prev, searchResults: [] }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await services.memory.search(query, limit);
      setState((prev) => ({
        ...prev,
        searchResults: result.results,
        isLoading: false,
      }));
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to search memory';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load memory data on mount
  useEffect(() => {
    get();
  }, [get]);

  return [
    state,
    {
      get,
      add,
      replace,
      remove,
      search,
      clearError,
    },
  ];
}
