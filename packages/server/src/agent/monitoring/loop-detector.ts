/**
 * Proactive loop detection and prevention
 * Detects loops BEFORE they become problematic
 */

export interface LoopPattern {
  type: 'identical' | 'similar' | 'url_stuck' | 'action_stuck';
  description: string;
  severity: 'warning' | 'critical';
}

export interface LoopDetectionResult {
  isLooping: boolean;
  pattern?: LoopPattern;
  suggestion: string;
}

interface ActionHistory {
  actions: Array<{ name: string; args?: Record<string, unknown>; iteration: number }>;
  urls: Array<{ url: string; iteration: number }>;
}

/**
 * Proactive loop detector - identifies loops as they form
 */
export class LoopDetector {
  private history: ActionHistory = { actions: [], urls: [] };
  private maxHistorySize = 20;

  /**
   * Record an action for loop detection
   */
  recordAction(action: string, args?: Record<string, unknown>, iteration?: number, url?: string): void {
    this.history.actions.push({ name: action, args, iteration: iteration ?? 0 });

    if (url) {
      this.history.urls.push({ url, iteration: iteration ?? 0 });
    }

    // Keep history bounded
    if (this.history.actions.length > this.maxHistorySize) {
      this.history.actions.shift();
    }
    if (this.history.urls.length > this.maxHistorySize) {
      this.history.urls.shift();
    }
  }

  /**
   * Check if the agent is entering a loop (proactive detection)
   */
  detectLoop(): LoopDetectionResult {
    if (this.history.actions.length < 2) {
      return { isLooping: false, suggestion: '' };
    }

    // Check 1: Identical action repetition (catch after 2)
    const identicalResult = this.checkIdenticalRepetition();
    if (identicalResult.isLooping) {
      return identicalResult;
    }

    // Check 2: URL stuck (same URL, different actions)
    const urlStuckResult = this.checkUrlStuck();
    if (urlStuckResult.isLooping) {
      return urlStuckResult;
    }

    // Check 3: Action pattern repetition
    const patternResult = this.checkPatternRepetition();
    if (patternResult.isLooping) {
      return patternResult;
    }

    // Check 4: Navigation loop (A → B → A → B)
    const navLoopResult = this.checkNavigationLoop();
    if (navLoopResult.isLooping) {
      return navLoopResult;
    }

    return { isLooping: false, suggestion: '' };
  }

  /**
   * Detect identical action repetition (proactive: catch at 2 repeats)
   */
  private checkIdenticalRepetition(): LoopDetectionResult {
    const recent = this.history.actions.slice(-3);

    // Check if last 2 actions are identical
    if (recent.length >= 2) {
      const last = recent[recent.length - 1];
      const secondLast = recent[recent.length - 2];

      if (last.name === secondLast.name && this.argsEqual(last.args, secondLast.args)) {
        return {
          isLooping: true,
          pattern: {
            type: 'identical',
            description: `Action "${last.name}" repeated immediately`,
            severity: 'critical'
          },
          suggestion: `You're repeating the same action "${last.name}". The page may not have changed. Try: taking a snapshot, scrolling, or using a different approach.`
        };
      }
    }

    // Check for 3 identical within recent history
    for (let i = 0; i < recent.length - 2; i++) {
      const a = recent[i];
      const b = recent[i + 1];
      const c = recent[i + 2];

      if (a.name === b.name && b.name === c.name &&
          this.argsEqual(a.args, b.args) && this.argsEqual(b.args, c.args)) {
        return {
          isLooping: true,
          pattern: {
            type: 'identical',
            description: `Action "${a.name}" repeated 3 times`,
            severity: 'critical'
          },
          suggestion: `Action "${a.name}" keeps failing. STOP. Try a completely different approach.`
        };
      }
    }

    return { isLooping: false, suggestion: '' };
  }

