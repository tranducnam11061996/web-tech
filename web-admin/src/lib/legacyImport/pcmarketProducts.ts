import crypto from 'crypto';
// @ts-ignore php-serialize does not publish TypeScript declarations.
import { serialize } from 'php-serialize';
import { z } from 'zod';
import { sanitizeLegacyCategoryHtml } from './pcmarketProductCategories';

export const PCM_PRODUCT_SOURCE = 'https://pcmarket.vn/export/product.php';
export const PCM_BRAND_SOURCE = 'https://pcmarket.vn/export/brand.php';
export const PCM_ATTRIBUTE_SOURCE = 'https://pcmarket.vn/export/attribute.php';
export const PCM_PRODUCT_CONFIRMATION = 'IMPORT_PCMARKET_PRODUCTS';
export const PCM_BRAND_CONFIRMATION = 'SYNC_PCMARKET_BRANDS';
export const PCM_BRAND_ALIASES = new Map<number, number>([[34, 25], [57, 31]]);

const text = z.union([z.string(), z.number()]).nullable().transform((value) => String(value ?? ''));
const money = z.coerce.number().finite().nonnegative();
const pendingRecord = z.record(z.unknown());

const productCategorySchema = z.object({
  id: z.coerce.number().int().positive(),
  name: text,
  url: z.string().url(),
}).strict();

const productAttributeValueSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: text,
}).strict();

const productSpecAttributeSchema = z.object({
  attribute_code: z.string().trim().min(1).max(100),
  name: text,
  value_list: z.array(productAttributeValueSchema).max(500),
}).strict();

export const pcmarketProductSchema = z.object({
  id: z.coerce.number().int().positive(),
  categories: z.array(productCategorySchema).max(100),
  price: money,
  market_price: money,
  purchase_price: money,
  warranty: text,
  special_offer: text,
  product_title: text,
  product_summary: text,
  sku: text,
  url: z.string().url(),
  main_image: z.string().url(),
  image_collection: z.array(z.string().url()).max(250),
  description: text,
  spec: text,
  vat: z.coerce.number().int().min(0).max(2),
  brandId: z.coerce.number().int().nonnegative(),
  status: z.enum(['on', 'off']),
  meta_title: text,
  meta_keyword: text,
  meta_description: text,
  url_canonical: text,
  order_number: z.coerce.number().int(),
  spec_attributes: z.array(productSpecAttributeSchema).max(100),
  promotion: z.object({
    promotion: z.array(z.unknown()).max(500),
    promotion_group: z.array(z.unknown()).max(500),
  }).strict(),
  tags: z.array(z.unknown()).max(500),
  related_products: z.array(z.unknown()).max(500),
  related_articles: z.array(z.unknown()).max(500),
  variants: z.array(pendingRecord).max(500),
  config_group: pendingRecord.nullable(),
  addons: z.array(z.unknown()).max(500),
  comboset: z.array(pendingRecord).max(100),
  component_list: z.unknown().nullable(),
}).strict();

export const pcmarketBrandSchema = z.object({
  id: z.coerce.number().int().positive(),
  url: z.string().url(),
  name: text,
  summary: text,
  description: text,
  image: text,
  status: z.enum(['on', 'off']),
  ordering: z.coerce.number().int(),
  last_update: text,
  meta_title: text,
  meta_keyword: text,
  meta_description: text,
}).strict();

const attributeValueSchema = z.object({
  id: z.coerce.number().int().positive(),
  title: text,
  description: text,
  ordering: z.coerce.number().int(),
}).strict();

export const pcmarketAttributeSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: text,
  code: z.string().trim().min(1).max(100),
  description: text,
  status: z.enum(['on', 'off']),
  ordering: z.coerce.number().int(),
  scope: z.enum(['local', 'global']),
  options: z.object({
    is_display: z.coerce.number().int().min(0).max(1),
    is_header: z.coerce.number().int().min(0).max(1),
    in_summary: z.coerce.number().int().min(0).max(1),
  }).strict(),
  last_update: text,
  values: z.array(attributeValueSchema).max(2_000),
}).strict();

