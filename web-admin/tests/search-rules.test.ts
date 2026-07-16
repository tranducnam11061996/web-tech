import assert from 'node:assert/strict';
import test from 'node:test';
import type { FuseResult } from 'fuse.js';
import {
  getActiveExclusions,
  getSearchIntent,
  injectSearchSynonyms,
  matchesStrictPcProductName,
  normalizeSearchText,
  rankLexicalResults,
  type LexicalSearchProduct,
} from '../src/lib/searchRules';

function product(name: string, searchText = name, id = 1): LexicalSearchProduct {
  return {
    id,
    storeSKU: String(id),
    normalizedName: normalizeSearchText(name),
    searchText: normalizeSearchText(searchText),
    categoryIds: new Set<number>(),
  };
}

function fuseResult(item: LexicalSearchProduct, score = 0.01): FuseResult<LexicalSearchProduct> {
  return { item, refIndex: 0, score };
}

test('strict PC intent accepts complete PC titles and bundles', () => {
  assert.equal(getSearchIntent(normalizeSearchText('PC')), 'pc');
  for (const name of [
    'PC AMD Ryzen 5 5500X3D - RTX 3050 6GB',
    'Bộ PC Gaming i5 12400F',
    'Full bộ PC Gaming kèm màn hình và Windows 11 Pro',
  ]) {
    assert.equal(matchesStrictPcProductName(normalizeSearchText(name)), true, name);
  }
});

test('strict PC intent rejects standalone accessories and short-token false positives', () => {
  const falsePositives = [
    product('Mainboard PRO MSI A620M-E DDR5', 'PCM 13569 Mainboard PRO MSI A620M-E DDR5', 1),
    product('Mic thu âm Elgato Wave 3 Black', 'PCM 13665 Mic thu âm Elgato Wave 3 Black', 2),
    product('Thiết bị stream Elgato Cam Link 4K', 'PCM 13663 Thiết bị stream Elgato Cam Link 4K', 3),
    product('Fan Jungle Leopard TF-360 ARGB', 'PCM 13650 Fan Jungle Leopard TF-360 ARGB', 4),
    product('Chuột Logitech G Pro 2', 'PCM 13609 Chuột Logitech G Pro 2', 5),
    product('Case máy tính Gamdias Athena M4M', 'PCM 13562 Case máy tính Gamdias Athena M4M', 6),
    product('Card mạng không dây PCI Express Asus PCE-AX3000', undefined, 7),
    product('Windows 11 Pro 64-bit', 'PCM 13607 Windows 11 Pro 64-bit', 8),
    product('Ổ cứng SSD Samsung 9100 Pro 4TB PCIe Gen5', undefined, 9),
    product('Màn hình Asus ProArt PA279CV', 'PCM Màn hình Asus ProArt PA279CV', 10),
    product('Laptop Lenovo LOQ', 'PCM Laptop Lenovo LOQ', 11),
    product('RAM PC Corsair Vengeance RGB 96GB', undefined, 12),
    product('Case Lian Li PC-O11 Dynamic Black', undefined, 13),
  ];

  const ranked = rankLexicalResults(falsePositives.map((item) => fuseResult(item)), 'PC');
  assert.deepEqual(ranked, []);
});

test('strict PC title gate applies only to the exact PC query', () => {
  const ram = product('RAM PC Corsair Vengeance RGB 96GB', undefined, 1);
  const gamingPc = product('PC Gaming i5 12400F', undefined, 2);

  assert.equal(rankLexicalResults([fuseResult(ram)], 'ram pc').length, 1);
  assert.equal(rankLexicalResults([fuseResult(gamingPc)], 'pc gaming').length, 1);
  assert.equal(getSearchIntent('pc gaming'), null);
});

test('synonyms and explicit exclusion opt-outs retain their existing behavior', () => {
  const injected = injectSearchSynonyms(normalizeSearchText('Laptop Dell'));
  assert.match(injected, /(^|\s)may tinh xach tay(\s|$)/);
  assert.equal(getActiveExclusions(normalizeSearchText('cap laptop')).includes('cap'), false);
  assert.equal(getActiveExclusions(normalizeSearchText('laptop')).includes('cap'), true);
  assert.equal(getSearchIntent(normalizeSearchText('máy in')), 'printer');
  assert.equal(getSearchIntent(normalizeSearchText('mực máy in')), null);
});
