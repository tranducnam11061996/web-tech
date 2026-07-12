// @ts-ignore php-serialize does not publish TypeScript declarations.
import { unserialize } from 'php-serialize';

export type PublicProductVideo = {
  id: string;
  embedUrl: string;
  description: string;
};

const MAX_PUBLIC_PRODUCT_VIDEOS = 20;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function normalizeDescription(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 1_000);
}

function asUrl(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw || /[\u0000-\u001F\u007F\s]/.test(raw)) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

export function normalizePublicYoutubeEmbed(value: unknown) {
  const url = asUrl(value);
  if (!url || !['https:', 'http:'].includes(url.protocol)) return null;

  const host = url.hostname.toLowerCase();
  let videoId = '';
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] || '';
  } else if (youtubeHosts.has(host)) {
    videoId = url.searchParams.get('v') || '';
    if (!videoId) {
      const [kind, candidate] = url.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(kind)) videoId = candidate || '';
    }
  }

  if (!youtubeVideoIdPattern.test(videoId)) return null;
  return { id: videoId, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1` };
}

function videoEntries(raw: unknown): unknown[] {
  const source = String(raw || '').trim();
  if (!source) return [];

  try {
    const parsed = unserialize(source);
    if (parsed && typeof parsed === 'object') return Object.values(parsed as Record<string, unknown>);
  } catch {
    // Admin also accepts a direct legacy YouTube URL; treat malformed serialization as one candidate.
  }
  return [source];
}

/** Converts legacy `video_code` into the minimum safe public video contract. */
export function getPublicProductVideos(raw: unknown): PublicProductVideo[] {
  const seen = new Set<string>();
  const videos: PublicProductVideo[] = [];

  for (const entry of videoEntries(raw)) {
    const record = entry && typeof entry === 'object' ? entry as Record<string, unknown> : null;
    const normalized = normalizePublicYoutubeEmbed(record ? record.url : entry);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    videos.push({ ...normalized, description: normalizeDescription(record?.description) });
    if (videos.length >= MAX_PUBLIC_PRODUCT_VIDEOS) break;
  }
  return videos;
}

export function hasDisplayableSpecifications(value: unknown) {
  return String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|#160|#xA0);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0;
}
