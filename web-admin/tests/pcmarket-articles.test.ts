import assert from 'node:assert/strict';
import test from 'node:test';
import {
  articlePathFromUrl,
  articleSha256,
  canonicalArticleSnapshot,
  legacyTimestampEpoch,
  normalizePcmarketArticles,
  sanitizeLegacyArticleHtml,
} from '../src/lib/legacyImport/pcmarketArticles';
import { fetchPcmarketArticleSnapshot } from '../src/lib/legacyImport/articleSource';

const category = { id: 1, name: 'Tin Công Nghệ', url: 'https://pcmarket.vn/tin-cong-nghe.html' };
const base = {
  id: 4,
  article_category: [category],
  title: ' Bài viết thử nghiệm ',
  url_index: 'ignored-index',
  url: 'https://pcmarket.vn/bai-viet-thu-nghiem.html',
  image: 'https://pcmarket.vn/media/news/4.png',
  ordering: 1,
  status: 1,
  meta_title: '<b>SEO title</b>',
  meta_keywords: 'máy tính',
  meta_description: 'mô tả',
  comment_count: 2,
  summary: '<p>Tóm <strong>tắt</strong></p>',
  content: '<p onclick="bad()"><img src="/media/news/body.png"><a href="https://example.com/x">Link</a><script>alert(1)</script></p>',
  create_date: '2026-07-08 10:30:00',
  last_update: '2026-07-08 11:30:00',
};

test('normalizes article paths, text, media and category links deterministically', () => {
  const normalized = normalizePcmarketArticles([base]);
  assert.equal(normalized.articles[0].slug, 'bai-viet-thu-nghiem.html');
  assert.equal(normalized.articles[0].requestPath, '/bai-viet-thu-nghiem.html');
  assert.equal(normalized.articles[0].title, 'Bài viết thử nghiệm');
  assert.equal(normalized.articles[0].summary, 'Tóm tắt');
  assert.equal(normalized.articles[0].categoryCsv, ',1,');
  assert.equal(normalized.articles[0].thumbnail, 'https://pcmarket.vn/media/news/4.png');
  assert.match(normalized.articles[0].content, /https:\/\/pcmarket\.vn\/media\/news\/body\.png/);
  assert.match(normalized.articles[0].content, /loading="lazy"/);
  assert.match(normalized.articles[0].content, /noopener noreferrer nofollow/);
  assert.doesNotMatch(normalized.articles[0].content, /onclick|script|alert/);
});

test('quarantines only article 83 and audits article 122 truncation', () => {
  const quarantined = {
    ...base, id: 83, title: '', url_index: '', url: 'https://pcmarket.vn/.html', article_category: [category, { ...category, id: 2, name: 'Tin Công Ty', url: 'https://pcmarket.vn/tin-cong-ty.html' }],
  };
  const truncated = { ...base, id: 122, url: 'https://pcmarket.vn/article-122', content: 'x'.repeat(65_535) };
  const normalized = normalizePcmarketArticles([quarantined, truncated]);
  assert.deepEqual(normalized.quarantined.map((item) => item.id), [83]);
  assert.deepEqual(normalized.report.truncatedHtmlIds, [122]);
  assert.equal(normalized.articles.length, 1);
});

test('deduplicates categories in source order and keeps uncategorized articles unassigned', () => {
  const duplicate = { ...base, article_category: [category, category] };
  const uncategorized = { ...base, id: 5, url: 'https://pcmarket.vn/no-category', article_category: [] };
  const normalized = normalizePcmarketArticles([duplicate, uncategorized]);
  assert.deepEqual(normalized.articles[0].categoryIds, [1]);
  assert.equal(normalized.articles[0].links.length, 1);
  assert.deepEqual(normalized.report.duplicateRelations, [{ articleId: 4, categoryId: 1 }]);
  assert.deepEqual(normalized.report.noCategoryIds, [5]);
  assert.equal(normalized.articles[1].categoryId, 0);
  assert.equal(normalized.articles[1].categoryCsv, '');
});

test('normalizes UTC+07 timestamps and rejects unsafe source routes/taxonomy', () => {
  assert.equal(legacyTimestampEpoch('1970-01-01 07:00:00'), 0);
  assert.equal(articlePathFromUrl('https://pcmarket.vn/route-without-extension'), 'route-without-extension');
  assert.throws(() => articlePathFromUrl('https://example.com/a'), /pcmarket/i);
  assert.throws(() => normalizePcmarketArticles([{ ...base, article_category: [{ ...category, name: 'Wrong' }] }]), /taxonomy/i);
});

test('sanitizer removes HTTP and active HTML while converting YouTube iframe to a link', () => {
  const html = sanitizeLegacyArticleHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe><img src="http://bad.test/a.png"><form><input></form>');
  assert.match(html, /Xem video YouTube/);
  assert.doesNotMatch(html, /iframe|http:\/\/|form|input/);
});

test('canonical article hash is independent of source order', () => {
  const second = { ...base, id: 5, url: 'https://pcmarket.vn/second' };
  assert.equal(
    articleSha256(canonicalArticleSnapshot([base, second])),
    articleSha256(canonicalArticleSnapshot([second, base])),
  );
});

test('fetches bounded concurrent article pagination and stores page hashes', async () => {
  const fetchImpl = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get('page'));
    return new Response(JSON.stringify({
      current_page: page,
      size: 1,
      total_page: 2,
      total_item: 2,
      items: [{ ...base, id: page + 3, url: `https://pcmarket.vn/article-${page}` }],
    }), { status: 200 });
  };
  const snapshot = await fetchPcmarketArticleSnapshot({
    endpoint: 'https://pcmarket.vn/export/article.php', pageSize: 1, concurrency: 2, fetchImpl: fetchImpl as typeof fetch,
  });
  assert.deepEqual(snapshot.items.map((item) => item.id), [4, 5]);
  assert.equal(snapshot.pages.length, 2);
  assert.ok(snapshot.pages.every((page) => /^[a-f0-9]{64}$/.test(page.hash)));
});

test('rejects article endpoints outside pcmarket.vn', async () => {
  await assert.rejects(fetchPcmarketArticleSnapshot({ endpoint: 'https://example.com/article.php' }), /pcmarket.vn/i);
});
