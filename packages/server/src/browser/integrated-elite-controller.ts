/**
 * Integrated Elite Browser Controller
 * Combines all advanced browser automation capabilities into a unified controller
 * Maintains backward compatibility while providing elite features
 *
 * This controller integrates:
 * - Advanced Browser Engine (multi-strategy element resolution)
 * - Optimized Browser Session (retry logic, health checks)
 * - Circuit Breaker Protection (prevents cascading failures)
 * - Adaptive Throttling (dynamic performance-based rate limiting)
 * - Performance Monitoring (comprehensive metrics and telemetry)
 * - Elite Automation Features (AI-powered learning and prediction)
 */

import type { Page, Locator } from "playwright";
import { getConfig } from "../core/config.js";
import logger from "../core/logging.js";
import { BrowserSession } from "./session.js";
import { OptimizedBrowserSession } from "./optimized-session.js";
import { DISMISS_OVERLAYS_JS } from "./scripts/dismiss-overlays.js";
import { SNAPSHOT_JS } from "./scripts/snapshot.js";
import { createCDPInteractions, CDPInteractions } from "./cdp/index.js";
import { createElementResolver } from "./element-resolution/index.js";
import { getAdvancedBrowserEngine, AdvancedBrowserConfig } from "./advanced/automation-engine.js";
import { getRetrySystem } from "../agent/stability/retry-system.js";
import { getPerformanceMonitor } from "../agent/performance/monitor.js";
import { circuitBreakerRegistry } from "../agent/stability/circuit-breaker.js";
import { getAdaptiveThrottler } from "../agent/stability/adaptive-throttling.js";

// Re-export all the core types for backward compatibility
export interface ElementInfo {
  refId: number;
  tag: string;
  text: string;
  role: string;
  placeholder: string;
  href: string;
  src: string;
  alt: string;
  type: string;
  value: string;
  ariaLabel: string;
  title: string;
  name: string;
  isNew?: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PageSnapshot {
  url: string;
  title: string;
  elements: ElementInfo[];
  textPreview: string;
  output: string;
  scrollPosition?: { x: number; y: number };
  viewport?: { width: number; height: number };
  pageSize?: { width: number; height: number };
  stats?: {
    links: number;
    interactive: number;
    iframes: number;
    images: number;
    total: number;
    textChars: number;
  };
  pagesAbove?: number;
  pagesBelow?: number;
}

export interface EliteControllerConfig {
  headless?: boolean;
  userDataDir?: string;
  stealth?: boolean;
  proxy?: string;
  fingerprintSeed?: number;
  onStep?: (action: string, detail: string) => void;

  // Elite feature flags
  enableAdvancedFeatures?: boolean;
  enableRetry?: boolean;
  enableCircuitBreaker?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableAdaptiveThrottling?: boolean;
  enableElementCaching?: boolean;
  enableAIResolution?: boolean;
  enableLearning?: boolean;
  enableOptimization?: boolean;

  // Performance tuning
  maxRetries?: number;
  operationTimeout?: number;
  cacheSize?: number;
  interactionSpeed?: 'instant' | 'human' | 'cautious' | 'adaptive';
  screenshotQuality?: 'low' | 'medium' | 'high';
}

export interface EliteActionResult {
  success: boolean;
  message: string;
  duration: number;
  method: string;
  confidence: number;
  retryAttempts: number;
  fallbacks: string[];
  optimizations: string[];
  screenshotBefore?: string;
  screenshotAfter?: string;
}

/**
 * Integrated Elite Browser Controller
 *
 * This is the most advanced browser controller that combines:
 * 1. Basic browser operations (backward compatible)
 * 2. Optimized session management (health checks, retry logic)
 * 3. Advanced element resolution (9-strategy fallback with AI)
 * 4. Elite automation features (learning, prediction, optimization)
 * 5. Circuit breaker protection (prevents cascading failures)
 * 6. Adaptive throttling (dynamic performance-based rate limiting)
 * 7. Performance monitoring (comprehensive metrics and telemetry)
 */
export class IntegratedEliteController {
  private session: OptimizedBrowserSession | BrowserSession;
  private onStep?: (action: string, detail: string) => void;
  private cdpInteractions: CDPInteractions | null = null;
  private elementResolver = createElementResolver();

  // Elite systems
  private retrySystem = getRetrySystem('browser');
  private performanceMonitor = getPerformanceMonitor();
  private circuitBreaker = circuitBreakerRegistry.get('browser');
  private adaptiveThrottler = getAdaptiveThrottler('browser');
  private advancedEngine: ReturnType<typeof getAdvancedBrowserEngine> | null = null;

