type ProductSummary = { id?: number; slug?: string };

const apiBase = (process.env.LOCAL_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
const storefrontBase = (process.env.LOCAL_STOREFRONT_BASE || 'http://localhost:3001').replace(/\/+$/, '');
const categoryId = process.env.LOCAL_HEALTHCHECK_CATEGORY_ID || '6';
const collectionSlug = process.env.LOCAL_COLLECTION_SLUG || 'ban-phim-co-khong-day-full-size';

type CheckResult = { name: string; status: number; durationMs: number; ok: boolean };

async function check(name: string, url: string, init?: RequestInit, acceptedStatuses = [200]) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, init);
    const result: CheckResult = {
      name,
      status: response.status,
      durationMs: Date.now() - startedAt,
      ok: acceptedStatuses.includes(response.status),
    };
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${name}: HTTP ${result.status} (${result.durationMs}ms)`);
    return { result, response };
  } catch (error) {
    const result: CheckResult = { name, status: 0, durationMs: Date.now() - startedAt, ok: false };
    console.log(`FAIL ${name}: ${(error as Error).message}`);
    return { result, response: null };
  }
}

async function main() {
  const results: CheckResult[] = [];
  const productList = await check('API products', `${apiBase}/api/products?limit=24&page=1`);
  results.push(productList.result);

  let sampleProduct: ProductSummary | null = null;
  if (productList.response?.ok) {
    const payload = await productList.response.json().catch(() => null);
    sampleProduct = payload?.data?.find((product: ProductSummary) => {
      const slug = String(product.slug || '');
      return slug.length > 0 && !slug.startsWith('product-');
    }) || payload?.data?.[0] || null;
  }

  const sharedChecks = [
    ['API search', `${apiBase}/api/search?q=ban%20phim&limit=1&page=1`],
    ['API collection', `${apiBase}/api/collections/${encodeURIComponent(collectionSlug)}?limit=1&page=1`],
    ['API categories', `${apiBase}/api/categories?parentId=${categoryId}`],
    ['API category price bounds', `${apiBase}/api/categories/price-bounds?categoryId=${categoryId}`],
    ['API category attributes', `${apiBase}/api/categories/attributes?categoryId=${categoryId}`],
    ['Storefront home', storefrontBase],
    ['Storefront search', `${storefrontBase}/tim?q=ban%20phim`],
    ['Storefront collection', `${storefrontBase}/collection/${encodeURIComponent(collectionSlug)}`],
  ] as const;

  for (const [name, url] of sharedChecks) {
    const result = await check(name, url);
    results.push(result.result);
  }

  if (sampleProduct?.slug && !String(sampleProduct.slug).startsWith('product-')) {
    const detail = await check('API product detail', `${apiBase}/api/products/${encodeURIComponent(sampleProduct.slug)}`);
    results.push(detail.result);
  } else {
    console.log('SKIP API product detail: no product with a public legacy slug was returned.');
  }

  if (sampleProduct?.id) {
    const quote = await check(
      'API cart quote',
      `${apiBase}/api/cart/quote`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ productId: sampleProduct.id, quantity: 1 }] }),
      },
    );
    results.push(quote.result);
  }

  const failures = results.filter((result) => !result.ok);
  console.log(`\n[local:healthcheck] ${results.length - failures.length}/${results.length} checks passed.`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[local:healthcheck] Failed:', error);
  process.exitCode = 1;
});
