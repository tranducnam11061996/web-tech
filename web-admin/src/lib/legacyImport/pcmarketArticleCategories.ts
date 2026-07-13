import crypto from 'node:crypto';
import { z } from 'zod';
import { sanitizeLegacyCategoryHtml, sourcePathFromUrl } from './pcmarketProductCategories';

export const PCM_ARTICLE_CATEGORY_SOURCE = 'https://pcmarket.vn/export/article_category.php';
export const PCM_ARTICLE_CATEGORY_CONFIRMATION = 'IMPORT_ARTICLE_CATEGORIES';

const text = z.union([z.string(), z.number()]).nullable().transform((value) => String(value ?? ''));

function isLegacyTimestamp(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  return date.getUTCFullYear() === parts[0] && date.getUTCMonth() === parts[1] - 1 && date.getUTCDate() === parts[2]
    && date.getUTCHours() === parts[3] && date.getUTCMinutes() === parts[4] && date.getUTCSeconds() === parts[5];
}

export const pcmarketArticleCategorySchema = z.object({
  id: z.coerce.number().int().positive(),
  url: z.string().url().max(1000),
  name: text,
  summary: text,
  description: text,
  image: text,
  parentId: z.coerce.number().int().nonnegative(),
  status: z.enum(['on', 'off']),
  ordering: z.coerce.number().int().min(-32768).max(32767),
  create_time: text.refine(isLegacyTimestamp, 'Invalid legacy timestamp'),
  last_update: text.refine(isLegacyTimestamp, 'Invalid legacy timestamp'),
  meta_title: text,
  meta_keyword: text,
  meta_description: text,
}).strict();

export const pcmarketArticleCategoryEnvelopeSchema = z.object({
  current_page: z.coerce.number().int().positive(),
  size: z.coerce.number().int().min(1).max(500),
  total_page: z.coerce.number().int().positive().max(1000),
  total_item: z.coerce.number().int().nonnegative().max(10_000),
  items: z.array(pcmarketArticleCategorySchema).max(500),
}).strict();

export type PcmarketArticleCategory = z.infer<typeof pcmarketArticleCategorySchema>;

export type NormalizedArticleCategory = {
  id: number;
  name: string;
  slug: string;
  requestPath: string;
  parentId: number;
  status: 0 | 1;
  ordering: number;
  summary: string;
  description: string;
  imageUrl: string;
  createDate: string;
  lastUpdate: string;
  metaTitle: string;
  metaKeyword: string;
  metaDescription: string;
  catPath: string;
  childListId: string;
  isParent: 0 | 1;
};

export type ArticleCategoryImportReport = {
  total: number;
  roots: number;
  enabled: number;
  disabled: number;
  maxDepth: number;
  imageCount: number;
  sourcePaths: string[];
};

function pcmarketAssetUrl(value: string) {
  const raw = value.trim();
  if (!raw) return '';
  const parsed = new URL(raw, 'https://pcmarket.vn/');
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'pcmarket.vn' || parsed.username || parsed.password) {
    throw new Error(`Article-category asset must use https://pcmarket.vn: ${value}`);
  }
  const normalized = parsed.toString();
  if (normalized.length > 150) throw new Error(`Article-category image URL exceeds 150 characters: ${value}`);
  return normalized;
}

function assertPcmarketEmbeddedMedia(value: string, id: number) {
  const media = /<(?:img|video|source)\b[^>]*(?:src|poster)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of value.matchAll(media)) {
    try {
      pcmarketAssetUrl(match[2]);
    } catch {
      throw new Error(`Article category ${id} contains non-PCMarket embedded media`);
    }
  }
}

