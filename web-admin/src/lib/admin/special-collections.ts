import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import {
  AdminApiError,
  md5,
  maybeText,
  normalizeSlug,
  requireText,
  toBoolInt,
  toInt,
  withTransaction,
} from '@/lib/admin/common';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';

type ListParams = {
  page: number;
  limit: number;
  offset: number;
  search: string;
};

function clampListParams(searchParams: URLSearchParams): ListParams {
  const pagination = parsePaginationParams(searchParams);
  return {
    ...pagination,
    search: String(searchParams.get('search') || searchParams.get('q') || '').trim(),
  };
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250);
}

function imageUrl(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw || raw === '0') return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
  return `https://hacom.vn/media/product/${raw}`;
}

function formatDateTime(value: unknown) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('vi-VN');
}

function formatUnixTime(value: unknown) {
  const seconds = toInt(value);
  if (!seconds) return '';
  return new Date(seconds * 1000).toLocaleString('vi-VN');
}

function formatCollection(row: RowDataPacket) {
  return {
    id: Number(row.id || 0),
    name: String(row.name || ''),
    url: String(row.url || ''),
    iconUrl: String(row.icon_url || ''),
    parentId: Number(row.parent_id || 0),
    parentName: String(row.parent_name || ''),
    isParent: Number(row.is_parent || 0),
    childListId: String(row.child_list_id || ''),
    catPath: String(row.cat_path || ''),
    ordering: Number(row.ordering || 0),
    homePage: String(row.home_page || '0'),
    status: Number(row.status || 0),
    visit: Number(row.visit || 0),
    productCount: Number(row.actual_product_count || 0),
    storedProductCount: Number(row.product_count || 0),
    description: String(row.description || ''),
    metaTitle: String(row.meta_title || ''),
    metaKeyword: String(row.meta_keyword || ''),
    metaDescription: String(row.meta_description || ''),
    createBy: String(row.create_by || ''),
    createTime: row.create_time,
    createdAt: formatDateTime(row.create_time),
    lastUpdate: row.last_update,
    updatedAt: formatDateTime(row.last_update),
  };
}

function formatCollectionProduct(row: RowDataPacket) {
  return {
    linkId: Number(row.link_id || 0),
    collectionId: Number(row.special_cat_id || 0),
    productId: Number(row.product_id || 0),
    ordering: Number(row.ordering || 0),
    linkedAt: formatUnixTime(row.link_create_time),
    product: {
      id: Number(row.product_id || 0),
      name: String(row.proName || ''),
      sku: String(row.storeSKU || ''),
      brand: String(row.brandName || ''),
      price: Number(row.price || 0),
      marketPrice: Number(row.market_price || 0),
      status: Number(row.isOn || 0),
      imageUrl: imageUrl(row.proThum),
      categoryIds: String(row.product_cat || ''),
    },
  };
}

async function assertCollectionExists(connection: PoolConnection | typeof pool, id: number) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM idv_category_special WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay bo suu tap');
  return rows[0];
}

async function assertProductExists(connection: PoolConnection, productId: number) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_sell_product_store WHERE id = ? LIMIT 1', [productId]);
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay san pham');
}

async function assertCollectionUrlUnique(connection: PoolConnection, url: string, ignoredId = 0) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM idv_category_special WHERE url = ? AND id <> ? LIMIT 1',
    [url, ignoredId],
  );
  if (rows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Link bo suu tap da ton tai', { url: 'duplicate' });
}

async function assertValidParent(connection: PoolConnection, parentId: number, currentId = 0) {
  if (!parentId) return;
  if (parentId === currentId) throw new AdminApiError(400, 'BAD_REQUEST', 'Bo suu tap cha khong hop le', { parentId: 'self' });
  const parent = await assertCollectionExists(connection, parentId);
  if (currentId && String(parent.cat_path || '').split(':').includes(String(currentId))) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Bo suu tap cha khong hop le', { parentId: 'cycle' });
  }
}

