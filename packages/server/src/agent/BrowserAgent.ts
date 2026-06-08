/**
 * BrowserAgent — vision-enabled autonomous browser agent
 *
 * Architecture mirrors browser-use's proven approach:
 * - Screenshots injected as vision input so the LLM SEES the page
 * - Tree-style DOM snapshot with scroll context and page stats
 * - Structured output: thinking → eval → memory → next_goal → actions
 * - Self-correction loop via evaluation feedback
 * - Auto-captures state (snapshot + screenshot) after every action
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
import { setLatestScreenshot } from '../api/routes/browser';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: string } };

type AgentMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  tool_call_id?: string;
  name?: string;
};

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
  /** Enable vision: send screenshots to the LLM as image inputs (default: true) */
  useVision?: boolean;
}

interface ParsedAgentResponse {
  thinking: string;
  evaluationPreviousGoal: string;
  memory: string;
  nextGoal: string;
  actions: Array<{ name: string; args: Record<string, unknown> }>;
  done: boolean;
  doneText: string;
}

export class BrowserAgent {
  private llmProvider: LLMProvider;
  private browserController: BrowserController | null;
  private memory: BaseMemoryStrategy | null;
  private skillEngine: SkillEngine | null;
  private skillSearch: SkillSearchEngine | null;
  private toolBus: ToolBus;
  private streamEmitter: StreamEmitter;
  private conversation: AgentMessage[] = [];
  private maxIterations: number;
  private soul: string;
  private workingDirectory: string;
  private cancelled = false;
  private useVision: boolean;
  private agentMemory = '';
  private consecutiveFailures = 0;

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
    this.useVision = opts.useVision ?? true;

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
    if ((this as any).toolsInitialized) return;

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

