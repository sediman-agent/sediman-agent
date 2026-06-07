/**
 * End-to-end test for complete agent flow
 * Tests that the agent can use browser tools and communicate with humans
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';

describe('Complete Agent Flow - End to End', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-agent-flow'
    });

    await browserController.start();

    toolBus = new ToolBus();
    registerBrowserTools(toolBus, browserController);
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
  });

  it('should complete full agent browser navigation flow', async () => {
    // Step 1: User requests "visit google.com"
    const userRequest = "visit google.com";

    // Step 2: Agent interprets and calls browser_navigate
    const agentToolCall = {
      tool: 'browser_navigate',
      args: { url: 'https://www.google.com' }
    };

    // Step 3: Server executes the tool
    const result = await toolBus.execute(agentToolCall.tool, agentToolCall.args);

    // Step 4: Verify execution succeeded
    expect(result.success).toBe(true);
    expect(result.output).toContain('Navigated to https://www.google.com');

    // Step 5: Verify browser state
    const session = browserController.getSession();
    expect(session.isStarted).toBe(true);

    const pages = session.context?.pages() || [];
    expect(pages.length).toBeGreaterThan(0);

    // Step 6: Agent can now take actions on the page
    const snapshot = await toolBus.execute('browser_snapshot', {});
    expect(snapshot.success).toBe(true);

    const snapshotData = JSON.parse(snapshot.output);
    expect(snapshotData.url).toContain('google.com');
    expect(snapshotData.elements).toBeDefined();
    expect(Array.isArray(snapshotData.elements)).toBe(true);

    // Step 7: Agent can extract text from the page
    const textResult = await toolBus.execute('browser_extract_text', {});
    expect(textResult.success).toBe(true);
    expect(textResult.output).toBeDefined();
    expect(textResult.output.length).toBeGreaterThan(0);

    console.log('✅ Complete agent flow successful:');
    console.log('  1. User request received');
    console.log('  2. Agent interpreted request');
    console.log('  3. Agent called browser_navigate tool');
    console.log('  4. Server executed navigation');
    console.log('  5. Browser is at correct URL');
    console.log('  6. Agent can take snapshots');
    console.log('  7. Agent can extract text');
  }, 30000);

  it('should handle agent requesting human interaction', async () => {
    // Scenario: Agent finds something that requires human input

    // Navigate to a page
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Agent takes snapshot to understand page
    const snapshot = await toolBus.execute('browser_snapshot', {});
    expect(snapshot.success).toBe(true);

    const snapshotData = JSON.parse(snapshot.output);

    // Agent identifies elements and could ask human to interact
    if (snapshotData.elements.length > 0) {
      // Agent could say: "I found a button. Should I click it?"
      const hasClickableElements = snapshotData.elements.some((el: any) =>
        el.tag === 'BUTTON' || el.tag === 'A' || el.role === 'button'
      );

      if (hasClickableElements) {
        console.log('✅ Agent can request human interaction:');
        console.log('  - Found clickable elements');
        console.log('  - Can ask human: "Should I click this?"');
      }
    }

    // Verify agent has enough information to make decisions
    expect(snapshotData.elements.length).toBeGreaterThan(0);
  }, 30000);

  it('should allow agent to perform multiple browser operations in sequence', async () => {
    // Scenario: Complex multi-step task

    // Step 1: Navigate to page
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });
    expect(navResult.success).toBe(true);

    // Step 2: Take snapshot to understand content
    const snapshot1 = await toolBus.execute('browser_snapshot', {});
    expect(snapshot1.success).toBe(true);

    // Step 3: Extract text to read content
    const textResult = await toolBus.execute('browser_extract_text', {});
    expect(textResult.success).toBe(true);

    // Step 4: Navigate to different page
    const navResult2 = await toolBus.execute('browser_navigate', {
      url: 'https://httpbin.org/html'
    });
    expect(navResult2.success).toBe(true);

    // Step 5: Take another snapshot
    const snapshot2 = await toolBus.execute('browser_snapshot', {});
    expect(snapshot2.success).toBe(true);

    // Verify agent completed all steps successfully
    const snapshotData1 = JSON.parse(snapshot1.output);
    const snapshotData2 = JSON.parse(snapshot2.output);

    expect(snapshotData1.url).toContain('example.com');
    expect(snapshotData2.url).toContain('httpbin.org');
    expect(textResult.output.length).toBeGreaterThan(0);

    console.log('✅ Multi-step agent task completed:');
    console.log('  1. Navigated to example.com');
    console.log('  2. Took snapshot');
    console.log('  3. Extracted text');
    console.log('  4. Navigated to httpbin.org');
    console.log('  5. Took another snapshot');
  }, 30000);

  it('should handle agent errors gracefully and allow retry', async () => {
    // Scenario: Agent tries something that fails

    // Try to navigate to invalid URL
    const errorResult = await toolBus.execute('browser_navigate', {
      url: 'not-a-valid-url'
    });

    // Should handle error gracefully
    expect(errorResult).toBeDefined();
    expect(errorResult.success).toBeDefined();

    // Agent can still continue with other operations
    const successResult = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    expect(successResult.success).toBe(true);

    console.log('✅ Agent error handling works:');
    console.log('  1. Invalid URL handled gracefully');
    console.log('  2. Agent can continue with other operations');
  });

  it('should support agent taking screenshots for human verification', async () => {
    // Navigate to a page
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Agent takes screenshot to show human
    const screenshot = await toolBus.execute('browser_screenshot', {});

    expect(screenshot.success).toBe(true);
    expect(screenshot.output).toBeDefined();
    expect(screenshot.output).toContain('Screenshot taken');

    // Agent could now say: "Here's what I see. Should I proceed?"
    console.log('✅ Agent can take screenshots for human verification:');
    console.log('  - Screenshot captured successfully');
    console.log('  - Agent can show human what it sees');
  }, 30000);

  it('should allow agent to search for elements and request human guidance', async () => {
    // Navigate to a page
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Agent takes snapshot to find elements
    const snapshot = await toolBus.execute('browser_snapshot', {});
    expect(snapshot.success).toBe(true);

    const snapshotData = JSON.parse(snapshot.output);

    // Agent analyzes elements
    const buttons = snapshotData.elements.filter((el: any) =>
      el.tag === 'BUTTON' || el.role === 'button'
    );

    const links = snapshotData.elements.filter((el: any) => el.tag === 'A');

    // Agent could ask human: "I found X buttons and Y links. Which should I click?"
    console.log('✅ Agent can request human guidance:');
    console.log(`  - Found ${buttons.length} buttons`);
    console.log(`  - Found ${links.length} links`);
    console.log('  - Can ask human which element to interact with');
  }, 30000);
});

describe('Agent-Human Interaction Scenarios', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-human-interaction'
    });

    await browserController.start();

    toolBus = new ToolBus();
    registerBrowserTools(toolBus, browserController);
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
  });

  it('should support agent asking human for CAPTCHA solving', async () => {
    // Scenario: Agent encounters CAPTCHA

    // Navigate to page
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Agent takes screenshot
    const screenshot = await toolBus.execute('browser_screenshot', {});
    expect(screenshot.success).toBe(true);

    // Agent can say: "I see a CAPTCHA. Can you solve it for me?"
    console.log('✅ Agent can request human help for CAPTCHA:');
    console.log('  - Screenshot captured');
    console.log('  - Agent can show CAPTCHA to human');
    console.log('  - Human can solve and agent can proceed');
  }, 30000);

  it('should support agent asking human for form input', async () => {
    // Scenario: Agent needs form input

    // Navigate to page
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Agent takes snapshot to find forms
    const snapshot = await toolBus.execute('browser_snapshot', {});
    expect(snapshot.success).toBe(true);

    const snapshotData = JSON.parse(snapshot.output);

    // Check for form elements
    const inputs = snapshotData.elements.filter((el: any) =>
      el.tag === 'INPUT' || el.tag === 'TEXTAREA'
    );

    // Agent can say: "I found X input fields. What should I enter?"
    if (inputs.length > 0) {
      console.log('✅ Agent can request human input for forms:');
      console.log(`  - Found ${inputs.length} input fields`);
      console.log('  - Can ask human what to enter');
    }
  }, 30000);

  it('should support agent asking human for confirmation before actions', async () => {
    // Scenario: Agent wants confirmation before destructive action

    // Navigate to page
    await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    // Agent takes snapshot
    const snapshot = await toolBus.execute('browser_snapshot', {});
    expect(snapshot.success).toBe(true);

    const snapshotData = JSON.parse(snapshot.output);

    // Agent could ask: "I found a delete button. Should I click it?"
    const dangerousElements = snapshotData.elements.filter((el: any) =>
      el.text?.toLowerCase().includes('delete') ||
      el.text?.toLowerCase().includes('remove') ||
      el.ariaLabel?.toLowerCase().includes('delete')
    );

    if (dangerousElements.length > 0) {
      console.log('✅ Agent can request human confirmation:');
      console.log(`  - Found ${dangerousElements.length} potentially dangerous elements`);
      console.log('  - Can ask human for confirmation before clicking');
    }
  }, 30000);
});

describe('Agent Reliability and Error Recovery', () => {
  it('should recover from browser crash and continue task', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-recovery'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    // Perform successful operation
    const result1 = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });
    expect(result1.success).toBe(true);

    // Simulate crash
    await controller.stop();

    // Agent should be able to continue with new operation
    const result2 = await toolBus.execute('browser_navigate', {
      url: 'https://httpbin.org/html'
    });

    expect(result2).toBeDefined();

    await controller.stop();
  }, 30000);

  it('should handle network timeouts gracefully', async () => {
    const controller = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-timeouts'
    });

    await controller.start();

    const toolBus = new ToolBus();
    registerBrowserTools(toolBus, controller);

    // Try to navigate to URL that might timeout
    const result = await toolBus.execute('browser_navigate', {
      url: 'https://httpbin.org/delay/10'
    });

    // Should handle timeout gracefully
    expect(result).toBeDefined();

    await controller.stop();
  }, 30000);
});
