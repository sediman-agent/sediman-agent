import { ServiceContainer, createServiceContainer } from '@/services/index';
import { LocalAgentService } from '@/services/LocalAgentService';
import { LocalSkillsService } from '@/services/LocalSkillsService';
import { LocalMemoryService } from '@/services/LocalMemoryService';
import type { LocalServerDeps } from '@/services/LocalAgentService';

jest.mock('@/services/AgentService', () => ({
  createAgentService: jest.fn(() => ({ _type: 'rpc-agent' })),
}));
jest.mock('@/services/SkillsService', () => ({
  createSkillsService: jest.fn(() => ({ _type: 'rpc-skills' })),
}));
jest.mock('@/services/MemoryService', () => ({
  createMemoryService: jest.fn(() => ({ _type: 'rpc-memory' })),
}));
jest.mock('@/services/SandboxService', () => ({
  createSandboxService: jest.fn(() => ({ _type: 'sandbox' })),
}));

import { createAgentService } from '@/services/AgentService';
import { createSkillsService } from '@/services/SkillsService';
import { createMemoryService } from '@/services/MemoryService';
import { createSandboxService } from '@/services/SandboxService';

const mockedCreateAgentService = createAgentService as jest.Mock;
const mockedCreateSkillsService = createSkillsService as jest.Mock;
const mockedCreateMemoryService = createMemoryService as jest.Mock;
const mockedCreateSandboxService = createSandboxService as jest.Mock;

function createMockDeps(overrides: Partial<LocalServerDeps> = {}): LocalServerDeps {
  return {
    agentLoop: { run: jest.fn(), cancel: jest.fn() },
    skillEngine: {},
    memory: {},
    hubClient: {},
    gitHubInstaller: {},
    skillSearch: {},
    cronManager: {},
    changelog: {},
    checkpointManager: {},
    browserSession: {},
    browserController: {},
    llmProvider: {},
    headless: false,
    sandboxMode: 'off',
    tasksCompleted: 0,
    terminalAllowed: false,
    activeRecording: null,
    ...overrides,
  };
}

function createMockRPCClient() {
  return {
    call: jest.fn(),
    stream: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(),
  };
}