async function syncParentSummary(connection: PoolConnection, parentId: number) {
  if (!parentId) return;
  const [children] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM idv_category_special WHERE parent_id = ? ORDER BY ordering DESC, id DESC',
    [parentId],
  );
  const childIds = children.map((row) => Number(row.id || 0)).filter(Boolean);
  await connection.query(
    'UPDATE idv_category_special SET is_parent = ?, child_list_id = ?, last_update = NOW() WHERE id = ?',
    [childIds.length > 0 ? 1 : 0, [parentId, ...childIds].join(','), parentId],
  );
}

async function refreshCollectionProductCount(connection: PoolConnection, collectionId: number) {
  await connection.query(
    `
      UPDATE idv_category_special cs
      SET product_count = (
        SELECT COUNT(*)
        FROM idv_category_special_product csp
        WHERE csp.special_cat_id = cs.id
      ),
      last_update = NOW()
      WHERE cs.id = ?
    `,
    [collectionId],
  );
}

function collectionPayload(payload: Record<string, unknown>, existing?: RowDataPacket) {
  const name = requireText(payload.name, 'name', 'Ten bo suu tap', 100);
  const url = normalizeSlug(payload.url || payload.slug || name);
  if (!url) throw new AdminApiError(400, 'BAD_REQUEST', 'Link bo suu tap khong hop le', { url: 'invalid' });
  return {
    name,
    url,
    parentId: toInt(payload.parentId ?? payload.parent_id, Number(existing?.parent_id || 0)),
    ordering: toInt(payload.ordering, Number(existing?.ordering || 0)),
    homePage: String(toBoolInt(payload.homePage ?? payload.home_page, Number(existing?.home_page || 0))),
    status: toBoolInt(payload.status, Number(existing?.status || 0)),
    iconUrl: maybeText(payload.iconUrl ?? payload.icon_url ?? name, 150),
    description: maybeText(payload.description),
    metaTitle: maybeText(payload.metaTitle ?? payload.meta_title, 250),
    metaKeyword: maybeText(payload.metaKeyword ?? payload.meta_keyword, 250),
    metaDescription: maybeText(payload.metaDescription ?? payload.meta_description),
    createBy: maybeText(payload.createBy ?? payload.create_by ?? existing?.create_by ?? 'web-admin', 50),
  };
}

export async function listSpecialCollections(searchParams: URLSearchParams) {
  const params = clampListParams(searchParams);
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    filters.push('(cs.id LIKE ? OR cs.name LIKE ? OR cs.url LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM idv_category_special cs ${where}`, values),
    pool.query<RowDataPacket[]>(
      `
        SELECT cs.*, parent.name AS parent_name, COALESCE(product_counts.actual_product_count, 0) AS actual_product_count
        FROM idv_category_special cs
        LEFT JOIN idv_category_special parent ON parent.id = cs.parent_id
        LEFT JOIN (
          SELECT special_cat_id, COUNT(*) AS actual_product_count
          FROM idv_category_special_product
          GROUP BY special_cat_id
        ) product_counts ON product_counts.special_cat_id = cs.id
        ${where}
        ORDER BY cs.create_time DESC, cs.id DESC
        LIMIT ? OFFSET ?
      `,
      [...values, params.limit, params.offset],
    ),
  ]);

  const total = Number(countResult[0][0]?.total || 0);
  return {
    items: listResult[0].map(formatCollection),
    pagination: buildPagination(total, params.page, params.limit),
  };
}

export async function listSpecialCollectionOptions() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, name, parent_id FROM idv_category_special ORDER BY name ASC, id ASC',
  );
  return rows.map((row) => ({
    id: Number(row.id || 0),
    name: String(row.name || ''),
    parentId: Number(row.parent_id || 0),
  }));
}

