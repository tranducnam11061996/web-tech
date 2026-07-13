import assert from 'node:assert/strict';
import test from 'node:test';
import { withPublicProductResponseCache } from '../src/lib/publicProductCache';

test('public product cache coalesces fresh values', async () => {
  const key = `test:fresh:${Date.now()}:${Math.random()}`;
  let loads = 0;
  const loader = async () => ({ value: ++loads });
  const first = await withPublicProductResponseCache(key, loader, 1_000, 1_000, { skipVersionCheck: true });
  const second = await withPublicProductResponseCache(key, loader, 1_000, 1_000, { skipVersionCheck: true });
  assert.deepEqual(first, { value: 1 });
  assert.deepEqual(second, { value: 1 });
  assert.equal(loads, 1);
});

test('expired cache returns stale immediately while one background flight refreshes', async () => {
  const key = `test:stale:${Date.now()}:${Math.random()}`;
  await withPublicProductResponseCache(key, async () => 'old', 1, 2_000, { skipVersionCheck: true });
  await new Promise((resolve) => setTimeout(resolve, 5));

  let resolveRefresh: ((value: string) => void) | undefined;
  const refresh = () => new Promise<string>((resolve) => { resolveRefresh = resolve; });
  const stale = await withPublicProductResponseCache(key, refresh, 1_000, 2_000, { skipVersionCheck: true });
  assert.equal(stale, 'old');
  resolveRefresh?.('fresh');
  await new Promise((resolve) => setTimeout(resolve, 0));

  const fresh = await withPublicProductResponseCache(key, async () => 'unexpected', 1_000, 2_000, { skipVersionCheck: true });
  assert.equal(fresh, 'fresh');
});
