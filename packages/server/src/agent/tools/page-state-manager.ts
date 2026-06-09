/**
 * Page State Manager Module
 * Manages browser page state for change detection
 */

import type { PageSnapshot } from "../../browser/controller";

let lastPageState: PageSnapshot | null = null;

/**
 * Get the last known page state
 */
export function getLastPageState(): PageSnapshot | null {
  return lastPageState;
}

/**
 * Update the current page state
 */
export function updatePageState(state: PageSnapshot): void {
  lastPageState = state;
}

/**
 * Clear the page state
 */
export function clearPageState(): void {
  lastPageState = null;
}

/**
 * Detect if the page has changed based on snapshot comparison
 */
export function detectPageChange(
  previousState: PageSnapshot | null,
  currentState: PageSnapshot | null
): { changed: boolean; reason?: string } {
  if (!previousState || !currentState) {
    return { changed: false };
  }

  // Check URL change
  if (previousState.url !== currentState.url) {
    return { changed: true, reason: 'URL changed' };
  }

  // Check title change
  if (previousState.title !== currentState.title) {
    return { changed: true, reason: 'Title changed' };
  }

  // Check element count change (indicates DOM update)
  const prevElementCount = previousState.elements?.length || 0;
  const currElementCount = currentState.elements?.length || 0;
  if (prevElementCount !== currElementCount) {
    return { changed: true, reason: `Element count changed (${prevElementCount} → ${currElementCount})` };
  }

  // Check for significant content change
  const prevContent = previousState.elements?.map(e => e.text).join(' ') || '';
  const currContent = currentState.elements?.map(e => e.text).join(' ') || '';
  if (Math.abs(prevContent.length - currContent.length) > 100) {
    return { changed: true, reason: 'Content length changed significantly' };
  }

  return { changed: false };
}
