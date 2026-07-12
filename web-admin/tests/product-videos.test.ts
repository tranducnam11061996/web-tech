import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-ignore php-serialize does not publish TypeScript declarations.
import { serialize } from 'php-serialize';
import { getPublicProductVideos, hasDisplayableSpecifications, normalizePublicYoutubeEmbed } from '../src/lib/productVideos';

test('normalizes one or many legacy PHP-serialized YouTube videos', () => {
  const videos = getPublicProductVideos('a:2:{i:0;a:2:{s:3:"url";s:28:"https://youtu.be/ASXFmZ9XGoE";s:11:"description";s:5:"First";}i:1;a:2:{s:3:"url";s:43:"https://www.youtube.com/watch?v=8DbkCHnF6Kc";s:11:"description";s:0:"";}}');
  assert.deepEqual(videos, [
    { id: 'ASXFmZ9XGoE', embedUrl: 'https://www.youtube-nocookie.com/embed/ASXFmZ9XGoE?rel=0&modestbranding=1', description: 'First' },
    { id: '8DbkCHnF6Kc', embedUrl: 'https://www.youtube-nocookie.com/embed/8DbkCHnF6Kc?rel=0&modestbranding=1', description: '' },
  ]);
});

test('rejects empty, malformed, duplicate, and non-YouTube legacy video values', () => {
  assert.deepEqual(getPublicProductVideos('a:0:{}'), []);
  assert.deepEqual(getPublicProductVideos('a:1:{broken'), []);
  assert.equal(normalizePublicYoutubeEmbed('www.youtube.com/watch?v=LEwD20F99eE')?.id, 'LEwD20F99eE');
  assert.equal(normalizePublicYoutubeEmbed('https://evil.example/watch?v=LEwD20F99eE'), null);
  assert.deepEqual(getPublicProductVideos('a:2:{i:0;a:1:{s:3:"url";s:28:"https://youtu.be/ASXFmZ9XGoE";}i:1;a:1:{s:3:"url";s:28:"https://youtu.be/ASXFmZ9XGoE";}}'), [
    { id: 'ASXFmZ9XGoE', embedUrl: 'https://www.youtube-nocookie.com/embed/ASXFmZ9XGoE?rel=0&modestbranding=1', description: '' },
  ]);
});

test('bounds public videos and detects non-empty specifications', () => {
  const entries = Array.from({ length: 25 }, (_, index) => ({
    url: `https://youtu.be/${String(index).padStart(11, '0')}`,
    description: '',
  }));
  assert.equal(getPublicProductVideos(serialize(entries)).length, 20);
  assert.equal(hasDisplayableSpecifications('<p>&nbsp;</p><!-- empty -->'), false);
  assert.equal(hasDisplayableSpecifications('<table><tr><td>CPU</td></tr></table>'), true);
});