async function loadSpecialCollection(db: PoolConnection | typeof pool, id: number) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT cs.*, parent.name AS parent_name, COUNT(csp.id) AS actual_product_count
      FROM idv_category_special cs
      LEFT JOIN idv_category_special parent ON parent.id = cs.parent_id
      LEFT JOIN idv_category_special_product csp ON csp.special_cat_id = cs.id
      WHERE cs.id = ?
      GROUP BY cs.id
      LIMIT 1
    `,
    [id],
  );
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay bo suu tap');
  return formatCollection(rows[0]);
}

export async function getSpecialCollection(id: number) {
  return loadSpecialCollection(pool, id);
}

export async function saveSpecialCollection(payload: Record<string, unknown>, id?: number) {
  return withTransaction(async (connection) => {
    const existing = id ? await assertCollectionExists(connection, id) : undefined;
    const data = collectionPayload(payload, existing);
    await assertCollectionUrlUnique(connection, data.url, id || 0);
    await assertValidParent(connection, data.parentId, id || 0);
    const oldParentId = Number(existing?.parent_id || 0);
    const catPath = id ? `:${id}${data.parentId ? `:${data.parentId}` : ''}` : '';

    if (id) {
      await connection.query(
        `
          UPDATE idv_category_special
          SET url = ?, url_hash = ?, parent_id = ?, cat_path = ?, icon_url = ?, name = ?,
              name_search = ?, description = ?, ordering = ?, home_page = ?, status = ?,
              create_by = ?, last_update = NOW(), meta_title = ?, meta_keyword = ?, meta_description = ?
          WHERE id = ?
        `,
        [
          data.url,
          md5(data.url),
          data.parentId,
          catPath,
          data.iconUrl,
          data.name,
          normalizeSearchText(data.name),
          data.description,
          data.ordering,
          data.homePage,
          data.status,
          data.createBy,
          data.metaTitle,
          data.metaKeyword,
          data.metaDescription,
          id,
        ],
      );
      if (!String(existing?.child_list_id || '').trim() || String(existing?.child_list_id || '') === '0') {
        await connection.query('UPDATE idv_category_special SET child_list_id = ? WHERE id = ?', [String(id), id]);
      }
      await syncParentSummary(connection, oldParentId);
      await syncParentSummary(connection, data.parentId);
      return loadSpecialCollection(connection, id);
    }

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO idv_category_special (
          url, url_hash, is_parent, parent_id, child_list_id, cat_path, icon_url, store_cat_id,
          name, index_key, name_search, query_condition, product_query_condition, description,
          product_count, day_to_reset, ordering, home_page, status, visit, create_time, create_by,
          last_update, meta_title, meta_keyword, meta_description
        )
        VALUES (?, ?, 0, ?, '0', '0', ?, 0, ?, '0', ?, '', NULL, ?, 0, 5, ?, ?, ?, 0, NOW(), ?, NOW(), ?, ?, ?)
      `,
      [
        data.url,
        md5(data.url),
        data.parentId,
        data.iconUrl,
        data.name,
        normalizeSearchText(data.name),
        data.description,
        data.ordering,
        data.homePage,
        data.status,
        data.createBy,
        data.metaTitle,
        data.metaKeyword,
        data.metaDescription,
      ],
    );
    const newId = Number(result.insertId || 0);
    await connection.query('UPDATE idv_category_special SET child_list_id = ?, cat_path = ? WHERE id = ?', [
      String(newId),
      `:${newId}${data.parentId ? `:${data.parentId}` : ''}`,
      newId,
    ]);
    await syncParentSummary(connection, data.parentId);
    return loadSpecialCollection(connection, newId);
  });
}

export async function deleteSpecialCollection(id: number) {
  return withTransaction(async (connection) => {
    const existing = await assertCollectionExists(connection, id);
    const [children] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_category_special WHERE parent_id = ? LIMIT 1', [id]);
    if (children.length > 0) {
      throw new AdminApiError(409, 'CONFLICT', 'Khong the xoa bo suu tap dang co bo suu tap con');
    }
    await connection.query('DELETE FROM idv_category_special_product WHERE special_cat_id = ?', [id]);
    await connection.query('DELETE FROM idv_category_special WHERE id = ?', [id]);
    await syncParentSummary(connection, Number(existing.parent_id || 0));
    return { id, deleted: true };
  });
}

