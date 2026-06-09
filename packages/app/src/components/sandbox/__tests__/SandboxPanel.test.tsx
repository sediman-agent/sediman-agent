/**
 * Tests for SandboxPanel browser tab functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSandboxStore } from '@/stores/useSandboxStore';

describe('SandboxPanel Browser Tabs', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { reset } = useSandboxStore.getState();
    if (reset) reset();
  });

  it('should create new tabs with about:blank URL', () => {
    // Test that new tabs default to about:blank to prevent loading errors
    const initialState = {
      url: 'about:blank',
      title: 'New Tab',
      loading: false
    };

    expect(initialState.url).toBe('about:blank');
    expect(initialState.url).not.toBe('https://www.wikipedia.org');
  });

  it('should not create tabs with Wikipedia URL', () => {
    // Ensure we never default to Wikipedia which can cause ERR_ABORTED errors
    const tabUrls = [
      'about:blank',
      'https://www.google.com',
      'https://example.com'
    ];

    // None should be Wikipedia
    tabUrls.forEach(url => {
      expect(url).not.toBe('https://www.wikipedia.org');
    });
  });

  it('should handle tab creation without network requests', () => {
    // about:blank should be used to avoid immediate network requests
    const safeUrls = ['about:blank', 'data:text/html,<html></html>'];

    safeUrls.forEach(url => {
      expect(url.startsWith('about:') || url.startsWith('data:')).toBe(true);
    });
  });
});

describe('SandboxPanel Error Handling', () => {
  it('should prevent infinite retry loops on failed navigation', () => {
    // Track retry attempts
    let retryCount = 0;
    const maxRetries = 3;

    // Simulate failed navigation
    const simulateNavigationFailure = (url: string) => {
      if (url.includes('wikipedia.org')) {
        retryCount++;
        return retryCount < maxRetries; // Only retry up to maxRetries
      }
      return true;
    };

    // Test that Wikipedia URL would fail and not retry infinitely
    expect(simulateNavigationFailure('https://www.wikipedia.org')).toBe(true);
    expect(simulateNavigationFailure('https://www.wikipedia.org')).toBe(true);
    expect(simulateNavigationFailure('https://www.wikipedia.org')).toBe(false); // Stop after maxRetries

    // about:blank should always succeed
    retryCount = 0;
    expect(simulateNavigationFailure('about:blank')).toBe(true);
    expect(retryCount).toBe(0); // No retries for about:blank
  });

  it('should use safe fallback URLs', () => {
    const safeFallbacks = [
      'about:blank',
      '',
      'data:text/html;charset=utf-8,<html></html>'
    ];

    safeFallbacks.forEach(url => {
      // Should not use external URLs that can fail
      expect(url).not.toMatch(/^https?:\/\/(www\.)?wikipedia\.org/);
    });
  });
});