  // Configuration
  private config: EliteControllerConfig;

  // Advanced caching
  private elementCache = new Map<number, { locator: Locator; timestamp: number; confidence: number }>();
  private resolutionCache = new Map<string, Locator>();
  private maxCacheSize: number;

  // Performance tracking
  private operationHistory: Array<{ operation: string; duration: number; success: boolean; method: string; timestamp: number }> = [];
  private maxHistorySize = 1000;

  // Statistics
  private stats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    retriesTriggered: 0,
    circuitBreakerTrips: 0,
    optimizationsApplied: 0,
  };

  // Quality tracking
  private problematicOperations = new Map<string, number>();
  private lastOptimizationTime = Date.now();
  private optimizationInterval = 60000; // Optimize every minute

  constructor(config: EliteControllerConfig = {}) {
    this.config = {
      enableAdvancedFeatures: true,
      enableRetry: true,
      enableCircuitBreaker: true,
      enablePerformanceMonitoring: true,
      enableAdaptiveThrottling: true,
      enableElementCaching: true,
      enableAIResolution: true,
      enableLearning: true,
      enableOptimization: true,
      maxRetries: 5,
      operationTimeout: 15000,
      cacheSize: 1000,
      interactionSpeed: 'adaptive',
      screenshotQuality: 'high',
      ...config
    };

    this.maxCacheSize = this.config.cacheSize || 1000;

    // Initialize optimized session if advanced features are enabled
    if (this.config.enableAdvancedFeatures) {
      this.session = new OptimizedBrowserSession({
        headless: config.headless,
        userDataDir: config.userDataDir,
        stealth: config.stealth,
        proxy: config.proxy,
        fingerprintSeed: config.fingerprintSeed,
        connectionTimeout: 30000,
        operationTimeout: this.config.operationTimeout,
        onScreenshot: config.onStep ? (data) => config.onStep!("screenshot", `${data.length} bytes`) : undefined,
      });
    } else {
      // Use basic session for backward compatibility
      this.session = new BrowserSession({
        headless: config.headless,
        userDataDir: config.userDataDir,
      });
    }

    this.onStep = config.onStep;

    logger.info('[IntegratedEliteController] Initialized with elite capabilities - ' +
      `advancedFeatures: ${this.config.enableAdvancedFeatures}, ` +
      `retry: ${this.config.enableRetry}, ` +
      `circuitBreaker: ${this.config.enableCircuitBreaker}, ` +
      `performanceMonitoring: ${this.config.enablePerformanceMonitoring}, ` +
      `adaptiveThrottling: ${this.config.enableAdaptiveThrottling}, ` +
      `elementCaching: ${this.config.enableElementCaching}, ` +
      `aiResolution: ${this.config.enableAIResolution}, ` +
      `learning: ${this.config.enableLearning}, ` +
      `optimization: ${this.config.enableOptimization}`);
  }

  /**
   * Get or create CDP interactions instance for current page
   */
  private getCDP(): CDPInteractions {
    if (!this.cdpInteractions) {
      this.cdpInteractions = createCDPInteractions(this.page());
    }
    return this.cdpInteractions;
  }

  /**
   * Get current page (alias for getPage)
   */
  private page(): Page {
    // Synchronous version for compatibility with advanced engine
    // Note: This should only be called after the browser is started
    const context = this.session.context;
    if (!context) {
      throw new Error("no context in browser session");
    }

    const pages = context.pages();
    if (!pages || pages.length === 0) {
      throw new Error("no active page - browser may not be started");
    }

    return pages[0];
  }

