import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const cachePath = resolve(process.cwd(), '.next', 'dev');

if (existsSync(cachePath)) {
  rmSync(cachePath, { recursive: true, force: true });
  console.log(`[dev:clean] Removed ${cachePath}`);
} else {
  console.log('[dev:clean] No development cache to remove.');
}
