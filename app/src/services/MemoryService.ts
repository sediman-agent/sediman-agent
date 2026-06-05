/**
 * Memory service interface and implementation
 */

import { z } from 'zod';
import type { RPCClient } from '@/services/rpcClient';
import {
  RPCError,
  ValidationError,
  isAppError,
} from '@/errors';

// ============================================================================
// Schemas
// ============================================================================

export const MemoryEntrySchema = z.object({
  content: z.string(),
  created_at: z.string().nullable(),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const MemoryDataSchema = z.object({
  entries: z.object({
    memory: z.array(MemoryEntrySchema),
    user: z.array(MemoryEntrySchema),
  }),
  memory: z.string(),
  user: z.string(),
  memory_entries: z.number(),
  user_entries: z.number(),
});

export type MemoryData = z.infer<typeof MemoryDataSchema>;

export const MemorySearchResultSchema = z.object({
  results: z.array(z.any()),
});

export type MemorySearchResult = z.infer<typeof MemorySearchResultSchema>;

// ============================================================================
// Service Interface
// ============================================================================

export interface MemoryService {
  /**
   * Get all memory entries
   */
  get(): Promise<MemoryData>;

  /**
   * Add a memory entry
   */
  add(target: 'memory' | 'user', content: string): Promise<{ success: boolean; message: string }>;

  /**
   * Replace a memory entry
   */
  replace(target: 'memory' | 'user', oldEntry: string, newEntry: string): Promise<{ success: boolean; message: string }>;

  /**
   * Remove a memory entry
   */
  remove(target: 'memory' | 'user', entry: string): Promise<{ success: boolean; message: string }>;

  /**
   * Search memory
   */
  search(query: string, limit?: number): Promise<MemorySearchResult>;

  /**
   * Get memory changelog
   */
  changelog(target?: string, limit?: number): Promise<{ changes: any[] }>;

  /**
   * Switch memory system
   */
  switchSystem(system: 'file' | 'hy'): Promise<{ success: boolean; message: string; current_system: string }>;

  /**
   * Get current memory system
   */
  getSystem(): Promise<{ success: boolean; system: string }>;

  /**
   * Get memory statistics
   */
  getStats(): Promise<{ success: boolean; system: string; stats: any }>;
}

// ============================================================================
// Implementation
// ============================================================================

class RPCMemoryService implements MemoryService {
  constructor(private rpc: RPCClient) {}

  async get(): Promise<MemoryData> {
    try {
      const response = await this.rpc.call<any>('memory.get', {});
      const validated = MemoryDataSchema.safeParse(response);

      if (!validated.success) {
        throw new RPCError('Invalid memory data response');
      }

      return validated.data;
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to get memory');
    }
  }

  async add(target: 'memory' | 'user', content: string): Promise<{ success: boolean; message: string }> {
    if (!content || content.trim().length === 0) {
      throw new ValidationError('Memory content cannot be empty');
    }

    try {
      return await this.rpc.call<{ success: boolean; message: string }>('memory.add', {
        target,
        content,
      });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to add memory');
    }
  }

  async replace(target: 'memory' | 'user', oldEntry: string, newEntry: string): Promise<{ success: boolean; message: string }> {
    if (!oldEntry || oldEntry.trim().length === 0) {
      throw new ValidationError('Old entry cannot be empty');
    }
    if (!newEntry || newEntry.trim().length === 0) {
      throw new ValidationError('New entry cannot be empty');
    }

    try {
      return await this.rpc.call<{ success: boolean; message: string }>('memory.replace', {
        target,
        old_entry: oldEntry,
        new_entry: newEntry,
      });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to replace memory');
    }
  }

  async remove(target: 'memory' | 'user', entry: string): Promise<{ success: boolean; message: string }> {
    if (!entry || entry.trim().length === 0) {
      throw new ValidationError('Entry cannot be empty');
    }

    try {
      return await this.rpc.call<{ success: boolean; message: string }>('memory.remove', {
        target,
        entry,
      });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to remove memory');
    }
  }

  async search(query: string, limit = 5): Promise<MemorySearchResult> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty');
    }

    try {
      return await this.rpc.call<MemorySearchResult>('memory.search', {
        query,
        limit,
      });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to search memory');
    }
  }

  async changelog(target?: string, limit = 20): Promise<{ changes: any[] }> {
    try {
      return await this.rpc.call<{ changes: any[] }>('memory.changelog', {
        target: target || null,
        limit,
      });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to get memory changelog');
    }
  }

  async switchSystem(system: 'file' | 'hy'): Promise<{ success: boolean; message: string; current_system: string }> {
    try {
      return await this.rpc.call<any>('memory.switch_system', { system });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to switch memory system');
    }
  }

  async getSystem(): Promise<{ success: boolean; system: string }> {
    try {
      return await this.rpc.call<any>('memory.get_system', {});
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to get memory system');
    }
  }

  async getStats(): Promise<{ success: boolean; system: string; stats: any }> {
    try {
      return await this.rpc.call<any>('memory.get_stats', {});
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to get memory stats');
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createMemoryService(rpc: RPCClient): MemoryService {
  return new RPCMemoryService(rpc);
}
