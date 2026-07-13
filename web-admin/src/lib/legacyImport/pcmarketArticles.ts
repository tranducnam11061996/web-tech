import crypto from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

export const PCM_ARTICLE_SOURCE = 'https://pcmarket.vn/export/article.php';
export const PCM_ARTICLE_CONFIRMATION = 'IMPORT_PCMARKET_ARTICLES';
export const PCM_ARTICLE_ROLLBACK_CONFIRMATION = 'ROLLBACK_PCMARKET_ARTICLES';
export const PCM_ARTICLE_QUARANTINED_IDS = [83] as const;

const EXPECTED_ARTICLE_CATEGORIES = new Map<number, { name: string; path: string }>([
  [1, { name: 'Tin Công Nghệ', path: 'tin-cong-nghe.html' }],
  [2, { name: 'Tin Công Ty', path: 'tin-cong-ty.html' }],
  [3, { name: 'Bảo Hành', path: 'bao-hanh.html' }],
  [4, { name: 'Thủ thuật máy tính', path: 'thu-thuat-may-tinh.html' }],
]);

const legacyText = z.union([z.string(), z.number()]).nullable().transform((value) => String(value ?? ''));

function validLegacyTimestamp(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && date.getUTCHours() === hour && date.getUTCMinutes() === minute && date.getUTCSeconds() === second;
}

export const pcmarketArticleCategoryReferenceSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().max(300),
  url: z.string().url().max(1000),
}).strict();

export const pcmarketArticleSchema = z.object({
  id: z.coerce.number().int().positive(),
  article_category: z.array(pcmarketArticleCategoryReferenceSchema).max(100),
  title: legacyText,
  url_index: legacyText,
  url: z.string().url().max(1000),
  image: legacyText,
  ordering: z.coerce.number().int().min(-32768).max(32767),
  status: z.coerce.number().int().min(0).max(1),
  meta_title: legacyText,
  meta_keywords: legacyText,
  meta_description: legacyText,
  comment_count: z.coerce.number().int().nonnegative().max(16_777_215),
  summary: legacyText,
  content: legacyText,
  create_date: legacyText.refine(validLegacyTimestamp, 'Invalid legacy create timestamp'),
  last_update: legacyText.refine(validLegacyTimestamp, 'Invalid legacy update timestamp'),
}).strict();

export const pcmarketArticleEnvelopeSchema = z.object({
  current_page: z.coerce.number().int().positive().max(100),
  size: z.coerce.number().int().min(1).max(500),
  total_page: z.coerce.number().int().positive().max(100),
  total_item: z.coerce.number().int().nonnegative().max(5_000),
  items: z.array(pcmarketArticleSchema).max(500),
}).strict();

export type PcmarketArticle = z.infer<typeof pcmarketArticleSchema>;

export type NormalizedArticleCategoryLink = {
  categoryId: number;
  ordering: number;
  createTime: number;
  articleUpdateTime: number;
  articleDisplayTime: number;
};

export type NormalizedArticle = {
  id: number;
  title: string;
  slug: string;
  requestPath: string;
  externalUrl: string;
  thumbnail: string;
  categoryId: number;
  categoryCsv: string;
  categoryIds: number[];
  ordering: number;
  status: 0 | 1;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  summary: string;
  content: string;
  searchFulltext: string;
  commentCount: number;
  createDate: string;
  lastUpdate: string;
  links: NormalizedArticleCategoryLink[];
};

export type QuarantinedArticle = {
  id: number;
  reason: string;
  sourceUrl: string;
  status: number;
  normalizedJson: string;
};

export type ArticleImportReport = {
  sourceTotal: number;
  imported: number;
  enabled: number;
  disabled: number;
  thumbnailCount: number;
  relationCountRaw: number;
  relationCountUnique: number;
  duplicateRelations: Array<{ articleId: number; categoryId: number }>;
  noCategoryIds: number[];
  multiCategoryIds: number[];
  htmlExtensionCount: number;
  extensionlessCount: number;
  truncatedHtmlIds: number[];
  quarantined: Array<Omit<QuarantinedArticle, 'normalizedJson'>>;
  topLevelImageHosts: Record<string, number>;
  embeddedHosts: Record<string, number>;
};

