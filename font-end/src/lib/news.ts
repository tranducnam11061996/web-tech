import sanitizeHtml from 'sanitize-html';

export type NewsItem = {
  id: number;
  title: string;
  url: string;
  request_path?: string;
  thumnail: string;
  summary: string;
  createDate: string;
  lastUpdate?: string;
  visit?: number;
  comment_count?: number;
  category_name?: string | null;
  category_id?: number;
};

export type NewsCategory = {
  id: number;
  name: string;
  url: string;
  summary?: string;
  description?: string;
  image?: string;
  totalNews: number;
  visit?: number;
  isFeatured?: boolean;
};

export type YoutubeChannelVideo = {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  watchUrl: string;
};

export type YoutubeChannelPayload = {
  available: boolean;
  channelUrl: string;
  videos: YoutubeChannelVideo[];
};

export type NewsCategoryTrailItem = {
  id: number;
  name: string;
  slug: string;
};

export type NewsArticle = NewsItem & {
  content?: string;
  tags?: string;
  categoryTrail?: NewsCategoryTrailItem[];
  relatedNews?: NewsItem[];
};

export function sanitizeNewsHtml(value: unknown) {
  return sanitizeHtml(String(value || ''), {
    allowedTags: [
      'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'dd', 'del', 'div', 'dl',
      'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li',
      'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot',
      'th', 'thead', 'tr', 'u', 'ul', 'video', 'source',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      video: ['src', 'poster', 'controls', 'width', 'height'],
      source: ['src', 'type'],
      table: ['border', 'cellpadding', 'cellspacing'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope'],
    },
    allowedSchemes: ['https'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_name, attributes) => ({ tagName: 'a', attribs: { ...attributes, rel: 'noopener noreferrer nofollow' } }),
      img: (_name, attributes) => ({ tagName: 'img', attribs: { ...attributes, loading: 'lazy' } }),
    },
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
  });
}

export function formatNewsDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function formatNewsRelativeDate(value: string, now = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const elapsed = Math.max(0, now - date.getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return 'Vừa đăng';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatNewsDate(value);
}

export function formatNewsDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value || '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`.trim();
}

export function newsPlainText(value: unknown) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}
