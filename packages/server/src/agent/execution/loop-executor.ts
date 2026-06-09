/**
 * Loop Executor Module
 * Handles the main agent execution loop with step-by-step processing
 */

import type { LLMProvider } from '../../llm/provider';
import type { ToolBus } from '../tools/bus';
import type { Message, StepEvent, AgentResult } from '../../core/types';
import { InterruptSignal } from '../core/interrupt';
import { AuditLog, SharedScratchpad, checkBudget } from '../monitoring/guardrails';
import { ProgressTracker } from '../memory/progress';
import { ContextCompressor } from '../memory/compressor';
import { StreamEmitter } from '../streaming';
import { LoopDetector } from '../monitoring/loop-detector';
import { CheckpointManager } from '../monitoring/checkpoint';
import logger from '../../core/logging';
import { getConfig } from '../../core/config';

export interface LoopExecutorOptions {
  llmProvider: LLMProvider;
  toolBus: ToolBus;
  interrupt: InterruptSignal;
  auditLog: AuditLog;
  scratchpad: SharedScratchpad;
  progress: ProgressTracker;
  compressor: ContextCompressor;
  streamEmitter: StreamEmitter;
  loopDetector: LoopDetector;
  checkpointManager: CheckpointManager;
  maxIterations?: number;
  memory?: any;
}

export interface LoopExecutionOptions {
  task: string;
  systemPrompt: string;
  initialConversation: Message[];
  soul?: string;
}

export interface LoopExecutionResult {
  result: AgentResult;
  steps: StepEvent[];
  conversation: Message[];
}

/**
 * Execute the main agent loop with step-by-step processing
 */
export async function executeLoop(
  opts: LoopExecutorOptions,
  execOpts: LoopExecutionOptions
): Promise<LoopExecutionResult> {
  const {
    llmProvider,
    toolBus,
    interrupt,
    auditLog,
    scratchpad,
    progress,
    compressor,
    streamEmitter,
    loopDetector,
    checkpointManager,
    maxIterations = 50,
    memory
  } = opts;

  const { task, systemPrompt, initialConversation, soul } = execOps;

  logger.info('[LoopExecutor] Starting execution loop');

  const conversation: Message[] = [...initialConversation];
  const steps: StepEvent[] = [];
  let iteration = 0;
  let consecutiveFailures = 0;
  let finalResult = '';

  // Main execution loop
  while (iteration < maxIterations) {
    iteration++;
    interrupt.check();

    logger.info(`[LoopExecutor] Iteration ${iteration}/${maxIterations}`);

    // Emit progress
    streamEmitter.emitProgress(iteration, maxIterations, `executing_step_${iteration}`);

    // Update progress tracker
    progress.update(iteration, maxIterations);

    // Check for loops
    const loopDetected = loopDetector.detectLoop(actionsTaken);
    if (loopDetected) {
      logger.warn('[LoopExecutor] Loop detected:', loopDetected);
      streamEmitter.emitLoopWarning(loopDetected);

      if (loopDetected.severity === 'critical') {
        break;
      }
    }

    // Check budget
    const budget = { iterations: iteration, maxIterations, cost: 0 };
    const budgetCheck = checkBudget(budget);
    if (!budgetCheck.ok) {
      logger.warn('[LoopExecutor] Budget exhausted:', budgetCheck);
      break;
    }

    // Compress context if needed
    if (iteration % 10 === 0 && conversation.length > 50) {
      conversation = compressor.compress(conversation);
      logger.info('[LoopExecutor] Compressed conversation');
    }

    try {
      // Build messages for LLM
      const messages = buildMessages(conversation, task, systemPrompt);

      // Get available tools
      const tools = toolBus.getDefinitions();

      // Call LLM
      const response = await llmProvider.chat(messages, tools);

      // Process response
      const result = await processResponse(
        response,
        conversation,
        toolBus,
        interrupt,
        auditLog,
        scratchpad,
        streamEmitter,
        steps
      );

      // Update state based on result
      if (result.success) {
        consecutiveFailures = 0;
        finalResult = result.output || finalResult;

        // Check if task is complete
        if (result.done) {
          logger.info('[LoopExecutor] Task completed');
          break;
        }
      } else {
        consecutiveFailures++;
        logger.error(`[LoopExecutor] Step failed: ${result.error}`);

        if (consecutiveFailures >= 3) {
          logger.error('[LoopExecutor] Too many consecutive failures');
          finalResult = result.error || 'Execution failed';
          break;
        }
      }

      // Create checkpoint periodically
      if (iteration % 5 === 0) {
        checkpointManager.saveCheckpoint({
          iteration,
          conversation,
          steps,
          result: finalResult
        });
      }
    } catch (error) {
      logger.error('[LoopExecutor] Execution error:', error);
      consecutiveFailures++;

      if (consecutiveFailures >= 3) {
        finalResult = error instanceof Error ? error.message : String(error);
        break;
      }
    }
  }

  // Build final result
  const agentResult: AgentResult = {
    success: consecutiveFailures < 3,
    result: finalResult || 'Task execution completed',
    steps: steps.length,
    duration: 0, // Calculate actual duration
    conversation: conversation.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }))
  };

  if (memory) {
    await memory.onTurnEnd();
  }

  return {
    result: agentResult,
    steps,
    conversation
  };
}

