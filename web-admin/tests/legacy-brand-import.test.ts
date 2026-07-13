import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalBrandSnapshot,
  canonicalPcmarketBrandId,
  normalizePcmarketBrands,
  productCatalogSha256,
} from '../src/lib/legacyImport/pcmarketProducts';

function brand(id: number, name: string, slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    url: `https://pcmarket.vn/brand/${slug}`,
    name,
    summary: '',
    description: '',
    image: '',
    status: 'on',
    ordering: 0,
    last_update: '0000-00-00 00:00:00',
    meta_title: '',
    meta_keyword: '',
    meta_description: '',
    ...overrides,
  };
}

test('merges E-DRA and TEAMGROUP into canonical runtime IDs with content fallback', () => {
  const result = normalizePcmarketBrands([
    brand(25, 'E-DRA', 'e-dra'),
    brand(34, 'E-DRA', 'e-dra'),
    brand(31, 'TEAMGROUP', 'teamgroup'),
    brand(57, 'TEAMGROUP', 'teamgroup', { meta_title: 'TEAMGROUP', meta_description: 'Nội dung tiếng Việt' }),
  ], new Map([[25, 63], [31, 7]]));
  assert.equal(result.report.sourceBrands, 4);
  assert.equal(result.report.runtimeBrands, 3);
  assert.deepEqual(result.brands.map((item) => item.id), [25, 31, 96]);
  assert.deepEqual(result.brands[0].sourceIds, [25, 34]);
  assert.deepEqual(result.brands[2].sourceIds, [0]);
  assert.equal(result.brands[2].index, 'pcm');
  assert.equal(result.brands[2].ordering, 8_388_607);
  assert.equal(result.brands[0].productCount, 63);
  assert.equal(result.brands[1].metaTitle, 'TEAMGROUP');
  assert.equal(result.brands[1].metaDescription, 'Nội dung tiếng Việt');
  assert.equal(canonicalPcmarketBrandId(34), 25);
  assert.equal(canonicalPcmarketBrandId(57), 31);
  assert.equal(canonicalPcmarketBrandId(0), 96);
});

test('preserves UTF-8 content, remote PCMarket images and zero-date audit semantics', () => {
  const result = normalizePcmarketBrands([
    brand(2, 'Intel', 'intel', {
      summary: 'Tập đoàn Intel tại Hoa Kỳ',
      description: '<p style="color:red" onclick="x()">Mô tả</p><script>x()</script>',
      image: 'https://pcmarket.vn/media/brand/intel.png',
    }),
  ]);
  assert.equal(result.brands[0].summary, 'Tập đoàn Intel tại Hoa Kỳ');
  assert.equal(result.brands[0].image, 'https://pcmarket.vn/media/brand/intel.png');
  assert.equal(result.brands[0].lastUpdate, null);
  assert.doesNotMatch(result.brands[0].description, /script|onclick|style=/i);
});

test('rejects missing canonical aliases, unsafe URLs and off-domain images', () => {
  assert.throws(() => normalizePcmarketBrands([brand(34, 'E-DRA', 'e-dra')]), /Missing canonical brand 25/);
  assert.throws(() => normalizePcmarketBrands([{ ...brand(2, 'Intel', 'intel'), url: 'https://example.com/brand/intel' }]), /Invalid brand URL/);
  assert.throws(() => normalizePcmarketBrands([brand(2, 'Intel', 'intel', { image: 'https://example.com/intel.png' })]), /HTTPS on pcmarket/);
  assert.throws(() => normalizePcmarketBrands([brand(96, 'Conflicting source', 'conflict')]), /reserved PCM fallback/);
});

test('canonical brand hash is independent of source order', () => {
  const left = [brand(2, 'Intel', 'intel'), brand(3, 'LG', 'lg')] as any[];
  const right = [...left].reverse();
  assert.equal(productCatalogSha256(canonicalBrandSnapshot(left)), productCatalogSha256(canonicalBrandSnapshot(right)));
});