function envelope<T extends z.ZodTypeAny>(itemSchema: T, maxItems: number) {
  return z.object({
    current_page: z.coerce.number().int().positive(),
    size: z.coerce.number().int().min(1).max(500),
    total_page: z.coerce.number().int().positive().max(10_000),
    total_item: z.coerce.number().int().nonnegative().max(100_000),
    items: z.array(itemSchema).max(maxItems),
  }).strict();
}

export const pcmarketProductEnvelopeSchema = envelope(pcmarketProductSchema, 500);
export const pcmarketBrandEnvelopeSchema = envelope(pcmarketBrandSchema, 500);
export const pcmarketAttributeEnvelopeSchema = envelope(pcmarketAttributeSchema, 500);

export type PcmarketProduct = z.infer<typeof pcmarketProductSchema>;
export type PcmarketBrand = z.infer<typeof pcmarketBrandSchema>;
export type PcmarketAttribute = z.infer<typeof pcmarketAttributeSchema>;

export type NormalizedProduct = {
  id: number;
  categoryIds: number[];
  productCat: string;
  price: number;
  marketPrice: number;
  purchasePrice: number;
  warranty: string;
  specialOffer: string;
  name: string;
  summary: string;
  sku: string;
  sourceSku: string;
  path: string;
  requestPath: string;
  mainImage: string;
  imageCollection: string;
  imageCount: number;
  images: string[];
  description: string;
  spec: string;
  vatCode: number;
  hasVat: 0 | 1;
  brandId: number;
  status: 0 | 1;
  metaTitle: string;
  metaKeyword: string;
  metaDescription: string;
  ordering: number;
  attributes: Array<{ attributeId: number; valueId: number }>;
  variants: Record<string, unknown>[];
  configGroup: Record<string, unknown> | null;
  comboSets: Record<string, unknown>[];
};

export type NormalizedBrand = {
  id: number;
  sourceIds: number[];
  index: string;
  name: string;
  summary: string;
  description: string;
  image: string;
  status: 0 | 1;
  ordering: number;
  lastUpdate: string | null;
  productCount: number;
  metaTitle: string;
  metaKeyword: string;
  metaDescription: string;
};

export type BrandImportReport = {
  sourceBrands: number;
  runtimeBrands: number;
  enabled: number;
  disabled: number;
  images: number;
  summaries: number;
  descriptions: number;
  metaTitles: number;
  metaKeywords: number;
  metaDescriptions: number;
  merges: Array<{ sourceId: number; targetId: number }>;
};

export type NormalizedAttribute = {
  id: number;
  code: string;
  name: string;
  status: 0 | 1;
  ordering: number;
  scope: 0 | 1;
  isDisplay: 0 | 1;
  isHeader: 0 | 1;
  inSummary: 0 | 1;
  lastUpdate: number;
  values: Array<{ id: number; value: string; description: string; ordering: number }>;
};

export type ProductCatalogReport = {
  products: number;
  enabled: number;
  disabled: number;
  zeroPrice: number;
  enabledZeroPrice: number;
  fallbackSkus: number;
  duplicateSourcePaths: Array<{ sourcePath: string; productIds: number[]; resolvedPaths: string[] }>;
  uncategorizedProducts: number;
  productCategoryLinks: number;
  brands: number;
  duplicateBrandNames: Array<{ name: string; brandIds: number[] }>;
  attributes: number;
  attributeValues: number;
  productAttributeLinks: number;
  categoryAttributeLinks: number;
  pendingVariantProducts: number;
  pendingVariantLinks: number;
  pendingConfigProducts: number;
  pendingComboProducts: number;
  pendingComboOccurrences: number;
  imageUrls: number;
};

export function securePcmarketImage(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'pcmarket.vn') {
    throw new Error(`Product image must use HTTPS on pcmarket.vn: ${value}`);
  }
  return parsed.toString();
}

export function sanitizeLegacyProductHtml(value: string) {
  return sanitizeLegacyCategoryHtml(value.replace(/http:\/\/pcmarket\.vn(?=\/)/gi, 'https://pcmarket.vn'));
}