export async function listSpecialCollectionProducts(collectionId: number, searchParams: URLSearchParams) {
  await assertCollectionExists(pool, collectionId);
  const params = clampListParams(searchParams);
  const filters = ['csp.special_cat_id = ?'];
  const values: unknown[] = [collectionId];

  if (params.search) {
    filters.push('(p.id LIKE ? OR p.storeSKU LIKE ? OR p.proName LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }

  const where = `WHERE ${filters.join(' AND ')}`;
  const [countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `
        SELECT COUNT(*) AS total
        FROM idv_category_special_product csp
        LEFT JOIN idv_sell_product_store p ON p.id = csp.product_id
        ${where}
      `,
      values,
    ),
    pool.query<RowDataPacket[]>(
      `
        SELECT csp.id AS link_id, csp.special_cat_id, csp.product_id, csp.ordering,
               csp.create_time AS link_create_time,
               p.proName, p.storeSKU, p.proThum, p.product_cat,
               pr.price, pr.market_price, pr.isOn,
               b.name AS brandName
        FROM idv_category_special_product csp
        LEFT JOIN idv_sell_product_store p ON p.id = csp.product_id
        LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
        LEFT JOIN idv_brand b ON b.id = p.brandId
        ${where}
        ORDER BY csp.ordering ASC, csp.id DESC
        LIMIT ? OFFSET ?
      `,
      [...values, params.limit, params.offset],
    ),
  ]);

  const total = Number(countResult[0][0]?.total || 0);
  return {
    items: listResult[0].map(formatCollectionProduct),
    pagination: buildPagination(total, params.page, params.limit),
  };
}

export async function addProductToSpecialCollection(collectionId: number, payload: Record<string, unknown>) {
  return withTransaction(async (connection) => {
    await assertCollectionExists(connection, collectionId);
    const productId = toInt(payload.productId ?? payload.product_id);
    if (!productId) throw new AdminApiError(400, 'BAD_REQUEST', 'San pham khong hop le', { productId: 'required' });
    await assertProductExists(connection, productId);
    const [duplicateRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_category_special_product WHERE special_cat_id = ? AND product_id = ? LIMIT 1',
      [collectionId, productId],
    );
    if (duplicateRows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'San pham da co trong bo suu tap');
    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO idv_category_special_product
          (special_cat_id, seller_id, product_id, product_cat_id, create_by, create_time, ordering)
        VALUES (?, 0, ?, 0, 0, UNIX_TIMESTAMP(), ?)
      `,
      [collectionId, productId, toInt(payload.ordering)],
    );
    await refreshCollectionProductCount(connection, collectionId);
    return { id: Number(result.insertId || 0), collectionId, productId, ordering: toInt(payload.ordering) };
  });
}

export async function updateSpecialCollectionProduct(collectionId: number, linkId: number, payload: Record<string, unknown>) {
  return withTransaction(async (connection) => {
    await assertCollectionExists(connection, collectionId);
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_category_special_product WHERE id = ? AND special_cat_id = ? LIMIT 1',
      [linkId, collectionId],
    );
    if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay san pham trong bo suu tap');
    const ordering = toInt(payload.ordering);
    await connection.query('UPDATE idv_category_special_product SET ordering = ? WHERE id = ? AND special_cat_id = ?', [
      ordering,
      linkId,
      collectionId,
    ]);
    return { id: linkId, collectionId, ordering };
  });
}

export async function deleteSpecialCollectionProduct(collectionId: number, linkId: number) {
  return withTransaction(async (connection) => {
    await assertCollectionExists(connection, collectionId);
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT product_id FROM idv_category_special_product WHERE id = ? AND special_cat_id = ? LIMIT 1',
      [linkId, collectionId],
    );
    if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay san pham trong bo suu tap');
    await connection.query('DELETE FROM idv_category_special_product WHERE id = ? AND special_cat_id = ?', [linkId, collectionId]);
    await refreshCollectionProductCount(connection, collectionId);
    return { id: linkId, collectionId, productId: Number(rows[0].product_id || 0), deleted: true };
  });
}
