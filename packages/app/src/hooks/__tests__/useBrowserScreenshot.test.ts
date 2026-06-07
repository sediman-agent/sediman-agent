/**
 * Component Tests for useBrowserScreenshot Hook
 * Tests the screenshot polling functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { useBrowserScreenshot } from '../useBrowserScreenshot';

// Mock fetch globally
global.fetch = vi.fn();

describe('useBrowserScreenshot Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useBrowserScreenshot());

      expect(result.current.screenshot).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should fetch screenshot immediately when enabled', async () => {
      const mockScreenshot = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScreenshot
      });

      const { result } = renderHook(() => useBrowserScreenshot({ enabled: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.screenshot).toEqual(mockScreenshot);
      });
    });

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useBrowserScreenshot({ enabled: false }));

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.screenshot).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBrowserScreenshot({ enabled: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Network error');
      });
    });

    it('should handle 404 responses gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const { result } = renderHook(() => useBrowserScreenshot({ enabled: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.screenshot).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Polling Behavior', () => {
    it('should poll at specified interval', async () => {
      const mockScreenshot = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScreenshot
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: true, interval: 1000 })
      );

      // Initial fetch
      await waitFor(() => {
        expect(result.current.screenshot).not.toBeNull();
      });

      const fetchCountBefore = (global.fetch as any).mock.calls.length;

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBe(fetchCountBefore + 1);
      });
    });

    it('should stop polling when disabled', async () => {
      const mockScreenshot = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScreenshot
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useBrowserScreenshot({ enabled }),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(result.current.screenshot).not.toBeNull();
      });

      const fetchCountBefore = (global.fetch as any).mock.calls.length;

      // Disable polling
      rerender({ enabled: false });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not fetch again
      expect((global.fetch as any).mock.calls.length).toBe(fetchCountBefore);
    });

    it('should clear interval on unmount', async () => {
      const mockScreenshot = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScreenshot
      });

      const { unmount } = renderHook(() =>
        useBrowserScreenshot({ enabled: true, interval: 1000 })
      );

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
      });

      const fetchCountBefore = (global.fetch as any).mock.calls.length;

      act(() => {
        unmount();
        vi.advanceTimersByTime(5000);
      });

      // Should not fetch after unmount
      expect((global.fetch as any).mock.calls.length).toBe(fetchCountBefore);
    });
  });

  describe('Manual Operations', () => {
    it('should support manual refetch', async () => {
      const mockScreenshot = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScreenshot
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: false })
      );

      expect(global.fetch).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.refetch();
      });

      expect(global.fetch).toHaveBeenCalled();
      expect(result.current.screenshot).toEqual(mockScreenshot);
    });

    it('should support manual clear', async () => {
      const mockScreenshot = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScreenshot
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: true })
      );

      await waitFor(() => {
        expect(result.current.screenshot).not.toBeNull();
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.screenshot).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should update loading state correctly', async () => {
      let resolveFetch: any;
      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise(resolve => {
          resolveFetch = resolve;
        });
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: true })
      );

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFetch({
          ok: true,
          json: async () => ({ url: 'https://example.com', data: 'data', timestamp: Date.now(), age: 1000 })
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle response parsing errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: true })
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error).toContain('Invalid JSON');
      });
    });

    it('should handle API error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: true })
      });

      await waitFor(() => {
        expect(result.current.error).toContain('500');
        expect(result.current.error).toContain('Internal Server Error');
      });
    });
  });

  describe('Configuration', () => {
    it('should use default API URL', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://example.com', data: 'data', timestamp: Date.now(), age: 1000 })
      });

      renderHook(() => useBrowserScreenshot({ enabled: true }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/browser/screenshot'
        );
      });
    });

    it('should use custom API URL', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://example.com', data: 'data', timestamp: Date.now(), age: 1000 })
      });

      renderHook(() =>
        useBrowserScreenshot({
          enabled: true,
          apiUrl: 'https://custom.api.com/screenshot'
        })
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'https://custom.api.com/screenshot'
        );
      });
    });

    it('should use custom interval', async () => {
      const mockScreenshot = {
        url: 'https://example.com',
        data: 'base64data',
        timestamp: Date.now(),
        age: 1000
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockScreenshot
      });

      renderHook(() =>
        useBrowserScreenshot({ enabled: true, interval: 500 })
      );

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
      });

      const fetchCountBefore = (global.fetch as any).mock.calls.length;

      act(() => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBe(fetchCountBefore + 1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid enable/disable cycles', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://example.com', data: 'data', timestamp: Date.now(), age: 1000 })
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useBrowserScreenshot({ enabled }),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(result.current.screenshot).not.toBeNull();
      });

      // Disable
      rerender({ enabled: false });

      // Re-enable quickly
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.screenshot).not.toBeNull();
      });
    });

    it('should handle concurrent refetch calls', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://example.com', data: 'data', timestamp: Date.now(), age: 1000 })
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: false })
      );

      await act(async () => {
        // Trigger multiple concurrent refetches
        await Promise.all([
          result.current.refetch(),
          result.current.refetch(),
          result.current.refetch()
        ]);
      });

      // Should handle gracefully
      expect(result.current.error).toBeNull();
    });

    it('should handle empty response data', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ url: '', data: '', timestamp: Date.now(), age: 0 })
      });

      const { result } = renderHook(() =>
        useBrowserScreenshot({ enabled: true })
      );

      await waitFor(() => {
        expect(result.current.screenshot).not.toBeNull();
        expect(result.current.screenshot?.url).toBe('');
        expect(result.current.screenshot?.data).toBe('');
      });
    });
  });
});
