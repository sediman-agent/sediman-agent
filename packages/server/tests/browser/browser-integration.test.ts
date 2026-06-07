/**
 * Integration Tests for Complete Browser Automation System
 * Tests the entire system from user input to browser output
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { BrowserSession } from '../../src/browser/session';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';

// Helper function for safe JSON parsing
function safeJsonParse<T>(output: string): T {
  try {
    return JSON.parse(output) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

describe('Browser Automation - Integration Tests', () => {
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

  describe('Complete User Workflows', () => {
    it('should handle research workflow: search → navigate → extract', async () => {
      // Step 1: Navigate to search page
      await toolBus.execute('browser_navigate', {
        url: 'https://www.google.com'
      });

      // Step 2: Take screenshot to see results
      const screenshot = await toolBus.execute('browser_snapshot', {});
      expect(screenshot.success).toBe(true);

      // Step 3: Extract text content
      const text = await toolBus.execute('browser_extract_text', {});
      expect(text.success).toBe(true);
      expect(text.output.length).toBeGreaterThan(0);
    });

    it('should handle multi-page research workflow', async () => {
      const pages = [
        'https://example.com',
        'https://httpbin.org/html'
      ];

      const results = [];

      for (const page of pages) {
        // Navigate
        const navResult = await toolBus.execute('browser_navigate', { url: page });
        expect(navResult.success).toBe(true);

        // Get screenshot
        const screenshot = await toolBus.execute('browser_screenshot', {});
        expect(screenshot.success).toBe(true);

        // Get snapshot
        const snapshot = await toolBus.execute('browser_snapshot', {});
        expect(snapshot.success).toBe(true);

        // Get text
        const text = await toolBus.execute('browser_extract_text', {});
        expect(text.success).toBe(true);

        results.push({
          url: page,
          screenshot: screenshot.success,
          snapshot: snapshot.success,
          text: text.success
        });
      }

      // All operations should be successful
      results.forEach(result => {
        expect(result.screenshot).toBe(true);
        expect(result.snapshot).toBe(true);
        expect(result.text).toBe(true);
      });
    });

    it('should handle monitoring workflow: periodic checks', async () => {
      // Navigate to page
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Take multiple snapshots over time
      const snapshots = [];
      for (let i = 0; i < 3; i++) {
        const screenshot = await toolBus.execute('browser_screenshot', {});
        expect(screenshot.success).toBe(true);

        const snapshot = await toolBus.execute('browser_snapshot', {});
        expect(snapshot.success).toBe(true);

        snapshots.push({ screenshot, snapshot });

        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(snapshots.length).toBe(3);
    });
  });

  describe('Tool Integration', () => {
    it('should integrate all tools seamlessly', async () => {
      // Navigate
      const navResult = await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });
      expect(navResult.success).toBe(true);

      // Get snapshot
      const snapResult = await toolBus.execute('browser_snapshot', {});
      expect(snapResult.success).toBe(true);

      // Get text
      const textResult = await toolBus.execute('browser_extract_text', {});
      expect(textResult.success).toBe(true);

      // Get screenshot
      const ssResult = await toolBus.execute('browser_screenshot', {});
      expect(ssResult.success).toBe(true);

      // All tools should work together
      expect(navResult.success && snapResult.success && textResult.success && ssResult.success).toBe(true);
    });

    it('should handle tool execution in any order', async () => {
      // Navigate first
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Execute tools in different order
      const operations = [
        toolBus.execute('browser_screenshot', {}),
        toolBus.execute('browser_extract_text', {}),
        toolBus.execute('browser_snapshot', {})
      ];

      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Data Flow Integration', () => {
    it('should maintain data consistency across operations', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Get snapshot data
      const snapshot = await toolBus.execute('browser_snapshot', {});
      expect(snapshot.success).toBe(true);

      const snapshotData = safeJsonParse(snapshot.output);

      // Get text data
      const text = await toolBus.execute('browser_extract_text', {});
      expect(text.success).toBe(true);

      // Data should be consistent
      expect(snapshotData.url).toContain('example.com');
      expect(text.output.length).toBeGreaterThan(0);

      // Get screenshot
      const screenshot = await toolBus.execute('browser_screenshot', {});
      expect(screenshot.success).toBe(true);

      // All data should come from the same page
      expect(snapshotData.url).toContain('example.com');
    });

    it('should handle data updates after navigation', async () => {
      // First page
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const snapshot1 = await toolBus.execute('browser_snapshot', {});
      expect(snapshot1.success).toBe(true);

      const data1 = JSON.parse(snapshot1.output);

      // Second page
      await toolBus.execute('browser_navigate', {
        url: 'https://httpbin.org/html'
      });

      const snapshot2 = await toolBus.execute('browser_snapshot', {});
      expect(snapshot2.success).toBe(true);

      const data2 = JSON.parse(snapshot2.output);

      // Data should be different
      expect(data1.url).not.toBe(data2.url);
      expect(data1.title).not.toBe(data2.title);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors without breaking subsequent operations', async () => {
      // Fail intentionally
      const failResult = await toolBus.execute('browser_navigate', {
        url: 'invalid-url'
      });

      // Should still be able to perform valid operations
      const successResult = await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      expect(successResult.success).toBe(true);

      // Other tools should still work
      const screenshot = await toolBus.execute('browser_screenshot', {});
      expect(screenshot.success).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Try invalid tool
      const invalidResult = await toolBus.execute('invalid_tool', {});
      expect(invalidResult.success).toBe(false);

      // Valid tools should still work
      const validResult = await toolBus.execute('browser_screenshot', {});
      expect(validResult.success).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should handle complex workflows efficiently', async () => {
      const startTime = Date.now();

      // Complete workflow
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      await toolBus.execute('browser_screenshot', {});
      await toolBus.execute('browser_snapshot', {});
      await toolBus.execute('browser_extract_text', {});

      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(20000);
    });

    it('should handle parallel operations efficiently', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const startTime = Date.now();

      const operations = [
        toolBus.execute('browser_screenshot', {}),
        toolBus.execute('browser_snapshot', {}),
        toolBus.execute('browser_extract_text', {})
      ];

      await Promise.all(operations);

      const duration = Date.now() - startTime;

      // Parallel operations should be faster than sequential
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Resource Management', () => {
    it('should handle browser restart during workflow', async () => {
      // Start workflow
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Restart browser
      await browserController.stop();
      await new Promise(resolve => setTimeout(resolve, 100));
      await browserController.start();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be able to continue workflow
      const result = await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      expect(result.success).toBe(true);
    });

    it('should handle multiple browser instances', async () => {
      const controller1 = new BrowserController({
        headless: true,
        userDataDir: '/tmp/test-multi-1'
      });

      const controller2 = new BrowserController({
        headless: true,
        userDataDir: '/tmp/test-multi-2'
      });

      await controller1.start();
      await controller2.start();

      const bus1 = new ToolBus();
      const bus2 = new ToolBus();

      registerBrowserTools(bus1, controller1);
      registerBrowserTools(bus2, controller2);

      // Both should work independently
      const result1 = await bus1.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const result2 = await bus2.execute('browser_navigate', {
        url: 'https://httpbin.org/html'
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      await controller1.stop();
      await controller2.stop();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle web scraping scenario', async () => {
      // Navigate to target page
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Extract page structure
      const snapshot = await toolBus.execute('browser_snapshot', {});
      expect(snapshot.success).toBe(true);

      const data = safeJsonParse(snapshot.output);
      expect(data.elements.length).toBeGreaterThan(0);

      // Extract text content
      const text = await toolBus.execute('browser_extract_text', {});
      expect(text.success).toBe(true);
      expect(text.output.length).toBeGreaterThan(0);

      // Get visual representation
      const screenshot = await toolBus.execute('browser_screenshot', {});
      expect(screenshot.success).toBe(true);
    });

    it('should handle page monitoring scenario', async () => {
      // Initial load
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Monitor for changes
      const checks = [];
      for (let i = 0; i < 3; i++) {
        const screenshot = await toolBus.execute('browser_screenshot', {});
        const snapshot = await toolBus.execute('browser_snapshot', {});

        checks.push({
          screenshotSuccess: screenshot.success,
          snapshotSuccess: snapshot.success,
          timestamp: Date.now()
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All checks should be successful
      checks.forEach(check => {
        expect(check.screenshotSuccess).toBe(true);
        expect(check.snapshotSuccess).toBe(true);
      });
    });

    it('should handle content analysis scenario', async () => {
      // Navigate to content page
      const navResult = await toolBus.execute('browser_navigate', {
        url: 'https://httpbin.org/html'
      });
      expect(navResult.success).toBe(true);

      // Get structural information
      const snapshot = await toolBus.execute('browser_snapshot', {});
      expect(snapshot.success).toBe(true);

      const snapshotData = safeJsonParse(snapshot.output);
      expect(snapshotData.elements).toBeDefined();

      // Get text content
      const text = await toolBus.execute('browser_extract_text', {});
      expect(text.success).toBe(true);
      expect(text.output.length).toBeGreaterThan(0);

      // Get visual
      const screenshot = await toolBus.execute('browser_screenshot', {});
      expect(screenshot.success).toBe(true);

      // Should have comprehensive data
      expect(snapshotData.elements).toBeDefined();
      expect(text.output.length).toBeGreaterThan(0);
      expect(screenshot.success).toBe(true);
    });
  });
});
