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
let nextVersionCheckAt = 0;

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
  productResponseCache.clear();
  productResponseFlights.clear();
  void pool.query(`INSERT INTO web_admin_cache_versions(cache_key,version) VALUES('public_products',2)
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
      const [rows] = await pool.query(`SELECT version FROM web_admin_cache_versions WHERE cache_key='public_products' LIMIT 1`);
      const version = Number((rows as any[])[0]?.version || 0);
      if (sharedVersion && version && version !== sharedVersion) {
        productResponseCache.clear();
        productResponseFlights.clear();
      }
      sharedVersion = version;
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

  const flight = loader()
    .then((value) => {
      productResponseCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
        staleUntil: Date.now() + ttlMs + staleMs,
      });
      trimCache();
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
      productResponseFlights.delete(key);
    });

  productResponseFlights.set(key, flight as Promise<unknown>);
  return flight;
}
