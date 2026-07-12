import pool from '@/lib/db';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
};

const MAX_CACHE_ITEMS = 200;
const productResponseCache = new Map<string, CacheEntry<unknown>>();
const productResponseFlights = new Map<string, Promise<unknown>>();
const metrics = { hits: 0, misses: 0, coalesced: 0, staleFallbacks: 0 };
let sharedVersion = 0;
let sharedCatalogDetailVersion = 0;
let nextVersionCheckAt = 0;
let cacheGeneration = 0;
let catalogDetailGeneration = 0;

function clearCacheKeys(predicate: (key: string) => boolean) {
  for (const key of productResponseCache.keys()) {
    if (predicate(key)) productResponseCache.delete(key);
  }
  for (const key of productResponseFlights.keys()) {
    if (predicate(key)) productResponseFlights.delete(key);
  }
}

function clearAllLocalCaches() {
  cacheGeneration += 1;
  productResponseCache.clear();
  productResponseFlights.clear();
}

function clearCatalogDetailLocalCaches() {
  catalogDetailGeneration += 1;
  clearCacheKeys((key) => key.startsWith('product-detail:') || key.startsWith('combo-set:'));
}

function touchCacheKey(key: string, entry: CacheEntry<unknown>) {
  productResponseCache.delete(key);
  productResponseCache.set(key, entry);
}

function trimCache() {
  while (productResponseCache.size > MAX_CACHE_ITEMS) {
    const oldest = productResponseCache.keys().next().value;
    if (!oldest) return;
    productResponseCache.delete(oldest);
  }
}

export function clearPublicProductResponseCache() {
  clearAllLocalCaches();
  void pool.query(`INSERT INTO web_admin_cache_versions(cache_key,version) VALUES('public_products',2)
    ON DUPLICATE KEY UPDATE version=version+1`).catch(() => undefined);
}

export function clearPublicCatalogDetailCache() {
  clearCatalogDetailLocalCaches();
  void pool.query(`INSERT INTO web_admin_cache_versions(cache_key,version) VALUES('public_catalog_details',2)
    ON DUPLICATE KEY UPDATE version=version+1`).catch(() => undefined);
}

export function getPublicProductCacheStats() {
  return { items: productResponseCache.size, flights: productResponseFlights.size, ...metrics };
}

export async function withPublicProductResponseCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = 60_000,
  staleMs = 300_000,
): Promise<T> {
  if (Date.now() >= nextVersionCheckAt) {
    nextVersionCheckAt = Date.now() + 5_000;
    try {
      const [rows] = await pool.query(`SELECT cache_key, version FROM web_admin_cache_versions
        WHERE cache_key IN ('public_products','public_catalog_details')`);
      const versions = new Map((rows as any[]).map((row) => [String(row.cache_key), Number(row.version || 0)]));
      const version = Number(versions.get('public_products') || 0);
      const catalogDetailVersion = Number(versions.get('public_catalog_details') || 0);
      if (sharedVersion && version && version !== sharedVersion) {
        clearAllLocalCaches();
      }
      if (catalogDetailVersion && catalogDetailVersion !== sharedCatalogDetailVersion) {
        clearCatalogDetailLocalCaches();
      }
      sharedVersion = version;
      sharedCatalogDetailVersion = catalogDetailVersion;
    } catch { /* migration may not have run yet */ }
  }
  const now = Date.now();
  const cached = productResponseCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) {
    metrics.hits += 1;
    touchCacheKey(key, cached as CacheEntry<unknown>);
    return cached.value;
  }

  const existingFlight = productResponseFlights.get(key) as Promise<T> | undefined;
  if (existingFlight) {
    metrics.coalesced += 1;
    return existingFlight;
  }

  metrics.misses += 1;
  const startedGeneration = cacheGeneration;
  const startedCatalogDetailGeneration = catalogDetailGeneration;
  const isCatalogDetail = key.startsWith('product-detail:') || key.startsWith('combo-set:');

  const flight = loader()
    .then((value) => {
      const generationIsCurrent = startedGeneration === cacheGeneration;
      const detailGenerationIsCurrent = !isCatalogDetail || startedCatalogDetailGeneration === catalogDetailGeneration;
      if (generationIsCurrent && detailGenerationIsCurrent) {
        productResponseCache.set(key, {
          value,
          expiresAt: Date.now() + ttlMs,
          staleUntil: Date.now() + ttlMs + staleMs,
        });
        trimCache();
      }
      return value;
    })
    .catch((error) => {
      if (cached && cached.staleUntil > Date.now()) {
        metrics.staleFallbacks += 1;
        return cached.value;
      }
      throw error;
    })
    .finally(() => {
      if (productResponseFlights.get(key) === flight) productResponseFlights.delete(key);
    });

  productResponseFlights.set(key, flight as Promise<unknown>);
  return flight;
}
