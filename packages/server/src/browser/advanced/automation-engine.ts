/**
 * Advanced Browser Automation Engine
 * Top-tier browser automation with advanced capabilities
 * Designed to be significantly better than browser-use
 */

import type { Page, Locator, ElementHandle } from "playwright";
import { createLogger } from "../../core/logging.js";
import { getRetrySystem } from "../../agent/stability/retry-system.js";
import { getPerformanceMonitor } from "../../agent/performance/monitor.js";
import { circuitBreakerRegistry } from "../../agent/stability/circuit-breaker.js";
import { getAdaptiveThrottler } from "../../agent/stability/adaptive-throttling.js";

const logger = createLogger('AdvancedBrowserEngine');

export interface AdvancedBrowserConfig {
  enableSmartWaits?: boolean;
  enableAutoScroll?: boolean;
  enableOverlayDetection?: boolean;
  enableDynamicSelectors?: boolean;
  enablePerformanceOptimization?: boolean;
  screenshotQuality?: 'low' | 'medium' | 'high';
  interactionSpeed?: 'instant' | 'human' | 'cautious';
  retryStrategy?: 'aggressive' | 'balanced' | 'conservative';
}

export interface SmartElementMatch {
  locator: Locator;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'visual';
  element?: ElementHandle;
  timing: number;
}

export interface InteractionResult {
  success: boolean;
  duration: number;
  method: string;
  confidence: number;
  error?: string;
  screenshotBefore?: string;
  screenshotAfter?: string;
}

/**
 * Advanced Browser Automation Engine
 * Top-tier browser automation with cutting-edge features
 */
export class AdvancedBrowserEngine {
  private page: Page;
  private config: AdvancedBrowserConfig;
  private retrySystem = getRetrySystem('browser');
  private performanceMonitor = getPerformanceMonitor();
  private circuitBreaker = circuitBreakerRegistry.get('browser');
  private adaptiveThrottler = getAdaptiveThrottler('browser');

  // Advanced caches
  private elementCache = new Map<string, { locator: Locator; timestamp: number; confidence: number }>();
  private selectorCache = new Map<string, Locator>();
  private pageStructureCache = new Map<string, any>();
  private visualCache = new Map<string, Buffer>();

  // Performance tracking
  private interactionHistory: Array<{ operation: string; duration: number; success: boolean; method: string }> = [];
  private maxHistorySize = 1000;

  constructor(page: Page, config: AdvancedBrowserConfig = {}) {
    this.page = page;
    this.config = {
      enableSmartWaits: true,
      enableAutoScroll: true,
      enableOverlayDetection: true,
      enableDynamicSelectors: true,
      enablePerformanceOptimization: true,
      screenshotQuality: 'high',
      interactionSpeed: 'human',
      retryStrategy: 'balanced',
      ...config
    };

    logger.info('[AdvancedBrowserEngine] Initialized with advanced capabilities');
  }

  /**
   * Advanced element resolution with multiple strategies
   */
  async resolveElement(identifier: string | number): Promise<SmartElementMatch | null> {
    const startTime = Date.now();

    try {
      const matches = await Promise.race([
        this.findByExactMatch(identifier),
        this.findByFuzzyMatch(identifier),
        this.findBySemanticMatch(identifier),
        this.findByVisualMatch(identifier)
      ]);

      if (!matches) {
        return null;
      }

      const timing = Date.now() - startTime;

      // Cache high-confidence matches
      if (matches.confidence > 0.8) {
        this.elementCache.set(`${identifier}`, {
          locator: matches.locator,
          timestamp: Date.now(),
          confidence: matches.confidence
        });
      }

      return matches;

    } catch (error) {
      logger.error(`[AdvancedBrowserEngine] Element resolution failed for ${identifier}: ` + (error as Error).message);
      return null;
    }
  }

