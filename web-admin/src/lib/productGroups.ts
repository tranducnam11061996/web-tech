import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
// @ts-ignore php-serialize does not publish TypeScript declarations.
import { serialize, unserialize } from 'php-serialize';
import pool from '@/lib/db';
import { AdminApiError, resultId, withTransaction } from '@/lib/admin/common';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';
import { buildMediaUrl, parseLegacyProductImages } from '@/lib/admin/images';
import { clearPublicCatalogDetailCache } from '@/lib/publicProductCache';

export const PRODUCT_GROUP_LIMITS = {
  attributes: 4,
  valuesPerAttribute: 50,
  products: 50,
  name: 150,
  description: 255,
} as const;

export type ProductGroupValueInput = {
  key: string;
  id?: number;
  name: string;
  description: string;
  ordering: number;
};

export type ProductGroupAttributeInput = {
  key: string;
  id?: number;
  name: string;
  ordering: number;
  values: ProductGroupValueInput[];
};

export type ProductGroupProductInput = {
  productId: number;
  selections: Array<{ attributeKey: string; valueKey: string }>;
};

export type ProductGroupPayload = {
  name: string;
  description: string;
  attributes: ProductGroupAttributeInput[];
  products: ProductGroupProductInput[];
};

export type PublicProductGroupValue = {
  attributeId: number;
  attributeName: string;
  valueId: number;
  valueName: string;
};

export type PublicProductGroup = {
  id: number;
  name: string;
  displayLabel: string;
  items: Array<{
    productId: number;
    slug: string;
    sku: string;
    name: string;
    price: number;
    marketPrice: number;
    isCurrent: boolean;
    thumbnail: string;
    values: PublicProductGroupValue[];
    displayName: string;
  }>;
};

type AttributeRecord = {
  id: number;
  groupId: number;
  name: string;
  ordering: number;
};

type ValueRecord = {
  id: number;
  attributeId: number;
  name: string;
  description: string;
  ordering: number;
};

function boundedText(value: unknown, field: string, max: number, required = false) {
  const text = String(value ?? '').trim();
  if (required && !text) throw new AdminApiError(400, 'BAD_REQUEST', `${field} là bắt buộc`, { [field]: 'required' });
  if (text.length > max) throw new AdminApiError(400, 'BAD_REQUEST', `${field} vượt quá ${max} ký tự`, { [field]: 'max_length' });
  return text;
}

