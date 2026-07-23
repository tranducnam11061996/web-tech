import assert from 'node:assert/strict';
import test from 'node:test';
import type { FuseResult } from 'fuse.js';
import {
  buildFuseQuery,
  getActiveExclusions,
  getCanonicalSearchQuery,
  getSearchIntent,
  injectSearchSynonyms,
  matchesStrictIntentProductName,
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

function rankedNames(query: string, names: string[]) {
  return rankLexicalResults(names.map((name, index) => fuseResult(product(name, name, index + 1))), query)
    .map(({ product: item }) => item.normalizedName);
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

test('strict intent aliases resolve to stable canonical queries', () => {
  for (const query of ['win 11', 'win11', 'windows 11', 'WIN  11']) {
    assert.equal(getSearchIntent(query), 'windows11', query);
    assert.equal(getCanonicalSearchQuery(query), 'windows 11', query);
    assert.deepEqual(buildFuseQuery(query), buildFuseQuery('windows 11'), query);
  }
  for (const query of ['mic', 'micro']) {
    assert.equal(getSearchIntent(query), 'microphone', query);
    assert.equal(getCanonicalSearchQuery(query), 'mic', query);
  }
  assert.equal(getSearchIntent('hdd'), 'hdd');
  assert.equal(getSearchIntent('loa'), 'speaker');
});

test('Windows 11 intent keeps standalone software and rejects bundled hardware', () => {
  const names = [
    'Windows 11 Pro 64-bit All Language',
    'Microsoft Windows 11 Pro Download',
    'Phan mem Windows 11 Home',
    'Phan mem Microsoft Windows 11 Pro',
    'Laptop HP Pavilion kem Windows 11',
    'PC Office i5 kem Windows 11 Pro',
    'VGA Gigabyte WINDFORCE 11GB',
    'Windows 10 Pro',
  ];
  const expected = names.slice(0, 4).map(normalizeSearchText);

  for (const query of ['win 11', 'win11', 'windows 11']) {
    assert.deepEqual(rankedNames(query, names).sort(), [...expected].sort(), query);
  }
});

test('microphone intent rejects Microsoft, Micro-ATX, Mini and Mica false positives', () => {
  const accepted = ['Mic thu am Elgato Wave 3', 'Micro thu am USB', 'Microphone HyperX QuadCast'];
  const rejected = [
    'Phan mem Microsoft Office 2021',
    'Phan mem Microsoft Windows 11 Pro',
    'Mainboard ASRock A620AM-HVS Micro-ATX',
    'Micro-ATX Case compact',
    'Vo Case Cooler Master Mini Tower',
    'Vo Case Mica trong suot',
  ];

  for (const query of ['mic', 'micro']) {
    assert.deepEqual(rankedNames(query, [...accepted, ...rejected]).sort(), accepted.map(normalizeSearchText).sort(), query);
  }
});

test('HDD intent rejects SSD and NVMe products', () => {
  const accepted = ['HDD Western Digital 4TB', 'O cung HDD Seagate Barracuda 2TB'];
  const rejected = ['O cung SSD Samsung 990 PRO', 'SSD Kioxia NVMe 2TB', 'O cung gan ngoai 2TB'];
  assert.deepEqual(rankedNames('hdd', [...accepted, ...rejected]).sort(), accepted.map(normalizeSearchText).sort());
});

test('speaker intent rejects monitors that only mention integrated speakers', () => {
  const accepted = ['Loa Edifier MR3 Bluetooth', 'Bo loa Logitech Z407'];
  const rejected = ['Man hinh ASUS TUF VG279Q3R 27 inch IPS Loa', 'Gia treo loa de ban'];
  assert.deepEqual(rankedNames('loa', [...accepted, ...rejected]).sort(), accepted.map(normalizeSearchText).sort());
});

test('strict title predicates activate only for exact intent queries', () => {
  assert.equal(matchesStrictIntentProductName('windows11', normalizeSearchText('PC kem Windows 11')), false);
  assert.equal(matchesStrictIntentProductName('microphone', normalizeSearchText('Mainboard Micro-ATX')), false);
  assert.equal(matchesStrictIntentProductName('hdd', normalizeSearchText('O cung SSD NVMe')), false);
  assert.equal(matchesStrictIntentProductName('speaker', normalizeSearchText('Man hinh co Loa')), false);
  assert.equal(getSearchIntent('windows 11 pro'), null);
  assert.equal(getSearchIntent('mic hyperx'), null);
  assert.equal(getSearchIntent('hdd 4tb'), null);
  assert.equal(getSearchIntent('loa edifier'), null);
});

test('storage synonyms keep SSD and HDD semantics separate', () => {
  const ssd = injectSearchSynonyms(normalizeSearchText('O cung SSD Samsung'));
  const hdd = injectSearchSynonyms(normalizeSearchText('O cung HDD Seagate'));
  const genericStorage = injectSearchSynonyms(normalizeSearchText('O cung'));

  assert.match(ssd, /(^|\s)o cung the ran(\s|$)/);
  assert.doesNotMatch(ssd, /(^|\s)hdd(\s|$)/);
  assert.match(hdd, /(^|\s)o cung co(\s|$)/);
  assert.doesNotMatch(hdd, /(^|\s)ssd(\s|$)/);
  assert.equal(genericStorage, 'o cung');
});

test('synonyms and explicit exclusion opt-outs retain their existing behavior', () => {
  const injected = injectSearchSynonyms(normalizeSearchText('Laptop Dell'));
  assert.match(injected, /(^|\s)may tinh xach tay(\s|$)/);
  assert.equal(getActiveExclusions(normalizeSearchText('cap laptop')).includes('cap'), false);
  assert.equal(getActiveExclusions(normalizeSearchText('laptop')).includes('cap'), true);
  assert.equal(getSearchIntent(normalizeSearchText('máy in')), 'printer');
  assert.equal(getSearchIntent(normalizeSearchText('mực máy in')), null);
});
