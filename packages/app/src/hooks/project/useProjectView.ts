/**
 * useProjectView Hook
 * Manages project view modes and context window state
 */

import { useState, useCallback, useEffect } from 'react';

export type ViewMode = 'split' | 'chat' | 'diff';

export function useProjectView() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showDiff, setShowDiff] = useState(false);
  const [contextUsed, setContextUsed] = useState(0);
  const [contextMax] = useState(200000);
  const [isStartingBrowser, setIsStartingBrowser] = useState(false);

  // Toggle view mode
  const toggleViewMode = useCallback((mode?: ViewMode) => {
    setViewMode(mode || (prev => {
      switch (prev) {
        case 'split': return 'chat';
        case 'chat': return 'diff';
        case 'diff': return 'split';
      }
    }));
  }, [setViewMode]);

  // Toggle diff panel
  const toggleDiff = useCallback(() => {
    setShowDiff(prev => !prev);
  }, []);

  // Update context usage
  const updateContextUsed = useCallback((value: number) => {
    setContextUsed(value);
  }, []);

  // Increment context usage (for simulation)
  const incrementContext = useCallback(() => {
    setContextUsed(prev => Math.min(prev + 1000, contextMax));
  }, [contextMax]);

  // Reset context usage
  const resetContext = useCallback(() => {
    setContextUsed(0);
  }, []);

  // Set browser starting state
  const setBrowserStarting = useCallback((starting: boolean) => {
    setIsStartingBrowser(starting);
  }, []);

  return {
    viewMode,
    showDiff,
    contextUsed,
    contextMax,
    isStartingBrowser,
    setViewMode,
    toggleViewMode,
    toggleDiff,
    updateContextUsed,
    incrementContext,
    resetContext,
    setBrowserStarting
  };
}
