import type { RowDataPacket } from 'mysql2/promise';
import pool from './db';
import { clearPublicProductResponseCache } from './publicProductCache';
import { resolveProductImageUrl } from './productImageUrl';

export type ProductCardBadgeSlot = 'image_top_left' | 'image_bottom_center';
export type ProductCardBadgeColorVariant = 'red' | 'blue' | 'cyan' | 'green' | 'amber' | 'purple' | 'slate';
export type ProductCardBadgeValueMode = 'value' | 'attribute_value';

export type ProductCardBadge = {
  id: string;
  attributeId: number;
  attributeCode: string;
  valueId: number;
  text: string;
  slot: ProductCardBadgeSlot;
  colorVariant: ProductCardBadgeColorVariant;
  ordering: number;
};

export type ProductCardAttributeRule = {
  id: number;
  categoryId: number;
  attrId: number;
  attributeCode: string;
  attributeName: string;
  slot: ProductCardBadgeSlot;
  colorVariant: ProductCardBadgeColorVariant;
  labelTemplate: string;
  valueMode: ProductCardBadgeValueMode;
  maxValues: number;
  ordering: number;
  status: boolean;
  inheritToChildren: boolean;
  updatedAt: string | null;
};

export type ProductCardAttributeOption = {
  id: number;
  attributeCode: string;
  filterCode: string;
  name: string;
  ordering: number;
};

export type ProductCardAttributeCategory = {
  id: number;
  name: string;
  parentId: number;
  status: number;
  productCount: number;
};

export type ProductCardAttributePreviewProduct = {
  id: number;
  name: string;
  slug: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  brand: string;
  attributeValues: Array<{
    attributeId: number;
    attributeCode: string;
    attributeName: string;
    valueId: number;
    value: string;
  }>;
};

export type ProductCardAttributeEditorData = {
  categories: ProductCardAttributeCategory[];
  selectedCategoryId: number;
  availableAttributes: ProductCardAttributeOption[];
  rules: ProductCardAttributeRule[];
  inheritedRules: ProductCardAttributeRule[];
  previewProduct: ProductCardAttributePreviewProduct | null;
  migrationRequired: boolean;
};

type RuleRow = RowDataPacket & {
  id: number;
  category_id: number;
  attr_id: number;
  attribute_code: string | null;
  attribute_name: string | null;
  slot: string | null;
  color_variant: string | null;
  label_template: string | null;
  value_mode: string | null;
  max_values: number | null;
  ordering: number | null;
  status: number | null;
  inherit_to_children: number | null;
  updated_at: Date | string | null;
};

type CategoryRow = RowDataPacket & {
  id: number;
  name: string | null;
  parentId: number | null;
  status: number | null;
  proCount: number | null;
};

type AttributeValueRow = RowDataPacket & {
  pro_id: number;
  attr_id: number;
  attr_value_id: number;
  attribute_code: string | null;
  attribute_name: string | null;
  value_name: string | null;
  value_ordering: number | null;
};

type ProductCategoryRow = RowDataPacket & {
  pro_id: number;
  category_id: number;
};

type BadgeCacheState = {
  byProductId: Map<number, ProductCardBadge[]> | null;
  expiresAt: number;
  warmPromise: Promise<Map<number, ProductCardBadge[]>> | null;
  ruleTableExists: boolean | null;
};

