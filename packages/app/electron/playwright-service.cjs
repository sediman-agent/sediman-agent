/**
 * Playwright Browser Service (Main Process)
 * Runs in Node.js context to control browser via Playwright
 * Communicates with renderer via IPC
 */

const { chromium } = require('playwright');
const path = require('path');

class PlaywrightService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
    this.isInitializing = false;
  }

  /**
   * Initialize Playwright browser
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[PlaywrightService] Already initialized');
      return { success: true };
    }

    if (this.isInitializing) {
      console.log('[PlaywrightService] Already initializing');
      return { success: false, error: 'Already initializing' };
    }

    try {
      this.isInitializing = true;
      console.log('[PlaywrightService] Initializing Playwright...');

      // Launch headless browser
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      console.log('[PlaywrightService] Browser launched');

      // Create context
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      console.log('[PlaywrightService] Context created');

      // Create page
      this.page = await this.context.newPage();
      console.log('[PlaywrightService] Page created');

      this.isInitialized = true;
      console.log('[PlaywrightService] ✓ Initialization complete');

      return { success: true };
    } catch (error) {
      console.error('[PlaywrightService] Initialization failed:', error);
      this.isInitializing = false;
      return { success: false, error: error.message };
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Execute browser command
   */
  async executeCommand(command) {
    if (!this.isInitialized || !this.page) {
      return { success: false, error: 'Playwright not initialized' };
    }

    const { action, params } = command;

    try {
      console.log('[PlaywrightService] Executing:', action, params);

      let result;

      switch (action) {
        case 'navigate':
          result = await this.handleNavigate(params);
          break;

        case 'click':
          result = await this.handleClick(params);
          break;

        case 'type':
          result = await this.handleType(params);
          break;

        case 'snapshot':
          result = await this.handleSnapshot();
          break;

        case 'screenshot':
          result = await this.handleScreenshot();
          break;

        case 'scroll':
          result = await this.handleScroll(params);
          break;

        case 'wait':
          result = await this.handleWait(params);
          break;

        case 'hover':
          result = await this.handleHover(params);
          break;

        case 'press_key':
          result = await this.handlePressKey(params);
          break;

        case 'extract_text':
          result = await this.handleExtractText(params);
          break;

        case 'execute_script':
          result = await this.handleExecuteScript(params);
          break;

        case 'refresh':
          result = await this.handleRefresh();
          break;

        case 'go_back':
          result = await this.handleGoBack();
          break;

        case 'go_forward':
          result = await this.handleGoForward();
          break;

        default:
          result = { success: false, error: `Unknown action: ${action}` };
      }

      console.log('[PlaywrightService] Command result:', result.success ? 'SUCCESS' : 'FAILED');
      return result;

    } catch (error) {
      console.error('[PlaywrightService] Command execution error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle navigate command
   */
  async handleNavigate(params) {
    const url = params?.url;
    if (!url) {
      return { success: false, error: 'No URL provided' };
    }

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(500);

      return {
        success: true,
        result: { url, title: await this.page.title() }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle click command
   */
  async handleClick(params) {
    try {
      if (params.selector) {
        await this.page.click(params.selector);
        return { success: true, result: { clicked: true } };
      } else if (params.x !== undefined && params.y !== undefined) {
        await this.page.mouse.click(params.x, params.y);
        return { success: true, result: { clicked: true } };
      } else {
        return { success: false, error: 'No selector or coordinates provided' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle type command
   */
  async handleType(params) {
    try {
      if (params.selector && params.text) {
        await this.page.fill(params.selector, params.text);
        if (params.submit) {
          await this.page.press(params.selector, 'Enter');
        }
        return { success: true, result: { typed: true } };
      } else {
        return { success: false, error: 'No selector or text provided' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle snapshot command
   */
  async handleSnapshot() {
    try {
      const url = this.page.url();
      const title = await this.page.title();

      // Get interactive elements
      const elements = await this.page.evaluate(() => {
        const interactive = document.querySelectorAll('button, a, input, textarea, select, [onclick], [role="button"]');
        const results = [];
        interactive.forEach((el, idx) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          let text = '';
          if (el.placeholder) {
            text = el.placeholder;
          } else if (el.value && el.tagName === 'INPUT') {
            text = el.value;
          } else if (el.textContent) {
            text = el.textContent.slice(0, 50);
          }

          text = text.trim().slice(0, 100);

          results.push({
            refId: idx,
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            text: text,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          });
        });
        return results;
      });

      const output = `Current URL: ${url}\nTitle: ${title}\n\n${elements.length} interactive elements total.`;

      return {
        success: true,
        result: { url, title, elements, output }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle screenshot command
   */
  async handleScreenshot() {
    try {
      const screenshot = await this.page.screenshot();
      const base64 = screenshot.toString('base64');
      return {
        success: true,
        result: `data:image/png;base64,${base64}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle scroll command
   */
  async handleScroll(params) {
    try {
      const direction = params.direction || 'down';
      const amount = params.amount || 500;

      if (direction === 'down') {
        await this.page.evaluate(() => window.scrollBy(0, 500));
      } else if (direction === 'up') {
        await this.page.evaluate(() => window.scrollBy(0, -500));
      }

      return { success: true, result: { scrolled: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle wait command
   */
  async handleWait(params) {
    try {
      if (params.selector) {
        await this.page.waitForSelector(params.selector, { timeout: params.timeout || 5000 });
      } else {
        await this.page.waitForTimeout(params.timeout || 1000);
      }
      return { success: true, result: { waited: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle hover command
   */
  async handleHover(params) {
    try {
      if (params.selector) {
        await this.page.hover(params.selector);
        return { success: true, result: { hovered: true } };
      } else {
        return { success: false, error: 'No selector provided' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle press_key command
   */
  async handlePressKey(params) {
    try {
      if (params.key) {
        await this.page.keyboard.press(params.key);
        return { success: true, result: { pressed: true } };
      } else {
        return { success: false, error: 'No key provided' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle extract_text command
   */
  async handleExtractText(params) {
    try {
      const text = await this.page.evaluate(() => document.body.innerText);
      return {
        success: true,
        result: { text: text.slice(0, 1000) }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle execute_script command
   */
  async handleExecuteScript(params) {
    try {
      if (params.script) {
        const result = await this.page.evaluate(params.script);
        return {
          success: true,
          result: { result }
        };
      } else {
        return { success: false, error: 'No script provided' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle refresh command
   */
  async handleRefresh() {
    try {
      await this.page.reload();
      return { success: true, result: { refreshed: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle go_back command
   */
  async handleGoBack() {
    try {
      await this.page.goBack();
      return { success: true, result: { goneBack: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle go_forward command
   */
  async handleGoForward() {
    try {
      await this.page.goForward();
      return { success: true, result: { goneForward: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current page info
   */
  async getPageInfo() {
    if (!this.page) {
      return { success: false, error: 'Not initialized' };
    }

    try {
      return {
        success: true,
        url: this.page.url(),
        title: await this.page.title()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.context) {
      await this.context.close().catch(() => {});
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
    }

    this.isInitialized = false;
    console.log('[PlaywrightService] Cleaned up');
  }
}

// Singleton instance
const playwrightService = new PlaywrightService();

module.exports = { playwrightService };
