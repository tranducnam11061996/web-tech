import pool from '../src/lib/db';
import {
  SAFE_CONFIGURATION_CONFIRMATION,
  applySafeConfigurationBootstrap,
  planSafeConfigurationBootstrap,
  rollbackSafeConfigurationBootstrap,
} from '../src/lib/legacyImport/safeConfiguration';

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]) {
  const result: Args = {};
  for (const argument of argv) {
    if (!argument.startsWith('--')) throw new Error(`Unknown argument: ${argument}`);
    const [key, ...value] = argument.slice(2).split('=');
    result[key] = value.length ? value.join('=') : true;
  }
  return result;
}

function required(args: Args, key: string) {
  const value = args[key];
  if (!value || value === true) throw new Error(`--${key}=<value> is required`);
  return String(value);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const modes = ['dry-run', 'apply', 'rollback'].filter((mode) => args[mode] === true);
  if (modes.length > 1) throw new Error('Choose exactly one mode');
  const mode = modes[0] || 'dry-run';
  const targetDatabase = required(args, 'target-database');
  if (mode === 'rollback') {
    const runId = Number(required(args, 'run-id'));
    if (!Number.isSafeInteger(runId) || runId <= 0) throw new Error('--run-id must be a positive integer');
    console.log(JSON.stringify({ mode, result: await rollbackSafeConfigurationBootstrap({ runId, targetDatabase }) }, null, 2));
    return;
  }
  const sourceDatabase = required(args, 'source-database');
  const plan = await planSafeConfigurationBootstrap({ sourceDatabase, targetDatabase });
  if (mode === 'dry-run') {
    console.log(JSON.stringify({ mode, plan, applyConfirmation: SAFE_CONFIGURATION_CONFIRMATION }, null, 2));
    return;
  }
  if (required(args, 'confirm') !== SAFE_CONFIGURATION_CONFIRMATION) throw new Error(`--confirm=${SAFE_CONFIGURATION_CONFIRMATION} is required`);
  const result = await applySafeConfigurationBootstrap({ sourceDatabase, targetDatabase, expectedHash: required(args, 'expected-hash') });
  console.log(JSON.stringify({ mode, result }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => pool.end());
