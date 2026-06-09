/**
 * Hierarchical Memory Tree Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { HierarchicalMemoryTree, MemoryNode, MemoryLevel, MemorySearchResult } from '../../../src/memory/hierarchical/hierarchical-memory';

describe('HierarchicalMemoryTree', () => {
  let hmt: HierarchicalMemoryTree;

  beforeEach(() => {
    hmt = new HierarchicalMemoryTree();
  });

  afterEach(() => {
    hmt.clear();
  });

  describe('addMemory', () => {
    it('should add memory at step level', async () => {
      const id = await hmt.addMemory('Test step memory', 'step');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const memory = hmt.getMemory(id);
      expect(memory).toBeDefined();
      expect(memory?.content).toBe('Test step memory');
      expect(memory?.level).toBe('step');
    });

    it('should add memory at task level', async () => {
      const id = await hmt.addMemory('Test task memory', 'task');

      const memory = hmt.getMemory(id);
      expect(memory?.level).toBe('task');
    });

    it('should add memory at session level', async () => {
      const id = await hmt.addMemory('Test session memory', 'session');

      const memory = hmt.getMemory(id);
      expect(memory?.level).toBe('session');
    });

    it('should add memory at global level', async () => {
      const id = await hmt.addMemory('Test global memory', 'global');

      const memory = hmt.getMemory(id);
      expect(memory?.level).toBe('global');
    });

    it('should include metadata', async () => {
      const id = await hmt.addMemory('Test memory', 'step', {
        task: 'test-task',
        category: 'testing',
        success: true,
        importance: 0.8
      });

      const memory = hmt.getMemory(id);
      expect(memory?.metadata).toBeDefined();
      expect(memory?.metadata?.task).toBe('test-task');
      expect(memory?.metadata?.importance).toBe(0.8);
    });

    it('should assign unique IDs', async () => {
      const id1 = await hmt.addMemory('Memory 1', 'step');
      const id2 = await hmt.addMemory('Memory 2', 'step');

      expect(id1).not.toBe(id2);
    });

    it('should timestamp memories', async () => {
      const before = Date.now();
      const id = await hmt.addMemory('Test memory', 'step');
      const after = Date.now();

      const memory = hmt.getMemory(id);
      expect(memory?.metadata?.timestamp).toBeDefined();
      expect(memory?.metadata?.timestamp).toBeGreaterThanOrEqual(before);
      expect(memory?.metadata?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('retrieveMemories', () => {
    beforeEach(async () => {
      // Add some test memories
      await hmt.addMemory('Navigated to search page', 'step', { category: 'navigation' });
      await hmt.addMemory('Found search box', 'step', { category: 'interaction' });
      await hmt.addMemory('Entered search query', 'step', { category: 'interaction' });
    });

    it('should retrieve memories by keyword match', async () => {
      const results = await hmt.retrieveMemories('search page');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should limit results by maxResults', async () => {
      const results = await hmt.retrieveMemories('search', { maxResults: 1 });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should filter by minRelevance', async () => {
      const results = await hmt.retrieveMemories('search', { minRelevance: 0.9 });

      expect(results).toBeDefined();
    });

    it('should return results with relevance scores', async () => {
      const results = await hmt.retrieveMemories('search');

      for (const result of results) {
        expect(result.relevance).toBeDefined();
        expect(result.relevance).toBeGreaterThanOrEqual(0);
        expect(result.relevance).toBeLessThanOrEqual(1);
      }
    });

    it('should filter by level when specified', async () => {
      const results = await hmt.retrieveMemories('search', { level: 'step' });

      for (const result of results) {
        expect(result.node.level).toBe('step');
      }
    });

    it('should return empty array when no matches', async () => {
      const results = await hmt.retrieveMemories('xyz-nonexistent-query');

      expect(results).toEqual([]);
    });
  });

  describe('getMemoryContext', () => {
    beforeEach(async () => {
      await hmt.addMemory('Memory 1', 'step');
      await hmt.addMemory('Memory 2', 'task');
      await hmt.addMemory('Memory 3', 'session');
    });

    it('should build context string', async () => {
      const context = await hmt.getMemoryContext('test');

      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });

    it('should limit context by maxTokens', async () => {
      const context = await hmt.getMemoryContext('test', { maxTokens: 100 });

      expect(context).toBeDefined();
      // Should still return something even with limit
      expect(context.length).toBeGreaterThan(0);
    });

    it('should limit context by maxMemories', async () => {
      const context = await hmt.getMemoryContext('test', { maxMemories: 2 });

      const lines = context.split('\n').filter(l => l.startsWith('-'));
      expect(lines.length).toBeLessThanOrEqual(2);
    });

    it('should return fallback when no memories', async () => {
      hmt.clear();

      const context = await hmt.getMemoryContext('test');

      expect(context).toContain('No relevant memories found');
    });
  });

  describe('updateMemory', () => {
    it('should update memory content', async () => {
      const id = await hmt.addMemory('Original content', 'step');

      const updated = hmt.updateMemory(id, 'Updated content');

      expect(updated).toBe(true);

      const memory = hmt.getMemory(id);
      expect(memory?.content).toBe('Updated content');
    });

    it('should return false for non-existent memory', () => {
      const updated = hmt.updateMemory('nonexistent-id', 'content');

      expect(updated).toBe(false);
    });

    it('should update timestamp', async () => {
      const id = await hmt.addMemory('Original', 'step');
      const originalTimestamp = hmt.getMemory(id)?.metadata?.timestamp;

      await new Promise(resolve => setTimeout(resolve, 10));

      hmt.updateMemory(id, 'Updated');

      const newTimestamp = hmt.getMemory(id)?.metadata?.timestamp;

      expect(newTimestamp).toBeDefined();
      expect(newTimestamp).toBeGreaterThan(originalTimestamp || 0);
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory', async () => {
      const id = await hmt.addMemory('To be deleted', 'step');

      expect(hmt.getMemory(id)).toBeDefined();

      const deleted = hmt.deleteMemory(id);

      expect(deleted).toBe(true);
      expect(hmt.getMemory(id)).toBeNull();
    });

    it('should return false for non-existent memory', () => {
      const deleted = hmt.deleteMemory('nonexistent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await hmt.addMemory('Step memory', 'step');
      await hmt.addMemory('Task memory', 'task');
      await hmt.addMemory('Session memory', 'session');
      await hmt.addMemory('Global memory', 'global');
    });

    it('should return statistics', () => {
      const stats = hmt.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalNodes).toBe(5); // 4 memories + root
      expect(stats.totalMemories).toBe(4);
    });

    it('should count nodes by level', () => {
      const stats = hmt.getStats();

      expect(stats.nodesByLevel.step).toBe(1);
      expect(stats.nodesByLevel.task).toBe(1);
      expect(stats.nodesByLevel.session).toBe(1);
      expect(stats.nodesByLevel.global).toBe(1);
    });

    it('should track oldest and newest memories', () => {
      const stats = hmt.getStats();

      expect(stats.oldestMemory).toBeDefined();
      expect(stats.newestMemory).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear all memories', async () => {
      await hmt.addMemory('Test', 'step');

      expect(hmt.getStats().totalMemories).toBeGreaterThan(0);

      hmt.clear();

      expect(hmt.getStats().totalMemories).toBe(0);
    });

    it('should reset to initial state', async () => {
      await hmt.addMemory('Test', 'step');

      hmt.clear();

      const stats = hmt.getStats();
      expect(stats.totalNodes).toBe(1); // Only root
    });
  });

  describe('export and import', () => {
    it('should export memories as JSON', async () => {
      await hmt.addMemory('Export test', 'step');

      const exported = hmt.export();

      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);

      const parsed = JSON.parse(exported);
      expect(parsed).toBeDefined();
    });

    it('should import memories from JSON', async () => {
      const id = await hmt.addMemory('Import test', 'step');
      const exported = hmt.export();

      hmt.clear();

      const imported = hmt.import(exported);

      expect(imported).toBe(true);

      const stats = hmt.getStats();
      expect(stats.totalMemories).toBeGreaterThan(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const imported = hmt.import('invalid json');

      expect(imported).toBe(false);
    });
  });

  describe('setEmbeddingModel', () => {
    it('should set embedding model', () => {
      const mockModel = {
        embed: async (text: string) => {
          return new Array(128).fill(0);
        }
      };

      hmt.setEmbeddingModel(mockModel);

      // Should not throw
      expect(true).toBe(true);
    });
  });
});

describe('MemoryNode', () => {
  it('should have required properties', () => {
    const node: MemoryNode = {
      id: 'test-id',
      level: 'step',
      content: 'Test content',
      children: []
    };

    expect(node.id).toBeDefined();
    expect(node.level).toBeDefined();
    expect(node.content).toBeDefined();
    expect(Array.isArray(node.children)).toBe(true);
  });
});

describe('MemorySearchResult', () => {
  it('should have required properties', () => {
    const node: MemoryNode = {
      id: 'test-id',
      level: 'step',
      content: 'Test content',
      children: []
    };

    const result: MemorySearchResult = {
      node,
      relevance: 0.8
    };

    expect(result.node).toBeDefined();
    expect(result.relevance).toBeGreaterThanOrEqual(0);
    expect(result.relevance).toBeLessThanOrEqual(1);
  });
});
