type Target = { name: string; url: string };

export {};

const apiBaseUrl = (process.env.LOCAL_API_BASE || 'http://localhost:3000').replace(/\/$/, '');
const storefrontBaseUrl = (process.env.STOREFRONT_BENCHMARK_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const productSlug = process.env.LOCAL_PRODUCT_SLUG || '';
const targets: Target[] = [
  { name: 'storefront-home', url: `${storefrontBaseUrl}/` },
  { name: 'storefront-search', url: `${storefrontBaseUrl}/tim?q=ban%20phim` },
  { name: 'api-products', url: `${apiBaseUrl}/api/products?limit=24&page=1` },
  { name: 'api-search', url: `${apiBaseUrl}/api/search?q=ban%20phim&limit=24&page=1` },
  ...(productSlug ? [
    { name: 'product-core', url: `${apiBaseUrl}/api/products/${encodeURIComponent(productSlug)}?include=core` },
    { name: 'product-supplemental', url: `${apiBaseUrl}/api/products/${encodeURIComponent(productSlug)}/supplemental` },
    { name: 'storefront-product', url: `${storefrontBaseUrl}/${encodeURIComponent(productSlug)}` },
  ] : []),
];

async function measure(target: Target) {
  const startedAt = performance.now();
  const response = await fetch(target.url);
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
  console.log(`Benchmarking storefront=${storefrontBaseUrl} api=${apiBaseUrl}`);
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