export function productPathFromUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'pcmarket.vn' || parsed.search || parsed.hash) {
    throw new Error(`Invalid PCMarket product URL: ${value}`);
  }
  const path = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '');
  if (!path || path.includes('/') || !/^[a-zA-Z0-9._-]+$/.test(path)) throw new Error(`Unsafe product path: ${value}`);
  return path;
}

export function resolveDuplicateProductPaths(products: PcmarketProduct[]) {
  const grouped = new Map<string, PcmarketProduct[]>();
  for (const product of products) {
    const sourcePath = productPathFromUrl(product.url);
    grouped.set(sourcePath, [...(grouped.get(sourcePath) || []), product]);
  }
  const paths = new Map<number, string>();
  const collisions: ProductCatalogReport['duplicateSourcePaths'] = [];
  for (const [sourcePath, group] of grouped) {
    const sorted = [...group].sort((left, right) => left.id - right.id);
    const extension = sourcePath.match(/(\.html(?:-\d+)?)$/i)?.[1] || '';
    const stem = extension ? sourcePath.slice(0, -extension.length) : sourcePath;
    const resolvedPaths = sorted.map((product, index) => index === 0 ? sourcePath : `${stem}-product-${product.id}${extension}`);
    sorted.forEach((product, index) => paths.set(product.id, resolvedPaths[index]));
    if (sorted.length > 1) collisions.push({ sourcePath, productIds: sorted.map((product) => product.id), resolvedPaths });
  }
  return { paths, collisions };
}

export function parseLegacyTimestamp(value: string) {
  if (!value || value.startsWith('0000-00-00')) return null;
  const date = new Date(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.valueOf()) ? null : value;
}

export function canonicalPcmarketBrandId(id: number) {
  return PCM_BRAND_ALIASES.get(id) || id;
}

function firstNonEmpty(records: PcmarketBrand[], field: keyof PcmarketBrand) {
  for (const record of records) {
    const value = String(record[field] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function brandIndexFromUrl(value: string, brandId: number) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'pcmarket.vn' || parsed.search || parsed.hash) {
    throw new Error(`Invalid brand URL ${value}`);
  }
  const path = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, '');
  const match = path.match(/^brand\/([a-zA-Z0-9._-]+)$/);
  if (!match || !match[1] || match[1].length > 100) throw new Error(`Invalid brand index for ${brandId}`);
  return match[1];
}

export function canonicalBrandSnapshot(items: PcmarketBrand[]) {
  return JSON.stringify([...items].sort((left, right) => left.id - right.id));
}

