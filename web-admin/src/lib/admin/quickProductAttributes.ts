import crypto from 'crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { invalidateProductCardAttributeCaches } from '@/lib/productCardAttributes';
import { resolveProductImageUrl } from '@/lib/productImageUrl';
import { clearPublicCatalogDetailCache, clearPublicProductResponseCache } from '@/lib/publicProductCache';
import { invalidatePublicSearchMetadata } from '@/lib/publicSearch';
import { invalidateSearchCache, mutateSearchCache } from '@/lib/searchCache';
import { writeAdminAudit } from './auth';
import { AdminApiError, toInt, withTransaction } from './common';

const MAX_CATEGORY_DEPTH = 32;
const MAX_ACTIVE_CATEGORIES = 1_000;
const MAX_SEARCH_LENGTH = 100;
const MAX_ATTRIBUTE_VALUE_IDS = 100;
const ALLOWED_LIMITS = new Set([20, 50, 100]);

export type AttributeSelectionRevision = string;

export type QuickToolCategorySummary = {
  id: number;
  parentId: number;
  ordering: number;
  name: string;
  breadcrumb: string;
  depth: number;
  productCount: number;
  incompleteProductCount: number;
  missingCellCount: number;
  attributeCount: number;
  complete: boolean;
};

export type QuickToolAttributeSummary = {
  id: number;
  name: string;
  code: string;
  ordering: number;
  valueCount: number;
  mappedCategoryCount: number;
  productCount: number;
  incompleteProductCount: number;
};

export type QuickAttributeValue = {
  id: number;
  name: string;
  description: string;
  ordering: number;
};

export type IncompleteProductRow = {
  id: number;
  sku: string;
  name: string;
  thumbnail: string;
  summary: string;
  isOn: boolean;
  price: number;
  categoryNames: string[];
  selectedValueIds: number[];
  selectionRevision: AttributeSelectionRevision;
};

export type IncompleteProductQuery = {
  categoryId: number;
  attributeId: number;
  page: number;
  limit: 20 | 50 | 100;
  q: string;
  status: 'all' | 'visible' | 'hidden';
  sort: 'id-desc' | 'id-asc' | 'sku-asc' | 'sku-desc' | 'name-asc' | 'name-desc';
};

export type ReplaceAttributeSelectionPayload = {
  categoryId: number;
  attributeId: number;
  attributeValueIds: number[];
  expectedRevision: AttributeSelectionRevision;
};

type CategoryNode = {
  id: number;
  parentId: number;
  ordering: number;
  name: string;
};

const ACTIVE_CATEGORY_CTE = `
  WITH RECURSIVE active_categories AS (
    SELECT id, parentId, name
    FROM idv_seller_category
    WHERE status = 1
  ), category_closure AS (
    SELECT id AS root_id, id AS descendant_id, 0 AS depth, CAST(CONCAT('/', id, '/') AS CHAR(4096)) AS visited
    FROM active_categories
    UNION ALL
    SELECT cc.root_id, child.id, cc.depth + 1,
           CONCAT(cc.visited, child.id, '/')
    FROM category_closure cc
    JOIN active_categories child ON child.parentId = cc.descendant_id
    WHERE cc.depth < ${MAX_CATEGORY_DEPTH}
      AND LOCATE(CONCAT('/', child.id, '/'), cc.visited) = 0
  )
`;

function normalizedSearch(value: unknown) {
  return String(value || '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi');
}

function positiveId(value: unknown, field: string) {
  const id = toInt(value);
  if (id <= 0) throw new AdminApiError(400, 'BAD_REQUEST', `${field} không hợp lệ`, { [field]: 'invalid' });
  return id;
}

export function createAttributeSelectionRevision(valueIds: readonly number[]): AttributeSelectionRevision {
  const normalized = Array.from(new Set(valueIds.map((id) => toInt(id)).filter((id) => id > 0))).sort((a, b) => a - b);
  return crypto.createHash('sha256').update(normalized.join(',')).digest('hex');
}

