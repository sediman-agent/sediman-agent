/**
 * Screenshot Handler Module
 * Manages browser screenshots for visual feedback
 */

import { setLatestScreenshot, waitForCdpConnection } from '../../api/routes/browser.js';
import logger from '../../core/logging';

let browserController: any = null;

/**
 * Set the browser controller
 */
export function setBrowserController(controller: any): void {
  browserController = controller;
}

/**
 * Get the browser controller
 */
export function getBrowserController(): any {
  return browserController;
}

/**
 * Take a screenshot of the browser
 */
export async function takeBrowserScreenshot(projectId?: string): Promise<string | null> {
  const ctrl = browserController;
  if (!ctrl) {
    logger.warn('[ScreenshotHandler] No browser controller available');
    return null;
  }

  try {
    // Ensure CDP connection for Electron mode
    if (process.env.SEDIMAN_MODE === 'electron') {
      const connected = await waitForCdpConnection(5000);
      if (!connected) {
        logger.warn('[ScreenshotHandler] CDP connection timeout');
      }
    }

    const shot = await ctrl.screenshot();
    if (shot && shot.length > 100) {
      const currentUrl = ctrl.getSession()?.context?.pages?.[0]?.url() || '';
      setLatestScreenshot(shot, currentUrl);
      logger.info(`[ScreenshotHandler] Screenshot captured (${shot.length} bytes)`);
      return shot;
    } else {
      logger.warn('[ScreenshotHandler] Screenshot failed or empty');
      return null;
    }
  } catch (error) {
    logger.error({ error }, '[ScreenshotHandler] Screenshot failed');
    return null;
  }
}

/**
 * Store screenshot (with delay for visual feedback)
 */
export function storeScreenshot(url?: string): void {
  const ctrl = browserController;
  if (!ctrl) return;

  (async () => {
    try {
      await new Promise(r => setTimeout(r, 300));
      const shot = await ctrl.screenshot();
      if (shot && shot.length > 100) {
        const currentUrl = url || ctrl.getSession()?.context?.pages?.[0]?.url() || '';
        setLatestScreenshot(shot, currentUrl);
      }
    } catch (error) {
      logger.warn({ error }, '[ScreenshotHandler] Failed to store screenshot');
    }
  })();
}

/**
 * Update latest snapshot with element coordinates
 */
export async function updateLatestSnapshot(): Promise<void> {
  const ctrl = browserController;
  if (!ctrl) return;

  try {
    const snap = await ctrl.snapshot();
    if (snap && snap.elements && snap.elements.length > 0) {
      setLatestScreenshot({ elements: snap.elements }, snap.url);
      logger.info(`[ScreenshotHandler] Updated snapshot with ${snap.elements.length} elements`);
    }
  } catch (error) {
    logger.warn({ error }, '[ScreenshotHandler] Failed to update snapshot');
  }
}