export function normalizePcmarketBrands(input: unknown[], productCounts = new Map<number, number>()) {
  const sourceBrands = input.map((item) => pcmarketBrandSchema.parse(item)).sort((a, b) => a.id - b.id);
  if (new Set(sourceBrands.map((item) => item.id)).size !== sourceBrands.length) throw new Error('Duplicate brand IDs detected');
  for (const [aliasId, canonicalId] of PCM_BRAND_ALIASES) {
    if (sourceBrands.some((brand) => brand.id === aliasId) && !sourceBrands.some((brand) => brand.id === canonicalId)) {
      throw new Error(`Missing canonical brand ${canonicalId}`);
    }
  }

  const grouped = new Map<number, PcmarketBrand[]>();
  for (const brand of sourceBrands) {
    brandIndexFromUrl(brand.url, brand.id);
    if (!brand.name.trim() || brand.name.trim().length > 100) throw new Error(`Invalid brand name for ${brand.id}`);
    if (brand.image) securePcmarketImage(brand.image);
    const targetId = canonicalPcmarketBrandId(brand.id);
    grouped.set(targetId, [...(grouped.get(targetId) || []), brand]);
  }

  const brands = [...grouped.entries()].sort(([left], [right]) => left - right).map<NormalizedBrand>(([targetId, records]) => {
    const ordered = [...records].sort((left, right) => left.id === targetId ? -1 : right.id === targetId ? 1 : left.id - right.id);
    const canonical = ordered[0];
    const image = firstNonEmpty(ordered, 'image');
    const summary = firstNonEmpty(ordered, 'summary');
    const description = sanitizeLegacyProductHtml(firstNonEmpty(ordered, 'description'));
    const metaTitle = firstNonEmpty(ordered, 'meta_title');
    const metaKeyword = firstNonEmpty(ordered, 'meta_keyword');
    const metaDescription = firstNonEmpty(ordered, 'meta_description');
    const fields: Array<[string, string, number]> = [
      ['summary', summary, 65_535], ['description', description, 65_535],
      ['meta title', metaTitle, 250], ['meta keyword', metaKeyword, 65_535], ['meta description', metaDescription, 65_535],
    ];
    for (const [label, value, max] of fields) {
      const size = label === 'meta title' ? [...value].length : Buffer.byteLength(value, 'utf8');
      if (size > max) throw new Error(`Brand ${targetId} ${label} exceeds target capacity`);
    }
    const index = brandIndexFromUrl(canonical.url, canonical.id);
    return {
      id: targetId,
      sourceIds: ordered.map((brand) => brand.id).sort((a, b) => a - b),
      index,
      name: canonical.name.trim(),
      summary,
      description,
      image: image ? securePcmarketImage(image) : '',
      status: canonical.status === 'on' ? 1 : 0,
      ordering: canonical.ordering,
      lastUpdate: parseLegacyTimestamp(canonical.last_update),
      productCount: productCounts.get(targetId) || 0,
      metaTitle,
      metaKeyword,
      metaDescription,
    };
  });

  const runtimeIndexes = new Map<string, number>();
  for (const brand of brands) {
    const previous = runtimeIndexes.get(brand.index);
    if (previous) throw new Error(`Duplicate runtime brand index ${brand.index}: ${previous}, ${brand.id}`);
    runtimeIndexes.set(brand.index, brand.id);
  }

  const report: BrandImportReport = {
    sourceBrands: sourceBrands.length,
    runtimeBrands: brands.length,
    enabled: sourceBrands.filter((brand) => brand.status === 'on').length,
    disabled: sourceBrands.filter((brand) => brand.status === 'off').length,
    images: sourceBrands.filter((brand) => Boolean(brand.image.trim())).length,
    summaries: sourceBrands.filter((brand) => Boolean(brand.summary.trim())).length,
    descriptions: sourceBrands.filter((brand) => Boolean(brand.description.trim())).length,
    metaTitles: sourceBrands.filter((brand) => Boolean(brand.meta_title.trim())).length,
    metaKeywords: sourceBrands.filter((brand) => Boolean(brand.meta_keyword.trim())).length,
    metaDescriptions: sourceBrands.filter((brand) => Boolean(brand.meta_description.trim())).length,
    merges: [...PCM_BRAND_ALIASES.entries()].map(([sourceId, targetId]) => ({ sourceId, targetId })),
  };
  return { sourceBrands, brands, report };
}

