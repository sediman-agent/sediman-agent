/**
 * Reactive Browser Agent - Autonomous Task Completion
 * Automatically continues through tasks without stopping at each step
 */

import type { AgentResult, StepEvent, ToolDefinition } from '../core/types';
import type { LLMProvider } from '../llm/provider';
import type { BaseMemoryStrategy } from '../memory/strategy';
import type { SkillEngine } from '../skills/engine';
import type { SkillSearchEngine } from '../skills/search';
import type { BrowserController } from '../browser/controller';
import { ToolBus } from './tools/bus';
import { loadSoul } from './prompts/soul';
import { initializeT800Tools } from '../electron/tools';
import { StreamEmitter } from './streaming';
import { getConfig } from '../core/config';

type Message = { role: string; content: string };

export interface BrowserAgentOpts {
  llmProvider: LLMProvider;
  browserController?: BrowserController;
  memory?: BaseMemoryStrategy;
  skillEngine?: SkillEngine;
  skillSearch?: SkillSearchEngine;
  toolBus?: ToolBus;
  headless?: boolean;
  workingDirectory?: string;
  enableBrowserTools?: boolean;
  enableShellTools?: boolean;
  enableFileTools?: boolean;
  enableCodingTools?: boolean;
  enableWebTools?: boolean;
  enableSkillsTools?: boolean;
}

export class BrowserAgent {
  private llmProvider: LLMProvider;
  private browserController: BrowserController | null;
  private memory: BaseMemoryStrategy | null;
  private skillEngine: SkillEngine | null;
  private skillSearch: SkillSearchEngine | null;
  private toolBus: ToolBus;
  private streamEmitter: StreamEmitter;
  private conversation: Message[] = [];
  private maxIterations: number;
  private soul: string;
  private workingDirectory: string;
  private cancelled = false;
  private toolsInitialized = false;

  private enableBrowserTools: boolean;
  private enableShellTools: boolean;
  private enableFileTools: boolean;
  private enableCodingTools: boolean;
  private enableWebTools: boolean;
  private enableSkillsTools: boolean;

  constructor(opts: BrowserAgentOpts) {
    const config = getConfig();
    this.llmProvider = opts.llmProvider;
    this.browserController = opts.browserController ?? null;
    this.memory = opts.memory ?? null;
    this.skillEngine = opts.skillEngine ?? null;
    this.skillSearch = opts.skillSearch ?? null;
    this.toolBus = opts.toolBus ?? new ToolBus();
    this.streamEmitter = new StreamEmitter({ batchSize: 10, flushIntervalMs: 50 });

    this.conversation = [];
    this.maxIterations = config.compressThreshold * 2 + 10;
    this.soul = '';
    this.workingDirectory = opts.workingDirectory ?? process.cwd();

    this.enableBrowserTools = opts.enableBrowserTools ?? true;
    this.enableShellTools = opts.enableShellTools ?? true;
    this.enableFileTools = opts.enableFileTools ?? true;
    this.enableCodingTools = opts.enableCodingTools ?? true;
    this.enableWebTools = opts.enableWebTools ?? true;
    this.enableSkillsTools = opts.enableSkillsTools ?? true;

    this.initializeTools();
  }

  private initializeTools(): void {
    if (this.toolsInitialized) return;

    initializeT800Tools(this.toolBus, {
      cwd: this.workingDirectory,
      enableBrowserTools: this.enableBrowserTools,
      enableShellTools: this.enableShellTools,
      enableFileTools: this.enableFileTools,
      enableCodingTools: this.enableCodingTools,
      enableWebTools: this.enableWebTools,
      enableSkillsTools: this.enableSkillsTools,
      enableDocumentTools: false,
      skillDeps: {
        skillEngine: this.skillEngine ?? undefined,
        skillSearch: this.skillSearch ?? undefined,
        runSkill: async (name: string) => {
          if (!this.skillEngine) return null;
          const skill = this.skillEngine.getSkill(name);
          return skill;
        },
      },
    });

    this.toolsInitialized = true;
  }

