/**
 * Test browser tool functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BrowserController } from '../../src/browser/controller';
import { BrowserSession } from '../../src/browser/session';

describe('Browser Tools Integration', () => {
  let browserSession: BrowserSession;
  let browserController: BrowserController;

  beforeEach(async () => {
    browserSession = new BrowserSession({
      headless: true,
      userDataDir: '/tmp/test-browser-profile'
    });

    await browserSession.start();

    browserController = new BrowserController({
      headless: true,
      userDataDir: '/tmp/test-browser-profile'
    });

    await browserController.start();
  });

  afterEach(async () => {
    if (browserController) {
      await browserController.stop();
    }
    if (browserSession) {
      await browserSession.stop();
    }
  });

  it('should have isStarted getter that returns boolean', () => {
    expect(browserSession.isStarted).toBe(true);
    expect(typeof browserSession.isStarted).toBe('boolean');
  });

  it('should have context getter', () => {
    expect(browserSession.context).toBeTruthy();
    expect(browserSession.context?.pages()).toBeDefined();
  });

  it('should navigate to a URL', async () => {
    const result = await browserController.navigate('https://example.com');
    expect(result).toContain('Navigated to https://example.com');
  }, 30000);
});
