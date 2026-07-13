import assert from 'node:assert/strict';
import test from 'node:test';
import {
  articleCategorySha256,
  canonicalArticleCategorySnapshot,
  normalizePcmarketArticleCategories,
} from '../src/lib/legacyImport/pcmarketArticleCategories';
import { fetchPcmarketArticleCategorySnapshot } from '../src/lib/legacyImport/articleCategorySource';

const base = {
  id: 1,
  url: 'https://pcmarket.vn/tin-cong-nghe.html',
  name: ' Tin Công Nghệ ',
  summary: '',
  description: '',
  image: '',
  parentId: 0,
  status: 'on' as const,
  ordering: 0,
  create_time: '2018-10-02 14:50:57',
  last_update: '2018-10-02 14:50:57',
  meta_title: '',
  meta_keyword: '',
  meta_description: '',
};

test('normalizes article categories while preserving source IDs and .html routes', () => {
  const normalized = normalizePcmarketArticleCategories([
    base,
    { ...base, id: 2, name: 'Child', url: 'https://pcmarket.vn/child.html', parentId: 1, image: '/media/category.jpg' },
  ]);
  assert.deepEqual(normalized.report, {
    total: 2, roots: 1, enabled: 2, disabled: 0, maxDepth: 1, imageCount: 1,
    sourcePaths: ['tin-cong-nghe.html', 'child.html'],
  });
  assert.equal(normalized.categories[0].name, 'Tin Công Nghệ');
  assert.equal(normalized.categories[0].slug, 'tin-cong-nghe.html');
  assert.equal(normalized.categories[0].requestPath, '/tin-cong-nghe.html');
  assert.equal(normalized.categories[0].catPath, ':1');
  assert.equal(normalized.categories[0].childListId, '2');
  assert.equal(normalized.categories[0].isParent, 1);
  assert.equal(normalized.categories[1].imageUrl, 'https://pcmarket.vn/media/category.jpg');
});

test('canonical article-category hash is independent of source order', () => {
  const second = { ...base, id: 2, url: 'https://pcmarket.vn/tin-cong-ty.html', name: 'Tin Công Ty' };
  const firstHash = articleCategorySha256(canonicalArticleCategorySnapshot([base, second]));
  const secondHash = articleCategorySha256(canonicalArticleCategorySnapshot([second, base]));
  assert.equal(firstHash, secondHash);
});

test('rejects invalid trees, duplicate paths and off-domain media', () => {
  assert.throws(() => normalizePcmarketArticleCategories([{ ...base, parentId: 99 }]), /missing parent/i);
  assert.throws(() => normalizePcmarketArticleCategories([base, { ...base, id: 2 }]), /duplicate article-category path/i);
  assert.throws(() => normalizePcmarketArticleCategories([{ ...base, image: 'https://example.com/image.jpg' }]), /pcmarket/i);
  assert.throws(() => normalizePcmarketArticleCategories([{ ...base, description: '<img src="https://example.com/a.jpg">' }]), /embedded media/i);
});

test('fetches bounded article-category pagination', async () => {
  const fetchImpl = async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get('page'));
    return new Response(JSON.stringify({
      current_page: page,
      size: 1,
      total_page: 2,
      total_item: 2,
      items: [{ ...base, id: page, url: `https://pcmarket.vn/category-${page}.html` }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const snapshot = await fetchPcmarketArticleCategorySnapshot({
    endpoint: 'https://pcmarket.vn/export/article_category.php', pageSize: 1, fetchImpl: fetchImpl as typeof fetch,
  });
  assert.deepEqual(snapshot.items.map((item) => item.id), [1, 2]);
  assert.equal(snapshot.pages.length, 2);
});

test('rejects article-category endpoints outside pcmarket.vn', async () => {
  await assert.rejects(
    fetchPcmarketArticleCategorySnapshot({ endpoint: 'https://example.com/article_category.php' }),
    /pcmarket.vn/i,
  );
});