const RULE_TABLE = 'web_admin_product_card_attribute_rules';
const BADGE_CACHE_TTL_MS = 300_000;
const unsafePublicTextPattern = /^(?:javascript\s*:|https?:\/\/|data\s*:|\/\/)/i;
const htmlEntityPattern = /&(?:amp|lt|gt|quot|apos|#39|#x27|#60|#x3c|#62|#x3e);/gi;
const validSlots = new Set<ProductCardBadgeSlot>(['image_top_left', 'image_bottom_center']);
const validColorVariants = new Set<ProductCardBadgeColorVariant>(['red', 'blue', 'cyan', 'green', 'amber', 'purple', 'slate']);
const validValueModes = new Set<ProductCardBadgeValueMode>(['value', 'attribute_value']);

const badgeCache: BadgeCacheState = {
  byProductId: null,
  expiresAt: 0,
  warmPromise: null,
  ruleTableExists: null,
};
const MAX_PRODUCT_BADGE_CACHE_ITEMS = 5_000;

const laptopRuleSeeds = [
  { attributeCode: 'thong_so_cpu_laptop', slot: 'image_top_left', colorVariant: 'red', ordering: 10 },
  { attributeCode: 'thong_so_ram_laptop', slot: 'image_top_left', colorVariant: 'blue', ordering: 20 },
  { attributeCode: 'thong_so_ssd_laptop', slot: 'image_top_left', colorVariant: 'blue', ordering: 30 },
  { attributeCode: 'thong_so_vga_laptop', slot: 'image_bottom_center', colorVariant: 'cyan', ordering: 40 },
] satisfies Array<{
  attributeCode: string;
  slot: ProductCardBadgeSlot;
  colorVariant: ProductCardBadgeColorVariant;
  ordering: number;
}>;

export function decodeProductCardText(value: unknown): string {
  const text = String(value || '');
  if (!text || !htmlEntityPattern.test(text)) return text;

  htmlEntityPattern.lastIndex = 0;
  return text.replace(htmlEntityPattern, (entity) => {
    switch (entity.toLowerCase()) {
      case '&amp;':
        return '&';
      case '&lt;':
      case '&#60;':
      case '&#x3c;':
        return '<';
      case '&gt;':
      case '&#62;':
      case '&#x3e;':
        return '>';
      case '&quot;':
        return '"';
      case '&apos;':
      case '&#39;':
      case '&#x27;':
        return "'";
      default:
        return entity;
    }
  });
}

function cleanPublicText(value: unknown, maxLength = 64) {
  const text = decodeProductCardText(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || unsafePublicTextPattern.test(text)) return '';
  return text.slice(0, maxLength);
}

function toInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function normalizeSlot(value: unknown): ProductCardBadgeSlot {
  const slot = String(value || '').trim() as ProductCardBadgeSlot;
  return validSlots.has(slot) ? slot : 'image_top_left';
}

function normalizeColorVariant(value: unknown): ProductCardBadgeColorVariant {
  const color = String(value || '').trim() as ProductCardBadgeColorVariant;
  return validColorVariants.has(color) ? color : 'blue';
}

function normalizeValueMode(value: unknown): ProductCardBadgeValueMode {
  const mode = String(value || '').trim() as ProductCardBadgeValueMode;
  return validValueModes.has(mode) ? mode : 'value';
}

function normalizeRuleRow(row: RuleRow): ProductCardAttributeRule {
  return {
    id: Number(row.id || 0),
    categoryId: Number(row.category_id || 0),
    attrId: Number(row.attr_id || 0),
    attributeCode: cleanPublicText(row.attribute_code, 80),
    attributeName: cleanPublicText(row.attribute_name, 120),
    slot: normalizeSlot(row.slot),
    colorVariant: normalizeColorVariant(row.color_variant),
    labelTemplate: cleanPublicText(row.label_template, 120),
    valueMode: normalizeValueMode(row.value_mode),
    maxValues: Math.min(3, Math.max(1, toInt(row.max_values, 1))),
    ordering: toInt(row.ordering),
    status: Number(row.status ?? 1) === 1,
    inheritToChildren: Number(row.inherit_to_children ?? 1) === 1,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function productCardRuleTableExists() {
  if (badgeCache.ruleTableExists !== null) return badgeCache.ruleTableExists;
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = ?
    `,
    [RULE_TABLE],
  );
  badgeCache.ruleTableExists = Number(rows[0]?.count || 0) > 0;
  return badgeCache.ruleTableExists;
}

export async function ensureProductCardAttributeRulesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${RULE_TABLE} (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      category_id INT NOT NULL,
      attr_id INT NOT NULL,
      slot VARCHAR(32) NOT NULL DEFAULT 'image_top_left',
      color_variant VARCHAR(24) NOT NULL DEFAULT 'blue',
      label_template VARCHAR(120) NOT NULL DEFAULT '',
      value_mode VARCHAR(24) NOT NULL DEFAULT 'value',
      max_values TINYINT UNSIGNED NOT NULL DEFAULT 1,
      ordering SMALLINT NOT NULL DEFAULT 0,
      status TINYINT(1) NOT NULL DEFAULT 1,
      inherit_to_children TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_category_attr_slot (category_id, attr_id, slot),
      KEY idx_category_status (category_id, status),
      KEY idx_attr (attr_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  badgeCache.ruleTableExists = true;
  await seedDefaultLaptopProductCardRules();
}

async function seedDefaultLaptopProductCardRules() {
  const [categoryRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM idv_seller_category
      WHERE id IN (1087, 1106)
        OR name IN ('Laptop Gaming, Do Hoa', 'Laptop, Macbook, Surface', 'Laptop Gaming, Đồ Họa')
    `,
  );
  const categoryIds = Array.from(new Set(categoryRows.map((row) => Number(row.id || 0)).filter((id) => id > 0)));
  if (categoryIds.length === 0) return;

  const [attributeRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, attribute_code
      FROM idv_attribute
      WHERE attribute_code IN (?)
    `,
    [laptopRuleSeeds.map((seed) => seed.attributeCode)],
  );
  const attributeByCode = new Map(attributeRows.map((row) => [String(row.attribute_code), Number(row.id)]));

  for (const categoryId of categoryIds) {
    for (const seed of laptopRuleSeeds) {
      const attrId = attributeByCode.get(seed.attributeCode);
      if (!attrId) continue;
      await pool.query(
        `
          INSERT IGNORE INTO ${RULE_TABLE}
            (category_id, attr_id, slot, color_variant, label_template, value_mode, max_values, ordering, status, inherit_to_children)
          VALUES (?, ?, ?, ?, '', 'value', 1, ?, 1, 1)
        `,
        [categoryId, attrId, seed.slot, seed.colorVariant, seed.ordering],
      );
    }
  }
}

export function invalidateProductCardAttributeCaches() {
  badgeCache.byProductId = null;
  badgeCache.expiresAt = 0;
  clearPublicProductResponseCache();
}

function trimProductBadgeCache(cache: Map<number, ProductCardBadge[]>) {
  while (cache.size > MAX_PRODUCT_BADGE_CACHE_ITEMS) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

function buildCategoryMap(categories: Array<{ id: number; parentId: number }>) {
  return new Map(categories.map((category) => [category.id, category.parentId]));
}

function categoryPath(categoryId: number, parentById: Map<number, number>) {
  const path: number[] = [];
  const seen = new Set<number>();
  let current = categoryId;
  while (current > 0 && !seen.has(current)) {
    seen.add(current);
    path.push(current);
    current = parentById.get(current) || 0;
  }
  return path;
}

function resolveEffectiveRulesForCategories(
  categoryIds: number[],
  parentById: Map<number, number>,
  rulesByCategory: Map<number, ProductCardAttributeRule[]>,
) {
  const bestRules = new Map<string, { rule: ProductCardAttributeRule; distance: number }>();

  for (const categoryId of categoryIds) {
    const path = categoryPath(categoryId, parentById);
    path.forEach((ancestorId, distance) => {
      const rules = rulesByCategory.get(ancestorId) || [];
      for (const rule of rules) {
        if (distance > 0 && !rule.inheritToChildren) continue;
        const key = `${rule.attrId}:${rule.slot}`;
        const current = bestRules.get(key);
        if (
          !current ||
          distance < current.distance ||
          (distance === current.distance && rule.ordering < current.rule.ordering)
        ) {
          bestRules.set(key, { rule, distance });
        }
      }
    });
  }

  return Array.from(bestRules.values())
    .map((entry) => entry.rule)
    .filter((rule) => rule.status)
    .sort((left, right) => left.ordering - right.ordering || left.id - right.id);
}

function formatBadgeText(rule: ProductCardAttributeRule, value: AttributeValueRow) {
  const rawValue = cleanPublicText(value.value_name, 40);
  if (!rawValue) return '';
  const attributeName = cleanPublicText(value.attribute_name, 40);
  if (rule.labelTemplate) {
    return cleanPublicText(
      rule.labelTemplate
        .replace(/\{value\}/gi, rawValue)
        .replace(/\{attribute\}/gi, attributeName)
        .replace(/\{code\}/gi, rule.attributeCode),
      48,
    );
  }
  if (rule.valueMode === 'attribute_value' && attributeName) {
    return cleanPublicText(`${attributeName}: ${rawValue}`, 48);
  }
  return rawValue;
}

async function loadActiveAndBlockingRules() {
  if (!(await productCardRuleTableExists())) return [];
  const [rows] = await pool.query<RuleRow[]>(`
    SELECT
      r.*,
      a.attribute_code,
      a.name AS attribute_name
    FROM ${RULE_TABLE} r
    JOIN idv_attribute a ON a.id = r.attr_id AND a.status = 1
    ORDER BY r.category_id ASC, r.ordering ASC, r.id ASC
  `);
  return rows.map(normalizeRuleRow).filter((rule) => rule.categoryId > 0 && rule.attrId > 0);
}

async function buildProductCardBadgeCache() {
  const rules = await loadActiveAndBlockingRules();
  if (rules.length === 0) return new Map<number, ProductCardBadge[]>();

  const activeAttrIds = Array.from(new Set(rules.filter((rule) => rule.status).map((rule) => rule.attrId)));
  if (activeAttrIds.length === 0) return new Map<number, ProductCardBadge[]>();

  const [categoryRows, productCategoryRows, attributeValueRows] = await Promise.all([
    pool.query<CategoryRow[]>('SELECT id, parentId FROM idv_seller_category'),
    pool.query<ProductCategoryRow[]>(`
      SELECT pc.pro_id, pc.category_id
      FROM idv_product_category pc
      JOIN idv_sell_product_price pr ON pr.id = pc.pro_id AND pr.isOn = 1
      WHERE pc.status = 1
    `),
    pool.query<AttributeValueRow[]>(
      `
        SELECT
          pa.pro_id,
          pa.attr_id,
          pa.attr_value_id,
          a.attribute_code,
          a.name AS attribute_name,
          v.value AS value_name,
          v.ordering AS value_ordering
        FROM idv_product_attribute pa
        JOIN idv_attribute a ON a.id = pa.attr_id AND a.status = 1
        JOIN idv_attribute_value v ON v.id = pa.attr_value_id AND v.attributeId = a.id
        WHERE pa.attr_id IN (?)
      `,
      [activeAttrIds],
    ),
  ]);

  const parentById = buildCategoryMap(categoryRows[0].map((row) => ({
    id: Number(row.id),
    parentId: Number(row.parentId || 0),
  })));
  const rulesByCategory = new Map<number, ProductCardAttributeRule[]>();
  for (const rule of rules) {
    const categoryRules = rulesByCategory.get(rule.categoryId) || [];
    categoryRules.push(rule);
    rulesByCategory.set(rule.categoryId, categoryRules);
  }

  const productCategories = new Map<number, number[]>();
  for (const row of productCategoryRows[0]) {
    const productId = Number(row.pro_id);
    const categories = productCategories.get(productId) || [];
    categories.push(Number(row.category_id));
    productCategories.set(productId, categories);
  }

  const valuesByProductAndAttr = new Map<string, AttributeValueRow[]>();
  for (const row of attributeValueRows[0]) {
    const key = `${Number(row.pro_id)}:${Number(row.attr_id)}`;
    const values = valuesByProductAndAttr.get(key) || [];
    values.push(row);
    valuesByProductAndAttr.set(key, values);
  }
  for (const values of valuesByProductAndAttr.values()) {
    values.sort((left, right) => Number(left.value_ordering || 0) - Number(right.value_ordering || 0));
  }

  const byProductId = new Map<number, ProductCardBadge[]>();
  for (const [productId, categoryIds] of productCategories) {
    const effectiveRules = resolveEffectiveRulesForCategories(categoryIds, parentById, rulesByCategory);
    if (effectiveRules.length === 0) continue;

    const badges: ProductCardBadge[] = [];
    for (const rule of effectiveRules) {
      const values = valuesByProductAndAttr.get(`${productId}:${rule.attrId}`) || [];
      for (const value of values.slice(0, rule.maxValues)) {
        const text = formatBadgeText(rule, value);
        if (!text) continue;
        badges.push({
          id: `${rule.id}:${Number(value.attr_value_id)}`,
          attributeId: rule.attrId,
          attributeCode: rule.attributeCode,
          valueId: Number(value.attr_value_id),
          text,
          slot: rule.slot,
          colorVariant: rule.colorVariant,
          ordering: rule.ordering,
        });
      }
    }

    if (badges.length > 0) {
      byProductId.set(
        productId,
        badges.sort((left, right) => left.ordering - right.ordering || left.text.localeCompare(right.text, 'vi')),
      );
    }
  }

  return byProductId;
}

async function ensureBadgeCacheFresh() {
  if (badgeCache.byProductId && Date.now() < badgeCache.expiresAt) return badgeCache.byProductId;
  if (badgeCache.warmPromise) return badgeCache.warmPromise;

  badgeCache.warmPromise = buildProductCardBadgeCache()
    .then((byProductId) => {
      badgeCache.byProductId = byProductId;
      badgeCache.expiresAt = Date.now() + BADGE_CACHE_TTL_MS;
      return byProductId;
    })
    .finally(() => {
      badgeCache.warmPromise = null;
    });

  return badgeCache.warmPromise;
}

export async function getProductCardBadgesForProductIds(productIds: number[]) {
  const ids = Array.from(new Set(productIds.map((id) => Number(id)).filter((id) => id > 0)));
  const result = new Map<number, ProductCardBadge[]>();
  if (ids.length === 0) return result;

  // The old implementation warmed every product/category/attribute mapping in
  // the catalogue. A product card request only needs the visible page IDs.
  const cache = badgeCache.byProductId || new Map<number, ProductCardBadge[]>();
  badgeCache.byProductId = cache;
  const missingIds = ids.filter((id) => !cache.has(id));

  if (missingIds.length > 0) {
    const rules = await loadActiveAndBlockingRules();
    if (rules.length === 0) {
      for (const id of missingIds) cache.set(id, []);
    } else {
      const activeAttrIds = Array.from(new Set(rules.filter((rule) => rule.status).map((rule) => rule.attrId)));
      const [categoryRows, productCategoryRows, attributeValueRows] = await Promise.all([
        pool.query<CategoryRow[]>('SELECT id, parentId FROM idv_seller_category'),
        pool.query<ProductCategoryRow[]>('SELECT pro_id, category_id FROM idv_product_category WHERE pro_id IN (?) AND status = 1', [missingIds]),
        pool.query<AttributeValueRow[]>(`
          SELECT pa.pro_id, pa.attr_id, pa.attr_value_id, a.attribute_code, a.name AS attribute_name,
            v.value AS value_name, v.ordering AS value_ordering
          FROM idv_product_attribute pa
          JOIN idv_attribute a ON a.id = pa.attr_id AND a.status = 1
          JOIN idv_attribute_value v ON v.id = pa.attr_value_id AND v.attributeId = a.id
          WHERE pa.pro_id IN (?) AND pa.attr_id IN (?)
        `, [missingIds, activeAttrIds]),
      ]);
      const parentById = buildCategoryMap(categoryRows[0].map((row) => ({ id: Number(row.id), parentId: Number(row.parentId || 0) })));
      const rulesByCategory = new Map<number, ProductCardAttributeRule[]>();
      for (const rule of rules) {
        const categoryRules = rulesByCategory.get(rule.categoryId) || [];
        categoryRules.push(rule);
        rulesByCategory.set(rule.categoryId, categoryRules);
      }
      const categoriesByProduct = new Map<number, number[]>();
      for (const row of productCategoryRows[0]) {
        const productId = Number(row.pro_id);
        const categories = categoriesByProduct.get(productId) || [];
        categories.push(Number(row.category_id));
        categoriesByProduct.set(productId, categories);
      }
      const valuesByProductAndAttr = new Map<string, AttributeValueRow[]>();
      for (const row of attributeValueRows[0]) {
        const key = `${Number(row.pro_id)}:${Number(row.attr_id)}`;
        const values = valuesByProductAndAttr.get(key) || [];
        values.push(row);
        valuesByProductAndAttr.set(key, values);
      }
      for (const values of valuesByProductAndAttr.values()) {
        values.sort((left, right) => Number(left.value_ordering || 0) - Number(right.value_ordering || 0));
      }
      for (const productId of missingIds) {
        const badges: ProductCardBadge[] = [];
        const effectiveRules = resolveEffectiveRulesForCategories(categoriesByProduct.get(productId) || [], parentById, rulesByCategory);
        for (const rule of effectiveRules) {
          const values = valuesByProductAndAttr.get(`${productId}:${rule.attrId}`) || [];
          for (const value of values.slice(0, rule.maxValues)) {
            const text = formatBadgeText(rule, value);
            if (text) badges.push({
              id: `${rule.id}:${Number(value.attr_value_id)}`,
              attributeId: rule.attrId,
              attributeCode: rule.attributeCode,
              valueId: Number(value.attr_value_id),
              text,
              slot: rule.slot,
              colorVariant: rule.colorVariant,
              ordering: rule.ordering,
            });
          }
        }
        cache.set(productId, badges.sort((left, right) => left.ordering - right.ordering || left.text.localeCompare(right.text, 'vi')));
      }
    }
    badgeCache.expiresAt = Date.now() + BADGE_CACHE_TTL_MS;
    trimProductBadgeCache(cache);
  }
  for (const id of ids) {
    const badges = cache.get(id) || [];
    cache.delete(id);
    cache.set(id, badges);
    result.set(id, badges);
  }
  return result;
}

export async function listProductCardAttributeCategories() {
  const [rows] = await pool.query<CategoryRow[]>(`
    SELECT id, name, parentId, status, proCount
    FROM idv_seller_category
    ORDER BY parentId ASC, ordering DESC, name ASC
  `);
  return rows.map<ProductCardAttributeCategory>((row) => ({
    id: Number(row.id),
    name: cleanPublicText(row.name, 150) || `Category ${row.id}`,
    parentId: Number(row.parentId || 0),
    status: Number(row.status || 0),
    productCount: Number(row.proCount || 0),
  }));
}

async function listAvailableAttributesForCategory(categoryId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT
        a.id,
        a.attribute_code,
        a.filter_code,
        a.name,
        COALESCE(MAX(ac.ordering), a.ordering, 0) AS ordering
      FROM idv_attribute a
      LEFT JOIN idv_attribute_category ac ON ac.attr_id = a.id AND ac.category_id = ? AND ac.status = 1
      WHERE a.status = 1
        AND (a.scope = 1 OR ac.attr_id IS NOT NULL)
      GROUP BY a.id, a.attribute_code, a.filter_code, a.name, a.ordering
      ORDER BY ordering DESC, a.name ASC
    `,
    [categoryId],
  );
  return rows.map<ProductCardAttributeOption>((row) => ({
    id: Number(row.id),
    attributeCode: cleanPublicText(row.attribute_code, 80),
    filterCode: cleanPublicText(row.filter_code, 80),
    name: cleanPublicText(row.name, 120),
    ordering: Number(row.ordering || 0),
  }));
}

async function listDirectRules(categoryId: number) {
  if (!(await productCardRuleTableExists())) return [];
  const [rows] = await pool.query<RuleRow[]>(
    `
      SELECT
        r.*,
        a.attribute_code,
        a.name AS attribute_name
      FROM ${RULE_TABLE} r
      JOIN idv_attribute a ON a.id = r.attr_id AND a.status = 1
      WHERE r.category_id = ?
      ORDER BY r.ordering ASC, r.id ASC
    `,
    [categoryId],
  );
  return rows.map(normalizeRuleRow);
}

async function listInheritedRules(categoryId: number, categories: ProductCardAttributeCategory[]) {
  if (!(await productCardRuleTableExists())) return [];
  const parentById = new Map(categories.map((category) => [category.id, category.parentId]));
  const ancestors = categoryPath(categoryId, parentById).slice(1);
  if (ancestors.length === 0) return [];
  const [rows] = await pool.query<RuleRow[]>(
    `
      SELECT
        r.*,
        a.attribute_code,
        a.name AS attribute_name
      FROM ${RULE_TABLE} r
      JOIN idv_attribute a ON a.id = r.attr_id AND a.status = 1
      WHERE r.category_id IN (?)
        AND r.status = 1
        AND r.inherit_to_children = 1
      ORDER BY r.ordering ASC, r.id ASC
    `,
    [ancestors],
  );
  return rows.map(normalizeRuleRow);
}

async function loadPreviewProduct(categoryId: number, attributeIds: number[]) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT
        p.id,
        p.proName,
        p.proThum,
        pr.price,
        pr.market_price,
        u.request_path AS slug,
        b.name AS brandName
      FROM idv_product_category pc
      JOIN idv_sell_product_store p ON p.id = pc.pro_id
      JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      LEFT JOIN idv_brand b ON b.id = p.brandId
      WHERE pc.category_id = ?
      ORDER BY pc.ordering DESC, p.id DESC
      LIMIT 1
    `,
    [categoryId],
  );
  const product = rows[0];
  if (!product) return null;

  let attributeValues: ProductCardAttributePreviewProduct['attributeValues'] = [];
  if (attributeIds.length > 0) {
    const [valueRows] = await pool.query<AttributeValueRow[]>(
      `
        SELECT
          pa.pro_id,
          pa.attr_id,
          pa.attr_value_id,
          a.attribute_code,
          a.name AS attribute_name,
          v.value AS value_name,
          v.ordering AS value_ordering
        FROM idv_product_attribute pa
        JOIN idv_attribute a ON a.id = pa.attr_id AND a.status = 1
        JOIN idv_attribute_value v ON v.id = pa.attr_value_id AND v.attributeId = a.id
        WHERE pa.pro_id = ?
          AND pa.attr_id IN (?)
        ORDER BY a.ordering DESC, v.ordering ASC
      `,
      [Number(product.id), attributeIds],
    );
    attributeValues = valueRows.map((row) => ({
      attributeId: Number(row.attr_id),
      attributeCode: cleanPublicText(row.attribute_code, 80),
      attributeName: cleanPublicText(row.attribute_name, 120),
      valueId: Number(row.attr_value_id),
      value: cleanPublicText(row.value_name, 80),
    }));
  }

  return {
    id: Number(product.id),
    name: cleanPublicText(product.proName, 180) || 'Preview product',
    slug: String(product.slug || '').replace(/^\/+/, '') || `product-${product.id}`,
    thumbnail: resolveProductImageUrl(product.proThum, 'https://via.placeholder.com/300'),
    price: Number(product.price || 0),
    marketPrice: Number(product.market_price || 0),
    brand: cleanPublicText(product.brandName, 120) || 'Khac',
    attributeValues,
  };
}

export async function getProductCardAttributeEditorData(categoryId?: number): Promise<ProductCardAttributeEditorData> {
  const [categories, tableReady] = await Promise.all([
    listProductCardAttributeCategories(),
    productCardRuleTableExists(),
  ]);
  const categoryIds = new Set(categories.map((category) => category.id));
  const fallbackCategory = categories.find((category) => category.id === 1106)
    || categories.find((category) => category.status === 1)
    || categories[0];
  const selectedCategoryId = categoryId && categoryIds.has(categoryId)
    ? categoryId
    : Number(fallbackCategory?.id || 0);

  let availableAttributes: ProductCardAttributeOption[] = [];
  let rules: ProductCardAttributeRule[] = [];
  let inheritedRules: ProductCardAttributeRule[] = [];
  if (selectedCategoryId > 0) {
    [availableAttributes, rules, inheritedRules] = await Promise.all([
      listAvailableAttributesForCategory(selectedCategoryId),
      listDirectRules(selectedCategoryId),
      listInheritedRules(selectedCategoryId, categories),
    ]);
  }

  const previewAttributeIds = Array.from(new Set([
    ...availableAttributes.map((attribute) => attribute.id),
    ...rules.map((rule) => rule.attrId),
    ...inheritedRules.map((rule) => rule.attrId),
  ]));
  const previewProduct = selectedCategoryId > 0
    ? await loadPreviewProduct(selectedCategoryId, previewAttributeIds)
    : null;

  return {
    categories,
    selectedCategoryId,
    availableAttributes,
    rules,
    inheritedRules,
    previewProduct,
    migrationRequired: !tableReady,
  };
}

export async function saveProductCardAttributeRules(categoryId: number, rawRules: unknown[]) {
  await ensureProductCardAttributeRulesTable();

  const [categoryRows] = await pool.query<RowDataPacket[]>('SELECT id FROM idv_seller_category WHERE id = ? LIMIT 1', [categoryId]);
  if (categoryRows.length === 0) throw new Error('Category not found');

  const availableAttributes = await listAvailableAttributesForCategory(categoryId);
  const availableAttributeIds = new Set(availableAttributes.map((attribute) => attribute.id));
  const seenRuleKeys = new Set<string>();
  const normalizedRules = rawRules
    .map((raw, index) => {
      const source = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
      const attrId = toInt(source.attrId ?? source.attributeId);
      if (!availableAttributeIds.has(attrId)) return null;
      const slot = normalizeSlot(source.slot);
      const ruleKey = `${attrId}:${slot}`;
      if (seenRuleKeys.has(ruleKey)) return null;
      seenRuleKeys.add(ruleKey);
      return {
        attrId,
        slot,
        colorVariant: normalizeColorVariant(source.colorVariant),
        labelTemplate: cleanPublicText(source.labelTemplate, 120),
        valueMode: normalizeValueMode(source.valueMode),
        maxValues: Math.min(3, Math.max(1, toInt(source.maxValues, 1))),
        ordering: toInt(source.ordering, (index + 1) * 10),
        status: source.status === false || source.status === 0 || source.status === '0' ? 0 : 1,
        inheritToChildren: source.inheritToChildren === false || source.inheritToChildren === 0 || source.inheritToChildren === '0' ? 0 : 1,
      };
    })
    .filter((rule): rule is NonNullable<typeof rule> => Boolean(rule));

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM ${RULE_TABLE} WHERE category_id = ?`, [categoryId]);
    for (const rule of normalizedRules) {
      await connection.query(
        `
          INSERT INTO ${RULE_TABLE}
            (category_id, attr_id, slot, color_variant, label_template, value_mode, max_values, ordering, status, inherit_to_children)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          categoryId,
          rule.attrId,
          rule.slot,
          rule.colorVariant,
          rule.labelTemplate,
          rule.valueMode,
          rule.maxValues,
          rule.ordering,
          rule.status,
          rule.inheritToChildren,
        ],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  invalidateProductCardAttributeCaches();
  return getProductCardAttributeEditorData(categoryId);
}
