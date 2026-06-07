/**
 * Comprehensive Edge Case Tests for Browser Automation
 * Covers error scenarios, edge cases, and stress tests
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

describe('Browser Automation - Edge Cases', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-edge-cases'
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

  describe('Invalid URL Handling', () => {
    it('should handle empty URL gracefully', async () => {
      const result = await toolBus.execute('browser_navigate', {
        url: ''
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      // Should fail but not crash
    });

    it('should handle malformed URL', async () => {
      const result = await toolBus.execute('browser_navigate', {
        url: 'not-a-url'
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle URL with special characters', async () => {
      const result = await toolBus.execute('browser_navigate', {
        url: 'https://example.com/test?query=hello+world&foo=bar#section'
      });

      expect(result.success).toBe(true);
    });

    it('should handle URL with unicode characters', async () => {
      const result = await toolBus.execute('browser_navigate', {
        url: 'https://example.com/test?query=hello世界'
      });

      expect(result).toBeDefined();
    });
  });

  describe('Network Error Scenarios', () => {
    it('should handle non-existent domain', async () => {
      const result = await toolBus.execute('browser_navigate', {
        url: 'https://this-domain-definitely-does-not-exist-12345.com'
      });

      expect(result).toBeDefined();
      // Should fail gracefully without crashing
    });

    it('should handle timeout on slow pages', async () => {
      const result = await toolBus.execute('browser_navigate', {
        url: 'https://httpbin.org/delay/10'
      });

      expect(result).toBeDefined();
    }, 15000);
  });

  describe('Empty Page Scenarios', () => {
    it('should handle pages with no content', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'about:blank'
      });

      const screenshot = await toolBus.execute('browser_screenshot', {});
      expect(screenshot.success).toBe(true);

      const textExtract = await toolBus.execute('browser_extract_text', {});
      expect(textExtract.success).toBe(true);
    });

    it('should handle pages with minimal content', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'data:text/html,<html><body>Minimal</body></html>'
      });

      const snapshot = await toolBus.execute('browser_snapshot', {});
      expect(snapshot.success).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous navigations', async () => {
      const operations = [
        toolBus.execute('browser_navigate', { url: 'https://example.com' }),
        toolBus.execute('browser_navigate', { url: 'https://example.com' }),
        toolBus.execute('browser_navigate', { url: 'https://example.com' })
      ];

      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should handle mixed operations concurrently', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const operations = [
        toolBus.execute('browser_screenshot', {}),
        toolBus.execute('browser_snapshot', {}),
        toolBus.execute('browser_extract_text', {})
      ];

      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Screenshot Edge Cases', () => {
    it('should handle multiple screenshots in rapid succession', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const screenshots = [];
      for (let i = 0; i < 5; i++) {
        const result = await toolBus.execute('browser_screenshot', {});
        screenshots.push(result);
        expect(result.success).toBe(true);
      }

      // All screenshots should be successful
      screenshots.forEach(ss => {
        expect(ss.success).toBe(true);
      });
    });

    it('should handle screenshot on different page types', async () => {
      const pages = [
        'https://example.com',
        'https://httpbin.org/html',
        'https://www.google.com'
      ];

      for (const url of pages) {
        await toolBus.execute('browser_navigate', { url });
        const screenshot = await toolBus.execute('browser_screenshot', {});
        expect(screenshot.success).toBe(true);
      }
    });
  });

  describe('Text Extraction Edge Cases', () => {
    it('should handle pages with no text', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'about:blank'
      });

      const result = await toolBus.execute('browser_extract_text', {});
      expect(result.success).toBe(true);
    });

    it('should handle pages with lots of text', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const result = await toolBus.execute('browser_extract_text', {});
      expect(result.success).toBe(true);
      expect(result.output.length).toBeGreaterThan(0);
    });

    it('should handle pages with special characters', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const result = await toolBus.execute('browser_extract_text', {});
      expect(result.success).toBe(true);
      // Should contain various characters
    });
  });

  describe('Snapshot Edge Cases', () => {
    it('should handle snapshot with no elements', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'about:blank'
      });

      const result = await toolBus.execute('browser_snapshot', {});
      expect(result.success).toBe(true);

      const data = safeJsonParse(result.output);
      expect(data.elements).toBeDefined();
    });

    it('should handle snapshot with many elements', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const result = await toolBus.execute('browser_snapshot', {});
      expect(result.success).toBe(true);

      const data = safeJsonParse(result.output);
      expect(data.elements.length).toBeGreaterThan(0);
    });

    it('should handle snapshot structure consistency', async () => {
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const result = await toolBus.execute('browser_snapshot', {});
      expect(result.success).toBe(true);

      const data = safeJsonParse(result.output);

      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('elements');
      expect(Array.isArray(data.elements)).toBe(true);

      if (data.elements.length > 0) {
        const firstElement = data.elements[0];
        expect(firstElement).toHaveProperty('refId');
        expect(firstElement).toHaveProperty('tag');
      }
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across multiple operations', async () => {
      // Navigate
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      // Take multiple operations
      const screenshot1 = await toolBus.execute('browser_screenshot', {});
      const snapshot1 = await toolBus.execute('browser_snapshot', {});
      const text1 = await toolBus.execute('browser_extract_text', {});

      expect(screenshot1.success).toBe(true);
      expect(snapshot1.success).toBe(true);
      expect(text1.success).toBe(true);

      // State should still be consistent
      const screenshot2 = await toolBus.execute('browser_screenshot', {});
      const snapshot2 = await toolBus.execute('browser_snapshot', {});

      expect(screenshot2.success).toBe(true);
      expect(snapshot2.success).toBe(true);
    });

    it('should handle page changes correctly', async () => {
      // Go to first page
      await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      const snapshot1 = await toolBus.execute('browser_snapshot', {});
      const data1 = JSON.parse(snapshot1.output);

      // Go to different page
      await toolBus.execute('browser_navigate', {
        url: 'https://httpbin.org/html'
      });

      const snapshot2 = await toolBus.execute('browser_snapshot', {});
      const data2 = JSON.parse(snapshot2.output);

      // URLs should be different
      expect(data1.url).not.toBe(data2.url);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from failed navigation', async () => {
      // Fail first
      const failResult = await toolBus.execute('browser_navigate', {
        url: 'invalid-url'
      });

      // Should be able to navigate successfully after
      const successResult = await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });

      expect(successResult.success).toBe(true);
    });

    it('should handle tool execution errors gracefully', async () => {
      // Invalid tool
      const result = await toolBus.execute('nonexistent_tool', {});
      expect(result.success).toBe(false);
    });
  });

  describe('Browser Lifecycle', () => {
    it('should handle multiple start/stop cycles', async () => {
      // First cycle
      await browserController.stop();
      await new Promise(resolve => setTimeout(resolve, 100)); // Add delay for cleanup
      await browserController.start();

      const result1 = await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });
      expect(result1.success).toBe(true);

      // Second cycle
      await browserController.stop();
      await new Promise(resolve => setTimeout(resolve, 100)); // Add delay for cleanup
      await browserController.start();

      const result2 = await toolBus.execute('browser_navigate', {
        url: 'https://example.com'
      });
      expect(result2.success).toBe(true);
    });

    it('should handle rapid state changes', async () => {
      for (let i = 0; i < 3; i++) {
        await browserController.stop();
        await new Promise(resolve => setTimeout(resolve, 200)); // Add longer delay for cleanup
        await browserController.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // Add delay for startup

        const result = await toolBus.execute('browser_navigate', {
          url: 'https://example.com'
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