describe('ServiceContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor with LocalServerDeps', () => {
    let container: ServiceContainer;
    let deps: LocalServerDeps;

    beforeEach(() => {
      deps = createMockDeps();
      container = new ServiceContainer(deps);
    });

    it('agent getter returns a LocalAgentService instance', () => {
      const agent = container.agent;
      expect(agent).toBeInstanceOf(LocalAgentService);
    });

    it('skills getter returns a LocalSkillsService instance', () => {
      const skills = container.skills;
      expect(skills).toBeInstanceOf(LocalSkillsService);
    });

    it('memory getter returns a LocalMemoryService instance', () => {
      const memory = container.memory;
      expect(memory).toBeInstanceOf(LocalMemoryService);
    });

    it('agent passes localDeps to LocalAgentService', () => {
      container.agent;
      expect(mockedCreateAgentService).not.toHaveBeenCalled();
    });

    it('skills passes localDeps to LocalSkillsService', () => {
      container.skills;
      expect(mockedCreateSkillsService).not.toHaveBeenCalled();
    });

    it('memory passes localDeps.memory to LocalMemoryService', () => {
      container.memory;
      expect(mockedCreateMemoryService).not.toHaveBeenCalled();
    });
  });

  describe('constructor with RPCClient', () => {
    let container: ServiceContainer;
    let rpc: ReturnType<typeof createMockRPCClient>;

    beforeEach(() => {
      rpc = createMockRPCClient();
      container = new ServiceContainer(rpc as any);
    });

    it('agent getter returns RPC-based service (not LocalAgentService)', () => {
      const agent = container.agent;
      expect(agent).not.toBeInstanceOf(LocalAgentService);
      expect(agent).toEqual({ _type: 'rpc-agent' });
    });

    it('agent calls createAgentService without arguments', () => {
      container.agent;
      expect(mockedCreateAgentService).toHaveBeenCalledWith();
    });

    it('skills getter returns RPC-based service (not LocalSkillsService)', () => {
      const skills = container.skills;
      expect(skills).not.toBeInstanceOf(LocalSkillsService);
      expect(skills).toEqual({ _type: 'rpc-skills' });
    });

    it('skills calls createSkillsService without arguments', () => {
      container.skills;
      expect(mockedCreateSkillsService).toHaveBeenCalledWith();
    });

    it('memory getter returns RPC-based service (not LocalMemoryService)', () => {
      const memory = container.memory;
      expect(memory).not.toBeInstanceOf(LocalMemoryService);
      expect(memory).toEqual({ _type: 'rpc-memory' });
    });

    it('memory calls createMemoryService without arguments', () => {
      container.memory;
      expect(mockedCreateMemoryService).toHaveBeenCalledWith();
    });
  });

  describe('lazy initialization (caching)', () => {
    let container: ServiceContainer;
    let deps: LocalServerDeps;

    beforeEach(() => {
      deps = createMockDeps();
      container = new ServiceContainer(deps);
    });

    it('accessing agent twice returns the same instance', () => {
      const first = container.agent;
      const second = container.agent;
      expect(first).toBe(second);
    });

    it('accessing skills twice returns the same instance', () => {
      const first = container.skills;
      const second = container.skills;
      expect(first).toBe(second);
    });

    it('accessing memory twice returns the same instance', () => {
      const first = container.memory;
      const second = container.memory;
      expect(first).toBe(second);
    });

    it('accessing sandbox twice returns the same instance', () => {
      const first = container.sandbox;
      const second = container.sandbox;
      expect(first).toBe(second);
    });

    it('createSandboxService is only called once for repeated access', () => {
      container.sandbox;
      container.sandbox;
      container.sandbox;
      expect(mockedCreateSandboxService).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset()', () => {
    let container: ServiceContainer;
    let deps: LocalServerDeps;

    beforeEach(() => {
      deps = createMockDeps();
      container = new ServiceContainer(deps);
    });

    it('clears cached agent, next access creates a new instance', () => {
      const first = container.agent;
      container.reset();
      const second = container.agent;
      expect(first).not.toBe(second);
      expect(second).toBeInstanceOf(LocalAgentService);
    });

    it('clears cached skills, next access creates a new instance', () => {
      const first = container.skills;
      container.reset();
      const second = container.skills;
      expect(first).not.toBe(second);
      expect(second).toBeInstanceOf(LocalSkillsService);
    });

    it('clears cached memory, next access creates a new instance', () => {
      const first = container.memory;
      container.reset();
      const second = container.memory;
      expect(first).not.toBe(second);
      expect(second).toBeInstanceOf(LocalMemoryService);
    });

    it('clears cached sandbox, next access calls createSandboxService again', () => {
      container.sandbox;
      expect(mockedCreateSandboxService).toHaveBeenCalledTimes(1);
      container.reset();
      container.sandbox;
      expect(mockedCreateSandboxService).toHaveBeenCalledTimes(2);
    });

    it('reset followed by access returns valid services for all getters', () => {
      container.agent;
      container.skills;
      container.memory;
      container.sandbox;

      container.reset();

      expect(() => container.agent).not.toThrow();
      expect(() => container.skills).not.toThrow();
      expect(() => container.memory).not.toThrow();
      expect(() => container.sandbox).not.toThrow();
    });
  });

  describe('sandbox', () => {
    it('uses createSandboxService in local mode', () => {
      const deps = createMockDeps();
      const container = new ServiceContainer(deps);
      const sandbox = container.sandbox;

      expect(mockedCreateSandboxService).toHaveBeenCalledTimes(1);
      expect(sandbox).toEqual({ _type: 'sandbox' });
    });

    it('uses createSandboxService in RPC mode', () => {
      const rpc = createMockRPCClient();
      const container = new ServiceContainer(rpc as any);
      const sandbox = container.sandbox;

      expect(mockedCreateSandboxService).toHaveBeenCalledTimes(1);
      expect(sandbox).toEqual({ _type: 'sandbox' });
    });

    it('calls createSandboxService without arguments', () => {
      const rpc = createMockRPCClient();
      const container = new ServiceContainer(rpc as any);
      container.sandbox;

      expect(mockedCreateSandboxService).toHaveBeenCalledWith();
    });
  });

  describe('createServiceContainer() factory', () => {
    it('returns a ServiceContainer instance', () => {
      const deps = createMockDeps();
      const container = createServiceContainer(deps);
      expect(container).toBeInstanceOf(ServiceContainer);
    });

    it('creates a working container with LocalServerDeps', () => {
      const deps = createMockDeps();
      const container = createServiceContainer(deps);
      expect(container.agent).toBeInstanceOf(LocalAgentService);
    });

    it('creates a working container with RPCClient', () => {
      const rpc = createMockRPCClient();
      const container = createServiceContainer(rpc as any);
      expect(container.agent).toEqual({ _type: 'rpc-agent' });
    });
  });
});
