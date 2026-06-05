/**
 * Skills service interface and implementation
 */

import { z } from 'zod';
import type { RPCClient } from '@/services/rpcClient';
import {
  RPCError,
  RPCResponseError,
  ValidationError,
  isAppError,
} from '@/errors';

// ============================================================================
// Schemas
// ============================================================================

export const SkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  version: z.number(),
});

export type Skill = z.infer<typeof SkillSchema>;

export const HubSkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  author: z.string().nullable(),
  version: z.string(),
  trust: z.string(),
});

export type HubSkill = z.infer<typeof HubSkillSchema>;

export const SkillResultSchema = z.object({
  result: z.string(),
});

// ============================================================================
// Service Interface
// ============================================================================

export interface SkillsService {
  /**
   * List all installed skills
   */
  list(): Promise<Skill[]>;

  /**
   * Browse skills from the hub
   */
  browse(category?: string): Promise<HubSkill[]>;

  /**
   * Search for skills in the hub
   */
  search(query: string): Promise<HubSkill[]>;

  /**
   * Get skill details
   */
  get(name: string): Promise<Skill>;

  /**
   * Install a skill from the hub
   */
  install(name: string, force?: boolean): Promise<{ installed: string; message: string }>;

  /**
   * Uninstall a skill
   */
  remove(name: string): Promise<{ removed: string }>;

  /**
   * Run a skill
   */
  run(name: string): Promise<{ result: string }>;

  /**
   * Create a new skill
   */
  create(skill: CreateSkillInput): Promise<Skill>;

  /**
   * Delete a skill
   */
  delete(name: string): Promise<{ deleted: string }>;
}

export interface CreateSkillInput {
  name: string;
  description: string;
  steps: unknown[];
  category?: string;
  when_to_use?: string;
  pitfalls?: string[];
  verification?: string;
}

// ============================================================================
// Implementation
// ============================================================================

class RPCSkillsService implements SkillsService {
  constructor(private rpc: RPCClient) {}

  async list(): Promise<Skill[]> {
    try {
      const response = await this.rpc.call<any[]>('skills.list', {});

      // Validate each skill
      const skills: Skill[] = [];
      for (const skill of response) {
        const validated = SkillSchema.safeParse(skill);
        if (validated.success) {
          skills.push(validated.data);
        }
      }

      return skills;
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to list skills');
    }
  }

  async browse(category?: string): Promise<HubSkill[]> {
    try {
      const response = await this.rpc.call<any[]>('hub.browse', {
        category: category || null,
      });

      // Validate each skill
      const skills: HubSkill[] = [];
      for (const skill of response) {
        const validated = HubSkillSchema.safeParse(skill);
        if (validated.success) {
          skills.push(validated.data);
        }
      }

      return skills;
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to browse skills');
    }
  }

  async search(query: string): Promise<HubSkill[]> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty');
    }

    try {
      const response = await this.rpc.call<any[]>('hub.search', { query });

      const skills: HubSkill[] = [];
      for (const skill of response) {
        const validated = HubSkillSchema.safeParse(skill);
        if (validated.success) {
          skills.push(validated.data);
        }
      }

      return skills;
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to search skills');
    }
  }

  async get(name: string): Promise<Skill> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Skill name cannot be empty');
    }

    try {
      const response = await this.rpc.call<any>('skills.get', { name });
      const validated = SkillSchema.safeParse(response);

      if (!validated.success) {
        throw new RPCResponseError('skills.get', response);
      }

      return validated.data;
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to get skill');
    }
  }

  async install(name: string, force = false): Promise<{ installed: string; message: string }> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Skill name cannot be empty');
    }

    try {
      return await this.rpc.call<{ installed: string; message: string }>('hub.install', {
        name,
        force,
      });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to install skill');
    }
  }

  async remove(name: string): Promise<{ removed: string }> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Skill name cannot be empty');
    }

    try {
      return await this.rpc.call<{ removed: string }>('hub.remove', { name });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to remove skill');
    }
  }

  async run(name: string): Promise<{ result: string }> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Skill name cannot be empty');
    }

    try {
      const response = await this.rpc.call<any>('skills.run', { name });
      const validated = SkillResultSchema.safeParse(response);

      if (!validated.success) {
        throw new RPCResponseError('skills.run', response);
      }

      return validated.data;
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to run skill');
    }
  }

  async create(skill: CreateSkillInput): Promise<Skill> {
    try {
      const response = await this.rpc.call<any>('skills.create', skill);
      const validated = SkillSchema.safeParse(response);

      if (!validated.success) {
        throw new RPCResponseError('skills.create', response);
      }

      return validated.data;
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to create skill');
    }
  }

  async delete(name: string): Promise<{ deleted: string }> {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Skill name cannot be empty');
    }

    try {
      return await this.rpc.call<{ deleted: string }>('skills.delete', { name });
    } catch (error) {
      if (isAppError(error)) throw error;
      throw new RPCError('Failed to delete skill');
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSkillsService(rpc: RPCClient): SkillsService {
  return new RPCSkillsService(rpc);
}
