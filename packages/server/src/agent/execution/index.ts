/**
 * Agent Execution Module
 *
 * Exports agent execution loops
 *
 * @module agent/execution
 */

// Export the enhanced loop as the primary
export { EnhancedAgentLoop, createEnhancedAgentLoop } from './enhanced-loop';
export type { EnhancedAgentLoopOpts, EnhancedAgentResult } from './enhanced-loop';

// Re-export the original loop for backward compatibility
export { AgentLoop } from './loop';
export type { AgentLoopOpts } from './loop';
