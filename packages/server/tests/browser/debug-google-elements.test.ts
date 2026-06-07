/**
 * Debug Google Elements
 * Tests what elements are detected on Google homepage
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { ToolBus } from '../../src/agent/tools/bus';
import { registerBrowserTools } from '../../src/agent/tools/browser-tools';

describe('Debug Google Elements', () => {
  let browserController: BrowserController;
  let toolBus: ToolBus;

  beforeEach(async () => {
    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/debug-google'
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

  it('should show all detected elements on Google homepage', async () => {
    console.log('=== Debugging Google Elements ===');

    // Navigate to Google
    const navResult = await toolBus.execute('browser_navigate', {
      url: 'https://www.google.com'
    });

    expect(navResult.success).toBe(true);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page snapshot
    const snapshot = await toolBus.execute('browser_snapshot', {});
    const snapshotData = JSON.parse(snapshot.output);

    console.log('Page Title:', snapshotData.title);
    console.log('Page URL:', snapshotData.url);
    console.log('Total Elements:', snapshotData.elements.length);

    // Log all elements
    console.log('\n=== All Detected Elements ===');
    snapshotData.elements.forEach((el: any, index: number) => {
      console.log(`${index + 1}. Tag: ${el.tag}, RefId: ${el.refId}, Text: ${el.text?.substring(0, 50)}`);
      if (el.attributes) {
        console.log('   Attributes:', JSON.stringify(el.attributes).substring(0, 200));
      }
    });

    // Look for input elements specifically
    console.log('\n=== Input Elements ===');
    const inputs = snapshotData.elements.filter((el: any) => el.tag === 'input');
    console.log(`Found ${inputs.length} input elements:`);

    inputs.forEach((el: any, index: number) => {
      console.log(`Input ${index + 1}:`);
      console.log('  RefId:', el.refId);
      console.log('  Text:', el.text);
      console.log('  Attributes:', el.attributes);
    });

    // Look for elements with 'name' or 'type' attributes
    console.log('\n=== Elements with Attributes ===');
    const withAttrs = snapshotData.elements.filter((el: any) => el.attributes && Object.keys(el.attributes).length > 0);
    console.log(`Found ${withAttrs.length} elements with attributes:`);

    withAttrs.slice(0, 10).forEach((el: any, index: number) => {
      console.log(`Element ${index + 1}:`);
      console.log('  Tag:', el.tag);
      console.log('  Attributes:', el.attributes);
    });

    console.log('=== Debug Complete ===');

    expect(snapshotData.elements.length).toBeGreaterThan(0);
  }, 30000);
});
