/**
 * Industrial-grade custom hook for polling browser screenshots from the server
 * Following React best practices with proper typing and cleanup
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

export interface BrowserScreenshot {
  url: string;
  data: string;
  timestamp: number;
  age: number;
}

export interface UseBrowserScreenshotOptions {
  /** Whether to enable polling */
  enabled?: boolean;
  /** Polling interval in milliseconds */
  interval?: number;
  /** API endpoint URL */
  apiUrl?: string;
}

export interface UseBrowserScreenshotResult {
  /** Current screenshot data */
  screenshot: BrowserScreenshot | null;
  /** Whether a screenshot is currently being fetched */
  isLoading: boolean;
  /** Error message if fetching failed */
  error: string | null;
  /** Manually trigger a screenshot fetch */
  refetch: () => Promise<void>;
  /** Clear the current screenshot */
  clear: () => void;
}

// ============================================================================
// Custom Hook Implementation
// ============================================================================

const DEFAULT_OPTIONS: Required<UseBrowserScreenshotOptions> = {
  enabled: true,
  interval: 3000,
  apiUrl: 'http://localhost:3001/api/browser/screenshot',
};

export function useBrowserScreenshot(
  options: UseBrowserScreenshotOptions = {}
): UseBrowserScreenshotResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { enabled, interval, apiUrl } = mergedOptions;

  const [screenshot, setScreenshot] = useState<BrowserScreenshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScreenshot = useCallback(async () => {
    if (!enabled || !isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useBrowserScreenshot] Fetching screenshot from:', apiUrl);
      const response = await fetch(apiUrl);

      if (!isMountedRef.current) return; // Prevent state updates if unmounted

      if (response.ok) {
        const data = await response.json();
        console.log('[useBrowserScreenshot] Screenshot received:', {
          url: data.url,
          dataLength: data.data?.length || 0,
          timestamp: data.timestamp,
          age: data.age
        });
        setScreenshot(data);
        setError(null);
      } else if (response.status === 404) {
        // No screenshot available yet - not an error, just empty state
        console.log('[useBrowserScreenshot] No screenshot available (404)');
        setScreenshot(null);
        setError(null);
      } else {
        throw new Error(`Failed to fetch screenshot: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      if (!isMountedRef.current) return; // Prevent state updates if unmounted

      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('[useBrowserScreenshot] Fetch error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, apiUrl]);

  const clearScreenshot = useCallback(() => {
    setScreenshot(null);
    setError(null);
  }, []);

  // Set up polling interval
  useEffect(() => {
    if (!enabled) return;

    // Fetch immediately on mount
    fetchScreenshot();

    // Set up polling interval
    intervalRef.current = setInterval(fetchScreenshot, interval);

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, fetchScreenshot]);

  return {
    screenshot,
    isLoading,
    error,
    refetch: fetchScreenshot,
    clear: clearScreenshot,
  };
}