export function parseIncompleteProductQuery(input: URLSearchParams | Record<string, unknown>): IncompleteProductQuery {
  const get = (key: string) => input instanceof URLSearchParams ? input.get(key) : input[key];
  const rawLimit = toInt(get('limit'), 20);
  const rawStatus = String(get('status') || 'all');
  const rawSort = String(get('sort') || 'id-desc');
  const statuses = new Set(['all', 'visible', 'hidden']);
  const sorts = new Set(['id-desc', 'id-asc', 'sku-asc', 'sku-desc', 'name-asc', 'name-desc']);
  return {
    categoryId: positiveId(get('categoryId'), 'categoryId'),
    attributeId: positiveId(get('attributeId'), 'attributeId'),
    page: Math.min(10_000, Math.max(1, toInt(get('page'), 1))),
    limit: (ALLOWED_LIMITS.has(rawLimit) ? rawLimit : 20) as 20 | 50 | 100,
    q: String(get('q') || '').trim().slice(0, MAX_SEARCH_LENGTH),
    status: (statuses.has(rawStatus) ? rawStatus : 'all') as IncompleteProductQuery['status'],
    sort: (sorts.has(rawSort) ? rawSort : 'id-desc') as IncompleteProductQuery['sort'],
  };
}

export function parseReplaceAttributeSelectionPayload(input: unknown): ReplaceAttributeSelectionPayload {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  if (!Array.isArray(source.attributeValueIds)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'attributeValueIds phải là một mảng', { attributeValueIds: 'invalid' });
  }
  const attributeValueIds = Array.from(new Set(source.attributeValueIds.map((value) => toInt(value)).filter((id) => id > 0)));
  if (attributeValueIds.length > MAX_ATTRIBUTE_VALUE_IDS) {
    throw new AdminApiError(400, 'BAD_REQUEST', `Chỉ hỗ trợ tối đa ${MAX_ATTRIBUTE_VALUE_IDS} giá trị`, { attributeValueIds: 'max_items' });
  }
  const expectedRevision = String(source.expectedRevision || '').trim();
  if (!/^[a-f0-9]{64}$/.test(expectedRevision)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'expectedRevision không hợp lệ', { expectedRevision: 'invalid' });
  }
  return {
    categoryId: positiveId(source.categoryId, 'categoryId'),
    attributeId: positiveId(source.attributeId, 'attributeId'),
    attributeValueIds,
    expectedRevision,
  };
}

function categoryBreadcrumb(category: CategoryNode, byId: Map<number, CategoryNode>) {
  const labels: string[] = [];
  const visited = new Set<number>();
  let current: CategoryNode | undefined = category;
  while (current && labels.length <= MAX_CATEGORY_DEPTH && !visited.has(current.id)) {
    visited.add(current.id);
    labels.unshift(current.name);
    current = current.parentId > 0 ? byId.get(current.parentId) : undefined;
  }
  return { breadcrumb: labels.join(' / '), depth: Math.max(0, labels.length - 1) };
}

async function loadActiveCategoryNodes(connection: PoolConnection | typeof pool = pool) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT id, parentId, ordering, name FROM idv_seller_category WHERE status = 1 ORDER BY parentId, ordering DESC, name, id',
  );
  if (rows.length > MAX_ACTIVE_CATEGORIES) {
    throw new AdminApiError(409, 'CONFLICT', `Phạm vi có hơn ${MAX_ACTIVE_CATEGORIES} danh mục đang hoạt động`);
  }
  return rows.map((row) => ({
    id: Number(row.id),
    parentId: Number(row.parentId),
    ordering: Number(row.ordering || 0),
    name: String(row.name || ''),
  }));
}

