import type { ToolDefinition } from "../../core/types.js";
import type { ToolResult, ToolExecutor } from "./interfaces.js";
import { executeWithRetryAndTimeout } from "./error-handler.js";

export interface ToolBusConfig {
  /** Default timeout for tool execution in milliseconds */
  defaultTimeoutMs?: number;
  /** Enable retry logic for tool execution */
  enableRetry?: boolean;
  /** Max retries for failed tool execution */
  maxRetries?: number;
  /** Tool-specific timeouts (in milliseconds) */
  toolTimeouts?: Record<string, number>;
}

export class ToolBus {
  private tools = new Map<string, { definition: ToolDefinition; executor: ToolExecutor }>();
  private config: Required<ToolBusConfig>;
  private toolTimeouts: Map<string, number> = new Map();

  constructor(config: ToolBusConfig = {}) {
    this.config = {
      defaultTimeoutMs: config.defaultTimeoutMs ?? 30000,
      enableRetry: config.enableRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      toolTimeouts: config.toolTimeouts ?? {},
    };

    // Initialize tool-specific timeouts from config
    this.initializeTimeouts();
  }

  /**
   * Initialize tool timeouts from config
   */
  private async initializeTimeouts(): Promise<void> {
    try {
      const config = (await import('../../core/config')).getConfig();
      const toolTimeouts = config.toolTimeouts || {};

      for (const [tool, timeout] of Object.entries(toolTimeouts)) {
        this.toolTimeouts.set(tool, timeout);
      }
    } catch (error) {
      console.warn('[ToolBus] Failed to initialize tool timeouts:', error);
    }
  }

  /**
   * Get timeout for a specific tool
   * Returns tool-specific timeout if available, otherwise default timeout
   */
  private getTimeoutForTool(toolName: string): number {
    return this.toolTimeouts.get(toolName) ?? this.config.defaultTimeoutMs;
  }

  /**
   * Set timeout for a specific tool
   */
  setToolTimeout(toolName: string, timeoutMs: number): void {
    this.toolTimeouts.set(toolName, timeoutMs);
  }

  register(definition: ToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.name, { definition, executor });
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const entry = this.tools.get(name);
    if (!entry) {
      return { success: false, output: "", error: `Unknown tool: ${name}` };
    }

    // Get tool-specific timeout
    const toolTimeout = this.getTimeoutForTool(name);

    // Execute with timeout and retry if enabled
    if (this.config.enableRetry) {
      try {
        const result = await executeWithRetryAndTimeout(
          () => entry.executor(name, args),
          name,
          {
            timeout: toolTimeout,
            retry: { maxRetries: this.config.maxRetries }
          }
        );
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { success: false, output: "", error: errorMsg };
      }
    }

    // Simple timeout wrapper with tool-specific timeout
    try {
      return await this.executeWithTimeout(() => entry.executor(name, args), name, toolTimeout);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, output: "", error: errorMsg };
    }
  }

  /**
   * Execute multiple actions in batch until page changes
   * This is used for multi-action execution (e.g., filling multiple form fields at once)
   * Stops batch execution when page change is detected
   *
   * @param actions - Array of tool calls to execute
   * @param detectChange - Function to detect if page changed
   * @returns Batch execution result with executed actions and results
   */
  async executeBatchUntilChange(
    actions: Array<{ name: string; args: Record<string, unknown> }>,
    detectChange: () => Promise<{ changed: boolean; reason?: string }>
  ): Promise<{
    executed: Array<{ name: string; args: Record<string, unknown> }>;
    results: ToolResult[];
    stoppedEarly: boolean;
    stopReason?: string;
  }> {
    const executed: Array<{ name: string; args: Record<string, unknown> }> = [];
    const results: ToolResult[] = [];

    // Get config for batch size limit
    const config = (await import('../../core/config')).getConfig();
    const maxBatchSize = config.maxBatchSize;

    // Limit batch size
    const actionsToExecute = actions.slice(0, maxBatchSize);

    for (const action of actionsToExecute) {
      // Execute the action
      const result = await this.execute(action.name, action.args);
      executed.push(action);
      results.push(result);

      // Check if page changed (after each action)
      try {
        const changeResult = await detectChange();

        if (changeResult.changed) {
          // Stop batch on page change
          return {
            executed,
            results,
            stoppedEarly: executed.length < actions.length,
            stopReason: changeResult.reason || 'Page changed'
          };
        }
      } catch (error) {
        // Continue if change detection fails
        console.warn('[ToolBus] Page change detection failed:', error);
      }

      // Stop on first failure
      if (!result.success) {
        return {
          executed,
          results,
          stoppedEarly: true,
          stopReason: `Action ${action.name} failed: ${result.error || 'Unknown error'}`
        };
      }
    }

    return {
      executed,
      results,
      stoppedEarly: executed.length < actions.length,
      stopReason: executed.length < actions.length ? 'Batch size limit reached' : undefined
    };
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    toolName: string,
    timeoutMs?: number
  ): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;

    const actualTimeout = timeoutMs ?? this.config.defaultTimeoutMs;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Tool execution timeout: ${toolName} exceeded ${actualTimeout}ms`));
      }, actualTimeout);
    });

    try {
      return await Promise.race([
        fn(),
        timeoutPromise
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

}
