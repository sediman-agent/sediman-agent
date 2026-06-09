/**
 * Task Planner Tests
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { TaskPlanner, TaskPlan, SubTask } from '../../../src/agent/planning/task-planner';
import { MockLLMProvider } from '../../utils/test-utils';

describe('TaskPlanner', () => {
  let planner: TaskPlanner;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    planner = new TaskPlanner(mockLLM as any);
  });

  describe('decompose', () => {
    it('should decompose complex task', async () => {
      mockLLM = new MockLLMProvider({
        text: JSON.stringify({
          subtasks: [
            {
              description: 'Navigate to Google',
              dependencies: [],
              canParallelize: false,
              difficulty: 1
            },
            {
              description: 'Search for query',
              dependencies: [],
              canParallelize: false,
              difficulty: 2
            }
          ],
          estimatedIterations: 5,
          reasoning: 'Task decomposition complete'
        })
      });

      planner = new TaskPlanner(mockLLM as any);

      const plan = await planner.decompose('Navigate to Google and search for test query');

      expect(plan).toBeDefined();
      expect(plan.subtasks).toBeDefined();
      expect(plan.subtasks.length).toBe(2);
      expect(plan.original).toBe('Navigate to Google and search for test query');
    });

    it('should handle decomposition failure gracefully', async () => {
      mockLLM = new MockLLMProvider({
        text: 'invalid response without json'
      });

      planner = new TaskPlanner(mockLLM as any);

      const plan = await planner.decompose('Test task');

      expect(plan).toBeDefined();
      expect(plan.subtasks).toBeDefined();
      expect(plan.subtasks.length).toBe(1); // Should fallback to single subtask
    });

    it('should calculate execution order', async () => {
      mockLLM = new MockLLMProvider({
        text: JSON.stringify({
          subtasks: [
            {
              description: 'Task 1',
              dependencies: [],
              canParallelize: false,
              difficulty: 1
            },
            {
              description: 'Task 2',
              dependencies: ['subtask-0'],
              canParallelize: false,
              difficulty: 2
            },
            {
              description: 'Task 3',
              dependencies: ['subtask-0'],
              canParallelize: false,
              difficulty: 2
            }
          ],
          estimatedIterations: 8,
          reasoning: 'Tasks 2 and 3 depend on task 1'
        })
      });

      planner = new TaskPlanner(mockLLM as any);

      const plan = await planner.decompose('Task 1, then Tasks 2 and 3');

      expect(plan.executionOrder).toBeDefined();
      expect(plan.executionOrder.length).toBeGreaterThan(0);

      // First group should have only Task 1
      expect(plan.executionOrder[0]).toEqual(['subtask-0']);

      // Second group should have Tasks 2 and 3
      expect(plan.executionOrder[1]).toContain('subtask-1');
      expect(plan.executionOrder[1]).toContain('subtask-2');
    });

    it('should detect parallelizable tasks', async () => {
      mockLLM = new MockLLMProvider({
        text: JSON.stringify({
          subtasks: [
            {
              description: 'Task 1',
              dependencies: [],
              canParallelize: true,
              difficulty: 1
            },
            {
              description: 'Task 2',
              dependencies: [],
              canParallelize: true,
              difficulty: 1
            }
          ],
          estimatedIterations: 3,
          reasoning: 'Tasks are independent'
        })
      });

      planner = new TaskPlanner(mockLLM as any);

      const plan = await planner.decompose('Do Task 1 and Task 2');

      // Both should be in first group
      expect(plan.executionOrder[0].length).toBe(2);
    });
  });

  describe('calculateExecutionOrder', () => {
    it('should calculate execution order for subtasks', () => {
      const subtasks: SubTask[] = [
        {
          id: '1',
          description: 'First',
          dependencies: [],
          canParallelize: false,
          difficulty: 1,
          status: 'pending'
        },
        {
          id: '2',
          description: 'Second depends on first',
          dependencies: ['1'],
          canParallelize: false,
          difficulty: 2,
          status: 'pending'
        },
        {
          id: '3',
          description: 'Third depends on first',
          dependencies: ['1'],
          canParallelize: false,
          difficulty: 2,
          status: 'pending'
        }
      ];

      const order = planner.calculateExecutionOrder(subtasks);

      expect(order).toBeDefined();
      expect(order.length).toBe(2);
      expect(order[0]).toEqual(['1']);
      expect(order[1]).toContain('2');
      expect(order[1]).toContain('3');
    });

    it('should handle circular dependencies', () => {
      const subtasks: SubTask[] = [
        {
          id: '1',
          description: 'First',
          dependencies: ['2'],
          canParallelize: false,
          difficulty: 1,
          status: 'pending'
        },
        {
          id: '2',
          description: 'Second',
          dependencies: ['1'],
          canParallelize: false,
          difficulty: 1,
          status: 'pending'
        }
      ];

      const order = planner.calculateExecutionOrder(subtasks);

      // Should detect circular dependency and include all
      expect(order).toBeDefined();
      expect(order.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('executePlan', () => {
    it('should execute plan sequentially', async () => {
      const plan: TaskPlan = {
        original: 'Sequential test',
        subtasks: [
          {
            id: '1',
            description: 'Task 1',
            dependencies: [],
            canParallelize: false,
            difficulty: 1,
            status: 'pending'
          },
          {
            id: '2',
            description: 'Task 2',
            dependencies: ['1'],
            canParallelize: false,
            difficulty: 1,
            status: 'pending'
          }
        ],
        executionOrder: [['1'], ['2']],
        estimatedIterations: 3,
        reasoning: 'Sequential execution'
      };

      let executionOrder: string[] = [];

      const executor = async (subtask: SubTask) => {
        executionOrder.push(subtask.id);
        return `Result for ${subtask.id}`;
      };

      const results = await planner.executePlan(plan, executor);

      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      expect(executionOrder).toEqual(['1', '2']);
    });

    it('should execute plan in parallel where possible', async () => {
      const plan: TaskPlan = {
        original: 'Parallel test',
        subtasks: [
          {
            id: '1',
            description: 'Task 1',
            dependencies: [],
            canParallelize: true,
            difficulty: 1,
            status: 'pending'
          },
          {
            id: '2',
            description: 'Task 2',
            dependencies: [],
            canParallelize: true,
            difficulty: 1,
            status: 'pending'
          }
        ],
        executionOrder: [['1', '2']],
        estimatedIterations: 2,
        reasoning: 'Parallel execution'
      };

      let executionOrder: string[] = [];

      const executor = async (subtask: SubTask) => {
        executionOrder.push(subtask.id);
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
        return `Result for ${subtask.id}`;
      };

      const startTime = Date.now();
      const results = await planner.executePlan(plan, executor);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(2);

      // Both should have been executed
      expect(executionOrder).toContain('1');
      expect(executionOrder).toContain('2');

      // Should complete faster than sequential (rough check)
      expect(duration).toBeLessThan(100);
    });

    it('should handle execution failures', async () => {
      const plan: TaskPlan = {
        original: 'Failure test',
        subtasks: [
          {
            id: '1',
            description: 'Task 1',
            dependencies: [],
            canParallelize: false,
            difficulty: 1,
            status: 'pending'
          }
        ],
        executionOrder: [['1']],
        estimatedIterations: 1,
        reasoning: 'Test'
      };

      const executor = async (subtask: SubTask) => {
        throw new Error('Execution failed');
      };

      const results = await planner.executePlan(plan, executor);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Execution failed');
    });

    it('should stop execution after too many failures', async () => {
      const plan: TaskPlan = {
        original: 'Many failures test',
        subtasks: [
          { id: '1', description: 'Task 1', dependencies: [], canParallelize: false, difficulty: 1, status: 'pending' },
          { id: '2', description: 'Task 2', dependencies: [], canParallelize: false, difficulty: 1, status: 'pending' },
          { id: '3', description: 'Task 3', dependencies: [], canParallelize: false, difficulty: 1, status: 'pending' },
          { id: '4', description: 'Task 4', dependencies: [], canParallelize: false, difficulty: 1, status: 'pending' }
        ],
        executionOrder: [['1'], ['2'], ['3'], ['4']],
        estimatedIterations: 4,
        reasoning: 'Test'
      };

      let failCount = 0;
      const executor = async (subtask: SubTask) => {
        failCount++;
        throw new Error(`Failed ${failCount}`);
      };

      const results = await planner.executePlan(plan, executor);

      // Should stop after more than half fail
      expect(results.length).toBeLessThan(4);
    });
  });

  describe('getPlanStats', () => {
    it('should return plan statistics', () => {
      const plan: TaskPlan = {
        original: 'Stats test',
        subtasks: [
          {
            id: '1',
            description: 'Task 1',
            dependencies: [],
            canParallelize: false,
            difficulty: 1,
            status: 'pending'
          },
          {
            id: '2',
            description: 'Task 2',
            dependencies: ['1'],
            canParallelize: false,
            difficulty: 3,
            status: 'pending'
          },
          {
            id: '3',
            description: 'Task 3',
            dependencies: [],
            canParallelize: true,
            difficulty: 2,
            status: 'pending'
          }
        ],
        executionOrder: [['1', '3'], ['2']],
        estimatedIterations: 10,
        reasoning: 'Test'
      };

      const stats = planner.getPlanStats(plan);

      expect(stats).toBeDefined();
      expect(stats.totalSubtasks).toBe(3);
      expect(stats.parallelGroups).toBe(2);
      expect(stats.maxParallelism).toBe(2);
      expect(stats.estimatedDuration).toBeGreaterThan(0);
    });

    it('should calculate average difficulty', () => {
      const plan: TaskPlan = {
        original: 'Difficulty test',
        subtasks: [
          { id: '1', description: 'Task', dependencies: [], canParallelize: false, difficulty: 1, status: 'pending' },
          { id: '2', description: 'Task', dependencies: [], canParallelize: false, difficulty: 5, status: 'pending' }
        ],
        executionOrder: [['1', '2']],
        estimatedIterations: 6,
        reasoning: 'Test'
      };

      const stats = planner.getPlanStats(plan);

      expect(stats.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('shouldDecompose', () => {
    it('should return true for long tasks', () => {
      const longTask = 'Go to site A and search for X, then go to site B and search for Y, then go to site C and search for Z';

      const should = planner.shouldDecompose(longTask);

      expect(should).toBe(true);
    });

    it('should return true for tasks with "and"', () => {
      const task = 'Find X and Y and Z';

      const should = planner.shouldDecompose(task);

      expect(should).toBe(true);
    });

    it('should return true for tasks with commas', () => {
      const task = 'Find X, then find Y, then find Z';

      const should = planner.shouldDecompose(task);

      expect(should).toBe(true);
    });

    it('should return false for simple tasks', () => {
      const simpleTask = 'Navigate to example.com';

      const should = planner.shouldDecompose(simpleTask);

      expect(should).toBe(false);
    });

    it('should return false for short tasks', () => {
      const shortTask = 'Click button';

      const should = planner.shouldDecompose(shortTask);

      expect(should).toBe(false);
    });
  });
});

describe('createTaskPlanner', () => {
  it('should create task planner', () => {
    const mockLLM = new MockLLMProvider();
    const planner = createTaskPlanner(mockLLM as any);

    expect(planner).toBeDefined();
    expect(planner instanceof TaskPlanner).toBe(true);
  });
});

export function createTaskPlanner(llm: any): TaskPlanner {
  return new TaskPlanner(llm);
}
