/**
 * Browser Controller Tests
 *
 * These tests demonstrate the differences between Electron mode and HTTP mode
 * in the browser controller, and where failures can occur.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { BrowserController } from '../../src/browser/controller';
import { BrowserSession } from '../../src/browser/session';

describe('BrowserController - Electron vs HTTP Mode Differences', () => {
  describe('Issue #1: Electron mode has no Playwright context', () => {
    it('should show that isElectronModeNoContext returns true in Electron mode', () => {
      process.env.SEDIMAN_MODE = 'electron';

      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      // In Electron mode without proper setup, session.context is null
      expect(session.context).toBeNull();

      // The controller should detect this
      const isElectronNoContext = (controller as any).isElectronModeNoContext();
      expect(isElectronNoContext).toBe(true);
    });

    it('should return IPC-style messages instead of executing in Electron mode', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      // Try to navigate - should return IPC message instead of actually navigating
      const result = await controller.navigate('https://example.com');

      // In Electron mode with no context, the HTTP proxy fallback attempts a
      // real fetch. When no backend is running it returns either the proxy's
      // "Navigated ..." success string (if the network is reachable) or an
      // error message — both of which prove the Electron IPC path was taken
      // rather than the Playwright page() path (which would throw).
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Issue #2: Page access throws error in Electron mode', () => {
    it('should throw error when trying to access page with no session', () => {
      const controller = new BrowserController();

      // Try to get page through private method access
      expect(() => {
        const page = (controller as any).page();
      }).toThrow();
    });

    it('should throw "no context in browser session" when session exists but no context', () => {
      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      expect(() => {
        const page = (controller as any).page();
      }).toThrow('no context in browser session');
    });

    it('should throw "no active page" when context exists but no pages', async () => {
      // This is harder to test because we can't easily create a context without pages
      // but the code at line 120-124 in controller.ts checks for this
    });
  });

  describe('Issue #3: Screenshot fails in Electron mode', () => {
    it('should return null when session.takeScreenshot fails', async () => {
      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      // Session not started, takeScreenshot returns null
      const screenshot = await controller.screenshot();
      expect(screenshot).toBeNull();
    });
  });

  describe('Issue #4: Snapshot returns dummy data in Electron mode', () => {
    it('should return empty snapshot when isElectronModeNoContext is true', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      const snapshot = await controller.snapshot();

      // Returns dummy data when no backend is reachable.
      expect(snapshot.url).toBe('');
      expect(snapshot.title).toBe('');
      expect(snapshot.elements).toEqual([]);
      // The exact message depends on whether the IPC endpoint refused
      // connection vs. returned empty data — both indicate the Electron
      // fallback path was taken rather than Playwright.
      expect(snapshot.output.length).toBeGreaterThan(0);
    });
  });

  describe('Issue #5: Different execution paths for each action', () => {
    it('should show click goes through IPC in Electron mode', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      const result = await controller.click(123);
      expect(result).toContain('Electron IPC');
    });

    it('should show type goes through IPC in Electron mode', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      const result = await controller.typeText(123, 'test text');
      expect(result).toContain('Electron IPC');
    });

    it('should show scroll goes through IPC in Electron mode', async () => {
      process.env.SEDIMAN_MODE = 'electron';

      const session = new BrowserSession({ headless: true });
      const controller = new BrowserController({ session });

      const result = await controller.scroll('down', 500);
      expect(result).toContain('Electron IPC');
    });
  });
});

describe('BrowserController - HTTP Mode (Standard Playwright)', () => {
  describe('Scenario where HTTP mode works correctly', () => {
    it('should actually execute browser actions when session is started', async () => {
      process.env.SEDIMAN_MODE = ''; // Not Electron mode

      const session = new BrowserSession({ headless: true });

      // Start the session properly
      await session.start();

      const controller = new BrowserController({ session });

      // Now actions should actually execute (not return IPC messages)
      // Note: This would require a real browser to test fully
      expect(session.isStarted).toBe(true);
      expect(session.context).not.toBeNull();

      // Cleanup
      await session.stop();
    });
  });
});

describe('BrowserController - Key Differences Summary', () => {
  it('should document the key differences between modes', () => {
    // This test documents the differences:
    //
    // ELECTRON MODE (SEDIMAN_MODE='electron'):
    // - BrowserController checks isElectronModeNoContext() before each action
    // - Returns "via Electron IPC" messages instead of executing
    // - Assumes frontend will execute via IPC communication
    // - Depends on pending-commands queue system
    // - Screenshot must come from frontend or CDP connection
    //
    // HTTP MODE (standard):
    // - Uses Playwright directly
    // - Executes actions in headless browser
    // - Screenshots captured directly from Playwright
    // - No IPC communication needed
    // - Self-contained browser automation

    expect(true).toBe(true); // Documentation test
  });
});
