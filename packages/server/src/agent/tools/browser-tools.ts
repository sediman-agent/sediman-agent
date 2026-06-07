/**
 * Browser Tools Registration
 * Registers Playwright-based browser tools with the agent ToolBus
 */

import { ToolBus } from './bus.js';
import type { ToolExecutor } from './interfaces.js';
import { BrowserController } from '../../browser/controller.js';
import type { ToolDefinition } from '../../core/types.js';
import type { ProjectManager } from '../../project/manager.js';
import { setLatestScreenshot } from '../../api/routes/browser.js';

let browserController: BrowserController | null = null;
let projectManager: ProjectManager | null = null;

export function setProjectManager(pm: ProjectManager): void {
  projectManager = pm;
}

export function registerBrowserTools(toolBus: ToolBus, controller?: BrowserController): void {
  if (!browserController && controller) {
    browserController = controller;
  }

  if (!browserController) {
    throw new Error('BrowserController not provided. Pass it to registerBrowserTools().');
  }

  // Define browser tools
  const tools: ToolDefinition[] = [
    {
      name: 'browser_navigate',
      description: 'Navigate the browser to a URL',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to navigate to',
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'browser_click',
      description: 'Click an element on the page by its refId',
      parameters: {
        type: 'object',
        properties: {
          refId: {
            type: 'number',
            description: 'The refId of the element to click',
          },
        },
        required: ['refId'],
      },
    },
    {
      name: 'browser_type',
      description: 'Type text into an element, optionally submitting the form',
      parameters: {
        type: 'object',
        properties: {
          refId: {
            type: 'number',
            description: 'The refId of the input element',
          },
          text: { type: 'string', description: 'The text to type' },
          submit: {
            type: 'boolean',
            description: 'Press Enter after typing to submit',
          },
        },
        required: ['refId', 'text'],
      },
    },
    {
      name: 'browser_snapshot',
      description: 'Take a snapshot of the current page, returning visible interactive elements with refIds',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'browser_extract_text',
      description: 'Extract all visible text content from the current page',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'browser_screenshot',
      description: 'Take a screenshot of the current page and return base64 PNG',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'browser_take_and_store_screenshot',
      description: 'Take a screenshot and store it for UI display (use this after any operation to update the view)',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  ];

  // Create tool executor
  const executor: ToolExecutor = async (name, args) => {
    const currentController = browserController;
    if (!currentController) {
      console.log('[BrowserTools] BrowserController not initialized');
      return {
        success: false,
        output: '',
        error: 'BrowserController not initialized',
      };
    }

    try {
      let result: string;

      // Ensure browser is started before any operation
      const session = currentController.getSession();
      console.log('[BrowserTools] Session:', session ? 'exists' : 'null', 'isStarted:', session?.isStarted);

      // Check if session exists and is started
      if (!session || !session.isStarted) {
        console.log('[BrowserTools] Starting browser session...');
        await currentController.start();
        console.log('[BrowserTools] Browser session started');
      } else {
        console.log('[BrowserTools] Browser session already started');
      }

      // Ensure we have an active page
      const sessionContext = session?.context;
      console.log('[BrowserTools] Context:', sessionContext ? 'exists' : 'null');

      if (sessionContext) {
        const pages = sessionContext.pages();
        console.log('[BrowserTools] Pages count:', pages.length);

        if (pages.length === 0) {
          console.log('[BrowserTools] Creating new page...');
          const page = await sessionContext.newPage();
          console.log('[BrowserTools] New page created, URL:', page.url());
        }
      } else {
        console.log('[BrowserTools] No context available');
        return {
          success: false,
          output: '',
          error: 'Browser context not available',
        };
      }

      console.log('[BrowserTools] Executing tool:', name, 'with args:', args);

      switch (name) {
        case 'browser_navigate':
          result = await currentController.navigate(args.url as string);
          console.log('[BrowserTools] Navigation result:', result);

          // Take screenshot after navigation for client display
          try {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page to load
            const screenshot = await currentController.screenshot();
            if (screenshot && typeof screenshot === 'string' && screenshot.length > 100) {
              console.log('[BrowserTools] Screenshot taken:', screenshot.length, 'bytes');
              // Store screenshot for client retrieval
              setLatestScreenshot(screenshot, args.url as string);
            }
          } catch (e) {
            console.log('[BrowserTools] Screenshot failed:', e);
          }
          break;
        case 'browser_click':
          result = await currentController.click(args.refId as number);
          console.log('[BrowserTools] Click result:', result);
          break;
        case 'browser_type':
          result = await currentController.typeText(
            args.refId as number,
            args.text as string,
            args.submit as boolean
          );
          console.log('[BrowserTools] Type result:', result);
          break;
        case 'browser_snapshot':
          const snapshot = await currentController.snapshot();
          result = JSON.stringify({
            url: snapshot.url,
            title: snapshot.title,
            elements: snapshot.elements.slice(0, 20),
            elementCount: snapshot.elements.length,
          });
          console.log('[BrowserTools] Snapshot result:', result.substring(0, 100) + '...');
          break;
        case 'browser_extract_text':
          result = await currentController.extractText();
          console.log('[BrowserTools] Extract text result:', result.substring(0, 100) + '...');
          break;
        case 'browser_screenshot':
          const screenshot = await currentController.screenshot();
          result = screenshot ? `Screenshot taken (${screenshot.length} bytes)` : 'Screenshot failed';
          console.log('[BrowserTools] Screenshot result:', result);

          // Store screenshot for client retrieval
          if (screenshot && typeof screenshot === 'string' && screenshot.length > 100) {
            setLatestScreenshot(screenshot, currentController.getSession()?.context?.pages()[0]?.url() || 'Unknown');
            console.log('[BrowserTools] Screenshot stored for client');
          }
          break;
        case 'browser_take_and_store_screenshot':
          const manualScreenshot = await currentController.screenshot();
          if (manualScreenshot && typeof manualScreenshot === 'string' && manualScreenshot.length > 100) {
            const currentUrl = currentController.getSession()?.context?.pages()[0]?.url() || 'Unknown';
            setLatestScreenshot(manualScreenshot, currentUrl);
            result = `Screenshot captured and stored for display (${manualScreenshot.length} bytes)`;
            console.log('[BrowserTools] Manual screenshot stored for client display:', currentUrl);
          } else {
            result = 'Failed to capture screenshot';
            console.log('[BrowserTools] Manual screenshot failed');
          }
          break;
        default:
          console.log('[BrowserTools] Unknown tool:', name);
          return {
            success: false,
            output: '',
            error: `Unknown tool: ${name}`,
          };
      }

      console.log('[BrowserTools] Tool execution successful, result:', result.substring(0, 100) + '...');

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      console.log('[BrowserTools] Tool execution error:', error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  // Register all browser tools
  for (const tool of tools) {
    toolBus.register(tool, executor);
  }
}

export function registerBrowserToolsForProject(
  toolBus: ToolBus,
  projectManager: ProjectManager,
  projectId: string
): void {
  const controller = projectManager.getBrowserController(projectId);
  if (!controller) {
    throw new Error(`Browser not started for project: ${projectId}`);
  }
  registerBrowserTools(toolBus, controller);
}

export function getBrowserController(projectId?: string): BrowserController | null {
  if (projectId && projectManager) {
    return projectManager.getBrowserController(projectId);
  }
  return browserController;
}

export function setBrowserController(controller: BrowserController): void {
  browserController = controller;
}

export async function cleanupBrowserTools(): Promise<void> {
  if (browserController) {
    await browserController.stop();
    browserController = null;
  }
  if (projectManager) {
    await projectManager.shutdown();
    projectManager = null;
  }
}

/**
 * Take a screenshot from the active browser
 */
export async function takeBrowserScreenshot(projectId?: string): Promise<string | null> {
  const controller = getBrowserController(projectId);
  if (!controller) return null;
  return controller.screenshot();
}
