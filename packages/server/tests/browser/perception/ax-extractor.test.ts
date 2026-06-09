/**
 * Accessibility Tree Extractor Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AccessibilityTreeExtractor, PageState } from '../../../src/browser/perception/ax-extractor';
import { createMockPage, mockAXTree } from '../../utils/test-utils';

describe('AccessibilityTreeExtractor', () => {
  let extractor: AccessibilityTreeExtractor;

  beforeEach(() => {
    extractor = new AccessibilityTreeExtractor();
  });

  afterEach(() => {
    extractor.reset();
  });

  describe('extractAccessibilityTree', () => {
    it('should extract accessibility tree from page', async () => {
      const page = createMockPage();

      const tree = await extractor.extractAccessibilityTree(page);

      expect(tree).toBeDefined();
      expect(tree?.role).toBe('WebArea');
    });

    it('should handle null result gracefully', async () => {
      const page = createMockPage();

      // Create a page that will fail on accessibility
      const failingPage = {
        ...page,
        accessibility: () => {
          throw new Error('CDP not available');
        }
      } as any;

      const tree = await extractor.extractAccessibilityTree(failingPage);

      expect(tree).toBeNull();
    });
  });

  describe('extractInteractiveElements', () => {
    it('should extract interactive elements from page', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);

      expect(state).toBeDefined();
      expect(state.url).toBe('https://example.com');
      expect(state.title).toBe('Example Page');
      expect(Array.isArray(state.elements)).toBe(true);
    });

    it('should filter to only interactive elements', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);

      // All elements should be marked as interactive
      const nonInteractive = state.elements.filter(e => !e.metadata.isInteractable);
      expect(nonInteractive.length).toBe(0);
    });

    it('should track new elements', async () => {
      const page = createMockPage();

      // First snapshot
      const state1 = await extractor.extractInteractiveElements(page);
      expect(state1.stats.newElements).toBe(state1.elements.length);

      // Second snapshot (same elements)
      const state2 = await extractor.extractInteractiveElements(page);
      expect(state2.stats.newElements).toBe(0);
    });

    it('should include scroll information', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);

      expect(state.stats.scrollInfo).toBeDefined();
      expect(typeof state.stats.scrollInfo.scrollTop).toBe('number');
    });

    it('should assign sequential refIds', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);

      for (let i = 0; i < state.elements.length; i++) {
        expect(state.elements[i].refId).toBe(i);
      }
    });

    it('should respect maxDepth option', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page, {
        maxDepth: 2
      });

      expect(state).toBeDefined();
    });

    it('should preserve refIds across snapshots when possible', async () => {
      const page = createMockPage();

      const state1 = await extractor.extractInteractiveElements(page);
      const firstRefId = state1.elements[0]?.refId;

      const state2 = await extractor.extractInteractiveElements(page);
      const secondRefId = state2.elements[0]?.refId;

      // Same element should have same refId
      expect(firstRefId).toBe(secondRefId);
    });
  });

  describe('formatForLLM', () => {
    it('should format elements for LLM consumption', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);
      const formatted = extractor.formatForLLM(state);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should include page header', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);
      const formatted = extractor.formatForLLM(state);

      expect(formatted).toContain('URL:');
      expect(formatted).toContain('Title:');
    });

    it('should include element count', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);
      const formatted = extractor.formatForLLM(state);

      expect(formatted).toContain('Elements:');
    });

    it('should mark new elements with asterisk', async () => {
      const page = createMockPage();

      // First snapshot - all elements are new
      const state = await extractor.extractInteractiveElements(page);
      const formatted = extractor.formatForLLM(state);

      // Should have new element markers
      expect(formatted).toContain('*');
    });

    it('should produce compact output', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);
      const formatted = extractor.formatForLLM(state);

      // Should be much shorter than full DOM
      expect(formatted.length).toBeLessThan(10000);
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate token count accurately', async () => {
      const page = createMockPage();

      const state = await extractor.extractInteractiveElements(page);
      const tokens = extractor.estimateTokenCount(state);

      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');

      // Should be significantly less than full DOM
      expect(tokens).toBeLessThan(1000);
    });
  });

  describe('reset', () => {
    it('should reset extractor state', async () => {
      const page = createMockPage();

      // First snapshot
      await extractor.extractInteractiveElements(page);
      expect(extractor.getRefIdCount()).toBeGreaterThan(0);

      // Reset
      extractor.reset();

      // RefId count should be back to 0
      expect(extractor.getRefIdCount()).toBe(0);

      // Next snapshot should start from 0
      const state = await extractor.extractInteractiveElements(page);
      expect(state.elements[0]?.refId).toBe(0);
    });
  });

  describe('getRefIdCount', () => {
    it('should return current refId count', () => {
      expect(extractor.getRefIdCount()).toBe(0);

      extractor['nextRefId'] = 5;
      expect(extractor.getRefIdCount()).toBe(5);
    });
  });
});
