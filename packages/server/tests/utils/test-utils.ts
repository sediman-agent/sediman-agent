/**
 * Test Utilities
 *
 * Common utilities and mocks for testing
 */

import type { Page, Browser } from 'playwright';

/**
 * Create a mock page for testing
 */
export function createMockPage(): Page {
  const mockPage = {
    url: () => 'https://example.com',
    title: () => Promise.resolve('Example Page'),
    evaluate: async (fn: any) => fn(),
    accessibility: {
      snapshot: async () => mockAXTree
    },
    screenshot: async () => Buffer.from('fake-screenshot'),
    viewportSize: () => ({ width: 1280, height: 720 }),
    locator: () => ({
      first: () => ({
        innerText: async () => 'Test text'
      })
    }),
    waitForSelector: async () => null,
    context: () => ({
      pages: () => [mockPage],
      newCDPSession: async () => ({
        send: async () => ({}),
        on: () => {}
      })
    })
  } as any as Page;

  return mockPage;
}

/**
 * Mock accessibility tree for testing
 */
export const mockAXTree = {
  role: 'WebArea',
  name: 'Test Page',
  children: [
    {
      role: 'link',
      name: 'Home',
      description: 'Go to home page'
    },
    {
      role: 'button',
      name: 'Submit',
      description: 'Submit form'
    },
    {
      role: 'textbox',
      name: 'Search',
      description: 'Search input'
    }
  ]
};

/**
 * Mock browser session
 */
export function createMockBrowserSession() {
  return {
    isStarted: true,
    isStealth: false,
    isExternalBrowser: false,
    context: {
      pages: () => [createMockPage()]
    },
    takeScreenshot: async () => 'base64-screenshot-data'
  };
}

/**
 * Mock tool bus
 */
export class MockToolBus {
  private tools = new Map<string, () => any>();
  private executionResults = new Map<string, any>();

  register(tool: any, executor: any): void {
    this.tools.set(tool.name, executor);
  }

  getDefinitions(): any[] {
    return Array.from(this.tools.keys()).map(name => ({ name }));
  }

  async execute(name: string, args: any): Promise<any> {
    const executor = this.tools.get(name);
    if (executor) {
      return await executor(args);
    }

    // Return mock result
    const result = this.executionResults.get(name) || {
      success: true,
      output: `Executed ${name}`
    };
    return result;
  }

  setExecutionResult(name: string, result: any): void {
    this.executionResults.set(name, result);
  }
}

/**
 * Mock LLM provider
 */
export class MockLLMProvider {
  constructor(private response: any = {}) {}

  async chat(messages: any[], tools?: any[], systemPrompt?: string): Promise<any> {
    return {
      text: JSON.stringify(this.response),
      tool_calls: this.response.actions || []
    };
  }
}

/**
 * Mock structured LLM provider
 */
export class MockStructuredLLMProvider {
  constructor(private response: any = {}) {}

  async chatStructured<T>(
    messages: any[],
    schema: any,
    systemPrompt?: string,
    options?: any
  ): Promise<{ data: T; usage: any; model: string }> {
    return {
      data: this.response as T,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      model: 'mock-model'
    };
  }

  getProviderName(): string {
    return 'mock';
  }

  getModel(): string {
    return 'mock-model';
  }
}

/**
 * Wait for async operations
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test page with specific content
 */
export async function setupTestPage(browser: Browser, content: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(content);
  return page;
}

/**
 * Common test page HTML
 */
export const testPageHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
</head>
<body>
  <h1>Test Page</h1>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>
  <main>
    <form>
      <input type="text" name="search" placeholder="Search..." />
      <button type="submit">Search</button>
    </form>
    <div id="content">
      <p>Some content here</p>
    </div>
  </main>
  <footer>
    <button id="submit">Submit</button>
  </footer>
</body>
</html>
`;
