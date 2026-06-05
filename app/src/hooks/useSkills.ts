/**
 * Improved skills hook with proper error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { getRPCClient } from '@/services/rpcClient';
import {
  createServiceContainer,
  type Skill,
  type HubSkill,
} from '@/services';
import { isAppError, getUserMessage } from '@/errors';

export interface UseSkillsState {
  skills: Skill[];
  hubSkills: HubSkill[];
  isLoading: boolean;
  error: string | null;
  searchResults: HubSkill[];
}

export interface UseSkillsActions {
  list: () => Promise<void>;
  browse: (category?: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  install: (name: string, force?: boolean) => Promise<void>;
  remove: (name: string) => Promise<void>;
  run: (name: string) => Promise<string>;
  clearError: () => void;
}

/**
 * Hook for interacting with the skills service
 */
export function useSkills(): [UseSkillsState, UseSkillsActions] {
  const [state, setState] = useState<UseSkillsState>({
    skills: [],
    hubSkills: [],
    isLoading: false,
    error: null,
    searchResults: [],
  });

  const rpc = getRPCClient();
  const services = createServiceContainer(rpc);

  const list = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const skills = await services.skills.list();
      setState({
        skills,
        hubSkills: [],
        isLoading: false,
        error: null,
        searchResults: [],
      });
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to list skills';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services]);

  const browse = useCallback(async (category?: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const hubSkills = await services.skills.browse(category);
      setState((prev) => ({
        ...prev,
        hubSkills,
        isLoading: false,
      }));
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to browse skills';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services]);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState((prev) => ({ ...prev, searchResults: [] }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const results = await services.skills.search(query);
      setState((prev) => ({
        ...prev,
        searchResults: results,
        isLoading: false,
      }));
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to search skills';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services]);

  const install = useCallback(async (name: string, force = false) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await services.skills.install(name, force);
      // Refresh the list after installing
      await list();
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to install skill';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services, list]);

  const remove = useCallback(async (name: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await services.skills.remove(name);
      // Refresh the list after removing
      await list();
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to remove skill';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [services, list]);

  const run = useCallback(async (name: string) => {
    try {
      const result = await services.skills.run(name);
      return result.result;
    } catch (error) {
      const message = isAppError(error) ? getUserMessage(error) : 'Failed to run skill';
      setState((prev) => ({ ...prev, error: message }));
      throw error;
    }
  }, [services]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load skills on mount
  useEffect(() => {
    list();
  }, [list]);

  return [
    state,
    {
      list,
      browse,
      search,
      install,
      remove,
      run,
      clearError,
    },
  ];
}