export async function listQuickToolCategories(options: { includeComplete?: boolean; q?: string; selectedCategoryId?: number } = {}) {
  const [nodes, statsResult] = await Promise.all([
    loadActiveCategoryNodes(),
    pool.query<RowDataPacket[]>(`
      ${ACTIVE_CATEGORY_CTE}, selected_mappings AS (
        SELECT DISTINCT cc.root_id, ac.attr_id, ac.category_id AS mapping_category_id
        FROM category_closure cc
        JOIN idv_attribute_category ac ON ac.category_id = cc.descendant_id AND ac.status = 1
        JOIN idv_attribute a ON a.id = ac.attr_id AND a.status = 1
      ), applicable_categories AS (
        SELECT DISTINCT sm.root_id, sm.attr_id, cc.descendant_id AS category_id
        FROM selected_mappings sm
        JOIN category_closure cc ON cc.root_id = sm.mapping_category_id
      ), candidates AS (
        SELECT DISTINCT scope.root_id, scope.attr_id, pc.pro_id
        FROM applicable_categories scope
        JOIN idv_product_category pc ON pc.category_id = scope.category_id
        JOIN idv_sell_product_store p ON p.id = pc.pro_id
      ), candidate_stats AS (
        SELECT candidates.root_id,
               COUNT(DISTINCT candidates.pro_id) AS product_count,
               COUNT(DISTINCT CASE WHEN pa.pro_id IS NULL THEN candidates.pro_id END) AS incomplete_product_count,
               SUM(CASE WHEN pa.pro_id IS NULL THEN 1 ELSE 0 END) AS missing_cell_count
        FROM candidates
        LEFT JOIN idv_product_attribute pa
          ON pa.pro_id = candidates.pro_id AND pa.attr_id = candidates.attr_id
        GROUP BY candidates.root_id
      )
      SELECT sm.root_id,
             COUNT(DISTINCT sm.attr_id) AS attribute_count,
             COALESCE(MAX(stats.product_count), 0) AS product_count,
             COALESCE(MAX(stats.incomplete_product_count), 0) AS incomplete_product_count,
             COALESCE(MAX(stats.missing_cell_count), 0) AS missing_cell_count
      FROM selected_mappings sm
      LEFT JOIN candidate_stats stats ON stats.root_id = sm.root_id
      GROUP BY sm.root_id
    `),
  ]);
  const stats = new Map((statsResult[0] as RowDataPacket[]).map((row) => [Number(row.root_id), row]));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const query = normalizedSearch(options.q);
  const preservedIds = new Set<number>();
  let preservedCategoryId = toInt(options.selectedCategoryId);
  while (preservedCategoryId > 0 && !preservedIds.has(preservedCategoryId)) {
    const category = byId.get(preservedCategoryId);
    if (!category) break;
    preservedIds.add(category.id);
    preservedCategoryId = category.parentId;
  }
  const summaries = nodes.flatMap<QuickToolCategorySummary>((node) => {
    const stat = stats.get(node.id);
    if (!stat) return [];
    const missingCellCount = Number(stat.missing_cell_count || 0);
    if (!options.includeComplete && missingCellCount === 0 && !preservedIds.has(node.id)) return [];
    const path = categoryBreadcrumb(node, byId);
    return [{
      id: node.id,
      parentId: node.parentId,
      ordering: node.ordering,
      name: node.name,
      ...path,
      productCount: Number(stat.product_count || 0),
      incompleteProductCount: Number(stat.incomplete_product_count || 0),
      missingCellCount,
      attributeCount: Number(stat.attribute_count || 0),
      complete: missingCellCount === 0,
    }];
  });
  if (!query) return summaries;
  const summaryIds = new Set(summaries.map((category) => category.id));
  const visibleIds = new Set<number>();
  for (const category of summaries) {
    if (!normalizedSearch(`${category.name} ${category.breadcrumb} ${category.id}`).includes(query)) continue;
    let currentId = category.id;
    const visited = new Set<number>();
    while (currentId > 0 && summaryIds.has(currentId) && !visited.has(currentId)) {
      visited.add(currentId);
      visibleIds.add(currentId);
      currentId = byId.get(currentId)?.parentId || 0;
    }
  }
  return summaries.filter((category) => visibleIds.has(category.id));
}

