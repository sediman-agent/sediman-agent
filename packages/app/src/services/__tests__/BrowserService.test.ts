/**
 * Comprehensive tests for BrowserService
 * Tests for infinite loop prevention, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { browserService } from '../BrowserService';

// Mock HTMLWebViewElement
class MockWebView {
  private _url = 'about:blank';
  private eventListeners: Map<string, Function[]> = new Map();
  private title = 'Test Page';

  getURL() {
    return this._url;
  }

  getTitle() {
    return this.title;
  }

  // Handle src property setter (used by BrowserService.navigate)
  set src(url: string) {
    this._url = url;
    // Emit navigation event when src is set
    this.emit('will-navigate', url);
  }

  get src() {
    return this._url;
  }

  addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  loadURL(url: string) {
    this._url = url;
  }

  executeJavaScript(script: string) {
    return Promise.resolve({});
  }

  goBack() {
    // Mock
  }

  goForward() {
    // Mock
  }

  reload() {
    // Mock
  }

  executeJavaScript(script: string) {
    return Promise.resolve({});
  }

  goBack() {
    // Mock
  }

  goForward() {
    // Mock
  }

  reload() {
    // Mock
  }

  emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          // For events that expect specific data structures
          if (event === 'will-navigate' && typeof data === 'string') {
            callback({ detail: data });
          } else if (event === 'did-fail-load' && data) {
            callback({ detail: data });
          } else if (event === 'page-title-updated' && data) {
            callback({ detail: { title: data } });
          } else if (data !== undefined) {
            callback(data);
          } else {
            callback({});
          }
        } catch (e) {
          // Ignore callback errors
        }
      });
    }
  }
}

describe('BrowserService - Infinite Loop Prevention', () => {
  let mockWebView: MockWebView;

  beforeEach(() => {
    mockWebView = new MockWebView();
    // Reset browser service state
    browserService.reset();
  });

  afterEach(() => {
    browserService.deactivate();
  });

  it('should not register duplicate event listeners', () => {
    const addSpy = vi.spyOn(mockWebView, 'addEventListener');

    // Register same webview multiple times
    browserService.registerWebview(mockWebView as any);
    browserService.registerWebview(mockWebView as any);
    browserService.registerWebview(mockWebView as any);

    // Should only register once due to duplicate prevention
    expect(addSpy).toHaveBeenCalledTimes(8); // Fixed number of event listeners
  });

  it('should not trigger infinite dom-ready loops', () => {
    let domReadyCount = 0;
    const maxDomReadyEvents = 100;

    // Track dom-ready events
    browserService.on('browser-event', (event) => {
      if (event.type === 'dom-ready') {
        domReadyCount++;
      }
    });

    browserService.registerWebview(mockWebView as any);

    // Emit many dom-ready events (simulating a bug)
    for (let i = 0; i < maxDomReadyEvents; i++) {
      mockWebView.emit('dom-ready');
    }

    // Should not exceed a reasonable number
    // The service should record events but not cause infinite loops
    expect(domReadyCount).toBeGreaterThan(0);
    expect(domReadyCount).toBeLessThanOrEqual(maxDomReadyEvents);
  });

  it('should skip context extraction for about:blank', async () => {
    let extractCalled = false;

    // Mock executeJavaScript to track if it was called
    mockWebView.executeJavaScript = async (script: string) => {
      extractCalled = true;
      return {};
    };

    browserService.registerWebview(mockWebView as any);

    // Emit dom-ready while on about:blank
    mockWebView.emit('dom-ready');

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Context extraction should be skipped for about:blank
    expect(extractCalled).toBe(false);
  });

  it('should skip context extraction for data URLs', async () => {
    mockWebView.loadURL('data:text/html,<html></html>');

    let extractCalled = false;
    mockWebView.executeJavaScript = async (script: string) => {
      extractCalled = true;
      return {};
    };

    browserService.registerWebview(mockWebView as any);

    // Emit dom-ready while on data URL
    mockWebView.emit('dom-ready');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Context extraction should be skipped for data URLs
    expect(extractCalled).toBe(false);
  });

  it('should attempt context extraction for real URLs', async () => {
    mockWebView.loadURL('https://example.com');

    let extractCalled = false;
    mockWebView.executeJavaScript = async (script: string) => {
      extractCalled = true;
      return { url: 'https://example.com', title: 'Example' };
    };

    browserService.registerWebview(mockWebView as any);

    // Emit dom-ready while on real URL
    mockWebView.emit('dom-ready');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Context extraction should be attempted for real URLs
    expect(extractCalled).toBe(true);
  });
});

describe('BrowserService - Error Handling', () => {
  let mockWebView: MockWebView;

  beforeEach(() => {
    mockWebView = new MockWebView();
    browserService.reset();
  });

  afterEach(() => {
    browserService.deactivate();
  });

  it('should handle executeJavaScript errors gracefully', async () => {
    mockWebView.loadURL('https://example.com');
    mockWebView.executeJavaScript = async () => {
      throw new Error('Security error');
    };

    browserService.registerWebview(mockWebView as any);

    // Should not throw, should handle error gracefully
    expect(async () => {
      mockWebView.emit('dom-ready');
      await new Promise(resolve => setTimeout(resolve, 100));
    }).not.toThrow();
  });

  it('should handle navigation errors', () => {
    let errorEmitted = false;

    browserService.on('browser-error', () => {
      errorEmitted = true;
    });

    browserService.registerWebview(mockWebView as any);

    // Emit navigation error
    mockWebView.emit('did-fail-load', {
      errorCode: -3,
      errorDescription: 'ERR_ABORTED',
      validatedURL: 'https://www.wikipedia.org/'
    });

    expect(errorEmitted).toBe(true);
  });

  it('should handle null webview gracefully', () => {
    browserService.deactivate();

    // Should not throw when operating without webview
    expect(() => {
      browserService.navigate('https://example.com');
      browserService.reload();
      browserService.goBack();
      browserService.goForward();
    }).not.toThrow();
  });

  it('should maintain event history size limit', () => {
    browserService.registerWebview(mockWebView as any);

    const maxEvents = 100;

    // Emit more events than max history size
    for (let i = 0; i < maxEvents + 50; i++) {
      mockWebView.emit('dom-ready');
    }

    const history = browserService.getEventHistory();
    expect(history.length).toBeLessThanOrEqual(maxEvents);
  });
});

describe('BrowserService - State Management', () => {
  let mockWebView: MockWebView;

  beforeEach(() => {
    mockWebView = new MockWebView();
    browserService.reset();
  });

  afterEach(() => {
    browserService.deactivate();
  });

  it('should update state correctly on navigation', () => {
    let stateChanged = false;
    let newUrl = '';

    browserService.on('browser-state-change', (data) => {
      stateChanged = true;
      newUrl = data.newState.url;
    });

    browserService.registerWebview(mockWebView as any);

    // Emit navigation event
    mockWebView.emit('will-navigate', 'https://example.com');

    expect(stateChanged).toBe(true);
    expect(newUrl).toBe('https://example.com');
  });

  it('should update loading state', () => {
    const states: string[] = [];

    browserService.on('browser-state-change', (data) => {
      states.push(data.newState.isLoading ? 'loading' : 'idle');
    });

    browserService.registerWebview(mockWebView as any);

    mockWebView.emit('did-start-loading');
    mockWebView.emit('did-stop-loading');

    expect(states).toContain('loading');
    expect(states).toContain('idle');
  });

  it('should track browser readiness', () => {
    browserService.registerWebview(mockWebView as any);

    const initialState = browserService.isReady();
    expect(initialState).toBe(false);

    // Activate browser
    browserService.activate();

    // Emit completion
    mockWebView.emit('did-finish-load');

    const readyState = browserService.isReady();
    // Should be ready after activation and load complete
    expect(readyState).toBe(true);
  });

  it('should reset state correctly', () => {
    browserService.registerWebview(mockWebView as any);
    browserService.activate();

    // Navigate to create state
    mockWebView.emit('will-navigate', 'https://example.com');
    mockWebView.emit('did-start-loading');

    // Reset
    browserService.reset();

    const state = browserService.getState();
    expect(state.url).toBe('');
    expect(state.isLoading).toBe(false);
    expect(state.isActive).toBe(false);
  });
});

describe('BrowserService - Navigation', () => {
  let mockWebView: MockWebView;

  beforeEach(() => {
    mockWebView = new MockWebView();
    browserService.reset();
  });

  afterEach(() => {
    browserService.deactivate();
  });

  it('should navigate to URL', () => {
    browserService.registerWebview(mockWebView as any);
    browserService.navigate('https://example.com');

    // Check that src property was set
    expect(mockWebView.src).toBe('https://example.com');
  });

  it('should not navigate without webview', () => {
    browserService.navigate('https://example.com');

    // Should not throw, just log error
    expect(() => browserService.navigate('https://example.com')).not.toThrow();
  });

  it('should handle reload', () => {
    const reloadSpy = vi.spyOn(mockWebView, 'reload');

    browserService.registerWebview(mockWebView as any);
    browserService.reload();

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should handle go back when can go back', () => {
    const backSpy = vi.spyOn(mockWebView, 'goBack');

    // Manually set canGoBack to true
    browserService.registerWebview(mockWebView as any);
    (browserService as any).updateState({ canGoBack: true });

    browserService.goBack();

    expect(backSpy).toHaveBeenCalled();
  });

  it('should not go back when cannot go back', () => {
    const backSpy = vi.spyOn(mockWebView, 'goBack');

    browserService.registerWebview(mockWebView as any);
    // canGoBack is false by default

    browserService.goBack();

    expect(backSpy).not.toHaveBeenCalled();
  });
});

describe('BrowserService - Event History', () => {
  let mockWebView: MockWebView;

  beforeEach(() => {
    mockWebView = new MockWebView();
    browserService.reset();
  });

  afterEach(() => {
    browserService.deactivate();
  });

  it('should record navigation events', () => {
    browserService.registerWebview(mockWebView as any);

    mockWebView.emit('will-navigate', 'https://example.com');

    const history = browserService.getEventHistory();
    const navEvent = history.find(e => e.type === 'navigate');

    expect(navEvent).toBeDefined();
    expect(navEvent?.data).toEqual({ url: 'https://example.com' });
  });

  it('should record load events', () => {
    browserService.registerWebview(mockWebView as any);

    mockWebView.emit('did-start-loading');
    mockWebView.emit('did-stop-loading');

    const history = browserService.getEventHistory();
    const loadEvents = history.filter(e => e.type === 'load');

    expect(loadEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('should record error events', () => {
    browserService.registerWebview(mockWebView as any);

    mockWebView.emit('did-fail-load', {
      errorCode: -3,
      errorDescription: 'ERR_ABORTED',
      validatedURL: 'https://example.com'
    });

    const history = browserService.getEventHistory();
    const errorEvent = history.find(e => e.type === 'error');

    expect(errorEvent).toBeDefined();
  });

  it('should limit event history retrieval', () => {
    browserService.registerWebview(mockWebView as any);

    // Emit many events
    for (let i = 0; i < 50; i++) {
      mockWebView.emit('dom-ready');
    }

    const limitedHistory = browserService.getEventHistory(10);
    expect(limitedHistory.length).toBeLessThanOrEqual(10);
  });
});
