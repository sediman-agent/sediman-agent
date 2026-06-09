/**
 * Agent Tools
 *
 * Core tool infrastructure for the agent system.
 */

// Core tool bus
export { ToolBus } from './bus.js';

// Browser tools (used by BrowserAgent)
export { registerBrowserTools, getBrowserController, cleanupBrowserTools, takeBrowserScreenshot } from './browser-tools.js';

// Tool types
export type { ToolResult, ToolExecutor } from './interfaces.js';

// Tool registry factory (legacy, kept for compatibility)
export function createAgentToolRegistry(opts?: {
  terminalAllowed?: boolean;
  memoryManager?: unknown;
  skillEngine?: unknown;
  enableBrowserTools?: boolean;
  enableFileTools?: boolean;
  browserController?: import('../../browser/controller').BrowserController;
}): import('./bus.js').ToolBus {
  const { ToolBus } = require('./bus.js');
  const { registerBrowserTools } = require('./browser-tools.js');

  const bus = new ToolBus();

  // Register browser automation tools
  if (opts?.enableBrowserTools !== false) {
    registerBrowserTools(bus, opts?.browserController);
  }

  return bus;
}