export async function listQuickToolAttributes(categoryIdInput: unknown) {
  const categoryId = positiveId(categoryIdInput, 'categoryId');
  await assertActiveCategory(categoryId);
  const [rows] = await pool.query<RowDataPacket[]>(`
    ${ACTIVE_CATEGORY_CTE}, selected_mappings AS (
      SELECT DISTINCT ac.attr_id, ac.category_id AS mapping_category_id, ac.ordering
      FROM category_closure selected_scope
      JOIN idv_attribute_category ac ON ac.category_id = selected_scope.descendant_id AND ac.status = 1
      JOIN idv_attribute a ON a.id = ac.attr_id AND a.status = 1
      WHERE selected_scope.root_id = ?
    ), applicable_categories AS (
      SELECT DISTINCT sm.attr_id, sm.mapping_category_id, cc.descendant_id AS category_id
      FROM selected_mappings sm
      JOIN category_closure cc ON cc.root_id = sm.mapping_category_id
    ), candidates AS (
      SELECT DISTINCT scope.attr_id, scope.mapping_category_id, pc.pro_id
      FROM applicable_categories scope
      JOIN idv_product_category pc ON pc.category_id = scope.category_id
      JOIN idv_sell_product_store p ON p.id = pc.pro_id
    ), aggregate_stats AS (
      SELECT candidates.attr_id,
             COUNT(DISTINCT candidates.pro_id) AS product_count,
             COUNT(DISTINCT CASE WHEN pa.pro_id IS NULL THEN candidates.pro_id END) AS incomplete_product_count
      FROM candidates
      LEFT JOIN idv_product_attribute pa
        ON pa.pro_id = candidates.pro_id AND pa.attr_id = candidates.attr_id
      GROUP BY candidates.attr_id
    )
    SELECT a.id, a.name, a.attribute_code, a.ordering, COUNT(DISTINCT av.id) AS value_count,
           COUNT(DISTINCT sm.mapping_category_id) AS mapped_category_count,
           COALESCE(s.product_count, 0) AS product_count,
           COALESCE(s.incomplete_product_count, 0) AS incomplete_product_count,
           MIN(sm.ordering) AS mapping_ordering
    FROM selected_mappings sm
    JOIN idv_attribute a ON a.id = sm.attr_id AND a.status = 1
    LEFT JOIN idv_attribute_value av ON av.attributeId = a.id
    LEFT JOIN aggregate_stats s ON s.attr_id = a.id
    GROUP BY a.id, a.name, a.attribute_code, a.ordering,
             s.product_count, s.incomplete_product_count
    ORDER BY mapping_ordering, a.ordering, a.id
  `, [categoryId]);
  return rows.map<QuickToolAttributeSummary>((row) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    code: String(row.attribute_code || ''),
    ordering: Number(row.ordering || 0),
    valueCount: Number(row.value_count || 0),
    mappedCategoryCount: Number(row.mapped_category_count || 0),
    productCount: Number(row.product_count || 0),
    incompleteProductCount: Number(row.incomplete_product_count || 0),
  }));
}

const PRODUCT_SORT_SQL: Record<IncompleteProductQuery['sort'], string> = {
  'id-desc': 'p.id DESC',
  'id-asc': 'p.id ASC',
  'sku-asc': 'p.storeSKU ASC, p.id ASC',
  'sku-desc': 'p.storeSKU DESC, p.id DESC',
  'name-asc': 'p.proName ASC, p.id ASC',
  'name-desc': 'p.proName DESC, p.id DESC',
};

function productScopeCte() {
  return `${ACTIVE_CATEGORY_CTE}, selected_mappings AS (
    SELECT DISTINCT ac.category_id AS mapping_category_id
    FROM category_closure selected_scope
    JOIN idv_attribute_category ac
      ON ac.category_id = selected_scope.descendant_id AND ac.attr_id = ? AND ac.status = 1
    JOIN idv_attribute a ON a.id = ac.attr_id AND a.status = 1
    WHERE selected_scope.root_id = ?
  ), applicable_categories AS (
    SELECT DISTINCT cc.descendant_id AS category_id
    FROM selected_mappings sm
    JOIN category_closure cc ON cc.root_id = sm.mapping_category_id
  ), candidate_products AS (
    SELECT DISTINCT pc.pro_id
    FROM applicable_categories scope
    JOIN idv_product_category pc ON pc.category_id = scope.category_id
    JOIN idv_sell_product_store p ON p.id = pc.pro_id
  )`;
}

