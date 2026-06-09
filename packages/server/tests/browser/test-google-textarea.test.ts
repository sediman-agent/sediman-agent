/**
 * Test Google Search with Textarea
 * Tests Google search using the textarea element
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';

describe('Google Search with Textarea', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-google-textarea'
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

  it('should search Google using textarea element', async () => {
    console.log('=== Google Search with Textarea ===');

    // Navigate to Google
    console.log('Step 1: Navigating to Google');
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://www.google.com'
    });

    expect(navResult.success).toBe(true);
    console.log('✅ Navigation successful');

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page snapshot
    console.log('Step 2: Getting page elements');
    const snapshot = await toolBus.execute('browser_snapshot', {});
    const snapshotData = JSON.parse(snapshot.output);

    console.log('Page Title:', snapshotData.title);
    console.log('Total Elements:', snapshotData.elements.length);

    // Look for textarea (Google often uses textarea for search)
    console.log('Step 3: Looking for textarea element');
    const textareas = snapshotData.elements.filter((el: any) => el.tag === 'textarea');
    console.log('Textareas found:', textareas.length);

    if (textareas.length > 0) {
      const searchTextarea = textareas[0];
      console.log('Using textarea RefId:', searchTextarea.refId);

      // Type search query in textarea
      console.log('Step 4: Typing "elon musk" in textarea');
      const typeResult = await toolBus.execute('browser_type', {
        refId: searchTextarea.refId,
        text: 'elon musk'
      });

      expect(typeResult.success).toBe(true);
      console.log('✅ Text typed successfully:', typeResult.output);

      // Wait for typing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Press Enter to submit search
      console.log('Step 5: Submitting search with Enter');
      const submitResult = await toolBus.execute('browser_type', {
        refId: searchTextarea.refId,
        text: '',
        submit: true
      });

      expect(submitResult.success).toBe(true);
      console.log('✅ Search submitted');

      // Wait for search results to load
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Take screenshot of results
      console.log('Step 6: Taking screenshot of search results');
      const screenshot = await toolBus.execute('browser_take_and_store_screenshot', {});

      expect(screenshot.success).toBe(true);
      console.log('✅ Screenshot captured:', screenshot.output);

      // Check final page
      const finalSnapshot = await toolBus.execute('browser_snapshot', {});
      const finalData = JSON.parse(finalSnapshot.output);

      console.log('Final page title:', finalData.title);
      console.log('Final page URL:', finalData.url);

      expect(finalData.title).toContain('elon musk');
      expect(finalData.url).toContain('search');

      console.log('✅ Google search completed successfully!');
    } else {
      console.log('❌ No textarea found');
      console.log('Available elements:', snapshotData.elements.map((el: any) => ({
        tag: el.tag,
        refId: el.refId
      })));
    }

    console.log('=== Test Complete ===');
  }, 60000);

  it('should try typing directly into input elements', async () => {
    console.log('=== Typing into Input Elements ===');

    // Navigate to Google
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://www.google.com'
    });

    expect(navResult.success).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page snapshot
    const snapshot = await toolBus.execute('browser_snapshot', {});
    const snapshotData = JSON.parse(snapshot.output);

    // Try typing into first input
    const inputs = snapshotData.elements.filter((el: any) => el.tag === 'input');
    console.log('Found', inputs.length, 'input elements');

    if (inputs.length > 0) {
      const firstInput = inputs[0];
      console.log('Trying to type into input RefId:', firstInput.refId);

      const typeResult = await toolBus.execute('browser_type', {
        refId: firstInput.refId,
        text: 'elon musk',
        submit: true
      });

      console.log('Type result:', typeResult.success);
      console.log('Type output:', typeResult.output);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Take screenshot
      const screenshot = await toolBus.execute('browser_take_and_store_screenshot', {});
      console.log('Screenshot result:', screenshot.success, screenshot.output);
    }

    console.log('=== Input Test Complete ===');
  }, 60000);
});