  /**
   * Exact match strategy
   */
  private async findByExactMatch(identifier: string | number): Promise<SmartElementMatch | null> {
    try {
      const locator = typeof identifier === 'number'
        ? this.page.locator(`[data-sediman-ref-id="${identifier}"]`)
        : this.page.locator(identifier);

      const count = await locator.count();
      if (count === 0) {
        return null;
      }

      return {
        locator,
        confidence: 1.0,
        matchType: 'exact',
        timing: 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Fuzzy match strategy
   */
  private async findByFuzzyMatch(identifier: string | number): Promise<SmartElementMatch | null> {
    try {
      // Fuzzy text matching
      const textStr = typeof identifier === 'string' ? identifier : identifier.toString();

      // Try case-insensitive match
      const locator = this.page.locator(`text=${textStr}`, { hasText: textStr });

      const count = await locator.count();
      if (count === 0) {
        return null;
      }

      return {
        locator,
        confidence: 0.7,
        matchType: 'fuzzy',
        timing: 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Semantic match strategy
   */
  private async findBySemanticMatch(identifier: string | number): Promise<SmartElementMatch | null> {
    try {
      // Semantic understanding of element purpose
      const textStr = typeof identifier === 'string' ? identifier : identifier.toString();

      // Button semantic
      const buttonLocators = [
        this.page.locator(`button:has-text("${textStr}")`),
        this.page.locator(`[role="button"]:has-text("${textStr}")`),
        this.page.locator(`input[type="submit"][value*="${textStr}"]`),
      ];

      // Input semantic
      const inputLocators = [
        this.page.locator(`input[placeholder*="${textStr}"]`),
        this.page.locator(`input[name*="${textStr}"]`),
        this.page.locator(`#${textStr.replace(/\s+/g, '-').toLowerCase()}`),
      ];

      // Link semantic
      const linkLocators = [
        this.page.locator(`a:has-text("${textStr}")`),
        this.page.locator(`[href*="${textStr}"]`),
      ];

      const allLocators = [...buttonLocators, ...inputLocators, ...linkLocators];

      for (const locator of allLocators) {
        try {
          const count = await locator.count();
          if (count > 0) {
            return {
              locator,
              confidence: 0.6,
              matchType: 'semantic',
              timing: 0
            };
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Visual match strategy (placeholder for advanced visual recognition)
   */
  private async findByVisualMatch(identifier: string | number): Promise<SmartElementMatch | null> {
    // This would integrate with advanced visual recognition
    // For now, return null to fall back to other strategies
    return null;
  }

  /**
   * Advanced click with multiple fallback strategies
   */
  async advancedClick(identifier: string | number): Promise<InteractionResult> {
    const startTime = Date.now();

    try {
      const match = await this.resolveElement(identifier);
      if (!match) {
        return {
          success: false,
          duration: Date.now() - startTime,
          method: 'resolve_failed',
          confidence: 0,
          error: `Element not found: ${identifier}`
        };
      }

      // Take before screenshot if quality is high
      const screenshotBefore = this.config.screenshotQuality === 'high'
        ? await this.takeScreenshot()
        : undefined;

      // Apply adaptive throttling
      await this.adaptiveThrottler.acquire();

      // Execute click with strategy based on confidence
      let method = 'direct_click';
      let success = false;

      if (match.confidence > 0.9) {
        // High confidence - direct click
        success = await this.executeDirectClick(match.locator);
        method = 'direct_click';
      } else if (match.confidence > 0.7) {
        // Medium confidence - scroll and click
        await this.scrollToElement(match.locator);
        success = await this.executeDirectClick(match.locator);
        method = 'scroll_and_click';
      } else {
        // Low confidence - multiple strategies
        success = await this.executeRetryClick(match.locator);
        method = 'retry_click';
      }

      // Take after screenshot if quality is high
      const screenshotAfter = this.config.screenshotQuality === 'high'
        ? await this.takeScreenshot()
        : undefined;

      const duration = Date.now() - startTime;

      // Record interaction
      this.recordInteraction('click', duration, success, method);

      if (success) {
        this.performanceMonitor.recordToolExecution('click', duration, true);
      } else {
        this.performanceMonitor.recordToolExecution('click', duration, false);
      }

      return {
        success,
        duration,
        method,
        confidence: match.confidence,
        screenshotBefore,
        screenshotAfter
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordToolExecution('click', duration, false);

      return {
        success: false,
        duration,
        method: 'error',
        confidence: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Direct click execution
   */
  private async executeDirectClick(locator: Locator): Promise<boolean> {
    try {
      await locator.click({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retry click with backoff
   */
  private async executeRetryClick(locator: Locator): Promise<boolean> {
    try {
      const result = await this.retrySystem.execute(async () => {
        await locator.click({ timeout: 10000 });
        return true;
      }, 'retry_click');

      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Advanced text input with multiple strategies
   */
  async advancedType(identifier: string | number, text: string): Promise<InteractionResult> {
    const startTime = Date.now();

    try {
      const match = await this.resolveElement(identifier);
      if (!match) {
        return {
          success: false,
          duration: Date.now() - startTime,
          method: 'resolve_failed',
          confidence: 0,
          error: `Element not found: ${identifier}`
        };
      }

      // Apply adaptive throttling
      await this.adaptiveThrottler.acquire();

      let method = 'direct_type';
      let success = false;

      // Clear existing content
      await match.locator.fill('');

      // Type with human-like timing
      if (this.config.interactionSpeed === 'human') {
        for (const char of text) {
          await match.locator.type(char, { delay: Math.random() * 50 + 30 });
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 10));
        }
        success = true;
      } else if (this.config.interactionSpeed === 'instant') {
        await match.locator.fill(text);
        success = true;
      } else {
        // Cautious - very slow typing
        for (const char of text) {
          await match.locator.type(char, { delay: 100 + Math.random() * 50 });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        success = true;
      }

      const duration = Date.now() - startTime;

      // Record interaction
      this.recordInteraction('type', duration, success, method);
      this.performanceMonitor.recordToolExecution('type', duration, success);

      return {
        success,
        duration,
        method,
        confidence: match.confidence
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordToolExecution('type', duration, false);

      return {
        success: false,
        duration,
        method: 'error',
        confidence: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Smart scroll to element
   */
  async scrollToElement(locator: Locator): Promise<boolean> {
    try {
      await locator.scrollIntoViewIfNeeded();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Advanced screenshot with quality options
   */
  async takeScreenshot(): Promise<string> {
    try {
      const options: any = {
        type: 'png'
      };

      switch (this.config.screenshotQuality) {
        case 'low':
          options.quality = 50;
          break;
        case 'medium':
          options.quality = 75;
          break;
        case 'high':
          options.quality = 95;
          break;
      }

      const buffer = await this.page.screenshot(options);
      return buffer.toString('base64');
    } catch (error) {
      logger.error('[AdvancedBrowserEngine] Screenshot failed: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Record interaction for learning
   */
  private recordInteraction(operation: string, duration: number, success: boolean, method: string): void {
    this.interactionHistory.push({
      operation,
      duration,
      success,
      method
    });

    if (this.interactionHistory.length > this.maxHistorySize) {
      this.interactionHistory.shift();
    }
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats(): {
    totalInteractions: number;
    successRate: number;
    averageDuration: number;
    commonMethods: Map<string, number>;
    preferredTiming: Map<string, number>;
  } {
    const totalInteractions = this.interactionHistory.length;
    const successfulInteractions = this.interactionHistory.filter(i => i.success).length;
    const successRate = totalInteractions > 0 ? successfulInteractions / totalInteractions : 0;

    const averageDuration = totalInteractions > 0
      ? this.interactionHistory.reduce((sum, i) => sum + i.duration, 0) / totalInteractions
      : 0;

    const methodCounts = new Map<string, number>();
    for (const interaction of this.interactionHistory) {
      methodCounts.set(interaction.method, (methodCounts.get(interaction.method) || 0) + 1);
    }

    return {
      totalInteractions,
      successRate,
      averageDuration,
      commonMethods: methodCounts,
      preferredTiming: new Map() // Would calculate optimal timing
    };
  }

  /**
   * Optimize based on learned patterns
   */
  async optimizeFromHistory(): Promise<void> {
    const stats = this.getInteractionStats();

    // Optimize interaction speed based on success rates
    if (stats.successRate > 0.95) {
      // High success rate, optimize for speed
      if (this.config.interactionSpeed !== 'instant') {
        this.config.interactionSpeed = 'instant';
        logger.info('[AdvancedBrowserEngine] Optimized to instant speed');
      }
    } else if (stats.successRate < 0.8) {
      // Low success rate, slow down
      if (this.config.interactionSpeed !== 'cautious') {
        this.config.interactionSpeed = 'cautious';
        logger.info('[AdvancedBrowserEngine] Optimized to cautious speed');
      }
    }
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.elementCache.clear();
    this.selectorCache.clear();
    this.pageStructureCache.clear();
    this.visualCache.clear();
    logger.info('[AdvancedBrowserEngine] All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    elementCache: number;
    selectorCache: number;
    pageStructureCache: number;
    visualCache: number;
    totalCacheSize: number;
  } {
    const totalCacheSize = this.elementCache.size + this.selectorCache.size +
                          this.pageStructureCache.size + this.visualCache.size;

    return {
      elementCache: this.elementCache.size,
      selectorCache: this.selectorCache.size,
      pageStructureCache: this.pageStructureCache.size,
      visualCache: this.visualCache.size,
      totalCacheSize
    };
  }
}

// Global advanced browser engine instances
const advancedEngines = new Map<Page, AdvancedBrowserEngine>();

/**
 * Get or create advanced browser engine for page
 */
export function getAdvancedBrowserEngine(page: Page, config?: AdvancedBrowserConfig): AdvancedBrowserEngine {
  if (!advancedEngines.has(page)) {
    advancedEngines.set(page, new AdvancedBrowserEngine(page, config));
    logger.info('[AdvancedBrowserEngine] Created new engine for page');
  }
  return advancedEngines.get(page)!;
}

/**
 * Remove advanced browser engine
 */
export function removeAdvancedBrowserEngine(page: Page): void {
  advancedEngines.delete(page);
  logger.info('[AdvancedBrowserEngine] Removed engine for page');
}
