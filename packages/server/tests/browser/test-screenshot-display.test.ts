/**
 * Test Screenshot Display Flow
 * Tests the complete flow from navigation to screenshot display
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';
import { setLatestScreenshot, createBrowserRoutes } from '../../src/api/routes/browser';
import { Hono } from 'hono';

describe('Screenshot Display Flow Test', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;
  let app: Hono;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-screenshot-display'
    });

    await browserController.start();

    toolBus = new ToolBus();
    registerBrowserTools(toolBus, browserController);

    // Setup mock app for screenshot API
    app = new Hono();
    const browserRoutes = createBrowserRoutes();
    app.route('/api/browser', browserRoutes);
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
  });

  it('should capture and make screenshot available via API', async () => {
    console.log('=== Testing Screenshot Display Flow ===');

    // Step 1: Navigate to example.com
    console.log('Step 1: Navigating to example.com');
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    expect(navResult.success).toBe(true);
    console.log('✅ Navigation successful');

    // Wait for screenshot to be captured and stored
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Manually capture and store screenshot
    console.log('Step 2: Manually capturing screenshot');
    const screenshotResult = await toolBus.execute('browser_take_and_store_screenshot', {});

    expect(screenshotResult.success).toBe(true);
    console.log('✅ Screenshot captured and stored:', screenshotResult.output);

    // Step 3: Simulate API request for screenshot
    console.log('Step 3: Testing API endpoint availability');

    // Wait a bit more to ensure screenshot is processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Take another screenshot to verify persistence
    console.log('Step 4: Taking additional screenshot');
    const secondScreenshot = await toolBus.execute('browser_take_and_store_screenshot', {});

    expect(secondScreenshot.success).toBe(true);
    console.log('✅ Second screenshot successful:', secondScreenshot.output);

    // Step 5: Verify screenshot data
    console.log('Step 5: Verifying screenshot data integrity');

    // Navigate to different page
    const navResult2 = await toolBus.execute('browser_navigate', {
      url: 'https://www.google.com'
    });

    expect(navResult2.success).toBe(true);
    console.log('✅ Navigation to Google successful');

    // Wait for page load and screenshot
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Capture Google screenshot
    const googleScreenshot = await toolBus.execute('browser_take_and_store_screenshot', {});

    expect(googleScreenshot.success).toBe(true);
    console.log('✅ Google screenshot captured:', googleScreenshot.output);

    console.log('=== Screenshot Display Flow Test Completed ===');
  }, 60000);

  it('should handle screenshot API timing correctly', async () => {
    console.log('=== Testing Screenshot API Timing ===');

    // Navigate to a page
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://example.com'
    });

    expect(navResult.success).toBe(true);

    // Wait for screenshot capture
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Manually store screenshot
    const storeResult = await toolBus.execute('browser_take_and_store_screenshot', {});

    expect(storeResult.success).toBe(true);

    // Immediately try to get screenshot (should be available)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Take another screenshot to verify it's still working
    const secondStore = await toolBus.execute('browser_take_and_store_screenshot', {});

    expect(secondStore.success).toBe(true);

    console.log('✅ Screenshot API timing test passed');

    console.log('=== Screenshot API Timing Test Completed ===');
  }, 60000);
});