/**
 * Build messages for LLM call
 */
function buildMessages(
  conversation: Message[],
  task: string,
  systemPrompt: string
): Message[] {
  return [
    { role: 'system', content: systemPrompt },
    ...conversation,
    {
      role: 'user',
      content: `<current_task>${task}</current_task>\n\nContinue executing this task.`
    }
  ];
}

/**
 * Process LLM response and execute tools
 */
async function processResponse(
  response: any,
  conversation: Message[],
  toolBus: ToolBus,
  interrupt: InterruptSignal,
  auditLog: AuditLog,
  scratchpad: SharedScratchpad,
  streamEmitter: StreamEmitter,
  steps: StepEvent[]
): Promise<{ success: boolean; output?: string; error?: string; done?: boolean }> {
  const { text, toolCalls } = response;

  // Add assistant message to conversation
  conversation.push({
    role: 'assistant',
    content: text || '',
    tool_calls: toolCalls || []
  });

  // Check if done
  const done = text?.includes('<done>') || toolCalls?.some((tc: any) => tc.name === 'browser_end');

  if (!toolCalls || toolCalls.length === 0) {
    return { success: true, output: text, done };
  }

  // Execute tools
  const results: Array<{ success: boolean; output: string }> = [];

  for (const toolCall of toolCalls) {
    interrupt.check();

    streamEmitter.emitStepStart('executing', toolCall.name, JSON.stringify(toolCall.arguments));

    try {
      const result = await toolBus.execute(toolCall.name, toolCall.arguments);
      results.push(result);

      streamEmitter.emitStepComplete('executing', toolCall.name, result.output, result.success);

      // Add to audit log
      auditLog.add(toolCall.name, JSON.stringify(toolCall.arguments), {
        level: 'low',
        reasons: []
      });

      // Add tool result to conversation
      conversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result.success ? result.output : result.error || 'Tool failed',
        name: toolCall.name
      });

      // Add to steps
      steps.push({
        phase: 'executing',
        action: toolCall.name,
        detail: result.output,
        observation: result.success ? 'success' : 'failure'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ success: false, output: errorMsg });

      streamEmitter.emitStepComplete('executing', toolCall.name, errorMsg, false);

      conversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: `Error: ${errorMsg}`,
        name: toolCall.name
      });
    }
  }

  const allSuccessful = results.every(r => r.success);
  const combinedOutput = results.map(r => r.output).join('\n');

  return {
    success: allSuccessful,
    output: combinedOutput,
    error: allSuccessful ? undefined : combinedOutput,
    done
  };
}

// Temporary placeholder for actions tracking
const actionsTaken: string[] = [];
