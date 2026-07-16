import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeProductPromotions,
  parseProductEditorPromotions,
} from '../src/lib/productPromotionRichText';

test('product editor promotions split paragraphs, breaks and list items in source order', () => {
  const promotions = parseProductEditorPromotions(12767, `
    <p><strong>Chương trình một</strong></p>
    <p>Dòng hai<br><span>Dòng ba</span></p>
    <ul><li>Mục bốn</li><li>Mục năm</li></ul>
  `);

  assert.deepEqual(promotions.map((promotion) => promotion.text), [
    'Chương trình một',
    'Dòng hai',
    'Dòng ba',
    'Mục bốn',
    'Mục năm',
  ]);
  assert.deepEqual(promotions.map((promotion) => promotion.id), [
    'product-editor:12767:0',
    'product-editor:12767:1',
    'product-editor:12767:2',
    'product-editor:12767:3',
    'product-editor:12767:4',
  ]);
  assert.ok(promotions[0].html?.includes('<strong>Chương trình một</strong>'));
  assert.ok(promotions.every((promotion) => promotion.source === 'product-editor' && promotion.detailUrl === ''));
});

test('product editor promotions preserve allowed TinyMCE formatting across line breaks', () => {
  const promotions = parseProductEditorPromotions(9, `
    <p style="text-align: center; position: fixed">
      <span onclick="alert(1)" style="color: rgb(255, 0, 0); background-color: #fff; text-decoration: underline; display: none">
        Chữ đỏ<br>Vẫn đỏ
      </span>
    </p>
  `);

  assert.equal(promotions.length, 2);
  for (const promotion of promotions) {
    assert.match(promotion.html || '', /text-align:\s*center/i);
    assert.match(promotion.html || '', /color:\s*rgb\(255, 0, 0\)/i);
    assert.match(promotion.html || '', /background-color:\s*#fff/i);
    assert.match(promotion.html || '', /text-decoration:\s*underline/i);
    assert.doesNotMatch(promotion.html || '', /onclick|position|display/i);
  }
});

test('product editor promotions discard empty and unsafe embedded content while keeping safe links', () => {
  const promotions = parseProductEditorPromotions(10, `
    <p>&nbsp;</p>
    <script>alert(1)</script>
    <form><p>Không hiển thị form</p></form>
    <p><a href="javascript:alert(1)" onmouseover="alert(2)">Không an toàn</a></p>
    <p><a href="/khuyen-mai/noi-bo">Nội bộ</a></p>
    <p><a href="https://example.com/deal">HTTPS</a></p>
    <p><a href="http://example.com/deal">HTTP</a></p>
  `);

  assert.deepEqual(promotions.map((promotion) => promotion.text), [
    'Không an toàn',
    'Nội bộ',
    'HTTPS',
    'HTTP',
  ]);
  assert.doesNotMatch(promotions.map((promotion) => promotion.html).join(''), /script|form|onmouseover|javascript:/i);
  assert.match(promotions[1].html || '', /href="\/khuyen-mai\/noi-bo"/);
  assert.match(promotions[2].html || '', /href="https:\/\/example\.com\/deal"/);
  assert.match(promotions[2].html || '', /target="_blank"/);
  assert.doesNotMatch(promotions[3].html || '', /href=/);
});

test('managed promotions always precede product editor promotions', () => {
  const editorPromotions = parseProductEditorPromotions(12, '<p>Editor một</p><p>Editor hai</p>');
  const merged = mergeProductPromotions([
    { id: 99, text: 'Ưu đãi quản lý', detailUrl: '/uu-dai' },
  ], editorPromotions);

  assert.deepEqual(merged.map((promotion) => promotion.source), ['managed', 'product-editor', 'product-editor']);
  assert.deepEqual(merged.map((promotion) => promotion.text), ['Ưu đãi quản lý', 'Editor một', 'Editor hai']);
  assert.equal(merged[0].id, 99);
});
