#!/usr/bin/env bun
/**
 * Benchmark Execution Script
 *
 * Quick way to run all benchmarks with your configured model.
 *
 * Usage:
 *   bun scripts/run-benchmarks.ts                    # Run all benchmarks
 *   bun scripts/run-benchmarks.ts webbench            # Run specific category
 *   bun scripts/run-benchmarks.ts --runs 3             # Custom runs per test
 *   bun scripts/run-benchmarks.ts --model minimax-m3   # Custom model
 */

import { runBenchmarks } from '../tests/benchmarks/benchmark-runner';

// Parse command line arguments
const args = process.argv.slice(2);

const config: any = {
  runsPerTest: 2,
  model: 'minimax-m3'
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--runs' && args[i + 1]) {
    config.runsPerTest = parseInt(args[i + 1], 10);
    i++;
  } else if (arg === '--model' && args[i + 1]) {
    config.model = args[i + 1];
    i++;
  } else if (!arg.startsWith('--')) {
    // Positional argument - category name
    config.category = arg;
  }
}

// Check for API key
if (!process.env.MINIMAX_API_KEY) {
  console.error('❌ MINIMAX_API_KEY environment variable not set');
  console.error('Please set your API key:');
  console.error('  export MINIMAX_API_KEY=your_key_here');
  process.exit(1);
}

console.log('🚀 Starting Benchmark Execution');
console.log('📝 Configuration:', config);
console.log('');

try {
  await runBenchmarks(config);
  console.log('\n✅ Benchmarks completed successfully!');
  process.exit(0);
} catch (error: any) {
  console.error('\n❌ Benchmark execution failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
