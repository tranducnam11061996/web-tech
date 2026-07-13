import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

export const PCM_CATEGORY_SOURCE = 'https://pcmarket.vn/export/product_category.php';
export const PCM_CATEGORY_CONFIRMATION = 'REPLACE_PRODUCT_CATEGORIES';

const text = z.union([z.string(), z.number()]).nullable().transform((value) => String(value ?? ''));
function isLegacyTimestamp(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2]
    && date.getUTCHours() === parts[3] && date.getUTCMinutes() === parts[4] && date.getUTCSeconds() === parts[5];
}
const legacyTimestamp = text.refine(
  isLegacyTimestamp,
  'Invalid legacy timestamp',
);
const priceRange = text.refine((value) => !value || /^\d+(;\d+)*;?$/.test(value), 'Invalid price range');
const attributeSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: text,
  status: z.coerce.number().int().min(0).max(1),
}).strict();

export const pcmarketCategorySchema = z.object({
  id: z.coerce.number().int().positive(),
  url_index: text,
  url: z.string().url(),
  name: text,
  tags: text,
  summary: text,
  description: text,
  image: text,
  parentId: z.coerce.number().int().nonnegative(),
  status: z.enum(['on', 'off']),
  ordering: z.coerce.number().int(),
  price_range: priceRange,
  create_time: legacyTimestamp,
  last_update: legacyTimestamp,
  meta_title: text,
  meta_keyword: text,
  meta_description: text,
  attributes: z.array(attributeSchema).max(500),
}).strict();

export const pcmarketCategoryEnvelopeSchema = z.object({
  current_page: z.coerce.number().int().positive(),
  size: z.coerce.number().int().min(1).max(500),
  total_page: z.coerce.number().int().positive().max(10_000),
  total_item: z.coerce.number().int().nonnegative().max(100_000),
  items: z.array(pcmarketCategorySchema).max(500),
}).strict();

export type PcmarketCategory = z.infer<typeof pcmarketCategorySchema>;
export type PcmarketAttribute = z.infer<typeof attributeSchema>;

export type NormalizedCategory = {
  id: number;
  urlIndex: string;
  url: string;
  requestPath: string;
  name: string;
  parentId: number;
  ordering: number;
  status: 0 | 1;
  summary: string;
  staticHtml: string;
  imgUrl: string;
  priceRange: string;
  tags: string;
  metaTitle: string;
  metaKeyword: string;
  metaDescription: string;
  createTime: string;
  lastUpdate: string;
  isParent: 0 | 1;
  childListId: string;
  catPath: string;
  attributes: PcmarketAttribute[];
};

export type CategoryImportReport = {
  total: number;
  roots: number;
  maxDepth: number;
  enabled: number;
  disabled: number;
  enabledUnderDisabled: number[];
  duplicateSourcePaths: Array<{ sourcePath: string; categoryIds: number[]; resolvedPaths: string[] }>;
  pendingAttributeLinks: number;
  pendingAttributeDefinitions: number;
};

function absolutePcmarketUrl(value: string) {
  const raw = value.trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw, 'https://pcmarket.vn/');
    if (parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function transformUrlAttribute(attribs: Record<string, string>, key: 'href' | 'src' | 'poster') {
  if (attribs[key]) attribs[key] = absolutePcmarketUrl(attribs[key]);
  return attribs;
}

export function sanitizeLegacyCategoryHtml(value: string) {
  if (!value.trim()) return '';
  const withVideoLinks = value.replace(
    /<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>(?:\s*<\/iframe\s*>)?/gi,
    (_match, _quote, source: string) => {
      const href = absolutePcmarketUrl(source);
      try {
        const host = new URL(href).hostname.toLowerCase();
        if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
          return `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">Xem video YouTube</a>`;
        }
      } catch { /* invalid iframe source */ }
      return '';
    },
  );
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
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: { ...transformUrlAttribute(attribs, 'href'), rel: 'noopener noreferrer' },
      }),
      img: (_tagName, attribs) => ({ tagName: 'img', attribs: transformUrlAttribute(attribs, 'src') }),
      video: (_tagName, attribs) => ({
        tagName: 'video',
        attribs: transformUrlAttribute(transformUrlAttribute(attribs, 'src'), 'poster'),
      }),
      source: (_tagName, attribs) => ({ tagName: 'source', attribs: transformUrlAttribute(attribs, 'src') }),
      iframe: (_tagName, attribs) => {
        const href = absolutePcmarketUrl(attribs.src || '');
        let allowedHref = '';
        try {
          const host = new URL(href).hostname.toLowerCase();
          if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') allowedHref = href;
        } catch { /* invalid iframe source */ }
        const safeAttribs: Record<string, string> = allowedHref
          ? { href: allowedHref, rel: 'noopener noreferrer', target: '_blank' }
          : {};
        return { tagName: allowedHref ? 'a' : 'span', attribs: safeAttribs };
      },
    },
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
  }).trim();
}

export function sourcePathFromUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'pcmarket.vn') {
    throw new Error(`Category URL must use https://pcmarket.vn: ${value}`);
  }
  if (parsed.search || parsed.hash) throw new Error(`Category URL must not contain query or fragment: ${value}`);
  const path = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '');
  if (!path || path.includes('/') || !/^[a-zA-Z0-9._-]+$/.test(path)) throw new Error(`Unsafe category path: ${value}`);
  return path;
}