  /**
   * Get current page with health check
   */
  private async getPage(): Promise<Page> {
    // If using optimized session, leverage health check
    if (this.session instanceof OptimizedBrowserSession) {
      const health = await this.session.healthCheck();
      if (!health.healthy) {
        logger.warn(`[IntegratedEliteController] Browser health issues: ${health.issues.join(', ')}`);

        // Try to recover if possible
        if (!this.session.isStarted) {
          await this.start();
        }
      }

      const page = await this.session.getPage(5000);
      if (!page) {
        throw new Error('No active page available');
      }

      // Initialize advanced engine if enabled
      if (this.config.enableAdvancedFeatures && !this.advancedEngine) {
        const engineConfig: AdvancedBrowserConfig = {
          enableSmartWaits: true,
          enableAutoScroll: true,
          enableOverlayDetection: true,
          enableDynamicSelectors: true,
          enablePerformanceOptimization: this.config.enableOptimization,
          screenshotQuality: this.config.screenshotQuality || 'high',
          interactionSpeed: this.config.interactionSpeed === 'adaptive' ? 'human' : this.config.interactionSpeed,
          retryStrategy: 'balanced',
        };

        this.advancedEngine = getAdvancedBrowserEngine(page, engineConfig);
        logger.info('[IntegratedEliteController] Advanced browser engine initialized');
      }

      return page;
    }

    // Basic session handling
    const context = this.session.context;
    if (!context) {
      throw new Error("no context in browser session");
    }

    const pages = context.pages();
    if (!pages || pages.length === 0) {
      throw new Error("no active page - browser may not be started");
    }

    return pages[0];
  }

  /**
   * Emit step event
   */
  private emit(action: string, detail: string): void {
    this.onStep?.(action, detail);
  }

  /**
   * Record operation for learning and optimization
   */
  private recordOperation(operation: string, duration: number, success: boolean, method: string): void {
    this.operationHistory.push({
      operation,
      duration,
      success,
      method,
      timestamp: Date.now()
    });

    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift();
    }

    // Update statistics
    this.stats.totalOperations++;
    if (success) {
      this.stats.successfulOperations++;
    } else {
      this.stats.failedOperations++;
    }

