/**
 * Openbrowser Adapter
 * Integrates the Openbrowser library with the OpenSkynet server
 */

import { BrowserManager } from '../../../../vendor/Openbrowser/ai-agent/open-browser/src/core/index.js';
import { ToolExecutor, browserTools } from '../../../../vendor/Openbrowser/ai-agent/open-browser/src/tools/index.js';
import type { ToolDefinition } from '../core/types.js';
import type { ToolResult, ToolExecutor as CustomToolExecutor } from '../agent/tools/interfaces.js';

export class OpenbrowserAdapter {
  private browserManager: BrowserManager;
  private toolExecutor: ToolExecutor;

  constructor() {
    this.browserManager = new BrowserManager();
    this.toolExecutor = new ToolExecutor(this.browserManager);
  }

  /**
   * Get tool definitions compatible with OpenAI function calling
   */
  getToolDefinitions(): ToolDefinition[] {
    // Convert Openbrowser tool definitions to our format
    return browserTools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters as any,
      type: 'function' as const,
    }));
  }

  /**
   * Execute a browser tool
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await this.toolExecutor.executeTool(
        name as any,
        args
      );

      return {
        success: result.success,
        output: result.content,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the underlying browser manager for direct access
   */
  getBrowserManager(): BrowserManager {
    return this.browserManager;
  }

  /**
   * Get the tool executor for direct access
   */
  getToolExecutor(): ToolExecutor {
    return this.toolExecutor;
  }

  /**
   * Cleanup all browser instances
   */
  async cleanup(): Promise<void> {
    await this.browserManager.closeAll();
  }

  /**
   * Take a screenshot from the default browser
   */
  async screenshot(instanceId?: string): Promise<string | null> {
    if (!instanceId) {
      const instances = this.browserManager.listInstances();
      if (instances.length === 0) return null;
      instanceId = instances[0].id;
    }

    const instance = this.browserManager.getInstance(instanceId);
    if (!instance) return null;

    const result = await instance.screenshot();
    return result.success ? result.data : null;
  }
}