export async function listIncompleteProducts(queryInput: URLSearchParams | Record<string, unknown>) {
  const query = parseIncompleteProductQuery(queryInput);
  await assertActiveCategory(query.categoryId);
  const valuesPromise = pool.query<RowDataPacket[]>(`
    SELECT id, value, description, ordering
    FROM idv_attribute_value
    WHERE attributeId = ?
    ORDER BY ordering, id
  `, [query.attributeId]);
  const where: string[] = [
    'NOT EXISTS (SELECT 1 FROM idv_product_attribute pa WHERE pa.pro_id = p.id AND pa.attr_id = ?)',
  ];
  const params: unknown[] = [query.attributeId, query.categoryId, query.attributeId];
  if (query.q) {
    where.push('(p.storeSKU LIKE ? OR p.proName LIKE ?)');
    const term = `%${query.q}%`;
    params.push(term, term);
  }
  if (query.status === 'visible') where.push('COALESCE(pr.isOn, 0) = 1');
  if (query.status === 'hidden') where.push('COALESCE(pr.isOn, 0) <> 1');
  const baseCte = productScopeCte();
  const countPromise = pool.query<RowDataPacket[]>(`
    ${baseCte}
    SELECT COUNT(*) AS total
    FROM candidate_products candidates
    JOIN idv_sell_product_store p ON p.id = candidates.pro_id
    LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
    WHERE ${where.join(' AND ')}
  `, params);
  const offset = (query.page - 1) * query.limit;
  const rowsPromise = pool.query<RowDataPacket[]>(`
    ${baseCte}
    SELECT p.id, p.storeSKU, p.proName, p.proThum, LEFT(COALESCE(p.proSummary, ''), 1200) AS proSummary,
           COALESCE(pr.isOn, 0) AS isOn, COALESCE(pr.price, 0) AS price,
           GROUP_CONCAT(DISTINCT c.name ORDER BY c.ordering, c.id SEPARATOR '||') AS category_names
    FROM candidate_products candidates
    JOIN idv_sell_product_store p ON p.id = candidates.pro_id
    LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
    JOIN idv_product_category pc ON pc.pro_id = p.id
    JOIN applicable_categories scope ON scope.category_id = pc.category_id
    JOIN idv_seller_category c ON c.id = pc.category_id
    WHERE ${where.join(' AND ')}
    GROUP BY p.id, p.storeSKU, p.proName, p.proThum, p.proSummary, pr.isOn, pr.price
    ORDER BY ${PRODUCT_SORT_SQL[query.sort]}
    LIMIT ? OFFSET ?
  `, [...params, query.limit, offset]);
  const [[valueRows], [countRows], [productRows]] = await Promise.all([valuesPromise, countPromise, rowsPromise]);
  const totalItems = Number(countRows[0]?.total || 0);
  const values = valueRows.map<QuickAttributeValue>((row) => ({
    id: Number(row.id),
    name: String(row.value || ''),
    description: String(row.description || ''),
    ordering: Number(row.ordering || 0),
  }));
  const emptyRevision = createAttributeSelectionRevision([]);
  return {
    items: productRows.map<IncompleteProductRow>((row) => ({
      id: Number(row.id),
      sku: String(row.storeSKU || ''),
      name: String(row.proName || ''),
      thumbnail: resolveProductImageUrl(row.proThum),
      summary: String(row.proSummary || ''),
      isOn: Number(row.isOn) === 1,
      price: Number(row.price || 0),
      categoryNames: String(row.category_names || '').split('||').filter(Boolean),
      selectedValueIds: [],
      selectionRevision: emptyRevision,
    })),
    values,
    page: query.page,
    limit: query.limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / query.limit)),
  };
}

