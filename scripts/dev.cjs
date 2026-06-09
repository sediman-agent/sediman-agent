#!/usr/bin/env bun

/**
 * Development mode - runs backend with hot reload and frontend with vite dev server
 */

import { spawn } from 'child_process';
import { lstat } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const RUNNING_PROCESSES = [];

async function killExisting() {
  console.log('🧹 Cleaning up existing processes...');

  try {
    const { exec } = await import('child_process');
    exec("lsof -ti:3001 | xargs kill -9 2>/dev/null");
    exec("lsof -ti:1420 | xargs kill -9 2>/dev/null");
    exec("pkill -f 'vite.*1420' 2>/dev/null");
    exec("pkill -f 'Electron' 2>/dev/null");
    exec("pkill -f 'electron-forge' 2>/dev/null");
  } catch (e) {
    // Ignore errors
  }

  await new Promise(r => setTimeout(r, 1500));
  console.log('✅ Cleanup complete\n');
}

function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`▶️  Running: ${cmd} ${args.join(' ')}`);

    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    RUNNING_PROCESSES.push(proc);

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Process exited with code ${code}`);
        reject(new Error(`Process failed with code ${code}`));
      } else {
        resolve(code);
      }
    });

    proc.on('error', (err) => {
      console.error(`Process error: ${err.message}`);
      reject(err);
    });
  });
}

async function startBackend() {
  console.log('\n🔧 Starting backend server with hot reload...\n');

  const serverPath = join(rootDir, 'packages/server/src/index.ts');
  const env = { ...process.env, SEDIMAN_MODE: 'electron' };

  const proc = spawn('bun', ['--watch', serverPath, '--mode', 'api'], {
    env,
    stdio: 'inherit',
    shell: true,
    detached: false
  });

  RUNNING_PROCESSES.push(proc);

  // Wait for backend to be ready
  await new Promise((resolve) => {
    const checkReady = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health');
        if (response.ok) {
          console.log('✅ Backend ready\n');
          resolve(null);
        } else {
          setTimeout(checkReady, 500);
        }
      } catch (e) {
        setTimeout(checkReady, 500);
      }
    };
    checkReady();
  });

  return proc;
}

async function startFrontend() {
  console.log('\n🎨 Starting frontend dev server...\n');

  const appDir = join(rootDir, 'packages/app');

  const proc = spawn('bun', ['run', 'dev'], {
    cwd: appDir,
    stdio: 'inherit',
    shell: true,
    detached: false
  });

  RUNNING_PROCESSES.push(proc);

  // Wait for frontend to be ready
  await new Promise((resolve) => {
    const checkReady = async () => {
      try {
        const response = await fetch('http://localhost:1420/');
        if (response.ok) {
          console.log('✅ Frontend ready\n');
          resolve(null);
        } else {
          setTimeout(checkReady, 500);
        }
      } catch (e) {
        setTimeout(checkReady, 500);
      }
    };
    checkReady();
  });

  return proc;
}

async function startElectron() {
  console.log('\n🖥️  Starting Electron app...\n');

  const appDir = join(rootDir, 'packages/app');
  const env = { ...process.env, ELECTRON_IS_DEV: '1' };

  // Don't await - let Electron run in background
  const proc = spawn('bun', ['run', 'start'], {
    cwd: appDir,
    env,
    stdio: 'inherit',
    shell: true,
    detached: false
  });

  RUNNING_PROCESSES.push(proc);

  proc.on('error', (err) => {
    console.error(`Electron error: ${err.message}`);
  });

  console.log('✅ Electron started\n');
}

async function main() {
  try {
    await killExisting();

    console.log('🚀 Starting development environment...\n');
    console.log('This will start:');
    console.log('  1. Backend server (with hot reload) on port 3001');
    console.log('  2. Frontend dev server (vite) on port 1420');
    console.log('  3. Electron app (loads from dev server)');
    console.log('\nPress Ctrl+C to stop all processes\n');

    // Start backend and frontend in parallel
    const backend = startBackend();
    const frontend = startFrontend();

    // Wait for servers to be ready
    await Promise.all([backend, frontend]);

    // Start Electron
    await startElectron();

  } catch (error) {
    console.error('❌ Development mode failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Stopping development mode...');

  RUNNING_PROCESSES.forEach(proc => {
    try {
      proc.kill();
    } catch (e) {
      // Ignore
    }
  });

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Stopping development mode...');
  process.exit(0);
});

main();
