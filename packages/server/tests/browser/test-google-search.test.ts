/**
 * Direct Test for Google Search
 * Tests the complete flow: navigate to google.com -> search for "elon musk"
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';
import { setLatestScreenshot } from '../../src/api/routes/browser';

describe('Google Search Test', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-google-search'
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

  it('should navigate to google.com and search for elon musk', async () => {
    console.log('=== Starting Google Search Test ===');

    // Step 1: Navigate to Google
    console.log('Step 1: Navigating to google.com');
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://www.google.com'
    });

    expect(navResult.success).toBe(true);
    console.log('✅ Navigation successful');

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Take screenshot to see the page
    console.log('Step 2: Taking screenshot of Google homepage');
    const screenshot = await toolBus.execute('browser_screenshot', {});

    expect(screenshot.success).toBe(true);
    console.log('✅ Screenshot taken:', screenshot.output);

    // Step 3: Get page snapshot to find search elements
    console.log('Step 3: Getting page snapshot to find search elements');
    const snapshot = await toolBus.execute('browser_snapshot', {});

    expect(snapshot.success).toBe(true);
    const snapshotData = JSON.parse(snapshot.output);

    console.log('Page title:', snapshotData.title);
    console.log('Page URL:', snapshotData.url);
    console.log('Number of elements found:', snapshotData.elements.length);

    // Step 4: Look for search input field
    console.log('Step 4: Looking for search input field');
    const searchInputs = snapshotData.elements.filter((el: any) =>
      el.tag === 'input' && (el.attributes?.name === 'q' || el.attributes?.type === 'text' || el.attributes?.placeholder?.toLowerCase().includes('search'))
    );

    console.log('Search inputs found:', searchInputs.length);

    if (searchInputs.length > 0) {
      const searchInput = searchInputs[0];
      console.log('Search input refId:', searchInput.refId);
      console.log('Search input attributes:', searchInput.attributes);

      // Step 5: Type search query
      console.log('Step 5: Typing "elon musk" in search field');
      const typeResult = await toolBus.execute('browser_type', {
        refId: searchInput.refId,
        text: 'elon musk'
      });

      expect(typeResult.success).toBe(true);
      console.log('✅ Text typed successfully');

      // Wait for typing to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 6: Submit search
      console.log('Step 6: Submitting search (pressing Enter)');
      const submitResult = await toolBus.execute('browser_type', {
        refId: searchInput.refId,
        text: 'elon musk',
        submit: true
      });

      expect(submitResult.success).toBe(true);
      console.log('✅ Search submitted');

      // Wait for search results to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 7: Take screenshot of search results
      console.log('Step 7: Taking screenshot of search results');
      const resultsScreenshot = await toolBus.execute('browser_take_and_store_screenshot', {});

      expect(resultsScreenshot.success).toBe(true);
      console.log('✅ Results screenshot taken and stored:', resultsScreenshot.output);

      // Step 8: Get final page info
      console.log('Step 8: Getting final page information');
      const finalSnapshot = await toolBus.execute('browser_snapshot', {});
      const finalData = JSON.parse(finalSnapshot.output);

      console.log('Final page title:', finalData.title);
      console.log('Final page URL:', finalData.url);

      expect(finalData.url).toContain('google');
      expect(finalData.title).toContain('elon musk');
    } else {
      console.log('❌ No search input found on page');
      console.log('Available elements:', snapshotData.elements.slice(0, 10).map((el: any) => ({
        tag: el.tag,
        refId: el.refId,
        attributes: el.attributes
      })));
    }

    console.log('=== Google Search Test Completed ===');
  }, 60000);
});
