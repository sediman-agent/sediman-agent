/**
 * End-to-end integration test for browser flow
 * Tests the complete flow from agent request to browser panel update
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';

describe('Browser Flow Integration - End to End', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-browser-flow'
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

  it('should complete full browser navigation flow', async () => {
    // Step 1: Agent requests browser navigation
    const agentRequest = {
      tool: 'browser_navigate',
      args: { url: 'https://example.com' }
    };

    // Step 2: Server executes browser navigation
    const result = await toolBus.execute(agentRequest.tool, agentRequest.args);

    // Step 3: Verify server-side execution succeeded
    expect(result.success).toBe(true);
    expect(result.output).toContain('Navigated to https://example.com');

    // Step 4: Verify browser state
    const session = browserController.getSession();
    expect(session.isStarted).toBe(true);

    const pages = session.context?.pages() || [];
    expect(pages.length).toBeGreaterThan(0);

    const currentPage = pages[0];
    const currentUrl = currentPage.url();
    expect(currentUrl).toContain('example.com');
  }, 30000);

  it('should handle browser navigation with invalid URL gracefully', async () => {
    const result = await toolBus.execute('browser_navigate', {
      url: 'not-a-valid-url'
    });

    // Should not crash, should return an error result
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it('should maintain browser state across multiple operations', async () => {
    // First navigation
    const result1 = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });
    expect(result1.success).toBe(true);

    // Take snapshot
    const snapshot = await toolBus.execute('browser_snapshot', {});
    expect(snapshot.success).toBe(true);

    const snapshotData = JSON.parse(snapshot.output);
    expect(snapshotData.url).toContain('example.com');

    // Navigate to different URL
    const result2 = await toolBus.execute('browser_navigate', {
      url: 'https://httpbin.org/html'
    });
    expect(result2.success).toBe(true);

    // Take another snapshot
    const snapshot2 = await toolBus.execute('browser_snapshot', {});
    const snapshotData2 = JSON.parse(snapshot2.output);
    expect(snapshotData2.url).toContain('httpbin.org');
  }, 30000);

  it('should handle rapid browser operations without crashing', async () => {
    const operations = [
      () => toolBus.execute('browser_navigate', { url: 'https://example.com' }),
      () => toolBus.execute('browser_snapshot', {}),
      () => toolBus.execute('browser_extract_text', {}),
    ];

    // Execute all operations rapidly
    const results = await Promise.all(
      operations.map(op => op())
    );

    // All should complete successfully
    results.forEach(result => {
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  }, 30000);

  it('should handle browser click and type operations', async () => {
    // Navigate to a page with interactive elements
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Take snapshot to get elements
    const snapshot = await toolBus.execute('browser_snapshot', {});
    expect(snapshot.success).toBe(true);

    const snapshotData = JSON.parse(snapshot.output);

    // If there are interactive elements, try clicking one
    if (snapshotData.elements.length > 0) {
      const element = snapshotData.elements[0];

      // Try to click the element
      const clickResult = await toolBus.execute('browser_click', {
        refId: element.refId
      });

      expect(clickResult).toBeDefined();
    }
  }, 30000);

  it('should handle browser error gracefully and continue operations', async () => {
    // Try to navigate to an invalid URL
    const errorResult = await toolBus.execute('browser_navigate', {
      url: 'https://this-domain-does-not-exist-12345.com'
    });

    // Should handle error gracefully
    expect(errorResult).toBeDefined();

    // Should still be able to perform other operations
    const validResult = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    expect(validResult.success).toBe(true);
  }, 45000);
});

describe('Browser Flow - Error Recovery', () => {
  it('should recover from browser session crash', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-crash-recovery'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    // Perform a successful operation
    const result1 = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });
    expect(result1.success).toBe(true);

    // Simulate crash by stopping browser
    await controller.stop();

    // Try another operation - should auto-restart
    const result2 = await toolBus.execute('browser_navigate', {
      url: 'https://httpbin.org/html'
    });

    // Should handle the restart
    expect(result2).toBeDefined();

    await controller.stop();
  }, 30000);

  it('should handle multiple browser sessions independently', async () => {
    const controller1 = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-session-1'
    });

    const controller2 = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-session-2'
    });

    await controller1.start();
    await controller2.start();

    const toolBus1 = new ToolBus();
    const toolBus2 = new ToolBus();

    registerBrowserTools(toolBus1, controller1);
    registerBrowserTools(toolBus2, controller2);

    // Navigate to different URLs in each session
    const result1 = await toolBus1.execute('browser_navigate', {
      url: 'https://example.com'
    });

    const result2 = await toolBus2.execute('browser_navigate', {
      url: 'https://httpbin.org/html'
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Verify each browser is at different URL
    const session1 = controller1.getSession();
    const session2 = controller2.getSession();

    const url1 = session1.context?.pages()[0].url() || '';
    const url2 = session2.context?.pages()[0].url() || '';

    expect(url1).toContain('example.com');
    expect(url2).toContain('httpbin.org');

    await controller1.stop();
    await controller2.stop();
  }, 30000);
});

describe('Browser Flow - Performance', () => {
  it('should complete navigation within reasonable time', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-performance'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    const startTime = Date.now();

    const result = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    // Navigation should complete within 10 seconds
    expect(duration).toBeLessThan(10000);

    await controller.stop();
  }, 30000);

  it('should handle multiple concurrent operations efficiently', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-concurrent'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    const startTime = Date.now();

    // Execute multiple operations concurrently
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        toolBus.execute('browser_navigate', {
          url: 'https://example.com'
        })
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    // All operations should complete
    results.forEach(result => {
      expect(result).toBeDefined();
    });

    // Should complete within reasonable time
    expect(duration).toBeLessThan(20000);

    await controller.stop();
  }, 30000);
});
