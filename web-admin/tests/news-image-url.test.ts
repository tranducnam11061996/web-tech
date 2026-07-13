import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNewsImageUrl } from '../src/lib/newsImageUrl';

test('news image resolver preserves safe HTTPS URLs and expands legacy filenames', () => {
  assert.equal(resolveNewsImageUrl('https://pcmarket.vn/media/news/a.jpg'), 'https://pcmarket.vn/media/news/a.jpg');
  assert.equal(resolveNewsImageUrl('legacy.jpg'), 'https://hacom.vn/media/news/legacy.jpg');
  assert.equal(resolveNewsImageUrl('http://pcmarket.vn/a.jpg'), '');
  assert.equal(resolveNewsImageUrl('data:image/png;base64,x'), '');
});
