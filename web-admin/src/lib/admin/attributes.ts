import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { isAttributeValueApiKey } from '@/lib/attributeValueApiKey';
import { invalidateProductCardAttributeCaches } from '@/lib/productCardAttributes';
import { clearPublicCatalogDetailCache, clearPublicProductResponseCache } from '@/lib/publicProductCache';
import { invalidatePublicSearchMetadata } from '@/lib/publicSearch';
import { invalidateSearchCache } from '@/lib/searchCache';
import { AdminApiError, markRegistry, parseIdList, toBoolInt, toInt, withTransaction } from './common';
import type { AttributeCategoryNode, AttributeFormData, AttributeListItem, AttributeValueForm } from './attributeTypes';

type AttributeListQuery = {
  page: number;
  limit: number;
  q?: string;
  sort?: string;
  direction?: string;
};

const SORT_COLUMNS: Record<string, string> = {
  id: 'a.id',
  sequence: 'a.id',
  code: 'a.attribute_code',
  name: 'a.name',
  valueCount: 'value_count',
  categoryCount: 'category_count',
  status: 'a.status',
};

function boundedInt(value: unknown, field: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new AdminApiError(400, 'BAD_REQUEST', `${field} khong hop le`, { [field]: 'invalid' });
  }
  return parsed;
}

function text(value: unknown, field: string, max: number, required = false) {
  const normalized = String(value ?? '').trim();
  if (required && !normalized) throw new AdminApiError(400, 'BAD_REQUEST', `${field} la bat buoc`, { [field]: 'required' });
  if (normalized.length > max) throw new AdminApiError(400, 'BAD_REQUEST', `${field} vuot qua ${max} ky tu`, { [field]: 'max_length' });
  return normalized;
}

function safeImage(value: unknown) {
  const image = text(value, 'image', 150);
  if (/^(?:javascript|data|vbscript)\s*:/i.test(image) || /[\u0000-\u001f]/.test(image)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Anh icon khong hop le', { image: 'unsafe' });
  }
  return image;
}

function slug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
}

