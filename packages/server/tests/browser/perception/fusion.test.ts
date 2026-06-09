/**
 * Vision-DOM Fusion Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { VisionDOMFusion, FusionState, FusionStrategy } from '../../../src/browser/perception/fusion';
import { createMockPage } from '../../utils/test-utils';

describe('VisionDOMFusion', () => {
  let fusion: VisionDOMFusion;

  beforeEach(() => {
    fusion = new VisionDOMFusion();
  });

  afterEach(() => {
    fusion.reset();
  });

  describe('captureFusedState', () => {
    it('should capture fused state from page', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: false,
        fusionStrategy: 'balanced'
      });

      expect(state).toBeDefined();
      expect(state.dom).toBeDefined();
      expect(state.screenshot).toBeDefined();
      expect(state.fusion).toBeDefined();
    });

    it('should capture DOM state', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: false
      });

      expect(state.dom.state).toBeDefined();
      expect(state.dom.formatted).toBeDefined();
      expect(state.dom.json).toBeDefined();
    });

    it('should include screenshot when requested', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: true
      });

      expect(state.screenshot.data).toBeDefined();
      expect(state.screenshot.format).toBe('png');
    });

    it('should estimate token counts', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: false
      });

      expect(state.fusion.tokenEstimate).toBeDefined();
      expect(state.fusion.tokenEstimate.dom).toBeGreaterThan(0);
      expect(typeof state.fusion.tokenEstimate.total).toBe('number');
    });

    it('should use balanced strategy by default', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page);

      expect(state.fusion.strategy).toBe('balanced');
    });

    it('should respect fusion strategy option', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        fusionStrategy: 'vision-primary'
      });

      expect(state.fusion.strategy).toBe('vision-primary');
    });

    it('should calculate confidence score', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page);

      expect(state.fusion.confidence).toBeGreaterThanOrEqual(0);
      expect(state.fusion.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect changes between snapshots', async () => {
      const page = createMockPage();

      const state1 = await fusion.captureFusedState(page);
      const state2 = await fusion.captureFusedState(page);

      // First snapshot has no previous state
      expect(state1.fusion.detectedChanges).toEqual([]);

      // Second snapshot might detect changes (depending on implementation)
      expect(Array.isArray(state2.fusion.detectedChanges)).toBe(true);
    });
  });

  describe('buildLLMMessage', () => {
    it('should build LLM message with all components', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: false
      });

      const message = fusion.buildLLMMessage(state, 'Test task', 'Test memory');

      expect(message).toBeDefined();
      expect(Array.isArray(message)).toBe(true);
      expect(message[0].role).toBe('user');
    });

    it('should include task and memory in message', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: false
      });

      const message = fusion.buildLLMMessage(state, 'Test task', 'Test memory');

      const content = message[0].content as string;
      expect(content).toContain('Test task');
      expect(content).toContain('Test memory');
    });

    it('should include screenshot when available', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: true
      });

      const message = fusion.buildLLMMessage(state, 'Test task', 'Test memory');

      // Should have content as array with text and image
      const content = message[0].content;
      expect(Array.isArray(content)).toBe(true);
    });

    it('should include page state in message', async () => {
      const page = createMockPage();

      const state = await fusion.captureFusedState(page, {
        includeScreenshot: false
      });

      const message = fusion.buildLLMMessage(state, 'Test task', 'Test memory');

      const content = message[0].content as string;
      expect(content).toContain('<page_state>');
      expect(content).toContain('<interactive_elements>');
    });
  });

  describe('getLastState', () => {
    it('should return last captured state', async () => {
      const page = createMockPage();

      await fusion.captureFusedState(page);
      const lastState = fusion.getLastState();

      expect(lastState).toBeDefined();
      expect(lastState?.url).toBeDefined();
    });

    it('should return undefined before any capture', () => {
      const lastState = fusion.getLastState();
      expect(lastState).toBeUndefined();
    });
  });

  describe('getLastScreenshot', () => {
    it('should return last screenshot', async () => {
      const page = createMockPage();

      await fusion.captureFusedState(page, {
        includeScreenshot: true
      });

      const screenshot = fusion.getLastScreenshot();
      expect(screenshot).toBeDefined();
    });

    it('should return undefined when screenshot not captured', async () => {
      const page = createMockPage();

      await fusion.captureFusedState(page, {
        includeScreenshot: false
      });

      const screenshot = fusion.getLastScreenshot();
      expect(screenshot).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const page = createMockPage();

      await fusion.captureFusedState(page);
      expect(fusion.getLastState()).toBeDefined();

      fusion.reset();

      expect(fusion.getLastState()).toBeUndefined();
      expect(fusion.getLastScreenshot()).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const stats = fusion.getStats();

      expect(stats).toBeDefined();
      expect(stats.hasScreenshot).toBeDefined();
      expect(stats.hasState).toBeDefined();
      expect(typeof stats.refIdCount).toBe('number');
    });

    it('should update stats after capture', async () => {
      const page = createMockPage();

      await fusion.captureFusedState(page, {
        includeScreenshot: true
      });

      const stats = fusion.getStats();

      expect(stats.hasState).toBe(true);
      expect(stats.hasScreenshot).toBe(true);
    });
  });

  describe('Screenshot Quality Options', () => {
    it('should respect screenshot quality option', async () => {
      const page = createMockPage();

      const highQuality = await fusion.captureFusedState(page, {
        screenshotQuality: 'high'
      });

      const lowQuality = await fusion.captureFusedState(page, {
        screenshotQuality: 'low'
      });

      expect(highQuality.screenshot).toBeDefined();
      expect(lowQuality.screenshot).toBeDefined();
    });
  });
});
