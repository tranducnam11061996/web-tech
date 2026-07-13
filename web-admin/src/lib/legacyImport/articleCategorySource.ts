import {
  pcmarketArticleCategoryEnvelopeSchema,
  type PcmarketArticleCategory,
} from './pcmarketArticleCategories';

type FetchOptions = {
  endpoint: string;
  pageSize?: number;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
};

export type ArticleCategorySourceSnapshot = { items: PcmarketArticleCategory[]; pages: unknown[] };

function allowedEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'pcmarket.vn' || url.username || url.password) {
    throw new Error('Article-category endpoint must use HTTPS on pcmarket.vn without credentials');
  }
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
        redirect: 'error',
        headers: { Accept: 'application/json', 'User-Agent': 'HACOM-Legacy-Importer/1.0' },
      });
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
      const advertised = Number(response.headers.get('content-length') || 0);
      if (advertised > 2 * 1024 * 1024) throw new Error('Article-category source page exceeds 2 MiB');
      const body = await response.text();
      if (Buffer.byteLength(body, 'utf8') > 2 * 1024 * 1024) throw new Error('Article-category source page exceeds 2 MiB');
      const raw = JSON.parse(body);
      return { raw, envelope: pcmarketArticleCategoryEnvelopeSchema.parse(raw) };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unable to fetch article-category source');
}

export async function fetchPcmarketArticleCategorySnapshot(options: FetchOptions): Promise<ArticleCategorySourceSnapshot> {
  const endpoint = allowedEndpoint(options.endpoint);
  const pageSize = Math.min(500, Math.max(1, options.pageSize || 500));
  const timeoutMs = Math.min(60_000, Math.max(1_000, options.timeoutMs || 15_000));
  const retries = Math.min(5, Math.max(0, options.retries ?? 3));
  const fetchImpl = options.fetchImpl || fetch;
  const items: PcmarketArticleCategory[] = [];
  const pages: unknown[] = [];
  let expectedTotal = -1;
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const url = new URL(endpoint);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(pageSize));
    const fetched = await fetchPage(fetchImpl, url, timeoutMs, retries);
    if (fetched.envelope.current_page !== page) throw new Error(`Source returned page ${fetched.envelope.current_page}; expected ${page}`);
    if (page === 1) {
      expectedTotal = fetched.envelope.total_item;
      totalPages = fetched.envelope.total_page;
    } else if (fetched.envelope.total_item !== expectedTotal || fetched.envelope.total_page !== totalPages) {
      throw new Error('Article-category pagination metadata changed during download');
    }
    items.push(...fetched.envelope.items);
    pages.push(fetched.raw);
  }
  if (items.length !== expectedTotal) throw new Error(`Article-category item count mismatch: ${items.length}/${expectedTotal}`);
  return { items, pages };
}
