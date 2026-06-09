/**
 * Reflection Engine Module
 * Self-reflection and progress assessment for agent decisions
 */

import type { StepEvent } from "../../core/types";

export interface ReflectionOptions {
  maxIterations?: number;
  requireProgress?: boolean;
}

export interface ReflectionResult {
  success: boolean;
  recoveryHint?: string;
  shouldContinue?: boolean;
}

/**
 * Reflect on progress and decide if should continue
 *
 * @param task - Original task description
 * @param steps - Steps taken so far
 * @param iteration - Current iteration number
 * @param options - Reflection options
 * @returns Reflection result
 */
export function reflect(
  task: string,
  steps: StepEvent[],
  iteration: number,
  options: ReflectionOptions = {}
): ReflectionResult {
  const {
    maxIterations = 50,
    requireProgress = true
  } = options;

  // Check iteration limit
  if (iteration >= maxIterations) {
    return {
      success: false,
      recoveryHint: 'Maximum iterations reached',
      shouldContinue: false
    };
  }

  // Check for progress
  if (requireProgress && steps.length > 0) {
    const lastSteps = steps.slice(-5);
    const hasProgress = assessProgress(lastSteps);

    if (!hasProgress) {
      return {
        success: false,
        recoveryHint: 'No progress detected in last 5 steps',
        shouldContinue: false
      };
    }
  }

  // Check for error patterns
  const errorPattern = detectErrorPattern(steps);
  if (errorPattern) {
    return {
      success: false,
      recoveryHint: errorPattern,
      shouldContinue: false
    };
  }

  return {
    success: true,
    shouldContinue: true
  };
}

/**
 * Assess if recent steps show progress
 */
function assessProgress(steps: StepEvent[]): boolean {
  if (steps.length === 0) return true;

  // Look for successful actions (observations that don't contain errors)
  const successfulSteps = steps.filter(s => !s.observation?.toLowerCase().includes('error'));

  // If we have any successful actions in recent steps, that's progress
  if (successfulSteps.length > 0) {
    return true;
  }

  // Check if we're at least trying different things (no repeated failures)
  const actions = steps.map(s => s.action);
  const uniqueActions = new Set(actions);

  if (uniqueActions.size >= 2) {
    return true; // Trying different approaches
  }

  // All same action with no success
  return false;
}

/**
 * Detect patterns of repeated errors
 */
function detectErrorPattern(steps: StepEvent[]): string | null {
  const recentSteps = steps.slice(-5);

  // Check for repeated "element not found" errors
  const elementNotFoundErrors = recentSteps.filter(s =>
    s.observation?.toLowerCase().includes('not found') ||
    s.observation?.toLowerCase().includes('element not found')
  );

  if (elementNotFoundErrors.length >= 3) {
    return 'Elements not found - try taking a fresh snapshot or scroll to find elements';
  }

  // Check for repeated timeout errors
  const timeoutErrors = recentSteps.filter(s =>
    s.observation?.toLowerCase().includes('timeout')
  );

  if (timeoutErrors.length >= 3) {
    return 'Repeated timeouts - page may be loading slowly, try waiting longer';
  }

  // Check for navigation errors
  const navErrors = recentSteps.filter(s =>
    s.observation?.toLowerCase().includes('navigate') ||
    s.observation?.toLowerCase().includes('404') ||
    s.observation?.toLowerCase().includes('blocked')
  );

  if (navErrors.length >= 2) {
    return 'Navigation failing - URL may be invalid or blocked';
  }

  return null;
}

/**
 * Generate suggestion for next action based on reflection
 */
export function generateSuggestion(
  task: string,
  steps: StepEvent[],
  lastAction?: string
): string {
  if (steps.length === 0) {
    return 'Start by navigating to the target URL or taking a snapshot';
  }

  const lastStep = steps[steps.length - 1];

  if (lastStep.observation?.toLowerCase().includes('error')) {
    if (lastStep.observation.toLowerCase().includes('not found')) {
      return 'Try browser_snapshot to get fresh element coordinates, or scroll to find the element';
    }
    if (lastStep.observation.toLowerCase().includes('timeout')) {
      return 'Wait for page to load using browser_wait with a selector';
    }
    if (lastStep.action === 'browser_click') {
      return 'Try clicking with different coordinates or use browser_type instead';
    }
  }

  // If last action was successful but we're still going
  if (!lastStep.observation?.toLowerCase().includes('error')) {
    if (lastStep.action === 'browser_snapshot') {
      return 'Interact with an element using its refId number';
    }
    if (lastStep.action === 'browser_navigate') {
      return 'Wait for page to load, then take a snapshot';
    }
  }

  return 'Continue with the next logical action toward task completion';
}
