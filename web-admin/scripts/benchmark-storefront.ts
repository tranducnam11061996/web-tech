type Target = { name: string; url: string };

export {};

const baseUrl = (process.env.STOREFRONT_BENCHMARK_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const targets: Target[] = [
  { name: 'products', url: '/api/products?limit=24&page=1' },
  { name: 'search', url: '/api/search?q=ban%20phim&limit=24&page=1' },
  { name: 'collection', url: '/api/collections/ban-phim-co-khong-day-full-size?limit=24&page=1' },
];

async function measure(target: Target) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${target.url}`);
  const body = await response.arrayBuffer();
  return {
    name: target.name,
    status: response.status,
    durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    bytes: body.byteLength,
    cacheControl: response.headers.get('cache-control'),
    serverTiming: response.headers.get('server-timing'),
  };
}

async function main() {
  console.log(`Benchmarking ${baseUrl}`);
  for (const target of targets) {
    const cold = await measure(target);
    const warm = await measure(target);
    console.log(JSON.stringify({ cold, warm }));
  }
}

main().catch((error) => {
  console.error('[storefront:benchmark] Failed:', error);
  process.exitCode = 1;
});