export function parseAttributePayload(input: unknown): AttributeFormData {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const scope = boundedInt(source.scope ?? 0, 'scope', 0, 1) as 0 | 1;
  const categoryIds = Array.from(new Set((Array.isArray(source.categoryIds) ? source.categoryIds : [])
    .map((item) => toInt(item)).filter((id) => id > 0)));
  if (categoryIds.length > 1_000) throw new AdminApiError(400, 'BAD_REQUEST', 'Qua nhieu danh muc', { categoryIds: 'max_items' });
  if (scope === 0 && categoryIds.length === 0) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thuoc tinh Local can it nhat mot danh muc', { categoryIds: 'required' });
  }

  const rawValues = Array.isArray(source.values) ? source.values : [];
  if (rawValues.length > 2_000) throw new AdminApiError(400, 'BAD_REQUEST', 'Qua nhieu gia tri thuoc tinh', { values: 'max_items' });
  const valueIds = new Set<number>();
  const apiKeys = new Set<string>();
  const values: AttributeValueForm[] = rawValues.map((item, index) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const id = toInt(row.id);
    if (id > 0) {
      if (valueIds.has(id)) throw new AdminApiError(400, 'BAD_REQUEST', 'ID gia tri bi trung', { values: 'duplicate_id' });
      valueIds.add(id);
    }
    const value = text(row.value, `values.${index}.value`, 200, true);
    const apiKey = text(row.apiKey ?? row.api_key, `values.${index}.apiKey`, 200, true);
    if (!isAttributeValueApiKey(apiKey)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'ApiKey gia tri khong hop le', { [`values.${index}.apiKey`]: 'invalid_slug' });
    }
    const normalizedApiKey = apiKey.toLowerCase();
    if (normalizedApiKey) {
      if (apiKeys.has(normalizedApiKey)) throw new AdminApiError(400, 'BAD_REQUEST', 'ApiKey gia tri bi trung', { values: 'duplicate_api_key' });
      apiKeys.add(normalizedApiKey);
    }
    return {
      ...(id > 0 ? { id } : {}),
      value,
      apiKey,
      image: safeImage(row.image),
      description: text(row.description, `values.${index}.description`, 255),
      ordering: boundedInt(row.ordering ?? index, `values.${index}.ordering`, -32768, 32767),
      valueSort: boundedInt(row.valueSort ?? row.value_sort ?? 0, `values.${index}.valueSort`, -8388608, 8388607),
    };
  });

  return {
    name: text(source.name, 'name', 200, true),
    code: text(source.code ?? source.attributeCode ?? source.attribute_code, 'code', 30, true),
    comment: text(source.comment, 'comment', 250),
    filterCode: text(source.filterCode ?? source.filter_code, 'filterCode', 20),
    scope,
    ordering: boundedInt(source.ordering ?? 0, 'ordering', -32768, 32767),
    isHeader: Boolean(toBoolInt(source.isHeader ?? source.is_header)),
    isSearch: Boolean(toBoolInt(source.isSearch ?? source.is_search)),
    inSummary: Boolean(toBoolInt(source.inSummary ?? source.in_summary)),
    productSpec: Boolean(toBoolInt(source.productSpec ?? source.product_spec)),
    forProductOption: Boolean(toBoolInt(source.forProductOption ?? source.for_product_option)),
    status: source.status === undefined ? true : Boolean(toBoolInt(source.status)),
    values,
    categoryIds: scope === 1 ? [] : categoryIds,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function listAttributes(query: AttributeListQuery) {
  const page = Math.max(1, toInt(query.page, 1));
  const limit = [20, 50, 100].includes(toInt(query.limit)) ? toInt(query.limit) : 20;
  const q = String(query.q || '').trim().slice(0, 100);
  const where = q ? `WHERE (a.attribute_code LIKE ? ESCAPE '\\\\' OR a.name LIKE ? ESCAPE '\\\\')` : '';
  const bindings = q ? [`%${escapeLike(q)}%`, `%${escapeLike(q)}%`] : [];
  const sortColumn = SORT_COLUMNS[String(query.sort || '')] || 'a.id';
  const direction = String(query.direction || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const [[countRows], [rows]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM idv_attribute a ${where}`, bindings),
    pool.query<RowDataPacket[]>(`
      SELECT a.id, a.attribute_code, a.name, a.status,
        COALESCE(v.value_count, 0) value_count,
        CASE WHEN a.scope = 1 THEN (SELECT COUNT(*) FROM idv_seller_category) ELSE COALESCE(ac.category_count, 0) END category_count,
        COALESCE(pa.product_count, 0) product_count
      FROM idv_attribute a
      LEFT JOIN (SELECT attributeId, COUNT(*) value_count FROM idv_attribute_value GROUP BY attributeId) v ON v.attributeId = a.id
      LEFT JOIN (SELECT attr_id, COUNT(DISTINCT category_id) category_count FROM idv_attribute_category GROUP BY attr_id) ac ON ac.attr_id = a.id
      LEFT JOIN (SELECT attr_id, COUNT(DISTINCT pro_id) product_count FROM idv_product_attribute GROUP BY attr_id) pa ON pa.attr_id = a.id
      ${where}
      ORDER BY ${sortColumn} ${direction}, a.id DESC
      LIMIT ? OFFSET ?
    `, [...bindings, limit, offset]),
  ]);
  const totalItems = Number(countRows[0]?.total || 0);
  const items: AttributeListItem[] = rows.map((row, index) => ({
    id: Number(row.id),
    sequence: offset + index + 1,
    code: String(row.attribute_code || `ATTR_${row.id}`),
    name: String(row.name || 'N/A'),
    valueCount: Number(row.value_count || 0),
    categoryCount: Number(row.category_count || 0),
    productCount: Number(row.product_count || 0),
    isActive: Number(row.status) === 1,
  }));
  return { items, totalItems, page, limit };
}

export async function listAttributeCategories(): Promise<AttributeCategoryNode[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, parentId, name FROM idv_seller_category ORDER BY parentId ASC, ordering ASC, id ASC',
  );
  return rows.map((row) => ({ id: Number(row.id), parentId: Number(row.parentId || 0), name: String(row.name || '') }));
}

export async function getAttribute(id: number, connection?: PoolConnection): Promise<AttributeFormData> {
  if (!id) throw new AdminApiError(400, 'BAD_REQUEST', 'ID thuoc tinh khong hop le');
  const db = connection || pool;
  const [[attributes], [values], [categories]] = await Promise.all([
    db.query<RowDataPacket[]>(`
      SELECT id, name, attribute_code, comment, filter_code, scope, ordering, isHeader, isSearch,
        in_summary, product_spec, for_product_option, status
      FROM idv_attribute WHERE id = ? LIMIT 1
    `, [id]),
    db.query<RowDataPacket[]>(`
      SELECT v.id, v.value, v.api_key, v.image, v.description, v.ordering, v.value_sort,
        COUNT(DISTINCT pa.pro_id) product_count
      FROM idv_attribute_value v
      LEFT JOIN idv_product_attribute pa ON pa.attr_value_id = v.id AND pa.attr_id = v.attributeId
      WHERE v.attributeId = ?
      GROUP BY v.id
      ORDER BY v.ordering ASC, v.id ASC
    `, [id]),
    db.query<RowDataPacket[]>('SELECT DISTINCT category_id FROM idv_attribute_category WHERE attr_id = ? ORDER BY category_id', [id]),
  ]);
  const row = attributes[0];
  if (!row) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay thuoc tinh');
  return {
    id: Number(row.id), name: String(row.name || ''), code: String(row.attribute_code || ''),
    comment: String(row.comment || ''), filterCode: String(row.filter_code || ''), scope: Number(row.scope) === 1 ? 1 : 0,
    ordering: Number(row.ordering || 0), isHeader: Number(row.isHeader) === 1, isSearch: Number(row.isSearch) === 1,
    inSummary: Number(row.in_summary) === 1, productSpec: Number(row.product_spec) === 1,
    forProductOption: Number(row.for_product_option) === 1, status: Number(row.status) === 1,
    values: values.map((value) => ({
      id: Number(value.id), value: String(value.value || ''), apiKey: String(value.api_key || ''),
      image: String(value.image || ''), description: String(value.description || ''), ordering: Number(value.ordering || 0),
      valueSort: Number(value.value_sort || 0), productCount: Number(value.product_count || 0),
    })),
    categoryIds: categories.map((category) => Number(category.category_id)),
  };
}

async function tableExists(connection: PoolConnection, table: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1', [table],
  );
  return rows.length > 0;
}

async function validateReferences(connection: PoolConnection, payload: AttributeFormData) {
  if (payload.scope === 0) {
    const placeholders = payload.categoryIds.map(() => '?').join(',');
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT id FROM idv_seller_category WHERE id IN (${placeholders})`, payload.categoryIds);
    if (rows.length !== payload.categoryIds.length) throw new AdminApiError(400, 'BAD_REQUEST', 'Danh muc khong hop le', { categoryIds: 'invalid' });
  }
}

async function assertCodesUnique(connection: PoolConnection, payload: AttributeFormData, ignoredId: number) {
  const [codeRows] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM idv_attribute WHERE attribute_code = ? AND id <> ? LIMIT 1', [payload.code, ignoredId],
  );
  if (codeRows.length) throw new AdminApiError(409, 'CONFLICT', 'Ma thuoc tinh da ton tai', { code: 'duplicate' });
  if (payload.filterCode) {
    const [filterRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM idv_attribute WHERE filter_code = ? AND filter_code <> '' AND id <> ? LIMIT 1`, [payload.filterCode, ignoredId],
    );
    if (filterRows.length) throw new AdminApiError(409, 'CONFLICT', 'Ma bo loc da ton tai', { filterCode: 'duplicate' });
  }
}

async function bumpAttributeCaches(connection: PoolConnection) {
  if (!await tableExists(connection, 'web_admin_cache_versions')) return;
  for (const key of ['public_products', 'public_catalog_details', 'catalog', 'search']) {
    await connection.query(
      'INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2) ON DUPLICATE KEY UPDATE version=version+1', [key],
    );
  }
}

function clearAttributeCaches() {
  invalidateProductCardAttributeCaches();
  invalidatePublicSearchMetadata();
  invalidateSearchCache();
  clearPublicProductResponseCache();
  clearPublicCatalogDetailCache();
}

export async function saveAttribute(input: unknown, id?: number) {
  const payload = parseAttributePayload(input);
  const savedId = await withTransaction(async (connection) => {
    const attributeId = toInt(id);
    let targetId = attributeId;
    if (attributeId) {
      const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_attribute WHERE id = ? FOR UPDATE', [attributeId]);
      if (!existing[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay thuoc tinh');
    }
    await validateReferences(connection, payload);
    await assertCodesUnique(connection, payload, attributeId);
    const now = Math.floor(Date.now() / 1_000);

    if (attributeId) {
      await connection.query(`
        UPDATE idv_attribute SET scope=?, attribute_code=?, name=?, name_index=?, isSearch=?, filter_code=?, comment=?,
          ordering=?, isHeader=?, for_product_option=?, status=?, last_update=?, in_summary=?, product_spec=? WHERE id=?
      `, [payload.scope, payload.code, payload.name, payload.code, Number(payload.isSearch), payload.filterCode || null,
        payload.comment, payload.ordering, Number(payload.isHeader), Number(payload.forProductOption), Number(payload.status),
        now, Number(payload.inSummary), Number(payload.productSpec), attributeId]);
    } else {
      const [result] = await connection.query<ResultSetHeader>(`
        INSERT INTO idv_attribute(scope,attribute_code,sellerId,filterCol,categoryId,icon,name,name_index,isSearch,value_match_all,
          filter_code,comment,isDisplay,ordering,isHeader,isMulti,for_product_option,value_count,status,create_time,last_update,in_summary,product_spec)
        VALUES(?,?,0,'',0,'',?,?,?,0,?,?,1,?,?,0,?,0,?,?,?, ?,?)
      `, [payload.scope, payload.code, payload.name, payload.code, Number(payload.isSearch), payload.filterCode || null,
        payload.comment, payload.ordering, Number(payload.isHeader), Number(payload.forProductOption), Number(payload.status),
        now, now, Number(payload.inSummary), Number(payload.productSpec)]);
      targetId = Number(result.insertId);
      await markRegistry(connection, 'attribute', targetId);
    }

    const [existingValues] = await connection.query<RowDataPacket[]>(
      'SELECT id, api_key, value_sort FROM idv_attribute_value WHERE attributeId = ? FOR UPDATE', [targetId],
    );
    const existingById = new Map(existingValues.map((row) => [Number(row.id), row]));
    const retainedIds = new Set<number>();
    for (const value of payload.values) {
      if (value.id) {
        if (!existingById.has(value.id)) throw new AdminApiError(400, 'BAD_REQUEST', 'Gia tri khong thuoc thuoc tinh', { values: 'invalid_owner' });
        retainedIds.add(value.id);
        await connection.query(`
          UPDATE idv_attribute_value SET value=?, description=?, api_key=?, image=?, ordering=?, value_sort=? WHERE id=? AND attributeId=?
        `, [value.value, value.description, value.apiKey, value.image, value.ordering, value.valueSort || 0, value.id, targetId]);
      } else {
        await connection.query(
          'INSERT INTO idv_attribute_value(attributeId,value,description,api_key,image,value_en,ordering,value_sort) VALUES(?,?,?,?,?,?,?,?)',
          [targetId, value.value, value.description, value.apiKey || slug(value.value), value.image, '', value.ordering, value.valueSort || 0],
        );
      }
    }

    const deletedValueIds = existingValues.map((row) => Number(row.id)).filter((valueId) => !retainedIds.has(valueId));
    if (deletedValueIds.length) {
      const placeholders = deletedValueIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM idv_product_attribute WHERE attr_id = ? AND attr_value_id IN (${placeholders})`, [targetId, ...deletedValueIds]);
      await connection.query(`DELETE FROM idv_attribute_value WHERE attributeId = ? AND id IN (${placeholders})`, [targetId, ...deletedValueIds]);
    }

    if (payload.scope === 1) {
      await connection.query('DELETE FROM idv_attribute_category WHERE attr_id = ?', [targetId]);
    } else {
      const placeholders = payload.categoryIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM idv_attribute_category WHERE attr_id = ? AND category_id NOT IN (${placeholders})`, [targetId, ...payload.categoryIds]);
      const [existingCategories] = await connection.query<RowDataPacket[]>(
        `SELECT DISTINCT category_id FROM idv_attribute_category WHERE attr_id = ? AND category_id IN (${placeholders})`, [targetId, ...payload.categoryIds],
      );
      const existingIds = new Set(existingCategories.map((row) => Number(row.category_id)));
      for (const categoryId of payload.categoryIds) {
        if (!existingIds.has(categoryId)) {
          await connection.query(
            'INSERT INTO idv_attribute_category(attr_id,category_id,seller_id,ordering,status) VALUES(?,?,0,?,1)',
            [targetId, categoryId, payload.ordering],
          );
        }
      }
    }
    await connection.query(
      'UPDATE idv_attribute SET value_count=(SELECT COUNT(*) FROM idv_attribute_value WHERE attributeId=?) WHERE id=?',
      [targetId, targetId],
    );
    await bumpAttributeCaches(connection);
    return targetId;
  });
  clearAttributeCaches();
  return getAttribute(savedId);
}

export async function bulkAttributeAction(rawIds: unknown, action: string) {
  const ids = parseIdList(rawIds, 100);
  if (!['activate', 'hide', 'delete-permanent'].includes(action)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thao tac khong hop le');
  }
  const result = await withTransaction(async (connection) => {
    const placeholders = ids.map(() => '?').join(',');
    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM idv_attribute WHERE id IN (${placeholders}) FOR UPDATE`, ids,
    );
    if (existing.length !== ids.length) throw new AdminApiError(404, 'NOT_FOUND', 'Co thuoc tinh khong ton tai');
    if (action !== 'delete-permanent') {
      await connection.query(`UPDATE idv_attribute SET status=?, last_update=? WHERE id IN (${placeholders})`, [action === 'activate' ? 1 : 0, Math.floor(Date.now() / 1_000), ...ids]);
      await bumpAttributeCaches(connection);
      return { ids, action };
    }
    const [usage] = await connection.query<RowDataPacket[]>(`
      SELECT COUNT(DISTINCT pa.pro_id) productCount, COUNT(DISTINCT v.id) valueCount, COUNT(DISTINCT ac.category_id) categoryCount
      FROM idv_attribute a
      LEFT JOIN idv_product_attribute pa ON pa.attr_id=a.id
      LEFT JOIN idv_attribute_value v ON v.attributeId=a.id
      LEFT JOIN idv_attribute_category ac ON ac.attr_id=a.id
      WHERE a.id IN (${placeholders})
    `, ids);
    await connection.query(`DELETE FROM idv_product_attribute WHERE attr_id IN (${placeholders})`, ids);
    await connection.query(`DELETE FROM idv_attribute_category WHERE attr_id IN (${placeholders})`, ids);
    if (await tableExists(connection, 'idv_attribute_category_for_seo')) {
      await connection.query(`DELETE FROM idv_attribute_category_for_seo WHERE attr_id IN (${placeholders})`, ids);
    }
    if (await tableExists(connection, 'web_admin_product_card_attribute_rules')) {
      await connection.query(`DELETE FROM web_admin_product_card_attribute_rules WHERE attr_id IN (${placeholders})`, ids);
    }
    await connection.query(`DELETE FROM idv_attribute_value WHERE attributeId IN (${placeholders})`, ids);
    await connection.query(`DELETE FROM web_admin_entity_registry WHERE entity_type='attribute' AND entity_id IN (${placeholders})`, ids);
    await connection.query(`DELETE FROM idv_attribute WHERE id IN (${placeholders})`, ids);
    await bumpAttributeCaches(connection);
    return { ids, action, usage: usage[0] || {} };
  });
  clearAttributeCaches();
  return result;
}

export async function deleteAttribute(id: number) {
  return bulkAttributeAction([id], 'delete-permanent');
}
