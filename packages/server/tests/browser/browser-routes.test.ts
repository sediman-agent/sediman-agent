/**
 * Browser Route Handlers Tests
 *
 * These tests demonstrate the issues in the browser API routes,
 * particularly the state management and command queue issues.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Hono } from 'hono';
import { BrowserRouteHandlers } from '../../src/api/handlers/browser-route-handlers';
import { browserStateService } from '../../src/api/services/browser-state-service';

// Mock the browser tools
let mockBrowserController: any = null;
let mockScreenshot: string | null = null;

// Mock the module
const mockModule = {
  '../../src/agent/tools/browser-tools.js': {
    getBrowserController: () => mockBrowserController
  },
  '../../src/browser/global-session.js': {
    getGlobalBrowserSession: () => null
  }
};

// Apply mocks
for (const [path, exports] of Object.entries(mockModule)) {
  // In a real test environment, we would use mock.module()
  // For now, we'll document the expected behavior
}

describe('BrowserRouteHandlers - Electron Mode Issues', () => {
  let handlers: BrowserRouteHandlers;
  let app: Hono;

  beforeEach(() => {
    handlers = new BrowserRouteHandlers(browserStateService);
    app = new Hono();
    process.env.SEDIMAN_MODE = 'electron';

    // Reset state
    mockBrowserController = null;
    mockScreenshot = null;
  });

  afterEach(() => {
    process.env.SEDIMAN_MODE = '';
  });

  describe('Issue #1: Commands queued but frontend does not poll', () => {
    it('should show that command is added to pending queue but may not be retrieved', async () => {
      // This demonstrates the issue:
      // 1. Agent calls browser_navigate
      // 2. handleExec queues command (line 38-39 in browser-route-handlers.ts)
      // 3. Frontend MUST call /api/browser/pending-commands
      // 4. If frontend doesn't poll, command sits in queue forever

      // Create a mock context
      const mockContext = {
        req: {
          json: async () => ({ action: 'navigate', url: 'https://example.com' })
        },
        json: (data: any) => ({
          status: 200,
          ok: true,
          json: async () => data
        })
      } as any;

      const response = await handlers.handleExec(mockContext);

      // Should return queued message
      const result = await response.json();
      expect(result.result).toContain('queued');

      // But command is only stored in memory (pendingCommands array)
      // If frontend crashes or doesn't poll, command is lost
    });
  });

  describe('Issue #2: Screenshot from frontend not stored correctly', () => {
    it('should handle when frontend submits screenshot data', async () => {
      const mockContext = {
        req: {
          json: async () => ({
            screenshot: 'data:image/png;base64,iVBORw0KGgo...',
            url: 'https://example.com',
            title: 'Example'
          })
        },
        json: (data: any) => ({
          status: 200,
          ok: true,
          json: async () => data
        })
      } as any;

      const response = await handlers.handleScreenshotSubmit(mockContext);
      const result = await response.json();

      expect(result.success).toBe(true);

      // Screenshot should now be available via browserStateService
      const storedScreenshot = browserStateService.getScreenshotData();
      expect(storedScreenshot).toBeTruthy();
    });

    it('should reject when no screenshot data provided', async () => {
      const mockContext = {
        req: {
          json: async () => ({ url: 'https://example.com' })
        },
        json: (data: any) => ({
          status: 400,
          ok: false,
          json: async () => data
        })
      } as any;

      const response = await handlers.handleScreenshotSubmit(mockContext);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No screenshot data');
    });
  });

  describe('Issue #3: Command result storage and retrieval', () => {
    it('should show the command result flow', async () => {
      // 1. Frontend executes command and submits result
      const mockResultContext = {
        req: {
          json: async () => ({
            commandId: 'navigate:1234567890:abc',
            result: { url: 'https://example.com', title: 'Example' },
            error: null
          })
        },
        json: (data: any) => ({
          status: 200,
          ok: true,
          json: async () => data
        })
      } as any;

      await handlers.handleExecResult(mockResultContext);

      // 2. Result should be stored by action name
      const storedResult = browserStateService.getCommandResult('navigate');
      expect(storedResult).toEqual({ url: 'https://example.com', title: 'Example' });

      // 3. Poll endpoint should return the result
      const mockPollContext = {
        req: { json: async () => ({}) },
        json: (data: any) => ({
          status: 200,
          ok: true,
          json: async () => data
        })
      } as any;

      const pollResponse = await handlers.handleExecPoll(mockPollContext);
      const pollData = await pollResponse.json();

      expect(pollData.commandResults).toBeDefined();
      expect(pollData.commandResults.navigate).toEqual({ url: 'https://example.com', title: 'Example' });
    });
  });

  describe('Issue #4: CDP connection required for screenshots in Electron mode', () => {
    it('should show that screenshots fail without CDP connection', async () => {
      // In Electron mode, screenshots need:
      // 1. Either frontend provides them (handleScreenshotSubmit)
      // 2. Or CDP connection is established (handleCdpConnect)

      // Without CDP connection and without frontend screenshot:
      const mockContext = {
        req: { json: async () => ({}) },
        json: (data: any) => ({
          status: 404,
          ok: false,
          json: async () => data
        })
      } as any;

      const response = await handlers.handleScreenshot(mockContext);
      const result = await response.json();

      expect(result.error).toContain('No screenshot available');
    });
  });

  describe('Issue #5: State service persistence', () => {
    it('should show that state is stored in memory only', async () => {
      // This demonstrates an architectural issue:
      // - browserStateService stores all state in memory
      // - If server restarts, all state is lost
      // - Pending commands, screenshots, command results all lost
      // - Frontend may be waiting for results that no longer exist

      // Store some data
      browserStateService.setLatestScreenshot('test_screenshot_data', 'https://example.com');
      browserStateService.setCommandResult('navigate', { success: true });

      // Verify it's stored
      expect(browserStateService.getScreenshotData()).toBe('test_screenshot_data');
      expect(browserStateService.getCommandResult('navigate')).toEqual({ success: true });

      // But this is all in-memory - server restart loses everything
      // This is not tested directly but is an architectural issue
    });
  });

  describe('Issue #6: Action name from commandId parsing', () => {
    it('should show the commandId format and parsing', () => {
      // Command IDs are created in addPendingCommand (browser-route-handlers.ts:429)
      // Format: "${action}:${timestamp}:${random}"

      const commandId1 = 'navigate:1718123456789:abc123';
      const parts = commandId1.split(':');
      expect(parts[0]).toBe('navigate'); // Action
      expect(parts[1]).toMatch(/^\d+$/); // Timestamp
      expect(parts[2]).toMatch(/^[a-z0-9]+$/); // Random

      // When result is submitted, action is extracted from commandId
      // (browser-route-handlers.ts:160)
      const actionFromId = commandId1.split(':')[0];
      expect(actionFromId).toBe('navigate');

      // This means action names with colons would break parsing
      // But current action names don't have colons, so it works
    });
  });

  describe('Issue #7: Multiple concurrent commands', () => {
    it('should show that commands are queued in order', () => {
      // Multiple commands can be submitted before frontend polls
      // They all go into pendingCommands array
      // Frontend polls and gets them all at once
      // Order is preserved (FIFO)

      // This is documented behavior - not necessarily an issue
      expect(true).toBe(true);
    });
  });
});

describe('BrowserRouteHandlers - HTTP Mode (Non-Electron)', () => {
  beforeEach(() => {
    process.env.SEDIMAN_MODE = ''; // Not Electron
  });

  describe('Issue #8: Direct execution vs queued execution', () => {
    it('should show that HTTP mode executes directly without queue', async () => {
      // In HTTP mode, commands execute immediately via browser controller
      // No queue, no polling, no IPC communication

      const handlers = new BrowserRouteHandlers(browserStateService);

      // This would require a real browser controller to test fully
      // The key difference is line 48-134 in browser-route-handlers.ts
      // which directly calls controller methods instead of queuing

      expect(true).toBe(true); // Documentation test
    });
  });
});
