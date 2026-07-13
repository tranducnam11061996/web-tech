import pool from '@/lib/db';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
  sizeBytes: number;
};

function boundedEnvNumber(name: string, fallback: number, min: number, max: number) {
  const parsed = Number(process.env[name] || fallback);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
}

const MAX_CACHE_ITEMS = boundedEnvNumber('PUBLIC_CACHE_MAX_ITEMS', 300, 50, 2_000);
const MAX_CACHE_BYTES = Math.min(
  256 * 1024 * 1024,
  boundedEnvNumber('PUBLIC_CACHE_MAX_BYTES', 64 * 1024 * 1024, 8 * 1024 * 1024, 256 * 1024 * 1024),
);
const productResponseCache = new Map<string, CacheEntry<unknown>>();
const productResponseFlights = new Map<string, Promise<unknown>>();
const metrics = { hits: 0, misses: 0, coalesced: 0, staleFallbacks: 0 };
let cacheBytes = 0;
let sharedVersion = 0;
let sharedCatalogDetailVersion = 0;
let nextVersionCheckAt = 0;
let cacheGeneration = 0;
let catalogDetailGeneration = 0;

function clearCacheKeys(predicate: (key: string) => boolean) {
  for (const [key, entry] of productResponseCache.entries()) {
    if (predicate(key)) {
      cacheBytes = Math.max(0, cacheBytes - entry.sizeBytes);
      productResponseCache.delete(key);
    }
  }
  for (const key of productResponseFlights.keys()) {
    if (predicate(key)) productResponseFlights.delete(key);
  }
}

function clearAllLocalCaches() {
  cacheGeneration += 1;
  cacheBytes = 0;
  productResponseCache.clear();
  productResponseFlights.clear();
}

function clearCatalogDetailLocalCaches() {
  catalogDetailGeneration += 1;
  clearCacheKeys((key) => key.startsWith('product-detail:') || key.startsWith('product-supplemental:') || key.startsWith('combo-set:'));
}

function touchCacheKey(key: string, entry: CacheEntry<unknown>) {
  productResponseCache.delete(key);
  productResponseCache.set(key, entry);
}

function trimCache() {
  while (productResponseCache.size > MAX_CACHE_ITEMS || cacheBytes > MAX_CACHE_BYTES) {
    const oldest = productResponseCache.keys().next().value;
    if (!oldest) return;
    const entry = productResponseCache.get(oldest);
    if (entry) cacheBytes = Math.max(0, cacheBytes - entry.sizeBytes);
    productResponseCache.delete(oldest);
  }
}

function estimateSizeBytes(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return 1_024;
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
  return {
    items: productResponseCache.size,
    bytes: cacheBytes,
    maxItems: MAX_CACHE_ITEMS,
    maxBytes: MAX_CACHE_BYTES,
    flights: productResponseFlights.size,
    ...metrics,
  };
}

export async function withPublicProductResponseCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = 60_000,
  staleMs = 300_000,
  options?: { negativeTtlMs?: number; isNegative?: (value: T) => boolean; skipVersionCheck?: boolean },
): Promise<T> {
  if (!options?.skipVersionCheck && Date.now() >= nextVersionCheckAt) {
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
    if (cached && cached.staleUntil > now) {
      metrics.staleFallbacks += 1;
      touchCacheKey(key, cached as CacheEntry<unknown>);
      return cached.value;
    }
    return existingFlight;
  }

  metrics.misses += 1;
  const startedGeneration = cacheGeneration;
  const startedCatalogDetailGeneration = catalogDetailGeneration;
  const isCatalogDetail = key.startsWith('product-detail:') || key.startsWith('product-supplemental:') || key.startsWith('combo-set:');

  const flight = loader()
    .then((value) => {
      const generationIsCurrent = startedGeneration === cacheGeneration;
      const detailGenerationIsCurrent = !isCatalogDetail || startedCatalogDetailGeneration === catalogDetailGeneration;
      if (generationIsCurrent && detailGenerationIsCurrent) {
        const resolvedTtlMs = options?.isNegative?.(value)
          ? Math.max(1_000, options.negativeTtlMs || 10_000)
          : ttlMs;
        const sizeBytes = estimateSizeBytes(value);
        const previous = productResponseCache.get(key);
        if (previous) cacheBytes = Math.max(0, cacheBytes - previous.sizeBytes);
        productResponseCache.set(key, {
          value,
          expiresAt: Date.now() + resolvedTtlMs,
          staleUntil: Date.now() + resolvedTtlMs + staleMs,
          sizeBytes,
        });
        cacheBytes += sizeBytes;
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
  if (cached && cached.staleUntil > now) {
    metrics.staleFallbacks += 1;
    touchCacheKey(key, cached as CacheEntry<unknown>);
    void flight.catch(() => undefined);
    return cached.value;
  }
  return flight;
}