    (this as any).toolsInitialized = true;
  }

  private buildSystemPrompt(): string {
    return `You are an AI agent that operates a web browser to accomplish tasks. You see the page via screenshot AND text representation of interactive elements.

<language>
Default working language: English. Always respond in the same language as the user request.
</language>

<input_format>
At each step you receive:
1. <user_request> — Your ultimate objective. Has highest priority.
2. <agent_memory> — Your persistent memory across steps (track progress, counters, findings).
3. <browser_state> — Current URL, page stats, scroll info, and interactive elements in tree format.
4. A SCREENSHOT of the current page (if vision enabled) — This is your GROUND TRUTH.

Interactive elements format:
- [index]<tagname attr=value /> for interactive elements
- Indentation with \\t shows parent/child hierarchy
- *[index] means an element newly appeared since your last action
- Pure text lines are content (not interactive)
</input_format>

<browser_state>
Current URL: URL of the page you are on.
<page_stats>: links count, interactive elements, iframes, images, total elements, text chars.
<page_info>: pages above/below current scroll position.
Interactive elements: tree-style with [indices].
[Start of page] and [End of page] mark the visible area.
</browser_state>

<rules>
1. Only interact with elements that have a numeric [index].
2. Use the SCREENSHOT to verify the page state and your action results. It is GROUND TRUTH.
3. If an action might have failed, check the screenshot to confirm.
4. For search tasks: navigate → snapshot → type in search box → submit → wait for results.
5. For form filling: snapshot → type each field → click submit.
6. If the page has a popup, cookie banner, or modal — dismiss it FIRST before proceeding.
7. If you get a 403, bot detection, or access denied — do NOT retry the same URL. Try alternatives.
8. If stuck in a loop (same URL, same action failing 3+ times) — change approach.
9. When filling autocomplete/combobox fields: type text, then WAIT for suggestions to appear. Click the correct suggestion instead of pressing Enter.
10. If a click opens a new tab, switch to it.
11. Use browser_take_and_store_screenshot after major navigation/interaction to update the UI.
</rules>

<output_format>
You MUST respond with tools calls (via function calling). Include these fields in your text response BEFORE the tool calls:

<thinking>
Your reasoning about the current state, what you see in the screenshot, and why you chose these actions.
</thinking>

<evaluation>
Success/Failure — evaluate your PREVIOUS action using the screenshot as evidence. Format: "Success: ..." or "Failure: ..." or "Uncertain: ..."
</evaluation>

<memory>
1-3 sentences of specific progress tracking. Include: pages visited, items found, steps completed, what remains. This is persisted across steps.
</memory>

<next_goal>
One clear sentence stating what you will accomplish next.
</next_goal>

Then call the appropriate tool(s). You may call multiple tools (they execute sequentially).
</output_format>

<task_completion>
Call the browser_end tool when:
1. The user request is fully completed, OR
2. It is absolutely impossible to continue, OR
3. You've reached your step limit.

Set success=true only if ALL parts of the request are done. If anything is missing or uncertain, set success=false.
Put ALL relevant findings in the summary field.

Before claiming success, verify:
- Did you find/extract the CORRECT number of items requested?
- Did you apply ALL specified filters?
- Can you confirm every value from what you SEE on the page?
</task_completion>

<error_recovery>
If an action fails:
1. Check the screenshot to understand the actual page state
2. If a popup/modal blocks interaction, dismiss it first
3. If element not found, the page may have changed — take a fresh snapshot
4. If blocked (403/login), try alternative sites or approaches
5. After 2-3 repeated failures, explicitly change strategy
</error_recovery>

IMPORTANT: The SCREENSHOT is your most reliable source of truth. Always check it to verify your actions succeeded.
`;
  }

  /**
   * Capture current browser state: snapshot + screenshot → vision-enhanced message
   */
  private async captureState(): Promise<{
    output: string;
    screenshot: string | null;
    url: string;
    title: string;
  }> {
    const ctrl = this.browserController;
    if (!ctrl) {
      return { output: '', screenshot: null, url: '', title: '' };
    }

    try {
      const snapshot = await ctrl.snapshot();
      let screenshot: string | null = null;

      if (this.useVision) {
        screenshot = await ctrl.screenshot();
      }

      // Store screenshot for frontend display (via /api/browser/screenshot)
      if (screenshot && screenshot.length > 100) {
        setLatestScreenshot(screenshot, snapshot.url);
      }

      return {
        output: snapshot.output || `URL: ${snapshot.url}\nTitle: ${snapshot.title}\n${snapshot.elements.length} interactive elements`,
        screenshot,
        url: snapshot.url,
        title: snapshot.title,
      };
    } catch (e) {
      console.error('[BrowserAgent] Failed to capture state:', e);
      return { output: '', screenshot: null, url: '', title: '' };
    }
  }

  /**
   * Build a vision message with screenshot + DOM text for the LLM
   */
  private buildStateMessage(
    task: string,
    stateOutput: string,
    screenshotBase64: string | null,
    url: string,
  ): AgentMessage {
    const textContent = `<user_request>\n${task}\n</user_request>\n\n<agent_memory>\n${this.agentMemory || '(no memory yet)'}\n</agent_memory>\n\n<browser_state>\nCurrent URL: ${url}\n${stateOutput}\n</browser_state>`;

    if (screenshotBase64 && this.useVision && screenshotBase64.length > 100) {
      return {
        role: 'user',
        content: [
          { type: 'text', text: textContent },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${screenshotBase64}`,
              detail: 'auto',
            },
          },
        ],
      };
    }

    return { role: 'user', content: textContent };
  }

  /**
   * Parse structured output from the LLM text response
   */
  private parseAgentResponse(text: string): ParsedAgentResponse {
    const result: ParsedAgentResponse = {
      thinking: '',
      evaluationPreviousGoal: '',
      memory: '',
      nextGoal: '',
      actions: [],
      done: false,
      doneText: '',
    };

    if (!text) return result;

    const thinkMatch = text.match(/<thinking>\s*([\s\S]*?)\s*<\/thinking>/i);
    if (thinkMatch) result.thinking = thinkMatch[1].trim();

    const evalMatch = text.match(/<evaluation>\s*([\s\S]*?)\s*<\/evaluation>/i);
    if (evalMatch) result.evaluationPreviousGoal = evalMatch[1].trim();

    const memMatch = text.match(/<memory>\s*([\s\S]*?)\s*<\/memory>/i);
    if (memMatch) result.memory = memMatch[1].trim();

    const goalMatch = text.match(/<next_goal>\s*([\s\S]*?)\s*<\/next_goal>/i);
    if (goalMatch) result.nextGoal = goalMatch[1].trim();

    return result;
  }

  /**
   * Execute a single tool call and return its result
   */
  private async executeToolCall(
    toolName: string,
    toolArgs: Record<string, unknown>,
    actionsTaken: string[],
    stepNumber: number,
  ): Promise<{ success: boolean; output: string; error?: string }> {
    this.streamEmitter.emitStepStart('executing', toolName, JSON.stringify(toolArgs));

    try {
      const result = await this.toolBus.execute(toolName, toolArgs);

      if (result.success) {
        actionsTaken.push(`${toolName}: success`);
        this.consecutiveFailures = 0;
      } else {
        actionsTaken.push(`${toolName}: failed`);
        this.consecutiveFailures++;
      }

      this.streamEmitter.emitStepComplete(
        'executing',
        toolName,
        result.success ? (result.output || 'Success') : (result.error || 'Failed'),
        result.success,
      );

      return {
        success: result.success,
        output: result.output || '',
        error: result.error,
      };
    } catch (error) {
      this.consecutiveFailures++;
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[BrowserAgent] Tool ${toolName} threw:`, errMsg);

      this.streamEmitter.emitStepComplete('executing', toolName, errMsg, false);

      return { success: false, output: '', error: errMsg };
    }
  }

  async execute(task: string, onEvent?: (event: StepEvent) => void): Promise<AgentResult> {
    if (onEvent) {
      this.streamEmitter.onEvent((event: import('./streaming').AgentStreamEvent) => {
        if (event.type === 'progress') {
          onEvent({ phase: 'executing', action: 'progress', detail: `${event.iteration}/${event.maxIterations}` });
        } else if (event.type === 'step_start') {
          onEvent({ phase: event.phase, action: event.action, detail: event.detail });
        } else if (event.type === 'step_complete') {
          onEvent({ phase: event.phase, action: event.action, observation: event.observation });
        } else if (event.type === 'error') {
          onEvent({ phase: 'executing', action: 'error', detail: event.error });
        }
      });
    }

    const steps: StepEvent[] = [];
    const actionsTaken: string[] = [];
    let finalResult = '';
    let success = false;
    let iteration = 0;
    this.consecutiveFailures = 0;

    try {
      this.soul = loadSoul();
      this.cancelled = false;
      this.agentMemory = '';

      if (this.memory) {
        await this.memory.onTurnStart();
      }

      const systemPrompt = this.buildSystemPrompt();
      this.conversation = [];

      // Capture initial state and inject as first user message
      this.streamEmitter.emitProgress(0, this.maxIterations, 'capturing initial state');

      const initialState = await this.captureState();
      const initialMsg = this.buildStateMessage(task, initialState.output, initialState.screenshot, initialState.url);
      this.conversation.push(initialMsg);

      this.streamEmitter.emitProgress(0, this.maxIterations, 'starting');

      const TOOLS = this.toolBus.getDefinitions();

      while (iteration < this.maxIterations && !this.cancelled) {
        iteration++;
        this.streamEmitter.emitProgress(iteration, this.maxIterations, 'thinking');

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          ...this.conversation,
        ];

        let response;
        let llmRetries = 0;
        while (llmRetries < 3) {
          try {
            response = await this.llmProvider.chat(messages, TOOLS, systemPrompt);
            break;
          } catch (error: any) {
            llmRetries++;
            console.log(`[BrowserAgent] LLM error (attempt ${llmRetries}/3):`, error.message);
            if (llmRetries >= 3) {
              if (this.consecutiveFailures >= 3) {
                return {
                  task,
                  result: `LLM failed after ${llmRetries} retries and ${this.consecutiveFailures} consecutive tool failures`,
                  success: false,
                  actions_taken: actionsTaken,
                  steps,
                  iterations: iteration,
                  strategy_used: 'browser_vision',
                  elapsed_secs: 0,
                };
              }
              throw error;
            }
            await new Promise(r => setTimeout(r, 1000 * llmRetries));
          }
        }

        if (!response) {
          finalResult = 'No response from LLM';
          break;
        }

        // Parse structured output from text
        const parsed = this.parseAgentResponse(response.text || '');

        // Update memory from parsed response
        if (parsed.memory) {
          this.agentMemory = parsed.memory;
        }

        // Log thinking and evaluation
        if (parsed.thinking) {
          console.log(`[BrowserAgent] 💡 Thinking: ${parsed.thinking.slice(0, 150)}...`);
          this.streamEmitter.emitThinking(parsed.thinking, 'thinking');
        }
        if (parsed.evaluationPreviousGoal) {
          console.log(`[BrowserAgent] 📊 Eval: ${parsed.evaluationPreviousGoal}`);
        }

        // Add assistant response to conversation
        this.conversation.push({
          role: 'assistant',
          content: response.text || '',
        });

        // Done signal — check for browser_end or LLM indicating completion
        if (response.done || parsed.done) {
          finalResult = response.text || '';
          // Check if browser_end was the last action
          const lastAction = actionsTaken[actionsTaken.length - 1];
          if (lastAction && lastAction.includes('browser_end')) {
            success = true;
          } else if (parsed.evaluationPreviousGoal.toLowerCase().includes('success')) {
            success = true;
          } else {
            success = actionsTaken.length > 0;
          }
          break;
        }

        // Execute tool calls
        if (response.tool_calls && response.tool_calls.length > 0) {
          let anySuccess = false;
          let combinedOutput = '';

          for (const toolCall of response.tool_calls) {
            if (this.cancelled) break;

            const result = await this.executeToolCall(
              toolCall.name,
              toolCall.arguments || {},
              actionsTaken,
              iteration,
            );

            if (result.success) {
              anySuccess = true;
              combinedOutput += `[${toolCall.name}]: ${result.output}\n`;
            } else {
              combinedOutput += `[${toolCall.name}] FAILED: ${result.error || 'Unknown error'}\n`;
            }
          }

          // After tool execution, capture new state and inject as vision message
          if (!this.cancelled) {
            await new Promise(r => setTimeout(r, 500)); // Brief pause for page updates

            const newState = await this.captureState();
            const stateMsg = this.buildStateMessage(
              `Continue working on: ${task}`,
              newState.output,
              newState.screenshot,
              newState.url,
            );

            // Prefix with action results
            if (typeof stateMsg.content === 'string') {
              stateMsg.content = `<action_results>\n${combinedOutput.trim()}\n</action_results>\n\n${stateMsg.content}`;
            } else if (Array.isArray(stateMsg.content)) {
              const textPart = stateMsg.content.find(p => p.type === 'text');
              if (textPart && 'text' in textPart) {
                textPart.text = `<action_results>\n${combinedOutput.trim()}\n</action_results>\n\n${textPart.text}`;
              }
            }

            this.conversation.push(stateMsg);
          }

          // If all actions failed and we're in a failure loop, inject reflection
          if (!anySuccess && this.consecutiveFailures >= 3) {
            this.conversation.push({
              role: 'user',
              content: '<reflection>\nMultiple consecutive failures. The previous actions did not succeed. Examine the SCREENSHOT carefully to understand the actual page state. Try a completely different approach.\n</reflection>',
            });
          }
        } else {
          // No tool calls — text-only response
          if (actionsTaken.length > 0 && response.text && response.text.length > 50) {
            finalResult = response.text;
            success = true;
            break;
          }

          if (iteration >= this.maxIterations) {
            finalResult = response.text || 'Max iterations reached';
            success = actionsTaken.length > 0;
            break;
          }

          // Prompt to continue
          this.conversation.push({
            role: 'user',
            content: 'Please continue. Take the next action to complete the task.',
          });
        }

        // Max iterations check
        if (iteration >= this.maxIterations) {
          finalResult = this.agentMemory || `Completed ${actionsTaken.length} actions`;
          success = actionsTaken.length > 0;
          break;
        }

        // Budget warning at 75%
        if (iteration >= this.maxIterations * 0.75) {
          this.conversation.push({
            role: 'user',
            content: `<budget_warning>You have used ${iteration}/${this.maxIterations} steps. Focus on the most important remaining items and wrap up soon.</budget_warning>`,
          });
        }
      }

      if (!finalResult && !this.cancelled) {
        finalResult = this.agentMemory || 'Task execution ended without final result';
        success = actionsTaken.length > 0;
      }

      if (this.memory) {
        await this.memory.onSessionEnd();
      }

      return {
        task,
        result: finalResult || 'Task completed',
        success,
        actions_taken: actionsTaken,
        steps,
        iterations: iteration,
        strategy_used: 'browser_vision',
        elapsed_secs: 0,
      };
    } catch (error) {
      console.error('[BrowserAgent] Fatal error:', error);
      return {
        task,
        result: error instanceof Error ? error.message : String(error),
        success: false,
        actions_taken: actionsTaken,
        steps,
        iterations: iteration,
        strategy_used: 'browser_vision',
        elapsed_secs: 0,
      };
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.streamEmitter.emitError('Task cancelled', false);
  }

  /** Backward-compatible alias for execute() */
  async run(task: string): Promise<AgentResult> {
    return this.execute(task);
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.toolBus.getDefinitions();
  }
}
