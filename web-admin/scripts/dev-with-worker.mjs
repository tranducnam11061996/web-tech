import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(scriptsDirectory, '..');
const nextCli = path.join(workspaceDirectory, 'node_modules', 'next', 'dist', 'bin', 'next');
const tsxCli = path.join(workspaceDirectory, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const workerScript = path.join(workspaceDirectory, 'scripts', 'background-worker.ts');
const childEnvironment = { ...process.env, NODE_ENV: 'development' };

const processes = [
  {
    name: 'api',
    child: spawn(process.execPath, [nextCli, 'dev'], {
      cwd: workspaceDirectory,
      env: childEnvironment,
      stdio: 'inherit',
    }),
  },
  {
    name: 'background-worker',
    child: spawn(process.execPath, [tsxCli, workerScript], {
      cwd: workspaceDirectory,
      env: childEnvironment,
      stdio: 'inherit',
    }),
  },
];

let stopping = false;
let requestedExitCode = 0;
const closed = new Set();

function finishIfClosed() {
  if (closed.size === processes.length) process.exit(requestedExitCode);
}

function stopAll(exitCode = 0) {
  requestedExitCode = Math.max(requestedExitCode, exitCode);
  if (stopping) return;
  stopping = true;
  for (const processEntry of processes) {
    if (!closed.has(processEntry.name)) processEntry.child.kill('SIGTERM');
  }
  const forceExit = setTimeout(() => {
    for (const processEntry of processes) {
      if (!closed.has(processEntry.name)) processEntry.child.kill('SIGKILL');
    }
    process.exit(requestedExitCode || 1);
  }, 5_000);
  forceExit.unref();
}

for (const processEntry of processes) {
  processEntry.child.on('error', (error) => {
    console.error(`[dev:${processEntry.name}] failed to start`, error);
    stopAll(1);
  });
  processEntry.child.on('exit', (code, signal) => {
    closed.add(processEntry.name);
    if (!stopping) {
      console.error(`[dev:${processEntry.name}] exited unexpectedly (${signal || code || 0})`);
      stopAll(code || 1);
    }
    finishIfClosed();
  });
}

process.once('SIGINT', () => stopAll(0));
process.once('SIGTERM', () => stopAll(0));

