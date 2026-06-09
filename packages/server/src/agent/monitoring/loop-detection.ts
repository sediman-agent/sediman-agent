/**
 * Loop Detection Module
 * Detects when the agent is stuck in a repetitive loop
 */

export interface LoopDetectionOptions {
  maxRepeats?: number;
  maxSameActionRepeats?: number;
  actionWindow?: number;
}

export interface LoopDetectionResult {
  isLooping: boolean;
  loopType?: 'same-action' | 'circular' | 'stuck';
  suggestion?: string;
}

/**
 * Detect if the agent is stuck in a repetitive loop
 *
 * @param actionsTaken - Array of actions taken so far
 * @param options - Detection options
 * @returns Loop detection result
 */
export function detectLoop(
  actionsTaken: string[],
  options: LoopDetectionOptions = {}
): LoopDetectionResult | null {
  const {
    maxRepeats = 3,
    maxSameActionRepeats = 3,
    actionWindow = 5
  } = options;

  if (actionsTaken.length < maxRepeats) {
    return null;
  }

  // Check for same action repeated
  const recentActions = actionsTaken.slice(-actionWindow);
  const actionCounts = new Map<string, number>();

  for (const action of recentActions) {
    const count = actionCounts.get(action) || 0;
    actionCounts.set(action, count + 1);
  }

  for (const [action, count] of actionCounts.entries()) {
    if (count >= maxSameActionRepeats) {
      return {
        isLooping: true,
        loopType: 'same-action',
        suggestion: `Stop repeating "${action}" - try a different approach`
      };
    }
  }

  // Check for circular patterns (A → B → C → A)
  if (detectCircularPattern(actionsTaken)) {
    return {
      isLooping: true,
      loopType: 'circular',
      suggestion: 'Detected circular pattern - break out of current approach'
    };
  }

  // Check if stuck (no progress)
  if (detectStuckPattern(actionsTaken)) {
    return {
      isLooping: true,
      loopType: 'stuck',
      suggestion: 'No progress detected - try alternative approach or request human help'
    };
  }

  return null;
}

/**
 * Detect circular patterns in action sequence
 */
function detectCircularPattern(actions: string[]): boolean {
  if (actions.length < 6) return false;

  // Look for A → B → C → A patterns
  const recent = actions.slice(-6);
  const first = recent[0];
  const last = recent[recent.length - 1];

  // Simple check: if first and last are same, and middle is different
  if (first === last) {
    const uniqueMiddle = new Set(recent.slice(1, -1));
    if (uniqueMiddle.size >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if agent is stuck (no meaningful progress)
 */
function detectStuckPattern(actions: string[]): boolean {
  if (actions.length < 4) return false;

  // Check if last 4 actions are all snapshots with no other actions
  const recent = actions.slice(-4);
  const allSnapshots = recent.every(a => a.includes('snapshot'));

  if (allSnapshots) {
    // Check if we're snapshotting repeatedly without taking action
    const snapshotActions = actions.filter(a => a.includes('snapshot'));
    if (snapshotActions.length >= 5) {
      const lastNonSnapshot = actions.slice().reverse().find(a => !a.includes('snapshot'));
      if (!lastNonSnapshot) {
        return true; // Only snapshots, no other actions
      }
    }
  }

  return false;
}

/**
 * Generate recovery hint based on loop type
 */
export function getRecoveryHint(loopType: 'same-action' | 'circular' | 'stuck'): string {
  switch (loopType) {
    case 'same-action':
      return 'Try a different element, selector, or approach';
    case 'circular':
      return 'Break the cycle - try a completely different strategy';
    case 'stuck':
      return 'Consider scrolling, waiting for page load, or using request_human_help';
    default:
      return 'Change approach and try alternative method';
  }
}
