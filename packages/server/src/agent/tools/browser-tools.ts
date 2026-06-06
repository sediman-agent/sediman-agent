/**
 * Browser Tools Registration
 * Registers Openbrowser tools with the agent ToolBus
 */

import { ToolBus } from './bus.js';
import type { ToolExecutor } from './interfaces.js';
import { OpenbrowserAdapter } from '../../browser/OpenbrowserAdapter.js';

let openbrowserAdapter: OpenbrowserAdapter | null = null;

export function registerBrowserTools(toolBus: ToolBus): void {
  if (!openbrowserAdapter) {
    openbrowserAdapter = new OpenbrowserAdapter();
  }

  const toolDefinitions = openbrowserAdapter.getToolDefinitions();

  // Create a tool executor wrapper
  const executor: ToolExecutor = async (name, args) => {
    if (!openbrowserAdapter) {
      return {
        success: false,
        output: '',
        error: 'Openbrowser adapter not initialized',
      };
    }

    return openbrowserAdapter.executeTool(name, args);
  };

  // Register all browser tools
  for (const def of toolDefinitions) {
    toolBus.register(def, executor);
  }
}

export function getOpenbrowserAdapter(): OpenbrowserAdapter | null {
  return openbrowserAdapter;
}

export async function cleanupBrowserTools(): Promise<void> {
  if (openbrowserAdapter) {
    await openbrowserAdapter.cleanup();
    openbrowserAdapter = null;
  }
}

/**
 * Take a screenshot from the active browser
 */
export async function takeBrowserScreenshot(instanceId?: string): Promise<string | null> {
  if (!openbrowserAdapter) return null;
  return openbrowserAdapter.screenshot(instanceId);
}
