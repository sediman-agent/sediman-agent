/**
 * Electron Server Module
 *
 * Browser-first agent for Electron app with comprehensive tools.
 *
 * Key features:
 * - Browser automation via Browser tool
 * - Shell command integration
 * - File operations
 * - Code editing
 * - Skills & recording
 * - Tool-based execution system
 */

// Re-export the main BrowserAgent from the agent module
export { BrowserAgent } from "../agent/BrowserAgent";
export type { BrowserAgentOpts } from "../agent/BrowserAgent";

export * from "./tools";
export type { BuiltinTool, ToolExecution, ExecutableToolResult, ToolAccesses } from "./tooling/types";

import { BrowserAgent } from "../agent/BrowserAgent";
import type { BrowserAgentOpts } from "../agent/BrowserAgent";

/**
 * Create a configured BrowserAgent with proper tool initialization
 */
export interface CreateBrowserAgentConfig extends Omit<BrowserAgentOpts, 'llmProvider'> {
  llmProvider: import("../llm/provider").LLMProvider;
  useVision?: boolean;
}

export function createBrowserAgent(config: CreateBrowserAgentConfig): BrowserAgent {
  return new BrowserAgent({
    llmProvider: config.llmProvider,
    browserController: config.browserController,
    memory: config.memory,
    skillEngine: config.skillEngine,
    skillSearch: config.skillSearch,
    toolBus: config.toolBus,
    headless: config.headless,
    workingDirectory: config.workingDirectory,
    enableBrowserTools: config.enableBrowserTools ?? true,
    enableShellTools: config.enableShellTools ?? true,
    enableFileTools: config.enableFileTools ?? true,
    enableCodingTools: config.enableCodingTools ?? true,
    enableWebTools: config.enableWebTools ?? true,
    enableSkillsTools: config.enableSkillsTools ?? true,
    useVision: config.useVision ?? true,
  });
}

/**
 * Convenience function to run a task with the BrowserAgent
 */
export async function runBrowserTask(
  task: string,
  config: CreateBrowserAgentConfig
): Promise<import("../core/types").AgentResult> {
  const agent = createBrowserAgent(config);
  return agent.run(task);
}