export function resolveDuplicateCategoryPaths(categories: PcmarketCategory[]) {
  const grouped = new Map<string, PcmarketCategory[]>();
  for (const category of categories) {
    const path = sourcePathFromUrl(category.url);
    const group = grouped.get(path) || [];
    group.push(category);
    grouped.set(path, group);
  }
  const paths = new Map<number, string>();
  const collisions: CategoryImportReport['duplicateSourcePaths'] = [];
  for (const [sourcePath, group] of grouped) {
    const sorted = [...group].sort((left, right) => left.id - right.id);
    const resolvedPaths = sorted.map((category, index) => {
      if (index === 0) return sourcePath;
      const extension = sourcePath.match(/(\.html(?:-\d+)?)$/i)?.[1] || '';
      const stem = extension ? sourcePath.slice(0, -extension.length) : sourcePath;
      return `${stem}-category-${category.id}${extension}`;
    });
    sorted.forEach((category, index) => paths.set(category.id, resolvedPaths[index]));
    if (sorted.length > 1) collisions.push({
      sourcePath,
      categoryIds: sorted.map((category) => category.id),
      resolvedPaths,
    });
  }
  return { paths, collisions };
}

export function normalizePcmarketCategories(input: unknown[]): { categories: NormalizedCategory[]; report: CategoryImportReport } {
  const categories = input.map((item) => pcmarketCategorySchema.parse(item)).sort((left, right) => left.id - right.id);
  const byId = new Map(categories.map((category) => [category.id, category]));
  if (byId.size !== categories.length) throw new Error('Duplicate category IDs detected');
  for (const category of categories) {
    if (category.parentId === category.id) throw new Error(`Category ${category.id} references itself`);
    if (category.parentId && !byId.has(category.parentId)) throw new Error(`Category ${category.id} has missing parent ${category.parentId}`);
  }

  const depthMemo = new Map<number, number>();
  const ancestors = (id: number, visiting = new Set<number>()): number[] => {
    if (visiting.has(id)) throw new Error(`Category cycle detected at ${id}`);
    visiting.add(id);
    const category = byId.get(id)!;
    if (!category.parentId) return [id];
    return [id, ...ancestors(category.parentId, visiting)];
  };
  for (const category of categories) depthMemo.set(category.id, ancestors(category.id).length - 1);

  const children = new Map<number, PcmarketCategory[]>();
  for (const category of categories) {
    const list = children.get(category.parentId) || [];
    list.push(category);
    children.set(category.parentId, list);
  }
  for (const list of children.values()) list.sort((a, b) => b.ordering - a.ordering || a.id - b.id);

  const { paths, collisions } = resolveDuplicateCategoryPaths(categories);
  const normalized = categories.map<NormalizedCategory>((category) => {
    const childIds = (children.get(category.id) || []).map((child) => child.id);
    const image = category.image ? absolutePcmarketUrl(category.image) : '';
    if (category.image && (!image || new URL(image).hostname.toLowerCase() !== 'pcmarket.vn')) {
      throw new Error(`Category ${category.id} has an invalid image URL`);
    }
    const path = paths.get(category.id)!;
    if (!category.name.trim()) throw new Error(`Category ${category.id} has an empty name`);
    return {
      id: category.id,
      urlIndex: category.url_index.trim(),
      url: path,
      requestPath: `/${path}`,
      name: category.name.trim(),
      parentId: category.parentId,
      ordering: category.ordering,
      status: category.status === 'on' ? 1 : 0,
      summary: sanitizeLegacyCategoryHtml(category.summary),
      staticHtml: sanitizeLegacyCategoryHtml(category.description),
      imgUrl: image,
      priceRange: category.price_range.trim(),
      tags: category.tags.trim(),
      metaTitle: category.meta_title.trim(),
      metaKeyword: category.meta_keyword.trim(),
      metaDescription: category.meta_description.trim(),
      createTime: category.create_time.trim(),
      lastUpdate: category.last_update.trim(),
      isParent: childIds.length ? 1 : 0,
      childListId: childIds.join(','),
      catPath: `:${ancestors(category.id).join(':')}`,
      attributes: category.attributes,
    };
  });

  const enabledUnderDisabled = normalized
    .filter((category) => category.status === 1 && category.parentId && byId.get(category.parentId)?.status === 'off')
    .map((category) => category.id);
  const attributeIds = new Set(normalized.flatMap((category) => category.attributes.map((attribute) => attribute.id)));
  return {
    categories: normalized,
    report: {
      total: normalized.length,
      roots: normalized.filter((category) => category.parentId === 0).length,
      maxDepth: Math.max(0, ...depthMemo.values()),
      enabled: normalized.filter((category) => category.status === 1).length,
      disabled: normalized.filter((category) => category.status === 0).length,
      enabledUnderDisabled,
      duplicateSourcePaths: collisions,
      pendingAttributeLinks: normalized.reduce((sum, category) => sum + category.attributes.length, 0),
      pendingAttributeDefinitions: attributeIds.size,
    },
  };
}

export function canonicalCategorySnapshot(categories: PcmarketCategory[]) {
  return JSON.stringify([...categories].sort((left, right) => left.id - right.id));
}

export function sha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
