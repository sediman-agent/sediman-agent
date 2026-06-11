/**
 * Page Change Detector
 * Detects and reports changes between page states
 */

import type { PageState } from '../ax-extractor';
import { createLogger } from '../../../core/logging';

const logger = createLogger('PageChangeDetector');

export interface PageChange {
  type: 'navigation' | 'page' | 'elements' | 'scroll';
  description: string;
  details?: any;
}

/**
 * Page Change Detector analyzes differences between page states
 * This is extracted from browser/perception/fusion.ts
 */
export class PageChangeDetector {
  /**
   * Detect all changes between page states
   */
  detectChanges(
    previous: PageState | undefined,
    current: PageState
  ): string[] {
    if (!previous) return [];

    const changes: string[] = [];

    // URL change
    const urlChange = this.detectUrlChange(previous, current);
    if (urlChange) {
      changes.push(urlChange);
    }

    // Title change
    const titleChange = this.detectTitleChange(previous, current);
    if (titleChange) {
      changes.push(titleChange);
    }

    // New elements
    const elementChanges = this.detectElementChanges(previous, current);
    changes.push(...elementChanges);

    // Scroll position change
    const scrollChange = this.detectScrollChange(previous, current);
    if (scrollChange) {
      changes.push(scrollChange);
    }

    // Element count change
    const countChange = this.detectCountChange(previous, current);
    if (countChange) {
      changes.push(countChange);
    }

    return changes;
  }

  /**
   * Detect URL changes (navigation)
   */
  private detectUrlChange(previous: PageState, current: PageState): string | null {
    if (previous.url !== current.url) {
      return `[NAVIGATION] Navigated to: ${current.url}`;
    }
    return null;
  }

  /**
   * Detect title changes
   */
  private detectTitleChange(previous: PageState, current: PageState): string | null {
    if (previous.title !== current.title) {
      return `[PAGE] Title changed to: "${current.title}"`;
    }
    return null;
  }

  /**
   * Detect new/changed elements
   */
  private detectElementChanges(previous: PageState, current: PageState): string[] {
    const changes: string[] = [];

    const newElements = current.elements.filter(e => e.isNew);
    if (newElements.length > 0) {
      changes.push(`[ELEMENTS] ${newElements.length} new elements appeared`);

      // List notable new elements
      const notable = newElements
        .filter(e => e.metadata?.isInteractable && e.text)
        .slice(0, 5);

      for (const el of notable) {
        changes.push(`  - [${el.refId}]<${el.role}> "${el.text?.slice(0, 30)}"`);
      }
    }

    return changes;
  }

  /**
   * Detect scroll position changes
   */
  private detectScrollChange(previous: PageState, current: PageState): string | null {
    if (!previous.stats || !current.stats) return null;

    const prevScroll = previous.scrollPosition?.y || 0;
    const currScroll = current.scrollPosition?.y || 0;
    const docHeight = current.viewport?.height || 1000;
    const prevPercent = (prevScroll / docHeight) * 100;
    const currPercent = (currScroll / docHeight) * 100;

    if (Math.abs(prevPercent - currPercent) > 10) {
      return `[SCROLL] Position changed from ${Math.round(prevPercent)}% to ${Math.round(currPercent)}%`;
    }

    return null;
  }

  /**
   * Detect significant element count changes
   */
  private detectCountChange(previous: PageState, current: PageState): string | null {
    if (!current.stats || !previous.stats) return null;
    const countDiff = (current.stats.interactiveElements || 0) - (previous.stats.interactiveElements || 0);

    if (Math.abs(countDiff) > 5) {
      return `[ELEMENTS] Interactive element count changed by ${countDiff}`;
    }

    return null;
  }

  /**
   * Get structured change objects
   */
  detectStructuredChanges(
    previous: PageState | undefined,
    current: PageState
  ): PageChange[] {
    if (!previous) return [];

    const changes: PageChange[] = [];

    if (previous.url !== current.url) {
      changes.push({
        type: 'navigation',
        description: `Navigated to ${current.url}`,
        details: { from: previous.url, to: current.url }
      });
    }

    if (previous.title !== current.title) {
      changes.push({
        type: 'page',
        description: `Title changed to "${current.title}"`,
        details: { from: previous.title, to: current.title }
      });
    }

    const newElements = current.elements.filter(e => e.isNew);
    if (newElements.length > 0) {
      changes.push({
        type: 'elements',
        description: `${newElements.length} new elements appeared`,
        details: { count: newElements.length, elements: newElements.slice(0, 5) }
      });
    }

    if (previous.stats && current.stats) {
      const prevScroll = previous.scrollPosition?.y || 0;
      const currScroll = current.scrollPosition?.y || 0;
      const docHeight = current.viewport?.height || 1000;
      const prevPercent = (prevScroll / docHeight) * 100;
      const currPercent = (currScroll / docHeight) * 100;
      if (Math.abs(prevPercent - currPercent) > 10) {
        changes.push({
          type: 'scroll',
          description: `Scroll position changed from ${Math.round(prevPercent)}% to ${Math.round(currPercent)}%`,
          details: { from: prevPercent, to: currPercent }
        });
      }
    }

    return changes;
  }

  /**
   * Check if significant changes occurred
   */
  hasSignificantChanges(previous: PageState | undefined, current: PageState): boolean {
    if (!previous) return false;

    // Navigation is always significant
    if (previous.url !== current.url) return true;

    // Many new elements is significant
    const newElements = current.elements.filter(e => e.isNew);
    if (newElements.length > 10) return true;

    // Large scroll change might be significant
    if (previous.stats && current.stats && previous.scrollPosition && current.scrollPosition) {
      const docHeight = current.viewport?.height || 1000;
      const prevPercent = (previous.scrollPosition.y / docHeight) * 100;
      const currPercent = (current.scrollPosition.y / docHeight) * 100;
      if (Math.abs(prevPercent - currPercent) > 50) return true;
    }

    return false;
  }
}
