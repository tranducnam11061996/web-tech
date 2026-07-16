export const PCM_YOUTUBE_CHANNEL_ID = 'UCc4sRlnJNd3QK2vmwbu3Z0A';
export const PCM_YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@PCM.channel';

const PCM_YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${PCM_YOUTUBE_CHANNEL_ID}`;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const MAX_FEED_BYTES = 512 * 1024;
const FEED_TIMEOUT_MS = 3_000;

export type PublicYoutubeVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  watchUrl: string;
};

export type PublicYoutubeChannel = {
  available: boolean;
  channelUrl: string;
  videos: PublicYoutubeVideo[];
};

function decodeXmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    quot: '"',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, key: string) => {
    if (key.startsWith('#x') || key.startsWith('#X')) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    }
    if (key.startsWith('#')) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    }
    return named[key.toLowerCase()] || entity;
  });
}

function tagValue(entry: string, tagName: string) {
  const match = entry.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  if (!match) return '';
  return decodeXmlEntities(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim());
}

export function parseYoutubeChannelFeed(xml: string, expectedChannelId = PCM_YOUTUBE_CHANNEL_ID) {
  if (Buffer.byteLength(xml, 'utf8') > MAX_FEED_BYTES) throw new Error('YOUTUBE_FEED_TOO_LARGE');
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  const videos: PublicYoutubeVideo[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const videoId = tagValue(entry, 'yt:videoId');
    const channelId = tagValue(entry, 'yt:channelId');
    const title = tagValue(entry, 'title');
    const publishedAt = tagValue(entry, 'published');
    if (!VIDEO_ID_PATTERN.test(videoId) || channelId !== expectedChannelId || !title || !publishedAt || seen.has(videoId)) continue;
    const publishedTime = new Date(publishedAt).getTime();
    if (!Number.isFinite(publishedTime)) continue;
    seen.add(videoId);
    videos.push({
      videoId,
      title,
      publishedAt: new Date(publishedTime).toISOString(),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return videos
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, 6);
}

type YoutubeFeedLoaderOptions = {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  logWarning?: boolean;
};

export async function loadPcmYoutubeChannel({
  fetcher = fetch,
  timeoutMs = FEED_TIMEOUT_MS,
  logWarning = true,
}: YoutubeFeedLoaderOptions = {}): Promise<PublicYoutubeChannel> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(PCM_YOUTUBE_FEED_URL, {
      headers: { accept: 'application/atom+xml, application/xml;q=0.9, text/xml;q=0.8' },
      next: { revalidate: 900 },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`YOUTUBE_FEED_HTTP_${response.status}`);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_FEED_BYTES) throw new Error('YOUTUBE_FEED_TOO_LARGE');
    const videos = parseYoutubeChannelFeed(await response.text());
    return { available: true, channelUrl: PCM_YOUTUBE_CHANNEL_URL, videos };
  } catch (error) {
    if (logWarning) console.warn('Unable to load PCM YouTube feed:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    return { available: false, channelUrl: PCM_YOUTUBE_CHANNEL_URL, videos: [] };
  } finally {
    clearTimeout(timeout);
  }
}
