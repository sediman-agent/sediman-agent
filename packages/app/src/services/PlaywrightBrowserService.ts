/**
 * Playwright Browser Service
 * Uses Playwright + CDP to control the webview directly
 * This makes Electron mode equivalent to HTTP mode
 */

import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';

export interface BrowserCommand {
  id: string;
  action: string;
  params: Record<string, any>;
  timestamp: number;
}

export interface CommandResult {
  success: boolean;
  result?: any;
  error?: string;
}

class PlaywrightBrowserService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private isInitialized = false;
  private isConnecting = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private commandQueue: BrowserCommand[] = [];
  private pendingResults: Map<string, CommandResult> = new Map();

  /**
   * Initialize Playwright browser (headless, controlled via API)
   * The webview is only used for display, not for control
   */
  async initialize(webviewElement?: any): Promise<void> {
    if (this.isInitialized) {
      console.log('[PlaywrightBrowser] Already initialized');
      return;
    }

    if (this.isConnecting) {
      console.log('[PlaywrightBrowser] Already connecting');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('[PlaywrightBrowser] Initializing headless browser...');

      // Launch headless browser (no CDP connection needed)
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      console.log('[PlaywrightBrowser] Browser launched');

      // Create context
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      console.log('[PlaywrightBrowser] Context created');

      // Create page
      this.page = await this.context.newPage();
      console.log('[PlaywrightBrowser] Page created');

      this.isInitialized = true;
      console.log('[PlaywrightBrowser] ✓ Initialization complete');

      // Start polling for commands
      this.startCommandPolling();

      // Start webview sync (if webview provided)
      if (webviewElement) {
        this.startWebviewSync(webviewElement);
      }

    } catch (error) {
      console.error('[PlaywrightBrowser] Initialization failed:', error);
      this.isConnecting = false;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Start syncing the webview display with Playwright page
   */
  private startWebviewSync(webviewElement: any): void {
    if (!this.page) return;

    // Update webview URL when Playwright navigates
    this.page.on('load', () => {
      if (webviewElement && this.page) {
        const url = this.page.url();
        console.log('[PlaywrightBrowser] Syncing webview to:', url);
        webviewElement.src = url;
      }
    });

    // Update webview on DOM content loads
    this.page.on('domcontentloaded', () => {
      if (webviewElement && this.page) {
        const url = this.page.url();
        console.log('[PlaywrightBrowser] DOM loaded, syncing webview to:', url);
        webviewElement.src = url;
      }
    });
  }

  /**
   * Start polling for browser commands from backend
   */
  private startCommandPolling(): void {
    if (this.pollingInterval) return;

    console.log('[PlaywrightBrowser] Starting command polling...');
    this.pollingInterval = setInterval(async () => {
      if (!this.isInitialized) return;

      try {
        const response = await fetch('http://localhost:3001/api/browser/pending-commands');
        if (response.ok) {
          const data = await response.json();
          if (data.commands && data.commands.length > 0) {
            console.log('[PlaywrightBrowser] Received', data.commands.length, 'commands');
            await this.executeCommands(data.commands);
          }
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 500);
  }

  /**
   * Execute browser commands using Playwright
   */
  private async executeCommands(commands: BrowserCommand[]): Promise<void> {
    for (const command of commands) {
      try {
        console.log('[PlaywrightBrowser] Executing:', command.action, command.params);
        const result = await this.executeCommand(command);

        // Store result for submission
        this.pendingResults.set(command.id, result);

        // Send result back to backend
        await this.sendCommandResult(command.id, result);

      } catch (error) {
        console.error('[PlaywrightBrowser] Command execution error:', error);
        const errorResult: CommandResult = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
        await this.sendCommandResult(command.id, errorResult);
      }
    }
  }

  /**
   * Execute a single browser command using Playwright
   */
  private async executeCommand(command: BrowserCommand): Promise<CommandResult> {
    if (!this.page || !this.isInitialized) {
      throw new Error('Playwright not initialized');
    }

    const { action, params } = command;

    switch (action) {
      case 'navigate':
        return await this.handleNavigate(params);

      case 'click':
        return await this.handleClick(params);

      case 'type':
        return await this.handleType(params);

      case 'snapshot':
        return await this.handleSnapshot();

      case 'screenshot':
        return await this.handleScreenshot();

      case 'scroll':
        return await this.handleScroll(params);

      case 'wait':
        return await this.handleWait(params);

      case 'hover':
        return await this.handleHover(params);

      case 'press_key':
        return await this.handlePressKey(params);

      case 'extract_text':
        return await this.handleExtractText(params);

      case 'execute_script':
        return await this.handleExecuteScript(params);

      case 'refresh':
        return await this.handleRefresh();

      case 'go_back':
        return await this.handleGoBack();

      case 'go_forward':
        return await this.handleGoForward();

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  }

  /**
   * Handle navigate command
   */
  private async handleNavigate(params: { url?: string }): Promise<CommandResult> {
    if (!params.url) {
      return { success: false, error: 'No URL provided' };
    }

    try {
      console.log('[PlaywrightBrowser] Navigating to:', params.url);
      await this.page!.goto(params.url, { waitUntil: 'domcontentloaded' });

      // Wait a bit for page to settle
      await this.page!.waitForTimeout(1000);

      return {
        success: true,
        result: { url: params.url }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle click command
   */
  private async handleClick(params: { x?: number; y?: number; refId?: number }): Promise<CommandResult> {
    try {
      if (params.x !== undefined && params.y !== undefined) {
        // Click by coordinates
        await this.page!.mouse.click(params.x, params.y);
        return { success: true, result: { clicked: true } };
      } else if (params.refId !== undefined) {
        // Click by refId (would need element mapping)
        return { success: false, error: 'Click by refId not implemented yet' };
      } else {
        return { success: false, error: 'No coordinates or refId provided' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle type command
   */
  private async handleType(params: { refId?: number; selector?: string; text?: string; submit?: boolean }): Promise<CommandResult> {
    try {
      if (params.selector && params.text) {
        await this.page!.fill(params.selector, params.text);
        if (params.submit) {
          await this.page!.press(params.selector, 'Enter');
        }
        return { success: true, result: { typed: true } };
      } else {
        return { success: false, error: 'No selector or text provided' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle snapshot command
   */
  private async handleSnapshot(): Promise<CommandResult> {
    try {
      const url = this.page!.url();
      const title = await this.page!.title();

      // Get interactive elements
      const elements = await this.page!.evaluate(() => {
        const interactive = document.querySelectorAll('button, a, input, textarea, select, [onclick], [role="button"]');
        const results: any[] = [];
        interactive.forEach((el, idx) => {
          const rect = (el as Element).getBoundingClientRect();
          results.push({
            refId: idx,
            tag: (el as Element).tagName.toLowerCase(),
            type: (el as HTMLInputElement).type || '',
            text: (el as HTMLElement).textContent?.slice(0, 50) || (el as HTMLInputElement).placeholder || '',
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          });
        });
        return results;
      });

      return {
        success: true,
        result: {
          url,
          title,
          elements,
          output: `Current URL: ${url}\nTitle: ${title}\n\n${elements.length} interactive elements total.`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle screenshot command
   */
  private async handleScreenshot(): Promise<CommandResult> {
    try {
      const screenshot = await this.page!.screenshot();
      const base64 = screenshot.toString('base64');
      return {
        success: true,
        result: `data:image/png;base64,${base64}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle scroll command
   */
  private async handleScroll(params: { direction?: string; amount?: number }): Promise<CommandResult> {
    try {
      const direction = params.direction || 'down';
      const amount = params.amount || 500;

      if (direction === 'down') {
        await this.page!.evaluate(() => window.scrollBy(0, 500));
      } else if (direction === 'up') {
        await this.page!.evaluate(() => window.scrollBy(0, -500));
      } else if (direction === 'left') {
        await this.page!.evaluate(() => window.scrollBy(-500, 0));
      } else if (direction === 'right') {
        await this.page!.evaluate(() => window.scrollBy(500, 0));
      }

      return { success: true, result: { scrolled: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle wait command
   */
  private async handleWait(params: { selector?: string; timeout?: number }): Promise<CommandResult> {
    try {
      if (params.selector) {
        await this.page!.waitForSelector(params.selector, { timeout: params.timeout || 5000 });
      } else {
        await this.page!.waitForTimeout(params.timeout || 1000);
      }
      return { success: true, result: { waited: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle hover command
   */
  private async handleHover(params: { refId?: number; selector?: string }): Promise<CommandResult> {
    try {
      if (params.selector) {
        await this.page!.hover(params.selector);
        return { success: true, result: { hovered: true } };
      } else {
        return { success: false, error: 'No selector provided' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle press_key command
   */
  private async handlePressKey(params: { key?: string }): Promise<CommandResult> {
    try {
      if (params.key) {
        await this.page!.keyboard.press(params.key);
        return { success: true, result: { pressed: true } };
      } else {
        return { success: false, error: 'No key provided' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle extract_text command
   */
  private async handleExtractText(params: { query?: string; format?: string }): Promise<CommandResult> {
    try {
      const text = await this.page!.evaluate(() => document.body.innerText);
      return {
        success: true,
        result: { text: text.slice(0, 1000) } // Limit text length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle execute_script command
   */
  private async handleExecuteScript(params: { script?: string }): Promise<CommandResult> {
    try {
      if (params.script) {
        const result = await this.page!.evaluate(params.script);
        return {
          success: true,
          result: { result }
        };
      } else {
        return { success: false, error: 'No script provided' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle refresh command
   */
  private async handleRefresh(): Promise<CommandResult> {
    try {
      await this.page!.reload();
      return { success: true, result: { refreshed: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle go_back command
   */
  private async handleGoBack(): Promise<CommandResult> {
    try {
      await this.page!.goBack();
      return { success: true, result: { goneBack: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle go_forward command
   */
  private async handleGoForward(): Promise<CommandResult> {
    try {
      await this.page!.goForward();
      return { success: true, result: { goneForward: true } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send command result back to backend
   */
  private async sendCommandResult(commandId: string, result: CommandResult): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/browser/exec/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId,
          result: result.result,
          error: result.error
        })
      });

      if (response.ok) {
        console.log('[PlaywrightBrowser] Result sent for command:', commandId);
      } else {
        console.error('[PlaywrightBrowser] Failed to send result:', response.status);
      }
    } catch (err) {
      console.error('[PlaywrightBrowser] Error sending result:', err);
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.page !== null;
  }

  /**
   * Get current page URL
   */
  getCurrentUrl(): string {
    return this.page?.url() || '';
  }

  /**
   * Get current page title
   */
  async getCurrentTitle(): Promise<string> {
    if (!this.page) return '';
    return await this.page.title();
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.cdpSession) {
      await this.cdpSession.detach().catch(() => {});
    }

    if (this.context) {
      await this.context.close().catch(() => {});
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
    }

    this.isInitialized = false;
    console.log('[PlaywrightBrowser] Cleaned up');
  }
}

// Singleton instance
export const playwrightBrowserService = new PlaywrightBrowserService();

// Type declaration for global window object
declare global {
  interface Window {
    playwrightBrowserService?: typeof playwrightBrowserService;
  }
}

// Make available globally for easy access
if (typeof window !== 'undefined') {
  window.playwrightBrowserService = playwrightBrowserService;
}
