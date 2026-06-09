/**
 * Turbo Executor Module
 * Handles turbo/fast execution path for simple tasks
 */

import type { LLMProvider } from '../../llm/provider';
import type { ToolBus } from '../tools/bus';
import type { Message, AgentResult } from '../../core/types';
import { InterruptSignal } from '../core/interrupt';
import { ProgressTracker } from '../memory/progress';
import { StreamEmitter } from '../streaming';
import logger from '../../core/logging';
import { getConfig } from '../../core/config';

export interface TurboExecutorOptions {
  llmProvider: LLMProvider;
  toolBus: ToolBus;
  interrupt: InterruptSignal;
  progress: ProgressTracker;
  streamEmitter: StreamEmitter;
  memory?: any;
}

export interface TurboExecutionResult {
  success: boolean;
  result?: AgentResult;
  reason?: string;
}

/**
 * Execute task in turbo mode (simplified execution for simple tasks)
 */
export async function executeTurboPath(
  task: string,
  conversation: Message[],
  opts: TurboExecutorOptions
): Promise<TurboExecutionResult> {
  const config = getConfig();
  const { llmProvider, toolBus, interrupt, progress, streamEmitter, memory } = opts;

  logger.info('[TurboExecutor] Attempting turbo path for task');

  // Check if turbo mode is enabled
  if (!config.enableTurboMode) {
    return { success: false, reason: 'Turbo mode not enabled' };
  }

  // Check if task is simple enough for turbo path
  const isSimple = isTaskSimple(task);
  if (!isSimple) {
    return { success: false, reason: 'Task too complex for turbo path' };
  }

  try {
    // Build simplified system prompt for turbo execution
    const systemPrompt = buildTurboSystemPrompt();

    // Build user message
    const userMessage: Message = {
      role: 'user',
      content: `<task>${task}</task>\n\nExecute this task directly and efficiently.`
    };

    // Get available tools
    const tools = toolBus.getDefinitions();

    // Call LLM with simplified context
    const response = await llmProvider.chat(
      [{ role: 'system', content: systemPrompt }, userMessage],
      tools
    );

    // Check for tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      logger.info(`[TurboExecutor] Got ${response.toolCalls.length} tool calls`);

      // Execute tools directly
      const toolResults: Array<{ success: boolean; output: string }> = [];

      for (const toolCall of response.toolCalls) {
        interrupt.check();

        streamEmitter.emitStepStart('executing', toolCall.name, JSON.stringify(toolCall.arguments));
        progress.update(1, 5);

        const result = await toolBus.execute(toolCall.name, toolCall.arguments);
        toolResults.push(result);

        streamEmitter.emitStepComplete('executing', toolCall.name, result.output, result.success);

        if (!result.success) {
          logger.warn(`[TurboExecutor] Tool ${toolCall.name} failed: ${result.error}`);
        }
      }

      // Build final result
      const finalOutput = toolResults.map(r => r.output).join('\n');
      const allSuccessful = toolResults.every(r => r.success);

      // Add assistant response to conversation
      conversation.push({
        role: 'assistant',
        content: response.text || 'Executing task...',
        tool_calls: response.toolCalls
      });

      // Add tool results to conversation
      toolResults.forEach((result, idx) => {
        conversation.push({
          role: 'tool',
          tool_call_id: response.toolCalls![idx].id,
          content: result.success ? result.output : result.error || 'Tool failed',
          name: response.toolCalls![idx].name
        });
      });

      const agentResult: AgentResult = {
        success: allSuccessful,
        result: allSuccessful ? finalOutput : 'Task completed with some errors',
        steps: toolResults.length,
        duration: Date.now() - Date.now(), // Placeholder for actual timing
        conversation: conversation.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }))
      };

      if (memory) {
        await memory.onTurnEnd();
      }

      return { success: true, result: agentResult };
    }

    // No tool calls - treat as text-only response
    if (response.text) {
      conversation.push({
        role: 'assistant',
        content: response.text
      });

      const agentResult: AgentResult = {
        success: true,
        result: response.text,
        steps: 0,
        duration: 0,
        conversation: conversation.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }))
      };

      return { success: true, result: agentResult };
    }

    return { success: false, reason: 'No tool calls or text response from LLM' };
  } catch (error) {
    logger.error('[TurboExecutor] Turbo path failed:', error);
    return { success: false, reason: `Turbo execution failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Check if task is simple enough for turbo path
 */
function isTaskSimple(task: string): boolean {
  const config = getConfig();
  const maxLength = config.turboMaxTaskLength || 200;

  if (task.length > maxLength) return false;

  // Check for complex keywords
  const complexKeywords = ['analyze', 'research', 'compare', 'evaluate', 'investigate'];
  const lowerTask = task.toLowerCase();

  if (complexKeywords.some(kw => lowerTask.includes(kw))) {
    return false;
  }

  return true;
}

/**
 * Build simplified system prompt for turbo execution
 */
function buildTurboSystemPrompt(): string {
  return `You are an efficient AI assistant. Execute the given task directly and quickly.

<turbo_mode>
- Think briefly and act decisively
- Use tools when appropriate
- Provide concise results
- Skip extensive explanations unless requested
</turbo_mode>

<execution>
1. Understand the task
2. Choose the right tool(s)
3. Execute efficiently
4. Report results concisely
</execution>`;
}