function fitChars(value: string, max: number, label: string) {
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} exceeds ${max} characters`);
  return normalized;
}

function assertTextCapacity(value: string, label: string) {
  if (Buffer.byteLength(value, 'utf8') > 65_535) throw new Error(`${label} exceeds MySQL TEXT capacity`);
  return value;
}

function safeHttpsUrl(value: string, base = 'https://pcmarket.vn/') {
  const raw = value.trim();
  if (!raw || /^https?:\/\//i.test(raw) && raw.toLowerCase().startsWith('http://')) return '';
  try {
    const parsed = new URL(raw.startsWith('//') ? `https:${raw}` : raw, base);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function pcmarketUrl(value: string, max: number, label: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'pcmarket.vn' || parsed.username || parsed.password) {
    throw new Error(`${label} must use HTTPS on pcmarket.vn`);
  }
  const normalized = parsed.toString();
  if (normalized.length > max) throw new Error(`${label} exceeds ${max} characters`);
  return normalized;
}

export function articlePathFromUrl(value: string) {
  const parsed = new URL(pcmarketUrl(value, 250, 'Article URL'));
  if (parsed.search || parsed.hash) throw new Error(`Article URL must not contain a query or fragment: ${value}`);
  const pathname = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '');
  if (!pathname || pathname.includes('/') || !/^[a-zA-Z0-9._-]+$/.test(pathname)) {
    throw new Error(`Unsafe article path: ${value}`);
  }
  return pathname;
}

export function sanitizeLegacyArticleHtml(value: string) {
  if (!value.trim()) return '';
  const withVideoLinks = value.replace(
    /<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>(?:\s*<\/iframe\s*>)?/gi,
    (_match, _quote, source: string) => {
      const href = safeHttpsUrl(source);
      if (!href) return '';
      try {
        const host = new URL(href).hostname.toLowerCase();
        if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
          const escaped = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
          return `<a href="${escaped}">Xem video YouTube</a>`;
        }
      } catch { /* sanitized below */ }
      return '';
    },
  );
  const transformUrl = (attributes: Record<string, string>, key: string) => {
    const next = { ...attributes };
    const normalized = safeHttpsUrl(next[key] || '');
    if (normalized) next[key] = normalized;
    else delete next[key];
    return next;
  };
  return sanitizeHtml(withVideoLinks, {
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
      a: (_name, attributes) => ({
        tagName: 'a',
        attribs: { ...transformUrl(attributes, 'href'), rel: 'noopener noreferrer nofollow' },
      }),
      img: (_name, attributes) => ({
        tagName: 'img',
        attribs: { ...transformUrl(attributes, 'src'), loading: 'lazy' },
      }),
      video: (_name, attributes) => ({
        tagName: 'video',
        attribs: transformUrl(transformUrl(attributes, 'src'), 'poster'),
      }),
      source: (_name, attributes) => ({ tagName: 'source', attribs: transformUrl(attributes, 'src') }),
    },
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
  }).trim();
}

export function articlePlainText(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

export function legacyTimestampEpoch(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Invalid legacy timestamp: ${value}`);
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  return Math.floor(Date.UTC(year, month - 1, day, hour - 7, minute, second) / 1000);
}

export function canonicalArticleSnapshot(articles: PcmarketArticle[]) {
  return JSON.stringify([...articles].sort((left, right) => left.id - right.id));
}

export function articleSha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function incrementHost(inventory: Record<string, number>, value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    inventory[host] = (inventory[host] || 0) + 1;
  } catch { /* invalid values are rejected elsewhere */ }
}

