/**
 * Scroll Info Module
 * Handles scroll position and viewport information extraction
 */

import type { Page } from 'playwright';
import { createLogger } from '../../core/logging';

const logger = createLogger('scroll-info');

export interface ScrollInfo {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scrollPercentage: number;
  isAtTop: boolean;
  isAtBottom: boolean;
}

/**
 * Extract scroll information from page
 */
export async function getScrollInfo(page: Page): Promise<ScrollInfo> {
  try {
    const metrics = await page.evaluate(() => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0;

      const scrollPercentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      return {
        scrollTop,
        scrollHeight,
        clientHeight,
        scrollPercentage,
        isAtTop: scrollTop < 10,
        isAtBottom: (scrollTop + clientHeight) >= scrollHeight - 10
      };
    });

    return metrics;
  } catch (error) {
    logger.error({ error }, 'Failed to get scroll info');
    return {
      scrollTop: 0,
      scrollHeight: 0,
      clientHeight: 0,
      scrollPercentage: 0,
      isAtTop: true,
      isAtBottom: true
    };
  }
}

/**
 * Scroll to top of page
 */
export async function scrollToTop(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (error) {
    logger.error({ error }, 'Failed to scroll to top');
  }
}

/**
 * Scroll to bottom of page
 */
export async function scrollToBottom(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      window.scrollTo({ top: window.document.body.scrollHeight, behavior: 'smooth' });
    });
  } catch (error) {
    logger.error({ error }, 'Failed to scroll to bottom');
  }
}

/**
 * Get viewport dimensions
 */
export async function getViewportInfo(page: Page): Promise<{
  width: number;
  height: number;
  deviceScaleFactor: number;
}> {
  try {
    const metrics = await page.evaluate(() => {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        deviceScaleFactor: window.devicePixelRatio
      };
    });

    return metrics;
  } catch (error) {
    logger.error({ error }, 'Failed to get viewport info');
    return {
      width: 0,
      height: 0,
      deviceScaleFactor: 1
    };
  }
}
