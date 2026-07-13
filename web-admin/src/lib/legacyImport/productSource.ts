import type { z } from 'zod';
import {
  pcmarketAttributeEnvelopeSchema,
  pcmarketBrandEnvelopeSchema,
  pcmarketProductEnvelopeSchema,
  type PcmarketAttribute,
  type PcmarketBrand,
  type PcmarketProduct,
} from './pcmarketProducts';

type Snapshot<T> = { items: T[]; pages: unknown[] };
type FetchOptions = { endpoint: string; pageSize: number; timeoutMs?: number; retries?: number; fetchImpl?: typeof fetch };

function assertAllowedEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'pcmarket.vn' || url.username || url.password) {
    throw new Error('Legacy import endpoint must use HTTPS on pcmarket.vn without credentials');
  }
  return url;
}

async function fetchSnapshot<T>(schema: z.ZodTypeAny, options: FetchOptions): Promise<Snapshot<T>> {
  const endpoint = assertAllowedEndpoint(options.endpoint);
  const pageSize = Math.min(500, Math.max(1, options.pageSize));
  const timeoutMs = Math.min(60_000, Math.max(1_000, options.timeoutMs || 30_000));
  const retries = Math.min(5, Math.max(0, options.retries ?? 3));
  const fetchImpl = options.fetchImpl || fetch;
  const items: T[] = [];
  const pages: unknown[] = [];
  let expectedTotal = -1;
  let totalPages = 1;
  let totalBytes = 0;
  for (let page = 1; page <= totalPages; page += 1) {
    const url = new URL(endpoint);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(pageSize));
    let lastError: unknown;
    let raw: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json', 'User-Agent': 'HACOM-Legacy-Importer/1.0' } });
        if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
        const body = await response.text();
        const bytes = Buffer.byteLength(body, 'utf8');
        if (bytes > 10 * 1024 * 1024) throw new Error('Source page exceeds 10 MiB');
        totalBytes += bytes;
        if (totalBytes > 100 * 1024 * 1024) throw new Error('Source snapshot exceeds 100 MiB');
        raw = JSON.parse(body);
        break;
      } catch (error) {
        lastError = error;
        if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
      } finally {
        clearTimeout(timer);
      }
    }
    if (!raw) throw lastError instanceof Error ? lastError : new Error('Unable to fetch legacy source');
    const envelope = schema.parse(raw) as { current_page: number; total_item: number; total_page: number; items: T[] };
    if (envelope.current_page !== page) throw new Error(`Source returned page ${envelope.current_page}; expected ${page}`);
    if (page === 1) {
      expectedTotal = envelope.total_item;
      totalPages = envelope.total_page;
    } else if (envelope.total_item !== expectedTotal || envelope.total_page !== totalPages) {
      throw new Error('Source pagination metadata changed during download');
    }
    pages.push(raw);
    items.push(...envelope.items);
  }
  if (items.length !== expectedTotal) throw new Error(`Source item count mismatch: ${items.length}/${expectedTotal}`);
  return { items, pages };
}

export const fetchPcmarketProductSnapshot = (options: Omit<FetchOptions, 'pageSize'> & { pageSize?: number }) =>
  fetchSnapshot<PcmarketProduct>(pcmarketProductEnvelopeSchema, { ...options, pageSize: options.pageSize || 250 });
export const fetchPcmarketBrandSnapshot = (options: Omit<FetchOptions, 'pageSize'> & { pageSize?: number }) =>
  fetchSnapshot<PcmarketBrand>(pcmarketBrandEnvelopeSchema, { ...options, pageSize: options.pageSize || 500 });
export const fetchPcmarketAttributeSnapshot = (options: Omit<FetchOptions, 'pageSize'> & { pageSize?: number }) =>
  fetchSnapshot<PcmarketAttribute>(pcmarketAttributeEnvelopeSchema, { ...options, pageSize: options.pageSize || 500 });
