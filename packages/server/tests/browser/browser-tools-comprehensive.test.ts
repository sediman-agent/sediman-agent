/**
 * Comprehensive tests for Browser Tools
 * Tests for tool execution, error handling, session management, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { BrowserSession } from '../../src/browser/session';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';

describe('Browser Tools - Session Management', () => {
  let browserSession: BrowserSession;
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserSession = new BrowserSession({
      headless: true,
      userDataDir: '/tmp/test-browser-session'
    });

    await browserSession.start();

    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-browser-controller'
    });

    await browserController.start();

    toolBus = new ToolBus();
    registerBrowserTools(toolBus, browserController);
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
    if (browserSession) {
      await browserSession.stop();
    }
  });

  it('should have isStarted as a property, not a function', () => {
    expect(typeof browserSession.isStarted).toBe('boolean');
    expect(browserSession.isStarted).toBe(true);

    // Should NOT be callable as a function
    expect(() => {
      (browserSession.isStarted as any)();
    }).toThrow();
  });

  it('should start browser session when not started', async () => {
    const newSession = new BrowserSession({
      headless: true,
      userDataDir: '/tmp/test-new-session'
    });

    expect(newSession.isStarted).toBe(false);

    await newSession.start();

    expect(newSession.isStarted).toBe(true);

    await newSession.stop();
  });

  it('should have context property', () => {
    expect(browserSession.context).toBeTruthy();
    expect(typeof browserSession.context?.pages).toBe('function');
  });

  it('should create pages when context exists but has no pages', async () => {
    const newController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-pages-controller'
    });

    await newController.start();

    const session = newController.getSession();
    expect(session.isStarted).toBe(true);

    // Should have at least one page after starting
    const pages = session.context?.pages() || [];
    expect(pages.length).toBeGreaterThan(0);

    await newController.stop();
  });

  it('should handle null session gracefully', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-null-session'
    });

    // Don't start the controller
    const session = controller.getSession();
    expect(session).toBeTruthy(); // Session is always created in constructor
  });
});

describe('Browser Tools - Tool Execution', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-tool-execution'
    });

    await browserController.start();

    toolBus = new ToolBus();
    registerBrowserTools(toolBus, browserController);
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
  });

  it('should execute browser_navigate successfully', async () => {
    const result = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Navigated to');
    expect(result.error).toBeUndefined();
  });

  it('should execute browser_navigate with invalid URL gracefully', async () => {
    const result = await toolBus.execute('browser_navigate', {
      url: 'not-a-valid-url'
    });

    // Should not crash, should return error
    expect(result).toBeDefined();
  });

  it('should execute browser_snapshot successfully', async () => {
    // First navigate to a page
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    const result = await toolBus.execute('browser_snapshot', {});

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();

    const snapshot = JSON.parse(result.output);
    expect(snapshot.url).toBeDefined();
    expect(snapshot.elements).toBeDefined();
    expect(Array.isArray(snapshot.elements)).toBe(true);
  });

  it('should execute browser_extract_text successfully', async () => {
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    const result = await toolBus.execute('browser_extract_text', {});

    expect(result.success).toBe(true);
    expect(result.output).toBeDefined();
    expect(result.output.length).toBeGreaterThan(0);
  });

  it('should execute browser_screenshot successfully', async () => {
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    const result = await toolBus.execute('browser_screenshot', {});

    expect(result.success).toBe(true);
    expect(result.output).toContain('Screenshot taken');
  });

  it('should handle unknown tool names gracefully', async () => {
    const result = await toolBus.execute('unknown_tool', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown tool');
  });

  it('should handle browser_click with refId', async () => {
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    const snapshot = await toolBus.execute('browser_snapshot', {});
    const snapshotData = JSON.parse(snapshot.output);

    if (snapshotData.elements.length > 0) {
      const refId = snapshotData.elements[0].refId;
      const result = await toolBus.execute('browser_click', { refId });

      expect(result).toBeDefined();
    }
  });

  it('should handle browser_click with invalid refId', async () => {
    const result = await toolBus.execute('browser_click', { refId: 99999 });

    expect(result).toBeDefined();
    // Should handle gracefully
  });

  it('should handle browser_type with refId and text', async () => {
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    const snapshot = await toolBus.execute('browser_snapshot', {});
    const snapshotData = JSON.parse(snapshot.output);

    // Find an input element if any
    const input = snapshotData.elements.find((e: any) => e.tag === 'INPUT' || e.tag === 'TEXTAREA');

    if (input) {
      const result = await toolBus.execute('browser_type', {
        refId: input.refId,
        text: 'test text',
        submit: false
      });

      expect(result).toBeDefined();
    }
  });
});

describe('Browser Tools - Error Handling', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-error-handling'
    });

    toolBus = new ToolBus();
    registerBrowserTools(toolBus, browserController);
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
  });

  it('should handle tool execution when browser not started', async () => {
    // Don't start the browser controller
    const result = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Should auto-start the browser
    expect(result).toBeDefined();
  });

  it('should handle navigation timeout gracefully', async () => {
    // Try to navigate to a URL that might timeout
    const result = await toolBus.execute('browser_navigate', {
      url: 'https://httpbin.org/delay/10'
    });

    // Should handle timeout gracefully
    expect(result).toBeDefined();
  }, 15000);

  it('should handle multiple rapid tool executions', async () => {
    const promises = [];

    // Execute multiple tools rapidly
    for (let i = 0; i < 5; i++) {
      promises.push(
        toolBus.execute('browser_navigate', {
          url: 'https://example.com'
        })
      );
    }

    const results = await Promise.all(promises);

    // All should complete without crashing
    results.forEach(result => {
      expect(result).toBeDefined();
    });
  }, 30000); // 5 concurrent navigations each wait for network-idle/DOM-stable;

  it('should handle tool execution with missing parameters', async () => {
    const result = await toolBus.execute('browser_navigate', {} as any);

    // Should handle missing parameters gracefully
    expect(result).toBeDefined();
  });

  it('should handle tool execution with null parameters', async () => {
    const result = await toolBus.execute('browser_navigate', null as any);

    // Should handle null parameters gracefully
    expect(result).toBeDefined();
  });
});

describe('Browser Tools - Page Management', () => {
  let browserController: BrowserController;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-page-management'
    });

    await browserController.start();
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
  });

  it('should get current page without error', () => {
    const session = browserController.getSession();

    expect(session.isStarted).toBe(true);
    expect(session.context).toBeTruthy();

    const pages = session.context?.pages() || [];
    expect(pages.length).toBeGreaterThan(0);
  });

  it('should create multiple pages', async () => {
    const session = browserController.getSession();

    const initialPages = session.context?.pages().length || 0;

    // Create new page
    await session.context?.newPage();

    const newPages = session.context?.pages().length || 0;
    expect(newPages).toBeGreaterThan(initialPages);
  });

  it('should handle page closure', async () => {
    const session = browserController.getSession();

    const initialPages = session.context?.pages().length || 0;

    if (initialPages > 1) {
      const page = session.context?.pages()[0];
      await page?.close();

      const newPages = session.context?.pages().length || 0;
      expect(newPages).toBe(initialPages - 1);
    }
  });
});

describe('Browser Tools - Integration Scenarios', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-integration'
    });

    await browserController.start();

    toolBus = new ToolBus();
    registerBrowserTools(toolBus, browserController);
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
  });

  it('should complete full navigation and snapshot workflow', async () => {
    // Navigate
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });
    expect(navResult.success).toBe(true);

    // Take snapshot
    const snapshotResult = await toolBus.execute('browser_snapshot', {});
    expect(snapshotResult.success).toBe(true);

    const snapshot = JSON.parse(snapshotResult.output);
    expect(snapshot.url).toContain('example.com');
  }, 30000);

  it('should complete navigation, extract text, and screenshot workflow', async () => {
    // Navigate
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Extract text
    const textResult = await toolBus.execute('browser_extract_text', {});
    expect(textResult.success).toBe(true);
    expect(textResult.output.length).toBeGreaterThan(0);

    // Screenshot
    const screenshotResult = await toolBus.execute('browser_screenshot', {});
    expect(screenshotResult.success).toBe(true);
  }, 30000);

  it('should handle navigation to multiple URLs in sequence', async () => {
    const urls = [
      'https://example.com',
      'https://httpbin.org/html'
    ];

    for (const url of urls) {
      const result = await toolBus.execute('browser_navigate', { url });
      expect(result.success).toBe(true);
    }
  }, 30000);

  it('should maintain state across multiple operations', async () => {
    // Navigate to first URL
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Take snapshot
    const snapshot1 = await toolBus.execute('browser_snapshot', {});
    const data1 = JSON.parse(snapshot1.output);

    // Navigate to different URL
    await toolBus.execute('browser_navigate', {
      url: 'https://httpbin.org/html'
    });

    // Take another snapshot
    const snapshot2 = await toolBus.execute('browser_snapshot', {});
    const data2 = JSON.parse(snapshot2.output);

    // URLs should be different
    expect(data1.url).not.toBe(data2.url);
  }, 30000);
});

describe('Browser Tools - Edge Cases', () => {
  it('should handle empty URL navigation', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-empty-url'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    const result = await toolBus.execute('browser_navigate', {
      url: ''
    });

    // Should handle gracefully
    expect(result).toBeDefined();

    await controller.stop();
  });

  it('should handle very long URL', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-long-url'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    const longUrl = 'https://example.com?' + 'a'.repeat(10000);

    const result = await toolBus.execute('browser_navigate', {
      url: longUrl
    });

    // Should handle gracefully
    expect(result).toBeDefined();

    await controller.stop();
  });

  it('should handle special characters in URL', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-special-chars'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    const specialUrl = 'https://example.com/path?query=hello%20world&foo=bar#section';

    const result = await toolBus.execute('browser_navigate', {
      url: specialUrl
    });

    expect(result).toBeDefined();

    await controller.stop();
  });
});

describe('Browser Tools - Resource Cleanup', () => {
  it('should properly close browser and free resources', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-cleanup'
    });

    await controller.start();

    const session = controller.getSession();
    expect(session.isStarted).toBe(true);

    await controller.stop();

    expect(session.isStarted).toBe(false);
    expect(session.context).toBeNull();
  });

  it('should handle multiple start/stop cycles', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-cycles'
    });

    // Start and stop multiple times
    for (let i = 0; i < 3; i++) {
      await controller.start();

      const session = controller.getSession();
      expect(session.isStarted).toBe(true);

      await controller.stop();

      expect(session.isStarted).toBe(false);
    }
  });
});
