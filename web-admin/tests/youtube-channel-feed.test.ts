import assert from 'node:assert/strict';
import test from 'node:test';
import { loadPcmYoutubeChannel, PCM_YOUTUBE_CHANNEL_ID, parseYoutubeChannelFeed } from '../src/lib/youtubeChannelFeed';

function entry({
  videoId,
  channelId = PCM_YOUTUBE_CHANNEL_ID,
  title = 'Video &amp; mới',
  published = '2026-07-16T07:20:03+00:00',
}: {
  videoId: string;
  channelId?: string;
  title?: string;
  published?: string;
}) {
  return `<entry><yt:videoId>${videoId}</yt:videoId><yt:channelId>${channelId}</yt:channelId><title>${title}</title><published>${published}</published></entry>`;
}

test('YouTube feed parser validates channel/video identity, decodes titles and sorts newest first', () => {
  const xml = `<feed>
    ${entry({ videoId: 'aaaaaaaaaaa', published: '2026-07-14T07:20:03Z' })}
    ${entry({ videoId: 'bbbbbbbbbbb', title: '<![CDATA[Video số &#50;]]>', published: '2026-07-16T07:20:03Z' })}
    ${entry({ videoId: 'invalid id!' })}
    ${entry({ videoId: 'ccccccccccc', channelId: 'UCwrongchannel0000000000' })}
    ${entry({ videoId: 'aaaaaaaaaaa', published: '2026-07-15T07:20:03Z' })}
  </feed>`;
  const videos = parseYoutubeChannelFeed(xml);
  assert.deepEqual(videos.map((video) => video.videoId), ['bbbbbbbbbbb', 'aaaaaaaaaaa']);
  assert.equal(videos[0].title, 'Video số 2');
  assert.equal(videos[1].title, 'Video & mới');
  assert.equal(videos[0].thumbnailUrl, 'https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg');
  assert.equal(videos[0].watchUrl, 'https://www.youtube.com/watch?v=bbbbbbbbbbb');
});

test('YouTube feed parser caps output at six and rejects oversized responses', () => {
  const xml = `<feed>${Array.from({ length: 8 }, (_, index) => entry({
    videoId: `${String(index).padStart(11, '0')}`,
    published: `2026-07-${String(index + 1).padStart(2, '0')}T07:20:03Z`,
  })).join('')}</feed>`;
  assert.equal(parseYoutubeChannelFeed(xml).length, 6);
  assert.throws(() => parseYoutubeChannelFeed('x'.repeat(512 * 1024 + 1)), /YOUTUBE_FEED_TOO_LARGE/);
});

test('YouTube loader degrades network errors and timeouts to an unavailable public payload', async () => {
  const networkFailure = await loadPcmYoutubeChannel({
    fetcher: async () => { throw new Error('network down'); },
    logWarning: false,
  });
  assert.deepEqual(networkFailure, {
    available: false,
    channelUrl: 'https://www.youtube.com/@PCM.channel',
    videos: [],
  });

  const timedOut = await loadPcmYoutubeChannel({
    timeoutMs: 1,
    logWarning: false,
    fetcher: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  });
  assert.equal(timedOut.available, false);
  assert.deepEqual(timedOut.videos, []);
});
