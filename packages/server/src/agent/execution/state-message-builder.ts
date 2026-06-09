/**
 * State Message Builder Module
 * Builds user messages combining task, memory, and browser state for LLM input
 */

export interface StateMessageOptions {
  task: string;
  agentMemory: string;
  url: string;
  stateOutput: string;
  screenshotBase64?: string | null;
  useVision: boolean;
}

export interface BuiltMessage {
  role: 'user';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

/**
 * Build state message combining task, memory, and browser state
 */
export function buildStateMessage(options: StateMessageOptions): BuiltMessage {
  const {
    task,
    agentMemory,
    url,
    stateOutput,
    screenshotBase64,
    useVision
  } = options;

  const textContent = `<user_request>\n${task}\n</user_request>\n\n<agent_memory>\n${agentMemory || '(no memory yet)'}\n</agent_memory>\n\n<browser_state>\nCurrent URL: ${url}\n${stateOutput}\n</browser_state>`;

  if (screenshotBase64 && useVision && screenshotBase64.length > 100) {
    return {
      role: 'user',
      content: [
        { type: 'text', text: textContent },
        {
          type: 'image_url',
          image_url: {
            url: screenshotBase64
          }
        }
      ]
    };
  }

  return {
    role: 'user',
    content: textContent
  };
}

/**
 * Build system message with agent instructions
 */
export function buildSystemMessage(instructions: string): {
  role: 'system';
  content: string;
} {
  return {
    role: 'system',
    content: instructions
  };
}

/**
 * Build assistant message (for tool responses)
 */
export function buildAssistantMessage(content: string): {
  role: 'assistant';
  content: string;
} {
  return {
    role: 'assistant',
    content
  };
}

/**
 * Build tool response message
 */
export function buildToolMessage(
  toolName: string,
  output: string,
  isError?: boolean
): {
  role: 'tool';
  content: string;
  name: string;
} {
  return {
    role: 'tool',
    content: isError ? `Error: ${output}` : output,
    name: toolName
  };
}