  /**
   * Check if stuck on same URL (performing different actions but not progressing)
   */
  private checkUrlStuck(): LoopDetectionResult {
    if (this.history.urls.length < 4) {
      return { isLooping: false, suggestion: '' };
    }

    const recentUrls = this.history.urls.slice(-4);
    const uniqueUrls = new Set(recentUrls.map(u => u.url));

    // Same URL for 4+ iterations
    if (uniqueUrls.size === 1 && recentUrls.length >= 4) {
      const url = recentUrls[0].url;
      const recentActions = this.history.actions.slice(-4);

      // Check if actions are varied (not just waiting/snapshotting)
      const variedActions = new Set(recentActions.map(a => a.name));
      const hasProgressAction = !variedActions.has('browser_wait') &&
                                !variedActions.has('browser_snapshot');

      if (hasProgressAction || variedActions.size >= 3) {
        return {
          isLooping: true,
          pattern: {
            type: 'url_stuck',
            description: `Stuck on URL: ${url.substring(0, 50)}...`,
            severity: 'critical'
          },
          suggestion: `You've been on the same URL for ${recentUrls.length} steps. Try: navigating to a different page, going back, or scrolling to find what you need.`
        };
      }
    }

    return { isLooping: false, suggestion: '' };
  }

  /**
   * Check for repeating action patterns (e.g., click A → wait → click A → wait)
   */
  private checkPatternRepetition(): LoopDetectionResult {
    if (this.history.actions.length < 6) {
      return { isLooping: false, suggestion: '' };
    }

    const recent = this.history.actions.slice(-6);

    // Check for alternating pattern A → B → A → B
    if (recent.length >= 4) {
      const pattern1 = recent.slice(0, 2);
      const pattern2 = recent.slice(2, 4);

      if (this.actionsEqual(pattern1[0], pattern2[0]) &&
          this.actionsEqual(pattern1[1], pattern2[1])) {
        return {
          isLooping: true,
          pattern: {
            type: 'similar',
            description: `Alternating pattern: ${pattern1[0].name} → ${pattern1[1].name}`,
            severity: 'warning'
          },
          suggestion: `You're in a cycle of "${pattern1[0].name}" → "${pattern1[1].name}". Break the cycle by trying a different action.`
        };
      }
    }

    return { isLooping: false, suggestion: '' };
  }

  /**
   * Check for navigation loops (A → B → A → B)
   */
  private checkNavigationLoop(): LoopDetectionResult {
    if (this.history.urls.length < 4) {
      return { isLooping: false, suggestion: '' };
    }

    const recentUrls = this.history.urls.slice(-4).map(u => u.url);

    // Check for alternating URLs A → B → A → B
    if (recentUrls[0] === recentUrls[2] &&
        recentUrls[1] === recentUrls[3] &&
        recentUrls[0] !== recentUrls[1]) {
      return {
        isLooping: true,
        pattern: {
          type: 'url_stuck',
          description: `Navigation loop: ${recentUrls[0].substring(0, 30)}... ↔ ${recentUrls[1].substring(0, 30)}...`,
          severity: 'warning'
        },
        suggestion: `You're navigating back and forth between the same pages. Pick one path and stick with it.`
      };
    }

    return { isLooping: false, suggestion: '' };
  }

  /**
   * Compare if two action args are equal (simple deep compare)
   */
  private argsEqual(args1?: Record<string, unknown>, args2?: Record<string, unknown>): boolean {
    if (!args1 && !args2) return true;
    if (!args1 || !args2) return false;

    const keys1 = Object.keys(args1);
    const keys2 = Object.keys(args2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (args1[key] !== args2[key]) return false;
    }

    return true;
  }

  /**
   * Compare if two actions are equal
   */
  private actionsEqual(a: { name: string; args?: Record<string, unknown> }, b: { name: string; args?: Record<string, unknown> }): boolean {
    return a.name === b.name && this.argsEqual(a.args, b.args);
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.history = { actions: [], urls: [] };
  }

  /**
   * Get recent actions for debugging
   */
  getRecentActions(count: number = 5): Array<{ name: string; iteration: number }> {
    return this.history.actions.slice(-count).map(a => ({ name: a.name, iteration: a.iteration }));
  }
}
