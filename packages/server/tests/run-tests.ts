/**
 * Test Suite Entry Point
 *
 * This file runs all tests for the enhanced agent system
 */

import { describe } from 'bun:test';

// Import test files (Bun will auto-discover these, but this documents structure)
describe('Enhanced Agent System Tests', () => {
  // Tests will be auto-discovered from:
  // - browser/perception/*.test.ts
  // - agent/schemas/*.test.ts
  // - agent/execution/*.test.ts
  // - agent/planning/*.test.ts
  // - memory/hierarchical/*.test.ts
  // - llm/structured/*.test.ts
});

// Run all tests with:
// bun test packages/server/tests/
