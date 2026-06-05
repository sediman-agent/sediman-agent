/**
 * Service manager and exports
 */

export type { AgentService, AgentStatus, StreamCallbacks } from './AgentService';
export type { SkillsService, CreateSkillInput, Skill, HubSkill } from './SkillsService';
export type { MemoryService, MemoryData, MemoryEntry } from './MemoryService';
export type { SandboxService } from './SandboxService';
export type { SandboxSession, SandboxStatus, InputEvent, StreamCallback as SandboxStreamCallback } from '@/types/sandbox';

export { createAgentService } from './AgentService';
export { createSkillsService } from './SkillsService';
export { createMemoryService } from './MemoryService';
export { createSandboxService } from './SandboxService';

import type { RPCClient } from './rpcClient';
import type { AgentService } from './AgentService';
import type { SkillsService } from './SkillsService';
import type { MemoryService } from './MemoryService';
import type { SandboxService } from './SandboxService';
import { createAgentService } from './AgentService';
import { createSkillsService } from './SkillsService';
import { createMemoryService } from './MemoryService';
import { createSandboxService } from './SandboxService';

/**
 * Service container
 * Provides access to all application services
 */
export class ServiceContainer {
  private _agent?: AgentService;
  private _skills?: SkillsService;
  private _memory?: MemoryService;
  private _sandbox?: SandboxService;

  constructor(private rpc: RPCClient) {}

  get agent(): AgentService {
    if (!this._agent) {
      this._agent = createAgentService(this.rpc);
    }
    return this._agent;
  }

  get skills(): SkillsService {
    if (!this._skills) {
      this._skills = createSkillsService(this.rpc);
    }
    return this._skills;
  }

  get memory(): MemoryService {
    if (!this._memory) {
      this._memory = createMemoryService(this.rpc);
    }
    return this._memory;
  }

  get sandbox(): SandboxService {
    if (!this._sandbox) {
      this._sandbox = createSandboxService();
    }
    return this._sandbox;
  }

  /**
   * Reset all service instances
   */
  reset(): void {
    this._agent = undefined;
    this._skills = undefined;
    this._memory = undefined;
    this._sandbox = undefined;
  }
}

/**
 * Create a service container
 */
export function createServiceContainer(rpc: RPCClient): ServiceContainer {
  return new ServiceContainer(rpc);
}
