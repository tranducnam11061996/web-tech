import http from 'node:http';

type Result = { name: string; run: 'cold' | 'warm'; status: number; ttfbMs: number; totalMs: number; bytes: number; serverTiming: string | null };

const baseUrl = (process.env.LOCAL_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
const timeoutMs = Math.max(1_000, Number(process.env.LOCAL_BENCHMARK_TIMEOUT_MS || 15_000));
const targets = [
  { name: 'admin-login', path: '/login' },
  { name: 'favicon', path: '/icon.svg' },
  { name: 'customer-session', path: '/api/customer/me' },
  { name: 'header-menu', path: '/api/menu/header' },
  { name: 'homepage-bootstrap', path: '/api/homepage/bootstrap' },
] as const;

function measure(name: string, path: string, run: Result['run']) {
  return new Promise<Result>((resolve, reject) => {
    const startedAt = performance.now();
    const url = new URL(`${baseUrl}${path}`);
    const request = http.request({ hostname: url.hostname, port: url.port || 80, path: `${url.pathname}${url.search}`, method: 'GET' }, (response) => {
      const ttfbMs = performance.now() - startedAt;
      let bytes = 0;
      response.on('data', (chunk) => { bytes += Buffer.byteLength(chunk); });
      response.on('end', () => resolve({
        name, run, status: response.statusCode || 0, ttfbMs: Math.round(ttfbMs * 10) / 10,
        totalMs: Math.round((performance.now() - startedAt) * 10) / 10, bytes,
        serverTiming: typeof response.headers['server-timing'] === 'string' ? response.headers['server-timing'] : null,
      }));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`Timed out after ${timeoutMs}ms`)));
    request.on('error', reject);
    request.end();
  });
}

async function main() {
  console.log(`[local:benchmark] ${baseUrl} (timeout ${timeoutMs}ms)`);
  for (const target of targets) {
    for (const run of ['cold', 'warm'] as const) {
      const result = await measure(target.name, target.path, run);
      console.log(JSON.stringify(result));
    }
  }
}

main().catch((error) => {
  console.error('[local:benchmark] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