export function normalizePcmarketArticles(input: unknown[]) {
  const source = input.map((item) => pcmarketArticleSchema.parse(item)).sort((left, right) => left.id - right.id);
  if (new Set(source.map((article) => article.id)).size !== source.length) throw new Error('Duplicate article IDs detected');
  const articles: NormalizedArticle[] = [];
  const quarantined: QuarantinedArticle[] = [];
  const duplicateRelations: ArticleImportReport['duplicateRelations'] = [];
  const topLevelImageHosts: Record<string, number> = {};
  const embeddedHosts: Record<string, number> = {};
  let relationCountRaw = 0;

  for (const article of source) {
    relationCountRaw += article.article_category.length;
    if (article.id === 83) {
      quarantined.push({
        id: article.id,
        reason: 'Enabled source article has an empty title/slug and unsafe /.html route',
        sourceUrl: article.url,
        status: article.status,
        normalizedJson: JSON.stringify(article),
      });
      continue;
    }
    const title = fitChars(article.title, 200, `Article ${article.id} title`);
    if (!title) throw new Error(`Article ${article.id} has an empty title`);
    const slug = articlePathFromUrl(article.url);
    const seen = new Set<number>();
    const categoryIds: number[] = [];
    for (const category of article.article_category) {
      const categoryUrl = new URL(category.url);
      if (categoryUrl.protocol !== 'https:' || categoryUrl.hostname.toLowerCase() !== 'pcmarket.vn') {
        throw new Error(`Article ${article.id} category ${category.id} has an invalid URL`);
      }
      const expectedCategory = EXPECTED_ARTICLE_CATEGORIES.get(category.id);
      const categoryPath = decodeURIComponent(categoryUrl.pathname).replace(/^\/+|\/+$/g, '');
      if (!expectedCategory || category.name.trim() !== expectedCategory.name || categoryPath !== expectedCategory.path) {
        throw new Error(`Article ${article.id} category ${category.id} does not match imported article taxonomy`);
      }
      if (seen.has(category.id)) {
        duplicateRelations.push({ articleId: article.id, categoryId: category.id });
        continue;
      }
      seen.add(category.id);
      categoryIds.push(category.id);
    }
    const thumbnail = article.image.trim() ? pcmarketUrl(article.image, 150, `Article ${article.id} thumbnail`) : '';
    if (thumbnail) incrementHost(topLevelImageHosts, thumbnail);
    for (const match of article.content.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi)) {
      const normalized = safeHttpsUrl(match[2]);
      if (normalized) incrementHost(embeddedHosts, normalized);
    }
    const summary = assertTextCapacity(articlePlainText(article.summary), `Article ${article.id} summary`);
    const content = sanitizeLegacyArticleHtml(article.content);
    const createTime = legacyTimestampEpoch(article.create_date);
    const updateTime = legacyTimestampEpoch(article.last_update);
    articles.push({
      id: article.id,
      title,
      slug,
      requestPath: `/${slug}`,
      externalUrl: pcmarketUrl(article.url, 250, `Article ${article.id} URL`),
      thumbnail,
      categoryId: categoryIds[0] || 0,
      categoryCsv: categoryIds.length ? `,${categoryIds.join(',')},` : '',
      categoryIds,
      ordering: article.ordering,
      status: article.status as 0 | 1,
      metaTitle: fitChars(articlePlainText(article.meta_title), 250, `Article ${article.id} meta title`),
      metaKeywords: assertTextCapacity(articlePlainText(article.meta_keywords), `Article ${article.id} meta keywords`),
      metaDescription: assertTextCapacity(articlePlainText(article.meta_description), `Article ${article.id} meta description`),
      summary,
      content,
      searchFulltext: assertTextCapacity([title, summary].filter(Boolean).join(' '), `Article ${article.id} search text`),
      commentCount: article.comment_count,
      createDate: article.create_date,
      lastUpdate: article.last_update,
      links: categoryIds.map((categoryId) => ({
        categoryId,
        ordering: article.ordering,
        createTime,
        articleUpdateTime: updateTime,
        articleDisplayTime: createTime,
      })),
    });
  }

  const paths = articles.map((article) => article.slug);
  if (new Set(paths).size !== paths.length) throw new Error('Duplicate article paths detected');
  const report: ArticleImportReport = {
    sourceTotal: source.length,
    imported: articles.length,
    enabled: articles.filter((article) => article.status === 1).length,
    disabled: articles.filter((article) => article.status === 0).length,
    thumbnailCount: articles.filter((article) => Boolean(article.thumbnail)).length,
    relationCountRaw,
    relationCountUnique: articles.reduce((total, article) => total + article.links.length, 0),
    duplicateRelations,
    noCategoryIds: articles.filter((article) => article.categoryIds.length === 0).map((article) => article.id),
    multiCategoryIds: articles.filter((article) => article.categoryIds.length > 1).map((article) => article.id),
    htmlExtensionCount: articles.filter((article) => article.slug.endsWith('.html')).length,
    extensionlessCount: articles.filter((article) => !article.slug.endsWith('.html')).length,
    truncatedHtmlIds: source.filter((article) => article.id === 122 && Buffer.byteLength(article.content, 'utf8') === 65_535).map((article) => article.id),
    quarantined: quarantined.map(({ normalizedJson: _normalizedJson, ...item }) => item),
    topLevelImageHosts,
    embeddedHosts,
  };
  return { articles, quarantined, report };
}