function positiveInt(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function ordering(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(0, Math.min(number, 10_000)) : fallback;
}

function stableKey(value: unknown, fallback: string) {
  const key = String(value || fallback).trim().slice(0, 80);
  if (!/^[a-zA-Z0-9:_-]+$/.test(key)) throw new AdminApiError(400, 'BAD_REQUEST', 'Khóa thuộc tính hoặc giá trị không hợp lệ');
  return key;
}

export function parseProductGroupPayload(input: unknown): ProductGroupPayload {
  const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const rawAttributes = Array.isArray(body.attributes) ? body.attributes : [];
  const rawProducts = Array.isArray(body.products) ? body.products : [];
  if (rawAttributes.length > PRODUCT_GROUP_LIMITS.attributes) {
    throw new AdminApiError(400, 'BAD_REQUEST', `Chỉ hỗ trợ tối đa ${PRODUCT_GROUP_LIMITS.attributes} thuộc tính`);
  }
  if (rawProducts.length > PRODUCT_GROUP_LIMITS.products) {
    throw new AdminApiError(400, 'BAD_REQUEST', `Chỉ hỗ trợ tối đa ${PRODUCT_GROUP_LIMITS.products} sản phẩm`);
  }

  const attributeKeys = new Set<string>();
  const valueKeys = new Set<string>();
  const attributes = rawAttributes.map((raw, attributeIndex) => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const id = positiveInt(item.id);
    const key = stableKey(item.key, id ? `attribute-${id}` : `attribute-new-${attributeIndex}`);
    if (attributeKeys.has(key)) throw new AdminApiError(400, 'BAD_REQUEST', 'Khóa thuộc tính bị trùng');
    attributeKeys.add(key);
    const rawValues = Array.isArray(item.values) ? item.values : [];
    if (rawValues.length > PRODUCT_GROUP_LIMITS.valuesPerAttribute) {
      throw new AdminApiError(400, 'BAD_REQUEST', `Mỗi thuộc tính chỉ hỗ trợ tối đa ${PRODUCT_GROUP_LIMITS.valuesPerAttribute} giá trị`);
    }
    const values = rawValues.map((rawValue, valueIndex) => {
      const value = rawValue && typeof rawValue === 'object' ? rawValue as Record<string, unknown> : {};
      if (Object.hasOwn(value, 'image') || Object.hasOwn(value, 'colorCode') || Object.hasOwn(value, 'color_code')) {
        throw new AdminApiError(400, 'BAD_REQUEST', 'Ảnh value và mã màu không còn được hỗ trợ');
      }
      const valueId = positiveInt(value.id);
      const valueKey = stableKey(value.key, valueId ? `value-${valueId}` : `${key}-value-new-${valueIndex}`);
      if (valueKeys.has(valueKey)) throw new AdminApiError(400, 'BAD_REQUEST', 'Khóa giá trị bị trùng');
      valueKeys.add(valueKey);
      return {
        key: valueKey,
        ...(valueId ? { id: valueId } : {}),
        name: boundedText(value.name, 'Tên giá trị', 150, true),
        description: boundedText(value.description, 'Mô tả giá trị', 255),
        ordering: ordering(value.ordering, valueIndex),
      };
    });
    if (values.length === 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Mỗi thuộc tính cần ít nhất một giá trị');
    return {
      key,
      ...(id ? { id } : {}),
      name: boundedText(item.name, 'Tên thuộc tính', 150, true),
      ordering: ordering(item.ordering, attributeIndex),
      values,
    };
  });

  const productIds = new Set<number>();
  const products = rawProducts.map((raw, productIndex) => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const productId = positiveInt(item.productId);
    if (!productId) throw new AdminApiError(400, 'BAD_REQUEST', 'Sản phẩm không hợp lệ');
    if (productIds.has(productId)) throw new AdminApiError(400, 'BAD_REQUEST', 'Sản phẩm bị chọn trùng');
    productIds.add(productId);
    const rawSelections = Array.isArray(item.selections) ? item.selections : [];
    const selectedAttributes = new Set<string>();
    const selections = rawSelections.map((rawSelection) => {
      const selection = rawSelection && typeof rawSelection === 'object' ? rawSelection as Record<string, unknown> : {};
      const attributeKey = stableKey(selection.attributeKey, `missing-attribute-${productIndex}`);
      const valueKey = stableKey(selection.valueKey, `missing-value-${productIndex}`);
      if (!attributeKeys.has(attributeKey) || !valueKeys.has(valueKey)) {
        throw new AdminApiError(400, 'BAD_REQUEST', 'Giá trị phân loại không thuộc group');
      }
      if (selectedAttributes.has(attributeKey)) throw new AdminApiError(400, 'BAD_REQUEST', 'Mỗi thuộc tính chỉ được chọn một giá trị');
      selectedAttributes.add(attributeKey);
      const attribute = attributes.find((candidate) => candidate.key === attributeKey);
      if (!attribute?.values.some((candidate) => candidate.key === valueKey)) {
        throw new AdminApiError(400, 'BAD_REQUEST', 'Giá trị không thuộc thuộc tính đã chọn');
      }
      return { attributeKey, valueKey };
    });
    if (selections.length === 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Mỗi sản phẩm cần ít nhất một giá trị phân loại');
    return { productId, selections };
  });

  return {
    name: boundedText(body.name, 'Tên group', PRODUCT_GROUP_LIMITS.name, true),
    description: boundedText(body.description, 'Mô tả', PRODUCT_GROUP_LIMITS.description),
    attributes,
    products,
  };
}

export function parseLegacyAttributeConfig(raw: unknown, attributes: AttributeRecord[], values: ValueRecord[]) {
  let parsed: unknown;
  try {
    parsed = unserialize(String(raw || ''));
  } catch {
    return [] as Array<{ attribute: AttributeRecord; value: ValueRecord }>;
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const attributeMap = new Map(attributes.map((attribute) => [attribute.id, attribute]));
  const valueMap = new Map(values.map((value) => [value.id, value]));
  const result: Array<{ attribute: AttributeRecord; value: ValueRecord }> = [];
  for (const [rawAttributeId, rawValueId] of Object.entries(parsed as Record<string, unknown>)) {
    const attributeId = positiveInt(rawAttributeId);
    const valueId = positiveInt(rawValueId);
    if (!attributeId || !valueId) continue;
    const attribute = attributeMap.get(attributeId);
    const value = valueMap.get(valueId);
    if (!attribute || !value || value.attributeId !== attribute.id) continue;
    result.push({ attribute, value });
  }
  return result.sort((left, right) => left.attribute.ordering - right.attribute.ordering || left.attribute.id - right.attribute.id);
}

export function serializeAttributeConfig(entries: Array<{ attributeId: number; valueId: number }>) {
  const normalized = Object.fromEntries(entries.map((entry) => [entry.attributeId, String(entry.valueId)]));
  return serialize(normalized);
}

/** Resolves the SKU thumbnail without loading a separate image collection per card. */
export function resolveProductGroupThumbnail(rawThumbnail: unknown, rawImageCollection: unknown) {
  const images = parseLegacyProductImages(rawImageCollection, rawThumbnail);
  const image = images.find((candidate) => candidate.isPrimary) || images[0];
  return image ? buildMediaUrl(image.fileName, 'legacy') : '';
}

type PublicProductGroupRow = {
  product_id: number;
  attribute_config: unknown;
  storeSKU: unknown;
  proName: unknown;
  price: unknown;
  market_price: unknown;
  slug: unknown;
  proThum?: unknown;
  image_collection?: unknown;
};

export function buildPublicProductGroup(input: {
  groupId: number;
  groupName: string;
  currentProductId: number;
  attributes: AttributeRecord[];
  values: ValueRecord[];
  productRows: PublicProductGroupRow[];
}): PublicProductGroup | null {
  if (input.attributes.length === 0) return null;
  const seenProductIds = new Set<number>();
  const items = input.productRows.flatMap((row) => {
    const productId = Number(row.product_id);
    if (!productId || seenProductIds.has(productId)) return [];
    seenProductIds.add(productId);
    const parsed = parseLegacyAttributeConfig(row.attribute_config, input.attributes, input.values);
    const slug = String(row.slug || '').trim();
    const numericPrice = Number(row.price || 0);
    if (!slug || numericPrice <= 0 || parsed.length === 0) return [];
    const values: PublicProductGroupValue[] = parsed.map(({ attribute, value }) => ({
      attributeId: attribute.id,
      attributeName: attribute.name,
      valueId: value.id,
      valueName: value.name,
    }));
    return [{
      productId, slug, sku: String(row.storeSKU || ''), name: String(row.proName || ''),
      price: numericPrice, marketPrice: Number(row.market_price || 0),
      isCurrent: productId === input.currentProductId,
      thumbnail: resolveProductGroupThumbnail(row.proThum, row.image_collection),
      values,
      displayName: values.map((value) => value.valueName).join(' · '),
      sortKey: parsed.map(({ value }) => String(value.ordering).padStart(5, '0')).join(':'),
    }];
  }).sort((left, right) => left.sortKey.localeCompare(right.sortKey) || left.productId - right.productId)
    .map(({ sortKey: _sortKey, ...item }) => item);
  if (items.length < 2 || !items.some((item) => item.isCurrent)) return null;
  return {
    id: input.groupId,
    name: input.groupName,
    displayLabel: input.attributes.length === 1 ? input.attributes[0].name : 'Phiên bản',
    items,
  };
}

async function loadGroupTaxonomy(groupId: number, connection: PoolConnection | typeof pool = pool) {
  const [attributeRows, valueRows] = await Promise.all([
    connection.query<RowDataPacket[]>(
      'SELECT id, group_id, name, ordering FROM config_group_attribute WHERE group_id = ? ORDER BY ordering, id',
      [groupId],
    ),
    connection.query<RowDataPacket[]>(
      `SELECT v.id, v.attr_id, v.name, v.description, v.ordering
       FROM config_group_attribute_value v
       JOIN config_group_attribute a ON a.id = v.attr_id
       WHERE a.group_id = ? ORDER BY a.ordering, a.id, v.ordering, v.id`,
      [groupId],
    ),
  ]);
  const attributes: AttributeRecord[] = attributeRows[0].map((row) => ({
    id: Number(row.id), groupId: Number(row.group_id), name: String(row.name || ''), ordering: Number(row.ordering || 0),
  }));
  const values: ValueRecord[] = valueRows[0].map((row) => ({
    id: Number(row.id), attributeId: Number(row.attr_id), name: String(row.name || ''), description: String(row.description || ''),
    ordering: Number(row.ordering || 0),
  }));
  return { attributes, values };
}

export async function getPublicProductGroup(currentProductId: number): Promise<PublicProductGroup | null> {
  const [linkRows] = await pool.query<RowDataPacket[]>(
    `SELECT g.id group_id, g.name group_name
     FROM config_group_product gp
     JOIN config_group g ON g.id = gp.group_id
     WHERE gp.product_id = ? LIMIT 1`,
    [currentProductId],
  );
  const groupId = Number(linkRows[0]?.group_id || 0);
  if (!groupId) return null;

  const [taxonomy, productResult] = await Promise.all([
    loadGroupTaxonomy(groupId),
    pool.query<RowDataPacket[]>(
      `SELECT gp.product_id, gp.attribute_config, p.storeSKU, p.proName, p.proThum, p.image_collection, p.url, pr.price, pr.market_price,
              TRIM(BOTH '/' FROM COALESCE(NULLIF(u.request_path, ''), NULLIF(p.url, '0'), '')) AS slug
       FROM config_group_product gp
       JOIN idv_sell_product_store p ON p.id = gp.product_id
       JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1 AND pr.price > 0
       LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
       WHERE gp.group_id = ?
       ORDER BY gp.product_id
       LIMIT ?`,
      [groupId, PRODUCT_GROUP_LIMITS.products],
    ),
  ]);
  if (taxonomy.attributes.length === 0) return null;

  return buildPublicProductGroup({
    groupId,
    groupName: String(linkRows[0].group_name || ''),
    currentProductId,
    attributes: taxonomy.attributes,
    values: taxonomy.values,
    productRows: productResult[0] as PublicProductGroupRow[],
  });
}

export async function listProductGroupsFromRequest(url: string) {
  const searchParams = new URL(url).searchParams;
  const { page, limit, offset } = parsePaginationParams(searchParams);
  const search = String(searchParams.get('search') || '').trim().slice(0, 150);
  const values: unknown[] = [];
  const filters: string[] = [];
  if (search) {
    filters.push('(g.name LIKE ? OR g.description LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countRows, listRows] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM config_group g ${where}`, values),
    pool.query<RowDataPacket[]>(
      `SELECT g.id, g.name, g.description, g.create_by, g.create_time, g.last_update, g.last_update_by,
              (SELECT COUNT(*) FROM config_group_attribute a WHERE a.group_id = g.id) attribute_count,
              (SELECT COUNT(*) FROM config_group_product gp JOIN idv_sell_product_store p ON p.id = gp.product_id WHERE gp.group_id = g.id) valid_product_count,
              (SELECT COUNT(*) FROM config_group_product gp LEFT JOIN idv_sell_product_store p ON p.id = gp.product_id WHERE gp.group_id = g.id AND p.id IS NULL) orphan_product_count,
              (SELECT COUNT(*) FROM config_group_product gp JOIN idv_sell_product_store p ON p.id = gp.product_id JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1 AND pr.price > 0 WHERE gp.group_id = g.id) sellable_product_count
       FROM config_group g ${where}
       ORDER BY g.last_update DESC, g.id DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    ),
  ]);
  const total = Number(countRows[0][0]?.total || 0);
  return {
    items: listRows[0].map((row) => ({
      id: Number(row.id), name: String(row.name || ''), description: String(row.description || ''),
      createdBy: String(row.create_by || ''), createdAt: Number(row.create_time || 0),
      updatedBy: String(row.last_update_by || ''), updatedAt: Number(row.last_update || 0),
      attributeCount: Number(row.attribute_count || 0), validProductCount: Number(row.valid_product_count || 0),
      orphanProductCount: Number(row.orphan_product_count || 0), sellableProductCount: Number(row.sellable_product_count || 0),
      isVisible: Number(row.sellable_product_count || 0) >= 2,
    })),
    pagination: buildPagination(total, page, limit),
  };
}

export async function listProductGroupBrands() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT b.id, b.name, COUNT(p.id) productCount
     FROM idv_brand b
     JOIN idv_sell_product_store p ON p.brandId = b.id
     GROUP BY b.id, b.name
     ORDER BY b.name ASC
     LIMIT 1000`,
  );
  return rows.map((row) => ({ id: Number(row.id), name: String(row.name || ''), productCount: Number(row.productCount || 0) }));
}

export async function getAdminProductGroup(groupId: number) {
  const [groupRows] = await pool.query<RowDataPacket[]>('SELECT * FROM config_group WHERE id = ? LIMIT 1', [groupId]);
  const group = groupRows[0];
  if (!group) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy group sản phẩm');
  const [taxonomy, productRows, orphanRows] = await Promise.all([
    loadGroupTaxonomy(groupId),
    pool.query<RowDataPacket[]>(
      `SELECT gp.product_id, gp.attribute_config, p.storeSKU, p.proName, p.brandId, p.proThum,
              pr.price, pr.market_price, pr.isOn, b.name brandName
       FROM config_group_product gp
       JOIN idv_sell_product_store p ON p.id = gp.product_id
       LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
       LEFT JOIN idv_brand b ON b.id = p.brandId
       WHERE gp.group_id = ? ORDER BY gp.product_id`,
      [groupId],
    ),
    pool.query<RowDataPacket[]>(
      `SELECT gp.product_id FROM config_group_product gp
       LEFT JOIN idv_sell_product_store p ON p.id = gp.product_id
       WHERE gp.group_id = ? AND p.id IS NULL ORDER BY gp.product_id LIMIT 100`,
      [groupId],
    ),
  ]);
  const valuesByAttribute = new Map<number, ValueRecord[]>();
  for (const value of taxonomy.values) valuesByAttribute.set(value.attributeId, [...(valuesByAttribute.get(value.attributeId) || []), value]);
  let invalidConfigCount = 0;
  const products = productRows[0].map((row) => {
    const parsed = parseLegacyAttributeConfig(row.attribute_config, taxonomy.attributes, taxonomy.values);
    if (parsed.length === 0) invalidConfigCount += 1;
    return {
      productId: Number(row.product_id), sku: String(row.storeSKU || ''), name: String(row.proName || ''),
      brandId: Number(row.brandId || 0), brandName: String(row.brandName || ''), thumbnail: String(row.proThum || ''),
      price: Number(row.price || 0), marketPrice: Number(row.market_price || 0), status: Number(row.isOn || 0),
      selections: parsed.map(({ attribute, value }) => ({ attributeKey: `attribute-${attribute.id}`, valueKey: `value-${value.id}` })),
    };
  });
  return {
    id: groupId, name: String(group.name || ''), description: String(group.description || ''),
    createdBy: String(group.create_by || ''), createdAt: Number(group.create_time || 0),
    updatedBy: String(group.last_update_by || ''), updatedAt: Number(group.last_update || 0),
    attributes: taxonomy.attributes.map((attribute) => ({
      key: `attribute-${attribute.id}`, id: attribute.id, name: attribute.name, ordering: attribute.ordering,
      values: (valuesByAttribute.get(attribute.id) || []).map((value) => ({
        key: `value-${value.id}`, id: value.id, name: value.name, description: value.description,
        ordering: value.ordering,
      })),
    })),
    products,
    diagnostics: {
      orphanProductIds: orphanRows[0].map((row) => Number(row.product_id)),
      orphanProductCount: orphanRows[0].length,
      invalidConfigCount,
      isVisible: products.filter((product) => product.status === 1 && product.price > 0 && product.selections.length > 0).length >= 2,
    },
  };
}

async function assertOwnedIds(
  payload: ProductGroupPayload,
  groupId: number,
  existingAttributes: AttributeRecord[],
  existingValues: ValueRecord[],
) {
  const attributeIds = new Set(existingAttributes.map((attribute) => attribute.id));
  const valueOwners = new Map(existingValues.map((value) => [value.id, value.attributeId]));
  for (const attribute of payload.attributes) {
    if (attribute.id && !attributeIds.has(attribute.id)) throw new AdminApiError(409, 'CONFLICT', `Thuộc tính ${attribute.id} không thuộc group ${groupId}`);
    for (const value of attribute.values) {
      if (value.id && (!valueOwners.has(value.id) || valueOwners.get(value.id) !== attribute.id)) {
        throw new AdminApiError(409, 'CONFLICT', `Giá trị ${value.id} không thuộc thuộc tính đã chọn`);
      }
    }
  }
}

export async function saveProductGroup(input: unknown, actor: string, id?: number) {
  const payload = parseProductGroupPayload(input);
  const now = Math.floor(Date.now() / 1000);
  const groupId = await withTransaction(async (connection) => {
    let targetId = positiveInt(id);
    if (targetId) {
      const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM config_group WHERE id = ? FOR UPDATE', [targetId]);
      if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy group sản phẩm');
      await connection.query(
        'UPDATE config_group SET name = ?, description = ?, search_fulltext = ?, last_update = ?, last_update_by = ? WHERE id = ?',
        [payload.name, payload.description, `${payload.name} ${payload.description}`.trim(), now, actor, targetId],
      );
    } else {
      const [insert] = await connection.query<ResultSetHeader>(
        `INSERT INTO config_group (name, description, search_fulltext, create_by, create_time, last_update, last_update_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [payload.name, payload.description, `${payload.name} ${payload.description}`.trim(), actor, now, now, actor],
      );
      targetId = resultId(insert);
    }

    const taxonomy = await loadGroupTaxonomy(targetId, connection);
    await assertOwnedIds(payload, targetId, taxonomy.attributes, taxonomy.values);
    const productIds = payload.products.map((product) => product.productId).sort((left, right) => left - right);
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const [productRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM idv_sell_product_store WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
        productIds,
      );
      if (productRows.length !== productIds.length) throw new AdminApiError(409, 'CONFLICT', 'Một hoặc nhiều sản phẩm không còn tồn tại');
      const [conflicts] = await connection.query<RowDataPacket[]>(
        `SELECT gp.product_id, gp.group_id, g.name FROM config_group_product gp
         LEFT JOIN config_group g ON g.id = gp.group_id
         WHERE gp.product_id IN (${placeholders}) AND gp.group_id <> ? FOR UPDATE`,
        [...productIds, targetId],
      );
      if (conflicts[0]) {
        throw new AdminApiError(409, 'CONFLICT', `Sản phẩm ${conflicts[0].product_id} đã thuộc group ${conflicts[0].name || conflicts[0].group_id}`);
      }
    }

    const resolvedAttributes = new Map<string, number>();
    const resolvedValues = new Map<string, { id: number; attributeKey: string }>();
    for (const attribute of payload.attributes) {
      let attributeId = positiveInt(attribute.id);
      if (attributeId) {
        await connection.query(
          'UPDATE config_group_attribute SET name = ?, ordering = ?, last_update = ?, last_update_by = ? WHERE id = ? AND group_id = ?',
          [attribute.name, attribute.ordering, now, actor, attributeId, targetId],
        );
      } else {
        const [insert] = await connection.query<ResultSetHeader>(
          `INSERT INTO config_group_attribute (name, group_id, ordering, create_by, create_time, last_update, last_update_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [attribute.name, targetId, attribute.ordering, actor, now, now, actor],
        );
        attributeId = resultId(insert);
      }
      resolvedAttributes.set(attribute.key, attributeId);
      for (const value of attribute.values) {
        let valueId = positiveInt(value.id);
        if (valueId) {
          await connection.query(
            `UPDATE config_group_attribute_value SET name = ?, description = ?, ordering = ?, last_update = ?, last_update_by = ?
             WHERE id = ? AND attr_id = ?`,
            [value.name, value.description, value.ordering, now, actor, valueId, attributeId],
          );
        } else {
          const [insert] = await connection.query<ResultSetHeader>(
            `INSERT INTO config_group_attribute_value (name, description, attr_id, ordering, create_by, create_time, last_update, last_update_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [value.name, value.description, attributeId, value.ordering, actor, now, now, actor],
          );
          valueId = resultId(insert);
        }
        resolvedValues.set(value.key, { id: valueId, attributeKey: attribute.key });
      }
    }

    await connection.query('DELETE FROM config_group_product WHERE group_id = ?', [targetId]);
    for (const product of payload.products) {
      const entries = product.selections.map((selection) => {
        const attributeId = resolvedAttributes.get(selection.attributeKey);
        const value = resolvedValues.get(selection.valueKey);
        if (!attributeId || !value || value.attributeKey !== selection.attributeKey) {
          throw new AdminApiError(400, 'BAD_REQUEST', 'Không thể ánh xạ phân loại sản phẩm');
        }
        return { attributeId, valueId: value.id };
      });
      await connection.query(
        `INSERT INTO config_group_product (product_id, group_id, attribute_config, create_by, create_time, last_update, last_update_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [product.productId, targetId, serializeAttributeConfig(entries), actor, now, now, actor],
      );
    }

    const keptValueIds = [...resolvedValues.values()].map((value) => value.id);
    const keptAttributeIds = [...resolvedAttributes.values()];
    if (keptValueIds.length > 0) {
      await connection.query(
        `DELETE v FROM config_group_attribute_value v JOIN config_group_attribute a ON a.id = v.attr_id
         WHERE a.group_id = ? AND v.id NOT IN (${keptValueIds.map(() => '?').join(',')})`,
        [targetId, ...keptValueIds],
      );
    } else {
      await connection.query('DELETE v FROM config_group_attribute_value v JOIN config_group_attribute a ON a.id = v.attr_id WHERE a.group_id = ?', [targetId]);
    }
    if (keptAttributeIds.length > 0) {
      await connection.query(
        `DELETE FROM config_group_attribute WHERE group_id = ? AND id NOT IN (${keptAttributeIds.map(() => '?').join(',')})`,
        [targetId, ...keptAttributeIds],
      );
    } else {
      await connection.query('DELETE FROM config_group_attribute WHERE group_id = ?', [targetId]);
    }
    return targetId;
  });
  clearPublicCatalogDetailCache();
  return getAdminProductGroup(groupId);
}

export async function deleteProductGroupPermanently(id: number) {
  await withTransaction(async (connection) => {
    const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM config_group WHERE id = ? FOR UPDATE', [id]);
    if (!existing[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy group sản phẩm');
    const [attributes] = await connection.query<RowDataPacket[]>('SELECT id FROM config_group_attribute WHERE group_id = ?', [id]);
    const attributeIds = attributes.map((row) => Number(row.id));
    await connection.query('DELETE FROM config_group_product WHERE group_id = ?', [id]);
    if (attributeIds.length > 0) {
      await connection.query(`DELETE FROM config_group_attribute_value WHERE attr_id IN (${attributeIds.map(() => '?').join(',')})`, attributeIds);
    }
    await connection.query('DELETE FROM config_group_attribute WHERE group_id = ?', [id]);
    await connection.query('DELETE FROM config_group WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['product-group', id]);
  });
  clearPublicCatalogDetailCache();
  return { id, deleted: true };
}

export async function ensureProductGroupIndexes() {
  const [indexRows] = await pool.query<RowDataPacket[]>(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'config_group_product' AND INDEX_NAME = 'uq_config_group_product_product' LIMIT 1`,
  );
  if (indexRows[0]) return { changed: false };
  const [duplicates] = await pool.query<RowDataPacket[]>(
    `SELECT product_id, COUNT(*) relation_count, COUNT(DISTINCT group_id) group_count
     FROM config_group_product GROUP BY product_id HAVING relation_count > 1 OR group_count > 1 LIMIT 1`,
  );
  if (duplicates[0]) {
    throw new Error(`Cannot add uq_config_group_product_product: product ${duplicates[0].product_id} has duplicate group relations`);
  }
  await pool.query('ALTER TABLE config_group_product ADD UNIQUE KEY uq_config_group_product_product (product_id)');
  return { changed: true };
}

export async function removeProductGroupValueVisualColumns() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'config_group_attribute_value'
       AND COLUMN_NAME IN ('image', 'color_code')`,
  );
  const existingColumns = new Set(rows.map((row) => String(row.COLUMN_NAME)));
  const removed: Array<{ column: 'image' | 'color_code'; nonEmptyValues: number }> = [];
  for (const column of ['image', 'color_code'] as const) {
    if (!existingColumns.has(column)) continue;
    const [usageRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) non_empty_values FROM config_group_attribute_value
       WHERE NULLIF(TRIM(COALESCE(\`${column}\`, '')), '') IS NOT NULL`,
    );
    const nonEmptyValues = Number(usageRows[0]?.non_empty_values || 0);
    console.warn(`[product-group migration] dropping ${column}; ${nonEmptyValues} non-empty legacy value(s) will be discarded.`);
    await pool.query(`ALTER TABLE config_group_attribute_value DROP COLUMN \`${column}\``);
    removed.push({ column, nonEmptyValues });
  }
  return { changed: removed.length > 0, removed };
}