    // Trigger automatic optimization every 100 operations
    if (this.stats.totalOperations % 100 === 0 && this.config.enableLearning) {
      this.triggerAutomaticOptimization();
    }
  }

  /**
   * Trigger automatic optimization based on performance patterns
   */
  private triggerAutomaticOptimization(): void {
    const stats = this.getPerformanceSummary();

    // Optimize based on success rate
    if (stats.operations.successRate > 0.95) {
      // High success rate - optimize for speed
      if (this.config.interactionSpeed !== 'instant') {
        this.config.interactionSpeed = 'instant';
        logger.info('[IntegratedEliteController] Auto-optimized: High success rate → instant speed');
      }
    } else if (stats.operations.successRate < 0.8) {
      // Lower success rate - optimize for reliability
      if (this.config.interactionSpeed !== 'cautious') {
        this.config.interactionSpeed = 'cautious';
        logger.info('[IntegratedEliteController] Auto-optimized: Lower success rate → cautious speed');
      }
    }

    // Optimize cache based on hit rate
    if (stats.cache.hitRate < 0.5 && this.maxCacheSize < 2000) {
      this.maxCacheSize += 500;
      logger.info('[IntegratedEliteController] Auto-optimized: Low cache hit rate → increased cache size');
    }

    // Trigger engine optimization
    if (this.advancedEngine && this.config.enableOptimization) {
      this.advancedEngine.optimizeFromHistory().catch(err => {
        logger.debug('[IntegratedEliteController] Auto-optimization failed: ' + (err as Error).message);
      });
    }
  }

  /**
   * Execute operation with elite features
   */
  private async executeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Apply adaptive throttling if enabled
      if (this.config.enableAdaptiveThrottling) {
        await this.adaptiveThrottler.acquire();
      }

      let result: T;

      // Wrap with circuit breaker if enabled
      if (this.config.enableCircuitBreaker) {
        result = await this.circuitBreaker.execute(async () => {
          return await this.executeWithRetry(operation, fn, context);
        });
      } else {
        result = await this.executeWithRetry(operation, fn, context);
      }

      const duration = Date.now() - startTime;
      const success = true;

      // Record success in throttler
      if (this.config.enableAdaptiveThrottling) {
        this.adaptiveThrottler.recordResult(true, duration);
      }

      // Record in performance monitor
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.recordToolExecution(operation, duration, true);
      }

      // Record for learning
      this.recordOperation(operation, duration, success, 'direct');

      this.emit(operation, `Success in ${duration}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const success = false;

      // Record failure in throttler
      if (this.config.enableAdaptiveThrottling) {
        this.adaptiveThrottler.recordResult(false, duration);
      }

      // Record in performance monitor
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.recordToolExecution(operation, duration, false);
      }

      // Record for learning
      this.recordOperation(operation, duration, success, 'failed');

      this.emit(operation, `Failed after ${duration}ms: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    if (!this.config.enableRetry) {
      return await fn();
    }

    const retryResult = await this.retrySystem.execute(fn, context || operation);

    if (!retryResult.success) {
      // Intelligent error recovery - adjust strategy based on failure patterns
      await this.adjustStrategyBasedOnErrors(operation, retryResult.error);
      throw retryResult.error || new Error('Operation failed after retries');
    }

    if (retryResult.attempts > 1) {
      this.stats.retriesTriggered++;
      this.emit(operation, `Required ${retryResult.attempts} attempts (${retryResult.totalDelay}ms total retry delay)`);

      // Learn from retry patterns
      if (retryResult.attempts > 3) {
        logger.warn(`[IntegratedEliteController] High retry count for ${operation}: ${retryResult.attempts} attempts`);
        // Consider this operation as problematic and adjust future strategy
        this.recordProblematicOperation(operation);
      }
    }

    return retryResult.result!;
  }

  /**
   * Record problematic operation for future optimization
   */
  private recordProblematicOperation(operation: string): void {
    // Track operations that consistently require retries
    if (!this.problematicOperations) {
      this.problematicOperations = new Map<string, number>();
    }

    const count = (this.problematicOperations.get(operation) || 0) + 1;
    this.problematicOperations.set(operation, count);

    // If an operation consistently fails, adjust strategy
    if (count >= 5) {
      logger.info(`[IntegratedEliteController] Adjusting strategy for problematic operation: ${operation}`);
      // This could trigger more cautious timing or different approaches
    }
  }

  /**
   * Adjust strategy based on error patterns
   */
  private async adjustStrategyBasedOnErrors(operation: string, error?: Error): Promise<void> {
    if (!error) return;

    const errorMessage = error.message.toLowerCase();

    // Adjust based on error type
    if (errorMessage.includes('timeout')) {
      // Timeout errors - increase timeout or slow down
      if (this.config.operationTimeout && this.config.operationTimeout < 30000) {
        this.config.operationTimeout += 5000;
        logger.info('[IntegratedEliteController] Adjusted: Increased timeout due to timeout errors');
      }
    } else if (errorMessage.includes('not found') || errorMessage.includes('no such')) {
      // Element not found - might need to wait longer or check different selectors
      logger.debug('[IntegratedEliteController] Element resolution issue - will try alternative strategies next time');
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      // Network issues - might need circuit breaker intervention
      const cbState = this.circuitBreaker.getState();
      if (cbState.state !== 'open') {
        logger.warn('[IntegratedEliteController] Network issues detected - circuit breaker may activate');
      }
    }
  }

  /**
   * Resolve element with advanced caching and AI resolution
   */
  private async resolveElement(page: Page, refId: number): Promise<Locator> {
    // Check cache first if enabled
    if (this.config.enableElementCaching && this.elementCache.has(refId)) {
      const cached = this.elementCache.get(refId)!;
      try {
        // Verify element is still valid
        if (await cached.locator.count() > 0) {
          this.stats.cacheHits++;
          return cached.locator;
        }
      } catch {
        // Element is no longer valid, remove from cache
        this.elementCache.delete(refId);
      }
    }

    this.stats.cacheMisses++;

    // Try advanced engine resolution if enabled
    if (this.config.enableAIResolution && this.advancedEngine) {
      try {
        const match = await this.advancedEngine.resolveElement(refId);
        if (match && match.confidence > 0.8) {
          // Cache high-confidence matches
          if (this.config.enableElementCaching) {
            this.elementCache.set(refId, {
              locator: match.locator,
              timestamp: Date.now(),
              confidence: match.confidence
            });

            // Clean up old cache entries if needed
            if (this.elementCache.size > this.maxCacheSize) {
              const oldestKey = this.elementCache.keys().next().value;
              if (oldestKey !== undefined) {
                this.elementCache.delete(oldestKey);
              }
            }
          }

          return match.locator;
        }
      } catch (error) {
        logger.debug('[IntegratedEliteController] Advanced resolution failed, falling back to standard');
      }
    }

    // Standard resolution fallback
    const locator = page.locator(`[data-sediman-ref-id="${refId}"]`).first();

    // Verify element exists
    const count = await locator.count();
    if (count === 0) {
      throw new Error(`Element with refId ${refId} not found`);
    }

    // Cache the locator
    if (this.config.enableElementCaching) {
      this.elementCache.set(refId, {
        locator,
        timestamp: Date.now(),
        confidence: 1.0
      });

      // Clean up old cache entries if needed
      if (this.elementCache.size > this.maxCacheSize) {
        const oldestKey = this.elementCache.keys().next().value;
        if (oldestKey !== undefined) {
          this.elementCache.delete(oldestKey);
        }
      }
    }

    return locator;
  }

  // === Lifecycle ===

  /**
   * Start the browser session with elite features
   */
  async start(): Promise<void> {
    const startTime = Date.now();

    try {
      if (this.config.enableRetry) {
        const result = await this.retrySystem.execute(
          () => this.session.start(),
          'browser-start'
        );

        if (!result.success) {
          throw result.error || new Error('Failed to start browser after retries');
        }

        logger.info(`[IntegratedEliteController] Browser started after ${result.attempts} attempts (${result.totalDelay}ms total delay)`);
      } else {
        await this.session.start();
      }

      const duration = Date.now() - startTime;
      this.performanceMonitor.recordToolExecution('browser_start', duration, true);
      this.emit('browser_start', `Success in ${duration}ms`);

      // Trigger initial cache warm-up for better performance
      if (this.config.enableElementCaching) {
        await this.warmUpElementCache();
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordToolExecution('browser_start', duration, false);
      this.emit('browser_start', `Failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Warm up element cache for better performance
   */
  private async warmUpElementCache(): Promise<void> {
    try {
      const page = await this.getPage();
      // Pre-resolve common elements for better performance
      const commonSelectors = ['button', 'input', 'a', 'select', 'textarea'];

      for (const selector of commonSelectors) {
        try {
          const locator = page.locator(selector);
          const count = await locator.count();
          if (count > 0 && count < 100) { // Only cache reasonable amounts
            // This helps with subsequent element resolution
            logger.debug(`[IntegratedEliteController] Cache warm-up: ${selector} (${count} elements)`);
          }
        } catch {
          // Ignore errors during warm-up
        }
      }
    } catch (error) {
      logger.debug('[IntegratedEliteController] Cache warm-up failed: ' + (error as Error).message);
    }
  }

  /**
   * Stop the browser session
   */
  async stop(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.session.stop();
      this.elementCache.clear();
      this.resolutionCache.clear();

      if (this.advancedEngine) {
        this.advancedEngine.clearCaches();
      }

      const duration = Date.now() - startTime;
      this.performanceMonitor.recordToolExecution('browser_stop', duration, true);
      this.emit('browser_stop', `Success in ${duration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordToolExecution('browser_stop', duration, false);
      this.emit('browser_stop', `Failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get session
   */
  getSession(): OptimizedBrowserSession | BrowserSession {
    return this.session;
  }

  /**
   * Set session
   */
  setSession(session: OptimizedBrowserSession | BrowserSession): void {
    this.session = session;
  }

  // === Browser Operations ===

  /**
   * Navigate to URL with elite features
   */
  async navigate(url: string): Promise<string> {
    return this.executeOperation('navigate', async () => {
      const page = await this.getPage();

      // Try different wait strategies for maximum reliability
      const strategies = [
        { waitUntil: 'domcontentloaded' as const, timeout: 45000 },
        { waitUntil: 'load' as const, timeout: 30000 },
        { waitUntil: 'commit' as const, timeout: 15000 },
      ];

      let lastError: Error | undefined;

      for (const strategy of strategies) {
        try {
          await page.goto(url, strategy);
          return `Navigated to ${url}`;
        } catch (error) {
          lastError = error as Error;
          logger.debug(`[IntegratedEliteController] Navigation strategy ${strategy.waitUntil} failed, trying next`);
        }
      }

      throw lastError || new Error('Navigation failed');
    }, `navigate to ${url}`);
  }

  /**
   * Click element with elite features
   */
  async click(refId: number): Promise<string> {
    return this.executeOperation('click', async () => {
      const page = await this.getPage();
      const element = await this.resolveElement(page, refId);

      // Ensure element is ready for interaction
      await element.scrollIntoViewIfNeeded();
      await element.waitFor({ state: 'visible', timeout: 5000 });

      await element.click({ timeout: 5000 });
      return `Clicked element ${refId}`;
    }, `click refId ${refId}`);
  }

  /**
   * Type text with elite features
   */
  async typeText(refId: number, text: string, submit?: boolean): Promise<string> {
    return this.executeOperation('type', async () => {
      const page = await this.getPage();
      const element = await this.resolveElement(page, refId);

      // Clear existing content
      await element.fill('');

      // Type with appropriate timing based on configuration
      if (this.config.interactionSpeed === 'instant') {
        await element.fill(text);
      } else if (this.config.interactionSpeed === 'cautious') {
        for (const char of text) {
          await element.type(char, { delay: 100 + Math.random() * 50 });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } else {
        // Human or adaptive - use natural typing
        await element.type(text, { delay: 30 });
      }

      // Submit if requested
      if (submit) {
        await element.press('Enter');
      }

      return `Typed "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}" into element ${refId}${submit ? ' and submitted' : ''}`;
    }, `type in refId ${refId}`);
  }

  /**
   * Hover over element
   */
  async hover(refId: number): Promise<string> {
    return this.executeOperation('hover', async () => {
      const page = await this.getPage();
      const element = await this.resolveElement(page, refId);

      await element.hover({ timeout: 5000 });
      return `Hovered over element ${refId}`;
    }, `hover refId ${refId}`);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(refId: number, value: string): Promise<string> {
    return this.executeOperation('select', async () => {
      const page = await this.getPage();
      const element = await this.resolveElement(page, refId);

      await element.selectOption(value, { timeout: 5000 });
      return `Selected "${value}" in element ${refId}`;
    }, `select in refId ${refId}`);
  }

  /**
   * Scroll page
   */
  async scroll(direction: string, amount?: number): Promise<string> {
    return this.executeOperation('scroll', async () => {
      const page = await this.getPage();
      const delta = amount ?? 500;

      if (direction === 'left' || direction === 'right') {
        await page.mouse.wheel(direction === 'right' ? delta : -delta, 0);
      } else {
        const deltaWithSign = direction === 'up' ? -delta : delta;
        await page.mouse.wheel(0, deltaWithSign);
      }

      return `Scrolled ${direction} by ${delta}px`;
    }, `scroll ${direction}`);
  }

  /**
   * Press key
   */
  async pressKey(key: string): Promise<string> {
    return this.executeOperation('press_key', async () => {
      const page = await this.getPage();
      await page.keyboard.press(key);
      return `Pressed key: ${key}`;
    }, `press ${key}`);
  }

  /**
   * Navigate back
   */
  async goBack(): Promise<string> {
    return this.executeOperation('go_back', async () => {
      const page = await this.getPage();
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return 'Navigated back';
    }, 'go back');
  }

  /**
   * Navigate forward
   */
  async goForward(): Promise<string> {
    return this.executeOperation('go_forward', async () => {
      const page = await this.getPage();
      await page.goForward({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return 'Navigated forward';
    }, 'go forward');
  }

  /**
   * Refresh page
   */
  async refresh(): Promise<string> {
    return this.executeOperation('refresh', async () => {
      const page = await this.getPage();
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return 'Page refreshed';
    }, 'refresh');
  }

  /**
   * Take screenshot with elite features
   */
  async screenshot(): Promise<string | null> {
    return this.executeOperation('screenshot', async () => {
      return this.session.takeScreenshot();
    }, 'screenshot');
  }

  /**
   * Get page URL
   */
  async getUrl(): Promise<string> {
    const page = await this.getPage();
    return page.url();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    const page = await this.getPage();
    return page.title();
  }

  /**
   * Switch tab
   */
  async switchTab(index: number): Promise<string> {
    try {
      const ctx = this.session.context;
      if (!ctx) return "No browser context";
      const pages = ctx.pages();
      if (index < 0 || index >= pages.length) {
        return `Tab index ${index} out of range (0-${pages.length - 1})`;
      }
      await pages[index].bringToFront();
      this.emit("switch_tab", `index=${index}`);
      return `Switched to tab ${index}: ${pages[index].url()}`;
    } catch (e: any) {
      return `Failed to switch tab: ${e.message}`;
    }
  }

  /**
   * List tabs
   */
  async listTabs(): Promise<string> {
    try {
      const ctx = this.session.context;
      if (!ctx) return "No browser context";
      const pages = ctx.pages();
      const lines = pages.map((p: Page, i: number) => `[${i}] ${p.url()} — ${p.title()}`);
      this.emit("list_tabs", `${pages.length} tabs`);
      return lines.join("\n") || "No open tabs";
    } catch (e: any) {
      return `Failed to list tabs: ${e.message}`;
    }
  }

  /**
   * Close tab
   */
  async closeTab(index?: number): Promise<string> {
    try {
      const context = this.session.context;
      if (!context) return 'No browser session';
      const pages = context.pages();

      if (pages.length === 0) {
        return 'No tabs to close';
      }

      if (index === undefined) {
        // Close current page (last one)
        const currentPage = await this.getPage();
        await currentPage.close();
        return 'Closed current tab';
      } else {
        // Close specific tab by index
        if (index < 0 || index >= pages.length) {
          return `Invalid tab index: ${index}. Available tabs: ${pages.length}`;
        }
        await pages[index].close();
        return `Closed tab ${index}`;
      }
    } catch (error: any) {
      return `Failed to close tab: ${error.message}`;
    }
  }

  /**
   * Page snapshot
   */
  async snapshot(): Promise<PageSnapshot> {
    const page = await this.getPage();

    // Dismiss overlays
    await page.evaluate(DISMISS_OVERLAYS_JS).catch(() => {});

    // Take snapshot
    const result = (await page.evaluate(SNAPSHOT_JS)) as {
      elements: ElementInfo[];
      output: string;
      textPreview: string;
      scrollPosition: { x: number; y: number };
      viewport: { width: number; height: number };
      pageSize: { width: number; height: number };
      url: string;
      title: string;
      stats: { links: number; interactive: number; iframes: number; images: number; total: number; textChars: number };
      pagesAbove: number;
      pagesBelow: number;
    };

    const url = result.url || page.url();
    const title = result.title || await page.title();

    this.emit("snapshot", `${result.elements.length} elements`);

    return {
      url,
      title,
      elements: result.elements,
      textPreview: result.textPreview || "",
      output: result.output || "",
      scrollPosition: result.scrollPosition,
      viewport: result.viewport,
      pageSize: result.pageSize,
      stats: result.stats,
      pagesAbove: result.pagesAbove,
      pagesBelow: result.pagesBelow,
    };
  }

  /**
   * Extract text from page
   */
  async extractText(): Promise<string> {
    try {
      const page = await this.getPage();
      const text = await page.evaluate(() => {
        const body = document.body;
        if (!body) return "";
        const clone = body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("script, style, noscript, svg, path").forEach((el) => el.remove());
        return (clone.innerText || "").replace(/\s+/g, " ").trim();
      });

      return text;
    } catch (e: any) {
      return `Failed to extract text: ${e.message}`;
    }
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector: string, timeout?: number): Promise<string> {
    try {
      const page = await this.getPage();
      await page.waitForSelector(selector, {
        timeout: timeout ?? 10000,
        state: "visible",
      });
      return `Element "${selector}" appeared`;
    } catch (e: any) {
      return `Timeout waiting for "${selector}": ${(e as Error).message}`;
    }
  }

  /**
   * Drag and drop
   */
  async dragAndDrop(sourceRefId: number, targetRefId: number): Promise<string> {
    try {
      const page = await this.getPage();
      const result = await this.getCDP().dragAndDrop(
        sourceRefId,
        targetRefId,
        async (refId: number) => {
          const locator = await this.resolveElement(page, refId);
          // Convert Locator to ElementHandle
          const element = await locator.elementHandle();
          return element;
        }
      );
      return result.message;
    } catch (error: any) {
      return `Drag and drop failed: ${error.message}`;
    }
  }

  /**
   * Upload file
   */
  async uploadFile(refId: number, filePath: string): Promise<string> {
    try {
      const page = await this.getPage();
      const element = await this.resolveElement(page, refId);

      if (!element) {
        return `Failed to resolve element: ${refId}`;
      }

      // Use Playwright's setInputFiles for file upload
      await element.setInputFiles(filePath);

      return `Uploaded file "${filePath}" to element ${refId}`;
    } catch (error: any) {
      return `File upload failed: ${error.message}`;
    }
  }

  /**
   * Evaluate script
   */
  async evaluate(script: string): Promise<any> {
    try {
      const page = await this.getPage();
      const result = await page.evaluate(script);
      return result;
    } catch (error: any) {
      return `Script execution failed: ${error.message}`;
    }
  }

  /**
   * Dispatch mouse event
   */
  async dispatchMouse(type: string, x: number, y: number, button: string = 'left', buttons: number = 1): Promise<void> {
    await this.getCDP().dispatchMouseEvent(type as any, x, y, button as any, buttons);
  }

  /**
   * Dispatch key event
   */
  async dispatchKey(type: string, key: string, code?: string, text?: string): Promise<void> {
    await this.getCDP().dispatchKeyEvent(type as any, key);
  }

  // === Advanced Features ===

  /**
   * Clear element cache
   */
  clearElementCache(): void {
    this.elementCache.clear();
    this.resolutionCache.clear();
    if (this.advancedEngine) {
      this.advancedEngine.clearCaches();
    }
    logger.info('[IntegratedEliteController] All caches cleared');
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): {
    elementCache: number;
    resolutionCache: number;
    totalCacheSize: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const hitRate = this.stats.cacheHits + this.stats.cacheMisses > 0
      ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
      : 0;

    return {
      elementCache: this.elementCache.size,
      resolutionCache: this.resolutionCache.size,
      totalCacheSize: this.elementCache.size + this.resolutionCache.size,
      hits: this.stats.cacheHits,
      misses: this.stats.cacheMisses,
      hitRate
    };
  }

  /**
   * Get comprehensive performance summary
   */
  getPerformanceSummary(): {
    operations: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    cache: {
      hits: number;
      misses: number;
      hitRate: number;
    };
    retries: number;
    circuitBreakerTrips: number;
    optimizationsApplied: number;
    performanceMetrics: any;
    circuitBreakerState: any;
    qualityScore: number;
    recommendations: string[];
  } {
    const successRate = this.stats.totalOperations > 0
      ? this.stats.successfulOperations / this.stats.totalOperations
      : 0;

    const hitRate = this.stats.cacheHits + this.stats.cacheMisses > 0
      ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
      : 0;

    // Calculate quality score (0-100)
    const qualityScore = this.calculateQualityScore(successRate, hitRate);

    // Generate recommendations
    const recommendations = this.generateRecommendations(successRate, hitRate);

    return {
      operations: {
        total: this.stats.totalOperations,
        successful: this.stats.successfulOperations,
        failed: this.stats.failedOperations,
        successRate
      },
      cache: {
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses,
        hitRate
      },
      retries: this.stats.retriesTriggered,
      circuitBreakerTrips: this.stats.circuitBreakerTrips,
      optimizationsApplied: this.stats.optimizationsApplied,
      performanceMetrics: this.performanceMonitor.getSnapshot(),
      circuitBreakerState: this.circuitBreaker.getState(),
      qualityScore,
      recommendations
    };
  }

  /**
   * Calculate quality score based on performance metrics
   */
  private calculateQualityScore(successRate: number, cacheHitRate: number): number {
    let score = 0;

    // Success rate contributes 60% to quality score
    score += successRate * 60;

    // Cache hit rate contributes 20% to quality score
    score += cacheHitRate * 20;

    // Low retry rate contributes 10% to quality score
    const retryRate = this.stats.totalOperations > 0
      ? this.stats.retriesTriggered / this.stats.totalOperations
      : 0;
    score += Math.max(0, 10 - (retryRate * 50));

    // Optimization contributes 10% to quality score
    if (this.stats.optimizationsApplied > 0) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate recommendations based on performance metrics
   */
  private generateRecommendations(successRate: number, cacheHitRate: number): string[] {
    const recommendations: string[] = [];

    if (successRate < 0.9) {
      recommendations.push('Consider enabling cautious interaction mode for better reliability');
    }

    if (cacheHitRate < 0.7) {
      recommendations.push('Increase cache size for better performance');
    }

    if (this.stats.retriesTriggered > this.stats.totalOperations * 0.2) {
      recommendations.push('High retry rate detected - check network connectivity and page stability');
    }

    if (this.stats.circuitBreakerTrips > 5) {
      recommendations.push('Frequent circuit breaker trips - consider adjusting thresholds or improving error handling');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performing optimally - no changes needed');
    }

    return recommendations;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    logger.info('[IntegratedEliteController] Circuit breaker reset');
  }

  /**
   * Optimize based on learned patterns
   */
  async optimizeFromHistory(): Promise<void> {
    if (this.advancedEngine && this.config.enableLearning) {
      await this.advancedEngine.optimizeFromHistory();
      this.stats.optimizationsApplied++;
      logger.info('[IntegratedEliteController] Optimization applied based on learning history');
    }
  }

  /**
   * Get operation history
   */
  getOperationHistory(): Array<{
    operation: string;
    duration: number;
    success: boolean;
    method: string;
    timestamp: number;
  }> {
    return [...this.operationHistory];
  }

  /**
   * Get current configuration
   */
  getConfig(): EliteControllerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(updates: Partial<EliteControllerConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('[IntegratedEliteController] Configuration updated - ' + JSON.stringify(updates));
  }
}

/**
 * Factory function to create integrated elite controller
 */
export function createIntegratedEliteController(config?: EliteControllerConfig): IntegratedEliteController {
  return new IntegratedEliteController(config);
}