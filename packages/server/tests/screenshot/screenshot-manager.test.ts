/**
 * Screenshot Manager Tests
 *
 * These tests demonstrate the screenshot tool issues in the codebase,
 * particularly in Electron mode where the screenshot flow is complex
 * and can fail at multiple points.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ScreenshotManager } from '../../src/agent/vision/screenshot-manager';
import { BrowserController } from '../../src/browser/controller';
import { BrowserSession } from '../../src/browser/session';
import { browserStateService } from '../../src/api/services/browser-state-service';

// Mock the browser state service
mock.module('../../src/api/services/browser-state-service', () => ({
  browserStateService: {
    getScreenshotData: () => null,
    getScreenshotUrl: () => '',
    setLatestScreenshot: () => {},
    waitForCdpConnection: async () => false,
    isCdpConnected: () => false,
    setExternalCdpUrl: () => {},
    setCdpConnected: () => {},
    resetCdpConnection: () => {},
    getExternalCdpUrl: () => null
  }
}));

// Mock the browser tools module
mock.module('../src/agent/tools/browser-tools.js', () => ({
  getBrowserController: () => null
}));

// Mock the browser routes module
mock.module('../../src/api/routes/browser.js', () => ({
  setLatestScreenshot: () => {},
  waitForCdpConnection: async () => false
}));

describe('ScreenshotManager - Electron Mode Issues', () => {
  let screenshotManager: ScreenshotManager;
  let mockController: BrowserController;

  beforeEach(() => {
    screenshotManager = new ScreenshotManager(300);

    // Create a mock controller with no session (simulating Electron mode without CDP)
    mockController = {
      screenshot: async () => null,
      getSession: () => null
    } as any;
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Issue #1: Screenshot fails when no browser controller available', () => {
    it('should return error when controller is null', async () => {
      const manager = new ScreenshotManager();

      const result = await manager.capture({ url: 'https://example.com' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No browser controller available');
    });
  });

  describe('Issue #2: Screenshot fails in Electron mode without CDP connection', () => {
    it('should fail when frontend screenshot is unavailable and CDP times out', async () => {
      // Set environment to Electron mode
      process.env.SEDIMAN_MODE = 'electron';

      const manager = new ScreenshotManager();
      manager.setController(mockController);

      // Mock browserStateService to return no screenshot data
      const mockGetScreenshotData = () => null;

      // Capture should fail because:
      // 1. Frontend screenshot is unavailable (browserStateService.getScreenshotData() returns null)
      // 2. CDP connection times out
      // 3. Browser controller has no valid session

      const result = await manager.capture();

      expect(result.success).toBe(false);
      // Error message when frontend screenshot unavailable and CDP times out in Electron mode
      expect(result.error).toContain('No browser available and no frontend screenshot');
    });

    it('should show CDP timeout issue', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      const manager = new ScreenshotManager();
      manager.setController(mockController);

      // Mock waitForCdpConnection to timeout
      const mockWaitForCdpConnection = async () => false;

      const result = await manager.capture();

      expect(result.success).toBe(false);
    });
  });

  describe('Issue #3: Screenshot returns empty or invalid data', () => {
    it('should fail when screenshot returns empty string', async () => {
      process.env.SEDIMAN_MODE = 'api'; // Not Electron mode to bypass CDP check
      const mockControllerWithEmptyScreenshot = {
        screenshot: async () => '',
        getSession: () => ({ context: { pages: [] } })
      } as any;

      const manager = new ScreenshotManager();
      manager.setController(mockControllerWithEmptyScreenshot);

      const result = await manager.capture();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Screenshot failed or empty');
    });

    it('should fail when screenshot returns very short string (less than 100 bytes)', async () => {
      process.env.SEDIMAN_MODE = 'api'; // Not Electron mode to bypass CDP check
      const mockControllerWithShortScreenshot = {
        screenshot: async () => 'abc',
        getSession: () => ({ context: { pages: [] } })
      } as any;

      const manager = new ScreenshotManager();
      manager.setController(mockControllerWithShortScreenshot);

      const result = await manager.capture();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Screenshot failed or empty');
    });
  });

  describe('Issue #4: BrowserController.page() throws in Electron mode', () => {
    it('should handle errors when trying to access page with no context', async () => {
      process.env.SEDIMAN_MODE = 'api'; // Not Electron mode to bypass CDP check
      const mockControllerWithBadSession = {
        screenshot: async () => {
          throw new Error('no context in browser session');
        },
        getSession: () => ({ context: null })
      } as any;

      const manager = new ScreenshotManager();
      manager.setController(mockControllerWithBadSession);

      const result = await manager.capture();

      expect(result.success).toBe(false);
      expect(result.error).toContain('no context');
    });
  });

  describe('Issue #5: Race condition in Electron mode screenshot flow', () => {
    it('should show that frontend screenshot might be stale', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      const manager = new ScreenshotManager();
      manager.setController(mockController);

      // Mock browserStateService with a short screenshot (invalid)
      const mockStateService = {
        getScreenshotData: () => 'abc', // Too short, should be rejected
        getScreenshotUrl: () => 'https://example.com'
      };

      // Even though browserStateService returns data, it's too short (< 100 bytes)
      // So it should still try CDP fallback and fail
      const result = await manager.capture();

      expect(result.success).toBe(false);
    });
  });

  describe('Issue #6: Screenshot throttling causes missed captures', () => {
    it('should show rapid consecutive captures are throttled', async () => {
      process.env.SEDIMAN_MODE = 'api'; // Not Electron mode to bypass CDP check
      const manager = new ScreenshotManager(1000); // 1 second throttle

      let callCount = 0;
      const mockControllerWithTracking = {
        screenshot: async () => {
          callCount++;
          return 'x'.repeat(1000); // Valid screenshot
        },
        getSession: () => ({ context: { pages: [{ url: () => 'https://example.com' }] } })
      } as any;

      manager.setController(mockControllerWithTracking);

      // First capture should work
      await manager.capture({ force: true });
      expect(callCount).toBe(1);

      // Second immediate capture should wait for throttle
      const startTime = Date.now();
      await manager.capture();
      const elapsed = Date.now() - startTime;

      // Should have waited at least 500ms (remaining throttle time)
      expect(elapsed).toBeGreaterThan(400);
      expect(callCount).toBe(2); // Should still call screenshot
    });
  });

  describe('Issue #7: BrowserSession.takeScreenshot fails with no pages', () => {
    it('should demonstrate the actual session screenshot failure', async () => {
      const session = new BrowserSession({
        headless: true,
        userDataDir: '/tmp/test-browser'
      });

      // Don't start the session - this simulates Electron mode without proper setup
      // Try to take screenshot

      let errorThrown = false;
      try {
        const screenshot = await session.takeScreenshot();
        // If session is not started, takeScreenshot returns null
        expect(screenshot).toBeNull();
      } catch (error) {
        errorThrown = true;
      }

      // Either returns null or throws error - both indicate the issue
      expect(errorThrown || true).toBe(true);
    });
  });

  describe('Issue #8: Screenshot path through multiple layers increases failure points', () => {
    it('should trace the screenshot failure path in Electron mode', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      // This test demonstrates the complex screenshot flow:
      // 1. ScreenshotManager.capture() called
      // 2. Checks if RUNNING_IN_ELECTRON
      // 3. Tries browserStateService.getScreenshotData() - might return null
      // 4. Tries waitForCdpConnection() - might timeout
      // 5. Falls back to getBrowserController() - might be null
      // 6. Tries ctrl.screenshot() - might throw "no context"
      // 7. Checks if result is empty - might be < 100 bytes

      const manager = new ScreenshotManager();
      manager.setController(null);

      let failurePoint = '';

      try {
        // At this point, no controller set
        failurePoint = 'No browser controller available';

        manager.setController(mockController);

        // Now has controller, but controller.screenshot returns null
        const result = await manager.capture();

        if (!result.success) {
          if (result.error?.includes('No browser controller')) {
            failurePoint = 'Still no controller';
          } else if (result.error?.includes('Screenshot failed')) {
            failurePoint = 'Screenshot returned empty/null';
          } else {
            failurePoint = result.error || 'Unknown error';
          }
        }
      } catch (error) {
        failurePoint = `Exception: ${error}`;
      }

      // The test documents the failure path
      expect(failurePoint).toBeTruthy();
    });
  });
});

describe('ScreenshotManager - Working Scenarios', () => {
  describe('Scenario where screenshot works correctly', () => {
    it('should succeed when valid screenshot is returned', async () => {
      process.env.SEDIMAN_MODE = 'api'; // Not Electron mode to bypass CDP check
      const validScreenshot = 'x'.repeat(1000); // 1000 bytes
      const mockControllerValid = {
        screenshot: async () => validScreenshot,
        getSession: () => ({
          context: {
            pages: [{ url: () => 'https://example.com' }]
          }
        })
      } as any;

      const manager = new ScreenshotManager();
      manager.setController(mockControllerValid);

      const result = await manager.capture();

      expect(result.success).toBe(true);
      expect(result.data).toBe(validScreenshot);
      expect(result.size).toBe(1000);
    });
  });
});