async function assertActiveCategory(categoryId: number, connection: PoolConnection | typeof pool = pool) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(CASE WHEN status = 1 THEN 1 END) AS active_count,
            MAX(CASE WHEN id = ? AND status = 1 THEN 1 ELSE 0 END) AS category_active
     FROM idv_seller_category`,
    [categoryId],
  );
  if (Number(rows[0]?.active_count || 0) > MAX_ACTIVE_CATEGORIES) {
    throw new AdminApiError(409, 'CONFLICT', `Phạm vi có hơn ${MAX_ACTIVE_CATEGORIES} danh mục đang hoạt động`);
  }
  if (Number(rows[0]?.category_active || 0) !== 1) {
    throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy danh mục đang hoạt động');
  }
}

async function assertProductInAttributeScope(
  connection: PoolConnection,
  productId: number,
  categoryId: number,
  attributeId: number,
) {
  const [rows] = await connection.query<RowDataPacket[]>(`
    ${productScopeCte()}
    SELECT candidates.pro_id
    FROM candidate_products candidates
    WHERE candidates.pro_id = ?
    LIMIT 1
  `, [attributeId, categoryId, productId]);
  if (!rows[0]) {
    throw new AdminApiError(409, 'CONFLICT', 'Sản phẩm không còn thuộc phạm vi áp dụng của thuộc tính');
  }
}

async function bumpAttributeSelectionCaches(connection: PoolConnection) {
  for (const key of ['public_products', 'public_catalog_details', 'catalog', 'search', 'pc_builder']) {
    await connection.query(
      'INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2) ON DUPLICATE KEY UPDATE version=version+1',
      [key],
    );
  }
}

function invalidateAttributeSelectionCaches(productId: number) {
  invalidateProductCardAttributeCaches();
  invalidatePublicSearchMetadata();
  invalidateSearchCache();
  clearPublicProductResponseCache();
  clearPublicCatalogDetailCache();
  void mutateSearchCache(productId, 'UPDATE').catch(() => undefined);
}

export async function replaceQuickProductAttributeValues(productIdInput: unknown, input: unknown) {
  const productId = positiveId(productIdInput, 'productId');
  const payload = parseReplaceAttributeSelectionPayload(input);
  const result = await withTransaction(async (connection) => {
    const [productRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_sell_product_store WHERE id = ? FOR UPDATE',
      [productId],
    );
    if (!productRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm');
    await assertActiveCategory(payload.categoryId, connection);
    await assertProductInAttributeScope(connection, productId, payload.categoryId, payload.attributeId);

    if (payload.attributeValueIds.length > 0) {
      const placeholders = payload.attributeValueIds.map(() => '?').join(',');
      const [valueRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM idv_attribute_value WHERE attributeId = ? AND id IN (${placeholders})`,
        [payload.attributeId, ...payload.attributeValueIds],
      );
      if (valueRows.length !== payload.attributeValueIds.length) {
        throw new AdminApiError(400, 'BAD_REQUEST', 'Có giá trị không thuộc thuộc tính đã chọn', { attributeValueIds: 'wrong_owner' });
      }
    }

    const [currentRows] = await connection.query<RowDataPacket[]>(
      'SELECT attr_value_id FROM idv_product_attribute WHERE pro_id = ? AND attr_id = ? ORDER BY attr_value_id FOR UPDATE',
      [productId, payload.attributeId],
    );
    const previousValueIds = Array.from(new Set(currentRows.map((row) => Number(row.attr_value_id)))).sort((a, b) => a - b);
    const nextValueIds = [...payload.attributeValueIds].sort((a, b) => a - b);
    const currentRevision = createAttributeSelectionRevision(previousValueIds);
    const nextRevision = createAttributeSelectionRevision(nextValueIds);
    if (currentRevision === nextRevision) {
      return { changed: false, productId, previousValueIds, attributeValueIds: nextValueIds, revision: currentRevision };
    }
    if (payload.expectedRevision !== currentRevision) {
      throw new AdminApiError(409, 'CONFLICT', 'Thuộc tính đã được quản trị viên khác cập nhật. Hãy tải lại dữ liệu.');
    }

    await connection.query(
      'DELETE FROM idv_product_attribute WHERE pro_id = ? AND attr_id = ?',
      [productId, payload.attributeId],
    );
    if (nextValueIds.length > 0) {
      await connection.query(
        'INSERT INTO idv_product_attribute (pro_id, attr_id, attr_value_id, value_sort) VALUES ?',
        [nextValueIds.map((valueId, index) => [productId, payload.attributeId, valueId, index])],
      );
    }
    await bumpAttributeSelectionCaches(connection);
    return { changed: true, productId, previousValueIds, attributeValueIds: nextValueIds, revision: nextRevision };
  });
  if (result.changed) invalidateAttributeSelectionCaches(productId);
  return { ...result, categoryId: payload.categoryId, attributeId: payload.attributeId };
}

export async function replaceQuickProductAttributeValuesWithAudit(
  productIdInput: unknown,
  input: unknown,
  audit: { actorUserId?: number | null; request?: Request } = {},
) {
  const result = await replaceQuickProductAttributeValues(productIdInput, input);
  await writeAdminAudit({
    actorUserId: audit.actorUserId,
    action: 'quick_product_attribute.values_replaced',
    resource: 'catalog.attributes',
    resourceId: result.productId,
    request: audit.request,
    metadata: {
      categoryId: result.categoryId,
      attributeId: result.attributeId,
      previousValueIds: result.previousValueIds,
      attributeValueIds: result.attributeValueIds,
      changed: result.changed,
    },
  });
  return result;
}
