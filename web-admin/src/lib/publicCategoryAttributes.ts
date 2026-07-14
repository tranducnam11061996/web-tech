import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
import { createAttributeValueApiKey, isAttributeValueApiKey } from '@/lib/attributeValueApiKey';

type Db = Pool | PoolConnection;

export type PublicCategoryAttributeRow = {
  attr_id: number;
  attr_name: string;
  attribute_icon: string | null;
  filter_code: string | null;
  attribute_code: string | null;
  val_id: number;
  val_name: string;
  val_api_key: string;
  product_count: number;
  category_ordering: number;
  value_ordering: number;
  attribute_status: number;
  is_search: number;
  attribute_scope: number;
  is_mapped: number;
};

export type PublicCategoryAttribute = {
  id: number | string;
  name: string;
  icon: string | null;
  filter_code: string | null;
  attribute_code: string | null;
  values: Array<{ id: number; name: string; apiKey?: string; productCount: number }>;
};

const unsafeFilterValuePattern = /^(?:javascript\s*:|https?:\/\/|data\s*:|\/\/)/i;

function normalizeAttributeIcon(value: unknown) {
  const icon = String(value || '').trim();
  if (!icon || unsafeFilterValuePattern.test(icon) || icon.length > 16) return null;
  return icon;
}

function isDisplayableFilterValue(value: unknown) {
  const label = String(value || '').trim();
  return label.length > 0 && !unsafeFilterValuePattern.test(label);
}

export function selectEligiblePublicCategoryAttributeRows(
  rows: PublicCategoryAttributeRow[],
  hasCategoryScope: boolean,
) {
  return rows.filter((row) => {
    if (Number(row.attribute_status) !== 1 || Number(row.is_search) !== 1) return false;
    if (!isDisplayableFilterValue(row.val_name)) return false;
    if (!isAttributeValueApiKey(row.val_api_key)) return false;
    if (!hasCategoryScope) return true;
    return Number(row.attribute_scope) === 1
      || Number(row.is_mapped) === 1
      || Number(row.product_count) > 0;
  });
}

export function groupPublicCategoryAttributeRows(rows: PublicCategoryAttributeRow[]) {
  const attributes = new Map<number, PublicCategoryAttribute>();
  for (const row of rows) {
    const attributeId = Number(row.attr_id);
    if (!attributes.has(attributeId)) {
      attributes.set(attributeId, {
        id: attributeId,
        name: String(row.attr_name || ''),
        icon: normalizeAttributeIcon(row.attribute_icon),
        filter_code: row.filter_code ? String(row.filter_code) : null,
        attribute_code: row.attribute_code ? String(row.attribute_code) : null,
        values: [],
      });
    }
    attributes.get(attributeId)!.values.push({
      id: Number(row.val_id),
      name: String(row.val_name),
      apiKey: String(row.val_api_key),
      productCount: Number(row.product_count || 0),
    });
  }
  return Array.from(attributes.values()).filter((attribute) => attribute.values.length > 0);
}

export function buildPublicAttributeFilterIndex(rows: PublicCategoryAttributeRow[]) {
  const attributes = new Map<string, { attrId: number; valuesByApiKey: Map<string, number[]> }>();
  for (const row of rows) {
    const key = String(row.filter_code || row.attribute_code || createAttributeValueApiKey(row.attr_name));
    if (!key || !isAttributeValueApiKey(row.val_api_key)) continue;
    let attribute = attributes.get(key);
    if (!attribute) {
      attribute = { attrId: Number(row.attr_id), valuesByApiKey: new Map() };
      attributes.set(key, attribute);
    }
    const valueIds = attribute.valuesByApiKey.get(row.val_api_key) || [];
    valueIds.push(Number(row.val_id));
    attribute.valuesByApiKey.set(row.val_api_key, valueIds);
  }
  return attributes;
}

async function queryScopedAttributeRows(categoryScope: number[], db: Db) {
  const [rows] = await db.query<Array<RowDataPacket & PublicCategoryAttributeRow>>(`
    SELECT
      a.id AS attr_id,
      a.name AS attr_name,
      a.icon AS attribute_icon,
      a.filter_code,
      a.attribute_code,
      a.status AS attribute_status,
      a.isSearch AS is_search,
      a.scope AS attribute_scope,
      v.id AS val_id,
      v.value AS val_name,
      v.api_key AS val_api_key,
      COALESCE(product_counts.product_count, 0) AS product_count,
      COALESCE(applicable.category_ordering, a.ordering) AS category_ordering,
      v.ordering AS value_ordering,
      CASE WHEN applicable.attr_id IS NULL THEN 0 ELSE 1 END AS is_mapped
    FROM idv_attribute a
    JOIN idv_attribute_value v ON v.attributeId = a.id
    LEFT JOIN (
      SELECT attr_id, MAX(ordering) AS category_ordering
      FROM idv_attribute_category
      WHERE category_id IN (?) AND status = 1
      GROUP BY attr_id
    ) applicable ON applicable.attr_id = a.id
    LEFT JOIN (
      SELECT pa.attr_id, pa.attr_value_id, COUNT(DISTINCT pa.pro_id) AS product_count
      FROM idv_product_attribute pa
      JOIN idv_product_category pc
        ON pc.pro_id = pa.pro_id AND pc.category_id IN (?)
      JOIN idv_sell_product_price pr ON pr.id = pa.pro_id AND pr.isOn = 1
      GROUP BY pa.attr_id, pa.attr_value_id
    ) product_counts
      ON product_counts.attr_id = a.id AND product_counts.attr_value_id = v.id
    WHERE a.status = 1 AND a.isSearch = 1
    ORDER BY category_ordering DESC, value_ordering ASC, v.id ASC
  `, [categoryScope, categoryScope]);
  return selectEligiblePublicCategoryAttributeRows(rows, true);
}

async function queryUnscopedAttributeRows(db: Db) {
  const [rows] = await db.query<Array<RowDataPacket & PublicCategoryAttributeRow>>(`
    SELECT
      a.id AS attr_id,
      a.name AS attr_name,
      a.icon AS attribute_icon,
      a.filter_code,
      a.attribute_code,
      a.status AS attribute_status,
      a.isSearch AS is_search,
      a.scope AS attribute_scope,
      v.id AS val_id,
      v.value AS val_name,
      v.api_key AS val_api_key,
      0 AS product_count,
      a.ordering AS category_ordering,
      v.ordering AS value_ordering,
      0 AS is_mapped
    FROM idv_attribute a
    JOIN idv_attribute_value v ON v.attributeId = a.id
    WHERE a.status = 1 AND a.isSearch = 1
    ORDER BY category_ordering DESC, value_ordering ASC, v.id ASC
  `);
  return selectEligiblePublicCategoryAttributeRows(rows, false);
}

export async function queryPublicCategoryAttributeRows(
  categoryScope: number[] | null,
  db: Db = pool,
) {
  return categoryScope
    ? queryScopedAttributeRows(categoryScope, db)
    : queryUnscopedAttributeRows(db);
}

export async function getPublicCategoryAttributeRows(categoryScope: number[] | null) {
  const cacheScope = categoryScope?.join(',') || 'all';
  return withPublicProductResponseCache(
    `category-attribute-rows:${cacheScope}`,
    () => queryPublicCategoryAttributeRows(categoryScope),
    5 * 60_000,
    10 * 60_000,
  );
}