function fit(value: string, max: number, label: string) {
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} exceeds ${max} characters`);
  return normalized;
}

function fitTextBytes(value: string, label: string) {
  if (Buffer.byteLength(value, 'utf8') > 65_535) throw new Error(`${label} exceeds MySQL TEXT capacity`);
  return value;
}

export function canonicalArticleCategorySnapshot(items: PcmarketArticleCategory[]) {
  return JSON.stringify([...items].sort((left, right) => left.id - right.id));
}

export function articleCategorySha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function normalizePcmarketArticleCategories(input: unknown[]): {
  categories: NormalizedArticleCategory[];
  report: ArticleCategoryImportReport;
} {
  const categories = input.map((item) => pcmarketArticleCategorySchema.parse(item)).sort((left, right) => left.id - right.id);
  const byId = new Map(categories.map((category) => [category.id, category]));
  if (byId.size !== categories.length) throw new Error('Duplicate article-category IDs detected');

  const paths = new Set<string>();
  const depth = new Map<number, number>();
  const ancestors = (id: number, visiting = new Set<number>()): number[] => {
    if (visiting.has(id)) throw new Error(`Article-category cycle detected at ${id}`);
    visiting.add(id);
    const category = byId.get(id);
    if (!category) throw new Error(`Missing article category ${id}`);
    if (!category.parentId) return [id];
    if (!byId.has(category.parentId)) throw new Error(`Article category ${id} has missing parent ${category.parentId}`);
    return [...ancestors(category.parentId, visiting), id];
  };
  const children = new Map<number, number[]>();
  for (const category of categories) {
    if (category.parentId === category.id) throw new Error(`Article category ${category.id} references itself`);
    const list = children.get(category.parentId) || [];
    list.push(category.id);
    children.set(category.parentId, list);
    const slug = sourcePathFromUrl(category.url);
    if (paths.has(slug)) throw new Error(`Duplicate article-category path: ${slug}`);
    paths.add(slug);
  }

  const normalized = categories.map<NormalizedArticleCategory>((category) => {
    const trail = ancestors(category.id);
    depth.set(category.id, trail.length - 1);
    const slug = sourcePathFromUrl(category.url);
    if (slug.length > 180) throw new Error(`Article category ${category.id} slug exceeds 180 characters`);
    const name = fit(category.name, 150, `Article category ${category.id} name`);
    if (!name) throw new Error(`Article category ${category.id} has an empty name`);
    assertPcmarketEmbeddedMedia(category.summary, category.id);
    assertPcmarketEmbeddedMedia(category.description, category.id);
    const summary = fit(sanitizeLegacyCategoryHtml(category.summary), 250, `Article category ${category.id} summary`);
    const description = fitTextBytes(sanitizeLegacyCategoryHtml(category.description), `Article category ${category.id} description`);
    const childIds = [...(children.get(category.id) || [])].sort((left, right) => left - right);
    return {
      id: category.id,
      name,
      slug,
      requestPath: `/${slug}`,
      parentId: category.parentId,
      status: category.status === 'on' ? 1 : 0,
      ordering: category.ordering,
      summary,
      description,
      imageUrl: pcmarketAssetUrl(category.image),
      createDate: category.create_time,
      lastUpdate: category.last_update,
      metaTitle: fit(category.meta_title, 200, `Article category ${category.id} meta title`),
      metaKeyword: fit(category.meta_keyword, 200, `Article category ${category.id} meta keyword`),
      metaDescription: fitTextBytes(category.meta_description.trim(), `Article category ${category.id} meta description`),
      catPath: `:${trail.join(':')}`,
      childListId: childIds.join(','),
      isParent: childIds.length ? 1 : 0,
    };
  });

  return {
    categories: normalized,
    report: {
      total: normalized.length,
      roots: normalized.filter((category) => category.parentId === 0).length,
      enabled: normalized.filter((category) => category.status === 1).length,
      disabled: normalized.filter((category) => category.status === 0).length,
      maxDepth: Math.max(0, ...depth.values()),
      imageCount: normalized.filter((category) => Boolean(category.imageUrl)).length,
      sourcePaths: normalized.map((category) => category.slug),
    },
  };
}
