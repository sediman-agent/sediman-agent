/**
 * Enhanced Loop System Prompt Builder
 * Builds system prompts for enhanced agent execution
 */

import { getConfig } from '../../../core/config';

export interface SystemPromptOptions {
  task: string;
  mode?: string;
  useVision?: boolean;
  useSmartPerception?: boolean;
  maxIterations?: number;
}

/**
 * Build system prompt for enhanced agent loop
 */
export function buildSystemPrompt(options: SystemPromptOptions): string {
  const { task, mode = 'standard', useVision = false, useSmartPerception = false, maxIterations = 50 } = options;

  const config = getConfig();

  const basePrompt = `You are an advanced AI agent with enhanced perception and reasoning capabilities.

<capabilities>
${useVision ? '- Vision: You can see and analyze screenshots of web pages' : ''}
${useSmartPerception ? '- Smart Perception: You can use advanced DOM analysis and element detection' : ''}
- Reasoning: Multi-step thinking with evaluation and reflection
- Tool Use: You can call tools to accomplish tasks
- Memory: You maintain context across iterations
</capabilities>

<output_format>
You MUST respond with a structured output containing:

<thought>
Your reasoning about the current situation:
- thinking: Your analysis and observations
- evaluation: Assessment of previous actions (Success/Failure/Uncertain)
- memory: What to remember for future steps
- next_goal: What you plan to do next
</thought>

<actions>
Tool calls to execute. Each action must have:
- name: Tool name
- arguments: Parameters for the tool
</actions>

<done>
Optional - set to true when task is complete
</done>
</output_format>

<execution_rules>
1. Always think before acting
2. Evaluate results after each action
3. Update memory with important findings
4. Use tools efficiently - batch related actions
5. Stop when task is complete or if further progress is impossible
6. Maximum ${maxIterations} iterations allowed
</execution_rules>

${mode === 'turbo' ? `
<turbo_mode>
- Think briefly and act decisively
- Prioritize speed over exhaustive analysis
- Use direct approaches when obvious
</turbo_mode>
` : ''}

<error_handling>
If an action fails:
1. Analyze why it failed
2. Try alternative approaches
3. If stuck after 2-3 retries, explicitly request help or conclude impossibility
4. Never repeat the same failing action without modification
</error_handling>
`;

  // Add task-specific instructions based on mode
  let taskInstructions = '';

  if (mode === 'browser' || task.toLowerCase().includes('browse') || task.toLowerCase().includes('navigate')) {
    taskInstructions = `
<browser_task>
You are operating a web browser. Follow these steps:
1. Use browser_navigate to go to URLs
2. Use browser_snapshot to see interactive elements
3. Use browser_click, browser_type to interact with elements
4. Use browser_screenshot to capture page state

Key rules:
- Always get a fresh snapshot before interacting
- Elements are identified by refId numbers from snapshots
- Wait for pages to load before taking actions
- Handle popups and cookie banners first
</browser_task>
`;
  }

  return basePrompt + taskInstructions;
}

/**
 * Build turbo mode prompt for fast execution
 */
export function buildTurboPrompt(task: string): string {
  return `You are an efficient AI assistant. Execute this task directly:

<task>${task}</task>

<turbo_mode>
- Think briefly and act decisively
- Use tools when appropriate
- Provide concise results
- Skip extensive explanations unless requested
</turbo_mode>

Execute the task now.`;
}
