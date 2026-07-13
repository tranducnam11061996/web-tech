import { pcmarketCategoryEnvelopeSchema, type PcmarketCategory } from './pcmarketProductCategories';

export type SourceSnapshot = {
  items: PcmarketCategory[];
  pages: unknown[];
};

type FetchOptions = {
  endpoint: string;
  pageSize?: number;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
};

function assertAllowedEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'pcmarket.vn') {
    throw new Error('Legacy import endpoint must use HTTPS on pcmarket.vn');
  }
  if (url.username || url.password) throw new Error('Legacy import endpoint must not contain credentials');
  return url;
}

async function fetchPage(fetchImpl: typeof fetch, url: URL, timeoutMs: number, retries: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'HACOM-Legacy-Importer/1.0' },
        redirect: 'error',
      });
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
      const length = Number(response.headers.get('content-length') || 0);
      if (length > 10 * 1024 * 1024) throw new Error('Source page exceeds 10 MiB');
      const body = await response.text();
      if (Buffer.byteLength(body, 'utf8') > 10 * 1024 * 1024) throw new Error('Source page exceeds 10 MiB');
      const raw = JSON.parse(body);
      return { validated: pcmarketCategoryEnvelopeSchema.parse(raw), raw };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unable to fetch legacy source');
}

export async function fetchPcmarketCategorySnapshot(options: FetchOptions): Promise<SourceSnapshot> {
  const endpoint = assertAllowedEndpoint(options.endpoint);
  const pageSize = Math.min(500, Math.max(1, options.pageSize || 500));
  const timeoutMs = Math.min(60_000, Math.max(1_000, options.timeoutMs || 15_000));
  const retries = Math.min(5, Math.max(0, options.retries ?? 3));
  const fetchImpl = options.fetchImpl || fetch;
  const items: PcmarketCategory[] = [];
  const pages: unknown[] = [];
  let expectedTotal = -1;
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const url = new URL(endpoint);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(pageSize));
    const fetched = await fetchPage(fetchImpl, url, timeoutMs, retries);
    const envelope = fetched.validated;
    if (envelope.current_page !== page) throw new Error(`Source returned page ${envelope.current_page}; expected ${page}`);
    if (page === 1) {
      expectedTotal = envelope.total_item;
      totalPages = envelope.total_page;
    } else if (envelope.total_item !== expectedTotal || envelope.total_page !== totalPages) {
      throw new Error('Source pagination metadata changed during download');
    }
    pages.push(fetched.raw);
    items.push(...envelope.items);
  }
  if (items.length !== expectedTotal) throw new Error(`Source item count mismatch: ${items.length}/${expectedTotal}`);
  return { items, pages };
}