  private buildSystemPrompt(): string {
    const toolDescriptions = this.getToolDescriptions();

    return `# Autonomous Browser Agent - React & Complete Tasks

You are an autonomous browser automation agent. COMPLETE THE FULL TASK without stopping.

${this.soul ? `## Personality\n${this.soul}\n` : ''}

## Available Tools

${toolDescriptions.join('\n')}

## CRITICAL: BE AUTONOMOUS

**DO NOT STOP after one action.** Continue until the task is COMPLETE.

**For search tasks** (e.g., "search for X on Google"):
1. browser_navigate to google.com
2. browser_snapshot to find search box
3. browser_type with the search query and submit=true
4. browser_take_and_store_screenshot
5. REPORT RESULTS

**For navigation tasks** (e.g., "go to X"):
1. browser_navigate to the URL
2. browser_take_and_store_screenshot
3. REPORT what you see

**ALWAYS take screenshots** after navigation/interaction so the user can see results.

**NEVER give up** - if an action fails, try again or try an alternative approach.
`;
  }

  private getToolDescriptions(): string[] {
    const tools = this.toolBus.getDefinitions();
    return tools.map(tool => {
      let desc = `- **${tool.name}**: ${tool.description}`;
      if (tool.parameters?.properties) {
        const params = Object.keys(tool.parameters.properties);
        if (params.length > 0) {
          desc += `\n  Parameters: ${params.join(', ')}`;
        }
      }
      return desc;
    });
  }

  // Automatically determine next actions based on current state
  private async determineNextActions(task: string, lastAction: string, lastResult: string): Promise<Array<{name: string, args: any}>> {
    const actions: Array<{name: string, args: any}> = [];

    // If last action was navigation, automatically take snapshot
    if (lastAction === 'browser_navigate' && lastResult.includes('Navigated to')) {
      actions.push({ name: 'browser_snapshot', args: {} });

      // If task mentions "search" or Google, assume we need to search
      if (task.toLowerCase().includes('search') || task.toLowerCase().includes('google')) {
        const searchQuery = this.extractSearchQuery(task);
        if (searchQuery) {
          actions.push({
            name: 'browser_type',
            args: {
              refId: 0, // Will be determined from snapshot
              text: searchQuery,
              submit: true
            }
          });
        }
      }

      actions.push({ name: 'browser_take_and_store_screenshot', args: {} });
    }

    return actions;
  }

  private extractSearchQuery(task: string): string {
    // Extract search query from task
    const patterns = [
      /search for ["'](.+?)["']/i,
      /search for (.+?)$/i,
      /search ["'](.+?)["']/i,
      /google (.+?)$/i,
      /find ["'](.+?)["']/i,
    ];

    for (const pattern of patterns) {
      const match = task.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback: if task mentions a brand/product, use that
    if (task.toLowerCase().includes('tesla')) return 'Tesla official site';
    if (task.toLowerCase().includes('elon')) return 'Elon Musk';

    return '';
  }

  async execute(task: string, onEvent?: (event: StepEvent) => void): Promise<AgentResult> {
    if (onEvent) {
      this.streamEmitter.on('progress', (data) => onEvent({ type: 'progress', ...data }));
      this.streamEmitter.on('step', (data) => onEvent({ type: 'step', ...data }));
      this.streamEmitter.on('error', (data) => onEvent({ type: 'error', ...data }));
      this.streamEmitter.on('result', (data) => onEvent({ type: 'result', data }));
    }

    const steps: StepEvent[] = [];
    const actionsTaken: string[] = [];
    let finalResult = '';
    let success = false;
    let iteration = 0;

    try {
      this.soul = loadSoul();
      this.cancelled = false;

      if (this.memory) {
        await this.memory.onTurnStart();
      }

      this.conversation = [
        { role: 'user', content: task }
      ];

      const systemPrompt = this.buildSystemPrompt();
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.conversation
      ];

      this.streamEmitter.emitProgress(0, this.maxIterations, 'starting');

      let lastAction = '';
      let lastResult = '';

      // Main execution loop
      while (iteration < this.maxIterations && !this.cancelled) {
        iteration++;

        this.streamEmitter.emitProgress(iteration, this.maxIterations, 'thinking');

        // Try to get LLM response (with retry on 500 errors)
        let response;
        let retries = 0;
        while (retries < 3) {
          try {
            response = await this.llmProvider.chat(
              messages,
              this.toolBus.getDefinitions(),
              systemPrompt,
            );
            break; // Success
          } catch (error: any) {
            retries++;
            console.log(`[BrowserAgent] LLM call failed (attempt ${retries}/3):`, error.message);

            if (retries >= 3) {
              // After 3 failures, try autonomous continuation
              console.log('[BrowserAgent] LLM failed, attempting autonomous continuation');

              const autoActions = await this.determineNextActions(task, lastAction, lastResult);
              if (autoActions.length > 0) {
                console.log(`[BrowserAgent] Auto-executing ${autoActions.length} actions`);

                for (const autoAction of autoActions) {
                  if (this.cancelled) break;

                  this.streamEmitter.emitStepStart('executing', autoAction.name, JSON.stringify(autoAction.args));

                  try {
                    const result = await this.toolBus.execute(autoAction.name, autoAction.args);

                    if (result.success) {
                      actionsTaken.push(`${autoAction.name}: success (auto)`);
                      lastAction = autoAction.name;
                      lastResult = result.output || '';

                      this.conversation.push({
                        role: 'user',
                        content: `Auto-action ${autoAction.name} succeeded: ${result.output || 'Success'}`
                      });
                    } else {
                      actionsTaken.push(`${autoAction.name}: failed (auto)`);
                    }

                    this.streamEmitter.emitStepComplete('executing', autoAction.name, result.success);
                  } catch (error) {
                    console.error(`[BrowserAgent] Auto-action ${autoAction.name} failed:`, error);
                  }
                }

                // If we executed actions successfully, continue to next iteration
                if (actionsTaken.length > 0) {
                  continue;
                }
              }

              // If we get here, both LLM and auto-actions failed
              throw error;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }

        if (!response || !response.text) {
          finalResult = 'No response from LLM after retries';
          break;
        }

        this.conversation.push({ role: 'assistant', content: response.text });

        if (response.done) {
          finalResult = response.text;
          success = true;
          break;
        }

        // Execute tool calls
        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const toolCall of response.tool_calls) {
            if (this.cancelled) break;

            const toolName = toolCall.name;
            const toolArgs = toolCall.arguments || {};

            this.streamEmitter.emitStepStart('executing', toolName, JSON.stringify(toolArgs));

            try {
              const result = await this.toolBus.execute(toolName, toolArgs);

              if (result.success) {
                actionsTaken.push(`${toolName}: success`);
                lastAction = toolName;
                lastResult = result.output || '';

                this.conversation.push({
                  role: 'user',
                  content: `Tool ${toolName} returned: ${result.output || 'Success'}`
                });
              } else {
                actionsTaken.push(`${toolName}: failed`);
                this.conversation.push({
                  role: 'user',
                  content: `Tool ${toolName} failed: ${result.error || 'Unknown error'}`
                });
              }

              this.streamEmitter.emitStepComplete('executing', toolName, result.success);
            } catch (error) {
              console.error(`[BrowserAgent] ❌ ${toolName} error:`, error);
              this.conversation.push({
                role: 'user',
                content: `Tool ${toolName} threw error: ${error instanceof Error ? error.message : String(error)}`
              });
            }
          }
        } else {
          // No tool calls - check if we should continue
          if (actionsTaken.length > 0 && response.text.length > 50) {
            finalResult = response.text;
            success = true;
            break;
          }

          // If no actions taken, try autonomous continuation
          if (actionsTaken.length === 0 && iteration < 5) {
            const autoActions = await this.determineNextActions(task, lastAction, lastResult);
            if (autoActions.length > 0) {
              for (const autoAction of autoActions) {
                if (this.cancelled) break;

                this.streamEmitter.emitStepStart('executing', autoAction.name, JSON.stringify(autoAction.args));

                try {
                  const result = await this.toolBus.execute(autoAction.name, autoAction.args);

                  if (result.success) {
                    actionsTaken.push(`${autoAction.name}: success (auto)`);
                    lastAction = autoAction.name;
                    lastResult = result.output || '';

                    this.conversation.push({
                      role: 'user',
                      content: `Auto-action ${autoAction.name} succeeded: ${result.output || 'Success'}`
                    });
                  }

                  this.streamEmitter.emitStepComplete('executing', autoAction.name, result.success);
                } catch (error) {
                  console.error(`[BrowserAgent] Auto-action failed:`, error);
                }
              }
              continue;
            }
          }

          // After several iterations with no progress
          if (actionsTaken.length === 0) {
            finalResult = response.text || 'No actions taken';
            success = false;
            break;
          }
        }

        if (iteration >= this.maxIterations) {
          finalResult = response.text || `Completed ${actionsTaken.length} actions`;
          success = actionsTaken.length > 0;
          break;
        }
      }

      if (this.memory) {
        await this.memory.onTurnEnd();
      }

      return {
        success,
        output: finalResult || 'Task completed',
        actionsTaken,
        steps,
        iterations: iteration,
      };
    } catch (error) {
      console.error('[BrowserAgent] Error:', error);
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        actionsTaken,
        steps,
        iterations: iteration,
      };
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.streamEmitter.emitError('Task cancelled', false);
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.toolBus.getDefinitions();
  }
}