export function normalizePcmarketProductCatalog(input: {
  products: unknown[];
  brands: unknown[];
  attributes: unknown[];
  categoryAttributes: Array<{ categoryId: number; attributes: Array<{ id: number; name: string; status: number }> }>;
}) {
  const products = input.products.map((item) => pcmarketProductSchema.parse(item)).sort((a, b) => a.id - b.id);
  const brands = input.brands.map((item) => pcmarketBrandSchema.parse(item)).sort((a, b) => a.id - b.id);
  const attributes = input.attributes.map((item) => pcmarketAttributeSchema.parse(item)).sort((a, b) => a.id - b.id);
  if (new Set(products.map((item) => item.id)).size !== products.length) throw new Error('Duplicate product IDs detected');
  if (new Set(brands.map((item) => item.id)).size !== brands.length) throw new Error('Duplicate brand IDs detected');
  if (new Set(attributes.map((item) => item.id)).size !== attributes.length) throw new Error('Duplicate attribute IDs detected');

  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const attributeByCode = new Map(attributes.map((attribute) => [attribute.code, attribute]));
  const attributeById = new Map(attributes.map((attribute) => [attribute.id, attribute]));
  const valueOwner = new Map<number, number>();
  for (const attribute of attributes) {
    if (attribute.code.length > 30) throw new Error(`Attribute ${attribute.id} code exceeds target capacity`);
    for (const value of attribute.values) {
      const owner = valueOwner.get(value.id);
      if (owner && owner !== attribute.id) throw new Error(`Attribute value ${value.id} belongs to multiple attributes`);
      valueOwner.set(value.id, attribute.id);
    }
  }
  for (const relation of input.categoryAttributes) {
    for (const categoryAttribute of relation.attributes) {
      const definition = attributeById.get(categoryAttribute.id);
      if (!definition || definition.name !== categoryAttribute.name) {
        throw new Error(`Category ${relation.categoryId} references invalid attribute ${categoryAttribute.id}`);
      }
    }
  }

  const sourceSkus = new Set<string>();
  for (const product of products) {
    const sku = product.sku.trim().toLocaleLowerCase('en-US');
    if (!sku) continue;
    if (sourceSkus.has(sku)) throw new Error(`Duplicate product SKU detected: ${product.sku}`);
    sourceSkus.add(sku);
  }
  const { paths, collisions } = resolveDuplicateProductPaths(products);
  const productCounts = new Map<number, number>();
  const normalizedProducts = products.map<NormalizedProduct>((product) => {
    if (!product.product_title.trim()) throw new Error(`Product ${product.id} has an empty title`);
    if (product.brandId && !brandById.has(product.brandId)) throw new Error(`Product ${product.id} has missing brand ${product.brandId}`);
    const sourceSku = product.sku.trim();
    const sku = sourceSku || `PCM-${product.id}`;
    if (sku.length > 15) throw new Error(`Product ${product.id} SKU exceeds target capacity`);
    if (!sourceSku && sourceSkus.has(sku.toLocaleLowerCase('en-US'))) throw new Error(`Fallback SKU conflicts with source SKU: ${sku}`);
    const categoryIds = product.categories.map((category) => category.id);
    if (new Set(categoryIds).size !== categoryIds.length) throw new Error(`Product ${product.id} has duplicate categories`);
    const attributesForProduct: NormalizedProduct['attributes'] = [];
    for (const specAttribute of product.spec_attributes) {
      const definition = attributeByCode.get(specAttribute.attribute_code);
      if (!definition || definition.name !== specAttribute.name) throw new Error(`Product ${product.id} has invalid attribute ${specAttribute.attribute_code}`);
      const values = new Map(definition.values.map((value) => [value.id, value]));
      for (const value of specAttribute.value_list) {
        const definitionValue = values.get(value.id);
        if (!definitionValue || definitionValue.title !== value.name) throw new Error(`Product ${product.id} has invalid attribute value ${value.id}`);
        attributesForProduct.push({ attributeId: definition.id, valueId: value.id });
      }
    }
    const mainImage = securePcmarketImage(product.main_image);
    const images = Array.from(new Set([mainImage, ...product.image_collection.map(securePcmarketImage)]));
    const imageCollection = serialize(images.map((image, index) => ({ image_name: image, alt: '', ordering: index, is_primary: index === 0 ? 1 : 0 })));
    const description = sanitizeLegacyProductHtml(product.description);
    const spec = sanitizeLegacyProductHtml(product.spec);
    if (Buffer.byteLength(spec, 'utf8') > 65_535) throw new Error(`Product ${product.id} sanitized spec exceeds TEXT capacity`);
    const canonicalBrandId = canonicalPcmarketBrandId(product.brandId);
    if (canonicalBrandId) productCounts.set(canonicalBrandId, (productCounts.get(canonicalBrandId) || 0) + 1);
    return {
      id: product.id,
      categoryIds,
      productCat: categoryIds.join(','),
      price: product.price,
      marketPrice: product.market_price,
      purchasePrice: product.purchase_price,
      warranty: product.warranty.trim(),
      specialOffer: sanitizeLegacyProductHtml(product.special_offer),
      name: product.product_title.trim(),
      summary: sanitizeLegacyProductHtml(product.product_summary),
      sku,
      sourceSku,
      path: paths.get(product.id)!,
      requestPath: `/${paths.get(product.id)!}`,
      mainImage,
      imageCollection,
      imageCount: images.length,
      images,
      description,
      spec,
      vatCode: product.vat,
      hasVat: product.vat === 1 ? 1 : 0,
      brandId: canonicalBrandId,
      status: product.status === 'on' ? 1 : 0,
      metaTitle: product.meta_title.trim(),
      metaKeyword: product.meta_keyword.trim(),
      metaDescription: product.meta_description.trim(),
      ordering: product.order_number,
      attributes: attributesForProduct,
      variants: product.variants,
      configGroup: product.config_group,
      comboSets: product.comboset,
    };
  });

  const { brands: normalizedBrands } = normalizePcmarketBrands(brands, productCounts);

  const normalizedAttributes = attributes.map<NormalizedAttribute>((attribute) => ({
    id: attribute.id,
    code: attribute.code,
    name: attribute.name.trim(),
    status: attribute.status === 'on' ? 1 : 0,
    ordering: attribute.ordering,
    scope: attribute.scope === 'global' ? 1 : 0,
    isDisplay: attribute.options.is_display as 0 | 1,
    isHeader: attribute.options.is_header as 0 | 1,
    inSummary: attribute.options.in_summary as 0 | 1,
    lastUpdate: parseLegacyTimestamp(attribute.last_update)
      ? Math.floor(new Date(attribute.last_update.replace(' ', 'T') + 'Z').valueOf() / 1000)
      : 0,
    values: attribute.values.map((value) => ({ id: value.id, value: value.title.trim(), description: value.description, ordering: value.ordering })),
  }));

  const duplicateNames = new Map<string, number[]>();
  for (const brand of normalizedBrands) {
    const key = brand.name.toLocaleLowerCase('en-US');
    duplicateNames.set(key, [...(duplicateNames.get(key) || []), brand.id]);
  }
  const report: ProductCatalogReport = {
    products: normalizedProducts.length,
    enabled: normalizedProducts.filter((product) => product.status === 1).length,
    disabled: normalizedProducts.filter((product) => product.status === 0).length,
    zeroPrice: normalizedProducts.filter((product) => product.price === 0).length,
    enabledZeroPrice: normalizedProducts.filter((product) => product.status === 1 && product.price === 0).length,
    fallbackSkus: normalizedProducts.filter((product) => !product.sourceSku).length,
    duplicateSourcePaths: collisions,
    uncategorizedProducts: normalizedProducts.filter((product) => !product.categoryIds.length).length,
    productCategoryLinks: normalizedProducts.reduce((total, product) => total + product.categoryIds.length, 0),
    brands: normalizedBrands.length,
    duplicateBrandNames: [...duplicateNames.entries()].filter(([, ids]) => ids.length > 1).map(([name, brandIds]) => ({ name, brandIds })),
    attributes: normalizedAttributes.length,
    attributeValues: normalizedAttributes.reduce((total, attribute) => total + attribute.values.length, 0),
    productAttributeLinks: normalizedProducts.reduce((total, product) => total + product.attributes.length, 0),
    categoryAttributeLinks: input.categoryAttributes.reduce((total, category) => total + category.attributes.length, 0),
    pendingVariantProducts: normalizedProducts.filter((product) => product.variants.length).length,
    pendingVariantLinks: normalizedProducts.reduce((total, product) => total + product.variants.length, 0),
    pendingConfigProducts: normalizedProducts.filter((product) => product.configGroup).length,
    pendingComboProducts: normalizedProducts.filter((product) => product.comboSets.length).length,
    pendingComboOccurrences: normalizedProducts.reduce((total, product) => total + product.comboSets.length, 0),
    imageUrls: normalizedProducts.reduce((total, product) => total + product.images.length, 0),
  };
  return { products: normalizedProducts, brands: normalizedBrands, attributes: normalizedAttributes, report };
}

export function canonicalProductCatalogSnapshot(input: { products: PcmarketProduct[]; brands: PcmarketBrand[]; attributes: PcmarketAttribute[] }) {
  return JSON.stringify({
    products: [...input.products].sort((a, b) => a.id - b.id),
    brands: [...input.brands].sort((a, b) => a.id - b.id),
    attributes: [...input.attributes].sort((a, b) => a.id - b.id),
  });
}

export function productCatalogSha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
