import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminApiError } from '../src/lib/admin/common';
import { parseBuyingGuidePayload } from '../src/lib/buyingGuides';

test('buying guide normalizes text and preserves item order', () => {
  const result = parseBuyingGuidePayload({
    enabled: true,
    heading: '  Vì sao   nên mua  ',
    introduction: 'Dòng một\r\nDòng hai',
    items: [
      { question: '  Câu   đầu tiên? ', answer: ' Trả lời 1 ', isActive: true, defaultExpanded: true },
      { question: 'Câu thứ hai?', answer: 'Trả lời 2', isActive: true, defaultExpanded: false },
    ],
  });
  assert.equal(result.heading, 'Vì sao nên mua');
  assert.equal(result.introduction, 'Dòng một\nDòng hai');
  assert.deepEqual(result.items.map((item) => item.question), ['Câu đầu tiên?', 'Câu thứ hai?']);
  assert.equal(result.items[0].defaultExpanded, true);
});

test('disabled buying guide may be saved incomplete', () => {
  const result = parseBuyingGuidePayload({
    enabled: false,
    heading: '',
    introduction: '',
    items: [{ question: '', answer: '', isActive: false, defaultExpanded: false }],
  });
  assert.equal(result.enabled, false);
  assert.equal(result.items.length, 1);
});

test('enabled buying guide requires a heading and complete active item', () => {
  assert.throws(
    () => parseBuyingGuidePayload({ enabled: true, heading: '', introduction: '', items: [] }),
    (error: unknown) => error instanceof AdminApiError && error.status === 400 && Boolean(error.fields?.heading),
  );
  assert.throws(
    () => parseBuyingGuidePayload({ enabled: true, heading: 'Tiêu đề', introduction: '', items: [{ question: 'Câu hỏi', answer: '', isActive: true }] }),
    (error: unknown) => error instanceof AdminApiError && Boolean(error.fields?.['items.0.answer']),
  );
});

test('buying guide enforces item and field limits', () => {
  const tooManyItems = Array.from({ length: 51 }, () => ({ question: '', answer: '', isActive: false }));
  assert.throws(() => parseBuyingGuidePayload({ enabled: false, heading: '', introduction: '', items: tooManyItems }));
  assert.throws(() => parseBuyingGuidePayload({ enabled: false, heading: 'x'.repeat(256), introduction: '', items: [] }));
  assert.throws(() => parseBuyingGuidePayload({ enabled: false, heading: '', introduction: '', items: [{ question: 'x'.repeat(301), answer: '', isActive: false }] }));
});
