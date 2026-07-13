import {
  articleSha256,
  pcmarketArticleEnvelopeSchema,
  type PcmarketArticle,
} from './pcmarketArticles';

type FetchOptions = {
  endpoint: string;
  pageSize?: number;
  timeoutMs?: number;
  retries?: number;
  concurrency?: number;
  fetchImpl?: typeof fetch;
};

export type ArticleSourcePage = { page: number; hash: string; raw: unknown };
export type ArticleSourceSnapshot = { items: PcmarketArticle[]; pages: ArticleSourcePage[]; totalBytes: number };

function allowedEndpoint(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'pcmarket.vn' || url.username || url.password) {
    throw new Error('Article endpoint must use HTTPS on pcmarket.vn without credentials');
  }
  return url;
}

async function fetchPage(fetchImpl: typeof fetch, endpoint: URL, page: number, size: number, timeoutMs: number, retries: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = new URL(endpoint);
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', String(size));
      const response = await fetchImpl(url, {
        signal: controller.signal,
        redirect: 'error',
        headers: { Accept: 'application/json', 'User-Agent': 'HACOM-Legacy-Importer/1.0' },
      });
      if (!response.ok) throw new Error(`Article source page ${page} returned HTTP ${response.status}`);
      const advertised = Number(response.headers.get('content-length') || 0);
      if (advertised > 2 * 1024 * 1024) throw new Error(`Article source page ${page} exceeds 2 MiB`);
      const body = await response.text();
      const bytes = Buffer.byteLength(body, 'utf8');
      if (bytes > 2 * 1024 * 1024) throw new Error(`Article source page ${page} exceeds 2 MiB`);
      const raw = JSON.parse(body);
      return { envelope: pcmarketArticleEnvelopeSchema.parse(raw), raw, bytes, hash: articleSha256(body) };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Unable to fetch article source page ${page}`);
}

export async function fetchPcmarketArticleSnapshot(options: FetchOptions): Promise<ArticleSourceSnapshot> {
  const endpoint = allowedEndpoint(options.endpoint);
  const pageSize = Math.min(500, Math.max(1, options.pageSize || 10));
  const timeoutMs = Math.min(60_000, Math.max(1_000, options.timeoutMs || 30_000));
  const retries = Math.min(5, Math.max(0, options.retries ?? 3));
  const concurrency = Math.min(8, Math.max(1, options.concurrency || 4));
  const fetchImpl = options.fetchImpl || fetch;
  const first = await fetchPage(fetchImpl, endpoint, 1, pageSize, timeoutMs, retries);
  if (first.envelope.current_page !== 1) throw new Error('Article source did not return page 1');
  const totalPages = first.envelope.total_page;
  const expectedTotal = first.envelope.total_item;
  const fetched = new Map<number, Awaited<ReturnType<typeof fetchPage>>>([[1, first]]);
  let nextPage = 2;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(0, totalPages - 1)) }, async () => {
    while (nextPage <= totalPages) {
      const page = nextPage;
      nextPage += 1;
      const result = await fetchPage(fetchImpl, endpoint, page, pageSize, timeoutMs, retries);
      if (result.envelope.current_page !== page) throw new Error(`Article source returned page ${result.envelope.current_page}; expected ${page}`);
      if (result.envelope.total_page !== totalPages || result.envelope.total_item !== expectedTotal) {
        throw new Error('Article pagination metadata changed during download');
      }
      fetched.set(page, result);
    }
  });
  await Promise.all(workers);
  const ordered = [...fetched.entries()].sort(([left], [right]) => left - right);
  const items = ordered.flatMap(([, result]) => result.envelope.items);
  const totalBytes = ordered.reduce((sum, [, result]) => sum + result.bytes, 0);
  if (items.length !== expectedTotal) throw new Error(`Article item count mismatch: ${items.length}/${expectedTotal}`);
  if (items.length > 5_000 || totalBytes > 32 * 1024 * 1024) throw new Error('Article snapshot exceeds configured limits');
  return {
    items,
    totalBytes,
    pages: ordered.map(([page, result]) => ({ page, hash: result.hash, raw: result.raw })),
  };
}
