/**
 * usePanelResize Hook
 * Handles panel resize functionality
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

export function usePanelResize(initialWidth = 600) {
  const [panelWidth, setPanelWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resizeHandlers = useMemo(() => ({
    down: (e: React.MouseEvent) => {
      if (isFullscreen) return;
      setIsResizing(true);
      e.preventDefault();
    },
    move: (e: MouseEvent) => {
      if (!isResizing) return;
      const w = window.innerWidth - e.clientX;
      if (w >= 400 && w <= window.innerWidth - 100) {
        setPanelWidth(w);
      }
    },
    up: () => setIsResizing(false),
  }), [isFullscreen, isResizing]);

  useEffect(() => {
    if (!isResizing) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', resizeHandlers.move);
    window.addEventListener('mouseup', resizeHandlers.up);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', resizeHandlers.move);
      window.removeEventListener('mouseup', resizeHandlers.up);
    };
  }, [isResizing, resizeHandlers]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return {
    panelWidth,
    isResizing,
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    resizeHandlers
  };
}
