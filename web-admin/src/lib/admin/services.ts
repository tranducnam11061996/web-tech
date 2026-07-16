import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { mutateSearchCache } from '@/lib/searchCache';
import { invalidateProductCardAttributeCaches } from '@/lib/productCardAttributes';
import { ensureAdminAccessTables } from './auth';
import {
  deleteCategoryFeatureBox,
  ensureCategoryFeatureBoxTable,
  getAdminCategoryFeatureBox,
  invalidateCategoryFeatureBoxCaches,
  saveCategoryFeatureBox,
} from '@/lib/categoryFeatureBoxes';
import {
  ARTICLE_CATEGORY_METADATA_TABLE,
  deleteArticleCategoryMetadata,
  ensureArticleCategoryMetadataTable,
  normalizeArticleCategoryFeatured,
  saveArticleCategoryFeatured,
} from '@/lib/articleCategoryMetadata';
import {
  AdminApiError,
  AdminEntityType,
  allocateProductId,
  csvArticleIds,
  csvCategoryIds,
  ensureAdminTables,
  isRegistered,
  markRegistry,
  maybeText,
  normalizeLegacyProductCategoryPath,
  normalizeSlug,
  parseIdList,
  requestPathIndex,
  requireText,
  resultId,
  toBoolInt,
  toInt,
  withTransaction,
} from './common';
import { normalizeImages, serializeProductImages } from './images';
import { buildPagination, parsePaginationParams } from './pagination';
import { deleteBuyingGuideForEntity, ensureBuyingGuideTables } from '@/lib/buyingGuides';
import { clearPublicCatalogDetailCache, clearPublicProductResponseCache } from '@/lib/publicProductCache';
import { invalidateVoucherCategoryCache } from '@/lib/vouchers';
import { ensureProductGroupIndexes } from '@/lib/productGroups';
import { invalidateProductPromotionCategoryCache } from '@/lib/productPromotions';

type ListParams = {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  status?: string;
};

function clampListParams(searchParams: URLSearchParams): ListParams {
  const pagination = parsePaginationParams(searchParams);
  return {
    ...pagination,
    search: String(searchParams.get('search') || searchParams.get('q') || '').trim(),
    status: String(searchParams.get('status') || '').trim(),
  };
}

async function assertSlugUnique(connection: PoolConnection, slug: string, idPath: string, ignoredIdPaths = [idPath]) {
  const ignoredPaths = Array.from(new Set(ignoredIdPaths.length ? ignoredIdPaths : [idPath]));
  const placeholders = ignoredPaths.map(() => '?').join(',');
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id_path FROM idv_url WHERE request_path = ? AND id_path NOT IN (${placeholders}) LIMIT 1`,
    [`/${slug}`, ...ignoredPaths],
  );
  if (rows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'URL đã tồn tại');
}

async function upsertUrl(
  connection: PoolConnection,
  idPath: string,
  slug: string,
  urlType: 'product:category' | 'product:product-detail',
  targetPath = '',
) {
  const requestPath = `/${slug}`;
  await assertSlugUnique(connection, slug, idPath);
  const [updateResult] = await connection.query(
    `
      UPDATE idv_url
      SET request_path = ?, request_path_index = ?, target_path = ?, url_type = ?
      WHERE id_path = ?
    `,
    [requestPath, requestPathIndex(slug), targetPath, urlType, idPath],
  );
  if ((updateResult as { affectedRows?: number }).affectedRows) return;

  await connection.query(
    `
      INSERT INTO idv_url (request_path, request_path_index, id_path, target_path, redirect_code, url_type)
      VALUES (?, ?, ?, ?, '', ?)
    `,
    [requestPath, requestPathIndex(slug), idPath, targetPath, urlType],
  );
}

async function assertRowsExist(connection: PoolConnection, table: string, idColumn: string, ids: number[], label: string) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT ${idColumn} AS id FROM ${table} WHERE ${idColumn} IN (${placeholders})`,
    ids,
  );
  if (rows.length !== ids.length) throw new AdminApiError(400, 'BAD_REQUEST', `${label} khong hop le`);
}

function optionalIdList(value: unknown, max = 100) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(source.map((item) => toInt(item)).filter((id) => id > 0))).slice(0, max);
}

type ProductSection = 'basic' | 'description' | 'category' | 'attributes' | 'combo';

async function getExistingProductForUpdate(connection: PoolConnection, productId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `
      SELECT p.id, p.storeSKU, p.proName, p.brandId, p.url, p.product_cat,
             pr.price, pr.market_price, pr.isOn, pr.ordering
      FROM idv_sell_product_store p
      LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
      WHERE p.id = ?
      LIMIT 1
    `,
    [productId],
  );
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay san pham');
  return rows[0];
}

async function assertSkuUnique(connection: PoolConnection, sku: string, productId: number) {
  const [skuRows] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM idv_sell_product_store WHERE storeSKU = ? AND id <> ? LIMIT 1',
    [sku, productId],
  );
  if (skuRows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');
}

async function validateCategoryUpdate(connection: PoolConnection, productId: number, categoryIds: number[]) {
  const [existingRows] = await connection.query<RowDataPacket[]>(
    'SELECT product_cat FROM idv_sell_product_store WHERE id = ? LIMIT 1',
    [productId],
  );
  const existingCategoryIds = new Set(optionalIdList(existingRows[0]?.product_cat, 100));
  const categoryIdsToValidate = categoryIds.filter((categoryId) => !existingCategoryIds.has(categoryId));
  await assertRowsExist(connection, 'idv_seller_category', 'id', categoryIdsToValidate, 'Danh muc');
}

async function rebuildProductCategories(
  connection: PoolConnection,
  options: {
    productId: number;
    categoryIds: number[];
    brandId: number;
    price: number;
    ordering: number;
    status: number;
  },
) {
  const now = Math.floor(Date.now() / 1000);
  await connection.query('DELETE FROM idv_product_category WHERE pro_id = ?', [options.productId]);
  for (const categoryId of options.categoryIds) {
    await connection.query(
      'INSERT INTO idv_product_category (category_id, pro_id, brandId, price, ordering, status, create_time, last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        categoryId,
        options.productId,
        options.brandId,
        Math.round(options.price),
        options.ordering,
        options.status,
        now,
        now,
      ],
    );
  }
}

async function upsertProductInfoFields(connection: PoolConnection, productId: number, fields: Record<string, unknown>) {
  const columnNames = Object.keys(fields);
  if (columnNames.length === 0) return;

  const [updateResult] = await connection.query(
    `
      UPDATE idv_sell_product_info
      SET ${columnNames.map((column) => `${column} = ?`).join(', ')}
      WHERE id = ?
    `,
    [...columnNames.map((column) => fields[column]), productId],
  );
  if ((updateResult as { affectedRows?: number }).affectedRows) return;

  await connection.query(
    `
      INSERT INTO idv_sell_product_info (id, ${columnNames.join(', ')})
      VALUES (?, ${columnNames.map(() => '?').join(', ')})
    `,
    [productId, ...columnNames.map((column) => fields[column])],
  );
}

async function upsertUrlWithAliases(connection: PoolConnection, primaryIdPath: string, aliasIdPaths: string[], slug: string, targetPath = '') {
  const requestPath = `/${slug}`;
  const allIdPaths = Array.from(new Set([primaryIdPath, ...aliasIdPaths]));
  await assertSlugUnique(connection, slug, primaryIdPath, allIdPaths);
  if (aliasIdPaths.length > 0) {
    const placeholders = aliasIdPaths.map(() => '?').join(',');
    await connection.query(`DELETE FROM idv_url WHERE id_path IN (${placeholders})`, aliasIdPaths);
  }
  const [updateResult] = await connection.query(
    `
      UPDATE idv_url
      SET request_path = ?, request_path_index = ?, target_path = ?
      WHERE id_path = ?
    `,
    [requestPath, requestPathIndex(slug), targetPath, primaryIdPath],
  );
  if ((updateResult as { affectedRows?: number }).affectedRows) return;

  await connection.query(
    `
      INSERT INTO idv_url (request_path, request_path_index, id_path, target_path, redirect_code)
      VALUES (?, ?, ?, ?, '')
    `,
    [requestPath, requestPathIndex(slug), primaryIdPath, targetPath],
  );
}

async function tableExists(connection: PoolConnection, tableName: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1
    `,
    [tableName],
  );
  return rows.length > 0;
}

function removeCategoryIdFromCsv(value: unknown, categoryId: number) {
  return csvCategoryIds(optionalIdList(value, 100).filter((id) => id !== categoryId));
}

function removeArticleCategoryIdFromCsv(value: unknown, categoryId: number) {
  const ids = optionalIdList(value, 200).filter((id) => id !== categoryId);
  return ids.length ? csvArticleIds(ids) : '';
}

function normalizeCategoryDisplayOption(value: unknown) {
  const option = String(value || '').trim();
  return ['child_only', 'product', 'child_product'].includes(option) ? option : 'child_product';
}

function normalizeArticleCategoryDisplayOption(value: unknown) {
  const option = String(value || '').trim();
  return ['article', 'child_article'].includes(option) ? option : 'article';
}

export async function listProductsFromRequest(url: string) {
  const searchParams = new URL(url).searchParams;
  const params = clampListParams(searchParams);
  const filters: string[] = [];
  const values: unknown[] = [];
  const groupId = toInt(searchParams.get('groupId'));
  const brandId = toInt(searchParams.get('brandId'));
  const assignment = String(searchParams.get('assignment') || '').trim();

  if (params.search) {
    filters.push('(p.id LIKE ? OR p.storeSKU LIKE ? OR p.proName LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.status === '0' || params.status === '1') {
    filters.push('pr.isOn = ?');
    values.push(Number(params.status));
  }
  if (brandId > 0) {
    filters.push('p.brandId = ?');
    values.push(brandId);
  }
  if (assignment === 'available') {
    filters.push(groupId > 0 ? '(cgp.group_id IS NULL OR cgp.group_id = ?)' : 'cgp.group_id IS NULL');
    if (groupId > 0) values.push(groupId);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const joins = `
    LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
    LEFT JOIN config_group_product cgp ON cgp.product_id = p.id
    LEFT JOIN config_group cg ON cg.id = cgp.group_id`;
  const [countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(DISTINCT p.id) AS total FROM idv_sell_product_store p ${joins} ${where}`, values),
    pool.query<RowDataPacket[]>(
      `
        SELECT p.id, p.storeSKU, p.proName, p.brandId, p.proThum, p.product_cat, p.image_count,
               pr.price, pr.market_price, pr.isOn, pr.ordering,
               b.name AS brandName, u.request_path AS slug,
               cgp.group_id AS assignedGroupId, cg.name AS assignedGroupName
        FROM idv_sell_product_store p
        ${joins}
        LEFT JOIN idv_brand b ON b.id = p.brandId
        LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
        ${where}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `,
      [...values, params.limit, params.offset],
    ),
  ]);

  const total = Number(countResult[0][0]?.total || 0);
  return {
    items: listResult[0],
    pagination: buildPagination(total, params.page, params.limit),
  };
}

export async function getProduct(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT p.*, pr.price, pr.market_price, pr.isOn, pr.ordering, i.video_code, i.spec, i.multipart_spec, i.description,
             u.request_path AS slug
      FROM idv_sell_product_store p
      LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
      LEFT JOIN idv_sell_product_info i ON i.id = p.id
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      WHERE p.id = ?
    `,
    [id],
  );
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay san pham');
  return rows[0];
}

export async function listProductComboSets(productId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT csp.id AS relationId, csp.set_id AS id, csp.ordering,
             cs.title, cs.status, cs.from_time, cs.to_time, cs.product_count
      FROM combo_set_product csp
      JOIN combo_set cs ON cs.id = csp.set_id
      WHERE csp.product_id = ?
      ORDER BY csp.ordering ASC, csp.id DESC
    `,
    [productId],
  );
  return rows.map((row) => ({
    relationId: Number(row.relationId),
    id: Number(row.id),
    title: String(row.title || ''),
    status: Number(row.status || 0),
    from_time: Number(row.from_time || 0),
    to_time: Number(row.to_time || 0),
    product_count: Number(row.product_count || 0),
    ordering: Number(row.ordering || 0),
  }));
}

export async function listComboSetCatalogFromRequest(url: string) {
  const params = clampListParams(new URL(url).searchParams);
  const searchParams = new URL(url).searchParams;
  const productId = toInt(searchParams.get('productId'));
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    filters.push('cs.title LIKE ?');
    values.push(`%${params.search}%`);
  }
  if (params.status === 'active') {
    filters.push('cs.status = 1');
  } else if (params.status === 'inactive') {
    filters.push('cs.status = 0');
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const selectedExpression = productId > 0
    ? 'EXISTS(SELECT 1 FROM combo_set_product selected WHERE selected.set_id = cs.id AND selected.product_id = ?) AS isSelected'
    : '0 AS isSelected';
  const selectedValues = productId > 0 ? [productId] : [];

  const [countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM combo_set cs ${where}`, values),
    pool.query<RowDataPacket[]>(
      `
        SELECT cs.id, cs.title, cs.status, cs.product_count, cs.from_time, cs.to_time,
               ${selectedExpression}
        FROM combo_set cs
        ${where}
        ORDER BY cs.id DESC
        LIMIT ? OFFSET ?
      `,
      [...selectedValues, ...values, params.limit, params.offset],
    ),
  ]);

  const total = Number(countResult[0][0]?.total || 0);
  return {
    combos: listResult[0].map((row) => ({
      id: Number(row.id),
      title: String(row.title || ''),
      status: Number(row.status || 0),
      product_count: Number(row.product_count || 0),
      from_time: Number(row.from_time || 0),
      to_time: Number(row.to_time || 0),
      isSelected: Boolean(row.isSelected),
    })),
    pagination: buildPagination(total, params.page, params.limit),
  };
}

export async function addProductToComboSet(productId: number, setId: number) {
  if (productId <= 0 || setId <= 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Combo set khong hop le');
  await withTransaction(async (connection) => {
    await getExistingProductForUpdate(connection, productId);
    await assertRowsExist(connection, 'combo_set', 'id', [setId], 'Combo set');
    const [existingRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM combo_set_product WHERE product_id = ? AND set_id = ? LIMIT 1 FOR UPDATE',
      [productId, setId],
    );
    const unixTime = Math.floor(Date.now() / 1000);
    if (existingRows.length === 0) {
      await connection.query(
        `
          INSERT INTO combo_set_product
            (product_id, set_id, ordering, create_time, create_by, last_update, last_update_by)
          VALUES (?, ?, (SELECT COALESCE(MAX(existing.ordering),-1)+1 FROM combo_set_product existing WHERE existing.product_id=?), ?, '', ?, '')
        `,
        [productId, setId, productId, unixTime, unixTime],
      );
    }
    await connection.query(
      `
        UPDATE combo_set
        SET product_count = (SELECT COUNT(*) FROM combo_set_product WHERE set_id = ?),
            last_update = ?
        WHERE id = ?
      `,
      [setId, unixTime, setId],
    );
  });

  clearPublicCatalogDetailCache();

  return { items: await listProductComboSets(productId) };
}

export async function saveProduct(payload: Record<string, unknown>, id?: number) {
  const saved = await withTransaction(async (connection) => {
    const name = requireText(payload.name || payload.proName, 'name', 'Ten san pham', 255);
    const sku = requireText(payload.sku || payload.storeSKU, 'sku', 'SKU', 15);
    const productId = id || (await allocateProductId(connection));
    const brandId = toInt(payload.brandId);
    const price = Math.max(0, Number(payload.price || 0));
    const marketPrice = Math.max(0, Number(payload.marketPrice || payload.market_price || 0));
    const status = toBoolInt(payload.status ?? payload.isOn, 1);
    const categoryInput = payload.categoryIds ?? payload.categories ?? payload.categoryId;
    const categoryIds = optionalIdList(categoryInput, 100);
    const attrValueIds = Array.isArray(payload.attributeValueIds) ? optionalIdList(payload.attributeValueIds, 500) : [];
    const slug = normalizeSlug(payload.url || payload.slug || name);
    if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug khong hop le', { slug: 'invalid' });

    const isUpdate = id !== undefined && id > 0;
    let categoryIdsToValidate = categoryIds;
    if (isUpdate) {
      const [existingRows] = await connection.query<RowDataPacket[]>(
        'SELECT product_cat FROM idv_sell_product_store WHERE id = ? LIMIT 1',
        [productId],
      );
      const existingCategoryIds = new Set(optionalIdList(existingRows[0]?.product_cat, 100));
      categoryIdsToValidate = categoryIds.filter((categoryId) => !existingCategoryIds.has(categoryId));
    }
    await assertRowsExist(connection, 'idv_seller_category', 'id', categoryIdsToValidate, 'Danh muc');
    if (attrValueIds.length > 0) await assertRowsExist(connection, 'idv_attribute_value', 'id', attrValueIds, 'Thuoc tinh');

    const skuQuery = 'SELECT id FROM idv_sell_product_store WHERE storeSKU = ?' + (isUpdate ? ' AND id <> ?' : '') + ' LIMIT 1';
    const skuBindings = isUpdate ? [sku, productId] : [sku];
    const [skuRows] = await connection.query<RowDataPacket[]>(skuQuery, skuBindings);
    if (skuRows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');

    let images = serializeProductImages(normalizeImages(payload.images));
    if (!Array.isArray(payload.images) && isUpdate) {
      const [existingImageRows] = await connection.query<RowDataPacket[]>(
        'SELECT proThum, image_collection, image_count FROM idv_sell_product_store WHERE id = ? LIMIT 1',
        [productId],
      );
      images = {
        primary: String(existingImageRows[0]?.proThum || ''),
        serialized: String(existingImageRows[0]?.image_collection || ''),
        count: toInt(existingImageRows[0]?.image_count),
      };
    }
    const now = new Date();
    const unixTime = Math.floor(now.getTime() / 1000);

    await connection.query(
      `
        INSERT INTO idv_sell_product_store
          (id, storeSKU, proName, brandId, url, proThum, product_cat, image_collection, image_count, proSummary, specialOffer, promotion, cond, postDate, lastUpdate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          storeSKU = VALUES(storeSKU),
          proName = VALUES(proName),
          brandId = VALUES(brandId),
          url = VALUES(url),
          proThum = VALUES(proThum),
          product_cat = VALUES(product_cat),
          image_collection = VALUES(image_collection),
          image_count = VALUES(image_count),
          proSummary = VALUES(proSummary),
          specialOffer = VALUES(specialOffer),
          promotion = VALUES(promotion),
          cond = VALUES(cond),
          lastUpdate = VALUES(lastUpdate)
      `,
      [
        productId,
        sku,
        name,
        brandId,
        slug,
        images.primary,
        csvCategoryIds(categoryIds),
        images.serialized,
        images.count,
        maybeText(payload.summary || payload.proSummary),
        maybeText(payload.specialOffer),
        maybeText(payload.promotion),
        maybeText(payload.cond, 255),
        now,
        now,
      ],
    );

    await connection.query(
      `
        INSERT INTO idv_sell_product_price (id, price, market_price, isOn, ordering, lastUpdate)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          price = VALUES(price),
          market_price = VALUES(market_price),
          isOn = VALUES(isOn),
          ordering = VALUES(ordering),
          lastUpdate = VALUES(lastUpdate)
      `,
      [productId, price, marketPrice, status, toInt(payload.ordering), now],
    );

    await connection.query(
      `
        INSERT INTO idv_sell_product_info (id, video_code, spec, multipart_spec, description)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          video_code = VALUES(video_code),
          spec = VALUES(spec),
          multipart_spec = VALUES(multipart_spec),
          description = VALUES(description)
      `,
      [productId, maybeText(payload.videoCode || payload.video_code), maybeText(payload.spec), maybeText(payload.multipartSpec || payload.multipart_spec), maybeText(payload.description)],
    );

    await connection.query('DELETE FROM idv_product_category WHERE pro_id = ?', [productId]);
    for (const categoryId of categoryIds) {
      await connection.query(
        'INSERT INTO idv_product_category (category_id, pro_id, brandId, price, ordering, status, create_time, last_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [categoryId, productId, brandId, Math.round(price), toInt(payload.ordering), status, unixTime, unixTime],
      );
    }

    await connection.query('DELETE FROM idv_product_attribute WHERE pro_id = ?', [productId]);
    if (attrValueIds.length > 0) {
      const placeholders = attrValueIds.map(() => '?').join(',');
      const [values] = await connection.query<RowDataPacket[]>(
        `SELECT id, attributeId FROM idv_attribute_value WHERE id IN (${placeholders})`,
        attrValueIds,
      );
      for (const value of values) {
        await connection.query(
          'INSERT INTO idv_product_attribute (pro_id, attr_id, attr_value_id) VALUES (?, ?, ?)',
          [productId, Number(value.attributeId), Number(value.id)],
        );
      }
    }

    await upsertUrl(connection, `module:product/view:product-detail/view_id:${productId}`, slug, 'product:product-detail');
    if (!id) await markRegistry(connection, 'product', productId);

    return { id: productId, slug, sku, name, isUpdate };
  });

  try {
    invalidateProductCardAttributeCaches();
    await mutateSearchCache(saved.id, saved.isUpdate ? 'UPDATE' : 'ADD', {
      SKU: saved.sku,
      ten_san_pham: saved.name,
    });
  } catch (error) {
    console.error('[SearchCache] Failed to sync saved product:', error);
  }

  return { id: saved.id, slug: saved.slug };
}

export async function updateProductSection(productId: number, section: ProductSection, data: Record<string, unknown>) {
  if (!['basic', 'description', 'category', 'attributes', 'combo'].includes(section)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Section khong hop le');
  }

  const saved = await withTransaction(async (connection) => {
    const existing = await getExistingProductForUpdate(connection, productId);
    const now = new Date();

    if (section === 'basic') {
      const name = requireText(data.name || data.proName, 'name', 'Ten san pham', 255);
      const sku = requireText(data.sku || data.storeSKU, 'sku', 'SKU', 15);
      const brandId = toInt(data.brandId);
      const price = Math.max(0, Number(data.price || 0));
      const marketPrice = Math.max(0, Number(data.marketPrice || data.market_price || 0));
      const status = toBoolInt(data.status ?? data.isOn, 1);
      const ordering = toInt(data.ordering);
      const slug = normalizeSlug(data.url || data.slug || name);
      if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug khong hop le', { slug: 'invalid' });

      await assertSkuUnique(connection, sku, productId);
      await connection.query(
        `
          UPDATE idv_sell_product_store
          SET storeSKU = ?, proName = ?, brandId = ?, url = ?, proSummary = ?, lastUpdate = ?
          WHERE id = ?
        `,
        [
          sku,
          name,
          brandId,
          slug,
          maybeText(data.summary || data.proSummary),
          now,
          productId,
        ],
      );
      await connection.query(
        `
          INSERT INTO idv_sell_product_price (id, price, market_price, isOn, ordering, lastUpdate)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            price = VALUES(price),
            market_price = VALUES(market_price),
            isOn = VALUES(isOn),
            ordering = VALUES(ordering),
            lastUpdate = VALUES(lastUpdate)
        `,
        [productId, price, marketPrice, status, ordering, now],
      );
      await upsertProductInfoFields(connection, productId, {
        video_code: maybeText(data.videoCode || data.video_code),
        spec: maybeText(data.spec),
      });
      await upsertUrl(connection, `module:product/view:product-detail/view_id:${productId}`, slug, 'product:product-detail');
      const categoryIds = data.categoryIds === undefined
        ? optionalIdList(existing.product_cat, 100)
        : optionalIdList(data.categoryIds ?? data.categories ?? data.categoryId, 100);
      await validateCategoryUpdate(connection, productId, categoryIds);
      await connection.query(
        'UPDATE idv_sell_product_store SET product_cat = ?, lastUpdate = ? WHERE id = ?',
        [csvCategoryIds(categoryIds), now, productId],
      );
      await rebuildProductCategories(connection, {
        productId,
        categoryIds,
        brandId,
        price,
        ordering,
        status,
      });
      return { id: productId, section, slug, sku, name, categoryIds };
    }

    if (section === 'description') {
      await connection.query(
        `
          UPDATE idv_sell_product_store
          SET meta_title = ?, meta_keyword = ?, meta_description = ?, lastUpdate = ?
          WHERE id = ?
        `,
        [
          maybeText(data.metaTitle || data.meta_title, 255),
          maybeText(data.metaKeyword || data.meta_keyword, 255),
          maybeText(data.metaDescription || data.meta_description, 512),
          now,
          productId,
        ],
      );
      await upsertProductInfoFields(connection, productId, {
        description: maybeText(data.description),
      });
      return { id: productId, section };
    }

    if (section === 'combo') {
      await connection.query(
        'UPDATE idv_sell_product_store SET specialOffer = ?, lastUpdate = ? WHERE id = ?',
        [maybeText(data.specialOffer), now, productId],
      );
      return { id: productId, section };
    }

    if (section === 'category') {
      const categoryIds = optionalIdList(data.categoryIds ?? data.categories ?? data.categoryId, 100);
      await validateCategoryUpdate(connection, productId, categoryIds);
      await connection.query(
        'UPDATE idv_sell_product_store SET product_cat = ?, lastUpdate = ? WHERE id = ?',
        [csvCategoryIds(categoryIds), now, productId],
      );
      await rebuildProductCategories(connection, {
        productId,
        categoryIds,
        brandId: toInt(existing.brandId),
        price: Number(existing.price || 0),
        ordering: toInt(existing.ordering),
        status: toBoolInt(existing.isOn, 1),
      });
      return { id: productId, section, categoryIds };
    }

    const attrValueIds = optionalIdList(data.attributeValueIds ?? data.attributes ?? data.attributeValueId, 500);
    if (attrValueIds.length > 0) await assertRowsExist(connection, 'idv_attribute_value', 'id', attrValueIds, 'Thuoc tinh');
    await connection.query('DELETE FROM idv_product_attribute WHERE pro_id = ?', [productId]);
    if (attrValueIds.length > 0) {
      const placeholders = attrValueIds.map(() => '?').join(',');
      const [values] = await connection.query<RowDataPacket[]>(
        `SELECT id, attributeId FROM idv_attribute_value WHERE id IN (${placeholders})`,
        attrValueIds,
      );
      for (const value of values) {
        await connection.query(
          'INSERT INTO idv_product_attribute (pro_id, attr_id, attr_value_id) VALUES (?, ?, ?)',
          [productId, Number(value.attributeId), Number(value.id)],
        );
      }
    }
    return { id: productId, section, attributeValueIds: attrValueIds };
  });

  if (['basic', 'category', 'attributes'].includes(section)) {
    try {
      invalidateProductCardAttributeCaches();
      await mutateSearchCache(
        saved.id,
        'UPDATE',
        section === 'basic'
          ? {
              SKU: (saved as { sku?: string }).sku,
              ten_san_pham: (saved as { name?: string }).name,
            }
          : undefined,
      );
    } catch (error) {
      console.error('[SearchCache] Failed to sync product section:', error);
    }
  }

  if (section === 'combo') clearPublicCatalogDetailCache();

  return saved;
}

export async function deleteProduct(id: number, mode: string) {
  const result = await withTransaction(async (connection) => {
    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_sell_product_price SET isOn = 0 WHERE id = ?', [id]);
      return { id, deleted: false, hidden: true };
    }

    await getExistingProductForUpdate(connection, id);

    const [comboRows] = await connection.query<RowDataPacket[]>(
      'SELECT DISTINCT set_id FROM combo_set_product WHERE product_id = ?',
      [id],
    );
    const comboSetIds = comboRows.map((row) => Number(row.set_id)).filter((setId) => setId > 0);

    await connection.query('DELETE FROM idv_product_attribute WHERE pro_id = ?', [id]);
    await connection.query('DELETE FROM idv_product_category WHERE pro_id = ?', [id]);
    await connection.query('DELETE FROM combo_set_product WHERE product_id = ?', [id]);
    for (const setId of comboSetIds) {
      await connection.query(
        `
          UPDATE combo_set
          SET product_count = (SELECT COUNT(*) FROM combo_set_product WHERE set_id = ?)
          WHERE id = ?
        `,
        [setId, setId],
      );
    }
    await connection.query('DELETE FROM product_data_search WHERE product_id = ?', [id]);
    await connection.query('DELETE FROM idv_url WHERE id_path = ?', [`module:product/view:product-detail/view_id:${id}`]);
    if (await tableExists(connection, 'web_admin_product_images')) {
      await connection.query('DELETE FROM web_admin_product_images WHERE product_id = ?', [id]);
    }
    if (await tableExists(connection, 'web_admin_customer_favorites')) {
      await connection.query('DELETE FROM web_admin_customer_favorites WHERE product_id = ?', [id]);
    }
    await deleteBuyingGuideForEntity(connection, 'product', id);
    await connection.query('DELETE FROM idv_sell_product_info WHERE id = ?', [id]);
    await connection.query('DELETE FROM idv_sell_product_price WHERE id = ?', [id]);
    await connection.query('DELETE FROM idv_sell_product_store WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['product', id]);
    return { id, deleted: true };
  });

  if (result.deleted) {
    clearPublicCatalogDetailCache();
    try {
      invalidateProductCardAttributeCaches();
      await mutateSearchCache(id, 'DELETE');
    } catch (error) {
      console.error('[SearchCache] Failed to remove deleted product:', error);
    }
  }

  return result;
}

export async function bulkProducts(ids: number[], action: string) {
  if (action === 'delete-permanent') {
    for (const id of ids) await deleteProduct(id, 'permanent');
    return { ids, action };
  }
  const result = await withTransaction(async (connection) => {
    const status = action === 'restore' ? 1 : 0;
    await connection.query(`UPDATE idv_sell_product_price SET isOn = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, ...ids]);
    return { ids, action: action === 'restore' ? 'restore' : 'hide' };
  });
  invalidateProductCardAttributeCaches();
  return result;
}

async function hasDescendant(connection: PoolConnection, table: string, id: number, parentId: number) {
  let current = parentId;
  const seen = new Set<number>();
  while (current > 0) {
    if (current === id) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT parentId FROM ${table} WHERE id = ? LIMIT 1`, [current]);
    current = Number(rows[0]?.parentId || 0);
  }
  return false;
}

async function rebuildNewsCategoryCache(connection: PoolConnection) {
  const [categories] = await connection.query<RowDataPacket[]>('SELECT id, parentId FROM idv_seller_news_category');
  const children = new Map<number, number[]>();
  for (const row of categories) {
    const parentId = Number(row.parentId || 0);
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId)!.push(Number(row.id));
  }
  for (const row of categories) {
    const childIds = children.get(Number(row.id)) || [];
    await connection.query(
      'UPDATE idv_seller_news_category SET childListId = ?, isParent = ? WHERE id = ?',
      [childIds.join(','), childIds.length > 0 ? 1 : 0, Number(row.id)],
    );
  }
}

async function saveCategory(options: {
  table: 'idv_seller_category' | 'idv_seller_news_category';
  entityType: AdminEntityType;
  slugPrefix: string;
  payload: Record<string, unknown>;
  id?: number;
}) {
  const { table, entityType, slugPrefix, payload } = options;
  let id = options.id;
  return withTransaction(async (connection) => {
    const isNewCategory = !id;
    const name = requireText(payload.name, 'name', 'Ten danh muc', 255);
    const categoryId = id || 0;
    const parentId = toInt(payload.parentId);
    if (categoryId > 0 && parentId > 0 && (await hasDescendant(connection, table, categoryId, parentId))) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Danh muc cha khong duoc la chinh no hoac hau due');
    }

    const slug = table === 'idv_seller_category'
      ? normalizeLegacyProductCategoryPath(payload.slug || payload.url || name)
      : normalizeSlug(payload.slug || payload.url || name);
    if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug khong hop le');
    const requestPath = `/${slug}`;
    const status = toBoolInt(payload.status, 1);
    const ordering = toInt(payload.ordering);
    const metaTitle = maybeText(payload.metaTitle || payload.meta_title, 255);
    const metaKeyword = maybeText(payload.metaKeyword || payload.meta_keyword, 255);
    const metaDescription = maybeText(payload.metaDescription || payload.meta_description, 512);
    const summary = table === 'idv_seller_category'
      ? maybeText(payload.summary ?? payload.description)
      : maybeText(payload.description);
    const categoryImgUrl = maybeText(payload.imgUrl ?? payload.img_url, 150);
    const categoryImgBig = maybeText(payload.imgBig ?? payload.img_big, 150);
    const categoryPriceRange = maybeText(payload.priceRange ?? payload.price_range, 150);
    const categoryStaticHtml = maybeText(payload.staticHtml ?? payload.static_html);
    const categoryIsFeatured = toBoolInt(payload.isFeatured ?? payload.is_featured, 0);
    const articleFeaturedProvided = Object.prototype.hasOwnProperty.call(payload, 'isFeatured')
      || Object.prototype.hasOwnProperty.call(payload, 'is_featured');
    const articleCategoryIsFeatured = articleFeaturedProvided
      ? normalizeArticleCategoryFeatured(payload.isFeatured ?? payload.is_featured)
      : 0;
    const categoryDisplayOption = normalizeCategoryDisplayOption(payload.displayOption ?? payload.display_option);
    const articleCategoryDisplayOption = normalizeArticleCategoryDisplayOption(payload.displayOption ?? payload.display_option);

    if (table === 'idv_seller_category' && id) {
      await connection.query(
        `
          UPDATE ${table}
          SET name = ?, parentId = ?, url = ?, request_path = ?, status = ?, ordering = ?, summary = ?,
              imgUrl = ?, img_big = ?, priceRange = ?, static_html = ?,
              is_featured = ?, display_option = ?,
              meta_title = ?, meta_keyword = ?, meta_description = ?
          WHERE id = ?
        `,
        [
          name,
          parentId,
          slug,
          requestPath,
          status,
          ordering,
          summary,
          categoryImgUrl,
          categoryImgBig,
          categoryPriceRange,
          categoryStaticHtml,
          categoryIsFeatured,
          categoryDisplayOption,
          metaTitle,
          metaKeyword,
          metaDescription,
          id,
        ],
      );
    } else if (table === 'idv_seller_category') {
      const [insert] = await connection.query(
        `
          INSERT INTO ${table}
            (name, parentId, url, request_path, status, ordering, summary, imgUrl, img_big, priceRange, static_html, is_featured, display_option, image_background, meta_title, meta_keyword, meta_description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          parentId,
          slug,
          requestPath,
          status,
          ordering,
          summary,
          categoryImgUrl,
          categoryImgBig,
          categoryPriceRange,
          categoryStaticHtml,
          categoryIsFeatured,
          categoryDisplayOption,
          '',
          metaTitle,
          metaKeyword,
          metaDescription,
        ],
      );
      id = resultId(insert);
      await markRegistry(connection, entityType, id);
    } else if (id) {
      await connection.query(
        `
          UPDATE ${table}
          SET name = ?, parentId = ?, url = ?, request_path = ?, status = ?, ordering = ?, summary = ?, description = ?, display_option = ?,
              meta_title = ?, meta_keyword = ?, meta_description = ?
          WHERE id = ?
        `,
        [
          name,
          parentId,
          slug,
          requestPath,
          status,
          ordering,
          maybeText(payload.summary, 250),
          maybeText(payload.description),
          articleCategoryDisplayOption,
          metaTitle,
          metaKeyword,
          metaDescription,
          id,
        ],
      );
    } else {
      const [insert] = await connection.query(
        `
          INSERT INTO ${table}
            (name, parentId, url, request_path, status, ordering, summary, description, display_option, meta_title, meta_keyword, meta_description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          parentId,
          slug,
          requestPath,
          status,
          ordering,
          maybeText(payload.summary, 250),
          maybeText(payload.description),
          articleCategoryDisplayOption,
          metaTitle,
          metaKeyword,
          metaDescription,
        ],
      );
      id = resultId(insert);
      await markRegistry(connection, entityType, id);
    }

    if (table === 'idv_seller_news_category') {
      await upsertUrlWithAliases(
        connection,
        `${slugPrefix}${id}`,
        [`module:article/view:category/view_id:${id}`],
        slug,
      );
      await rebuildNewsCategoryCache(connection);
      if (isNewCategory || articleFeaturedProvided) {
        await saveArticleCategoryFeatured(Number(id), articleCategoryIsFeatured, connection);
      }
    } else {
      await upsertUrl(connection, `${slugPrefix}${id}`, slug, 'product:category');
      await saveCategoryFeatureBox(Number(id), payload.featureBox, connection);
    }
    return { id, slug };
  });
}

export async function listProductCategories() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM idv_seller_category ORDER BY parentId ASC, ordering DESC, id DESC',
  );
  return rows;
}

export async function getProductCategory(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM idv_seller_category WHERE id = ?', [id]);
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay danh muc san pham');
  return {
    ...rows[0],
    featureBox: await getAdminCategoryFeatureBox(id),
  };
}

export async function saveProductCategory(payload: Record<string, unknown>, id?: number) {
  if (payload.featureBox && typeof payload.featureBox === 'object') {
    await ensureCategoryFeatureBoxTable();
  }
  const result = await saveCategory({ table: 'idv_seller_category', entityType: 'product-category', slugPrefix: 'module:product/view:category/view_id:', payload, id });
  invalidateVoucherCategoryCache();
  invalidateProductPromotionCategoryCache();
  clearPublicProductResponseCache();
  clearPublicCatalogDetailCache();
  return result;
}

export async function deleteCategory(entityType: AdminEntityType, table: string, id: number, mode: string) {
  const result = await withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    if (!existingRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay danh muc');

    if (mode !== 'permanent') {
      await connection.query(`UPDATE ${table} SET status = 0 WHERE id = ?`, [id]);
      return { id, hidden: true };
    }

    const [children] = await connection.query<RowDataPacket[]>(`SELECT id FROM ${table} WHERE parentId = ? LIMIT 1`, [id]);
    if (children.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Danh muc con van ton tai');

    if (table === 'idv_seller_category') {
      const [linkedProducts] = await connection.query<RowDataPacket[]>('SELECT DISTINCT pro_id FROM idv_product_category WHERE category_id = ?', [id]);
      const [legacyProducts] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM idv_sell_product_store
         WHERE FIND_IN_SET(?, REPLACE(COALESCE(product_cat, ''), ' ', '')) > 0
        `,
        [String(id)],
      );
      const affectedProductIds = Array.from(
        new Set([
          ...linkedProducts.map((row) => Number(row.pro_id || 0)),
          ...legacyProducts.map((row) => Number(row.id || 0)),
        ].filter((productId) => productId > 0)),
      );

      if (affectedProductIds.length > 0) {
        const [productCategoryRows] = await connection.query<RowDataPacket[]>(
          `SELECT id, product_cat FROM idv_sell_product_store WHERE id IN (${affectedProductIds.map(() => '?').join(',')})`,
          affectedProductIds,
        );
        for (const row of productCategoryRows) {
          await connection.query(
            'UPDATE idv_sell_product_store SET product_cat = ?, lastUpdate = ? WHERE id = ?',
            [removeCategoryIdFromCsv(row.product_cat, id), new Date(), Number(row.id)],
          );
        }
      }

      await connection.query('DELETE FROM idv_product_category WHERE category_id = ?', [id]);
      await connection.query('DELETE FROM idv_attribute_category WHERE category_id = ?', [id]);
      await deleteCategoryFeatureBox(id, connection);
      await deleteBuyingGuideForEntity(connection, 'product_category', id);
      await connection.query('DELETE FROM idv_url WHERE id_path = ?', [`module:product/view:category/view_id:${id}`]);
      await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', [entityType, id]);
      await connection.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return { id, deleted: true, affectedProductIds };
    } else {
      const [linkedArticles] = await connection.query<RowDataPacket[]>('SELECT DISTINCT article_id FROM idv_article_category WHERE category_id = ?', [id]);
      const [primaryArticles] = await connection.query<RowDataPacket[]>('SELECT id, article_category FROM idv_seller_news WHERE catId = ? OR FIND_IN_SET(?, REPLACE(COALESCE(article_category, \'\'), \' \', \'\')) > 0', [id, String(id)]);
      const affectedArticleIds = Array.from(
        new Set([
          ...linkedArticles.map((row) => Number(row.article_id || 0)),
          ...primaryArticles.map((row) => Number(row.id || 0)),
        ].filter((articleId) => articleId > 0)),
      );

      if (primaryArticles.length > 0) {
        for (const row of primaryArticles) {
          await connection.query(
            'UPDATE idv_seller_news SET catId = IF(catId = ?, 0, catId), article_category = ?, lastUpdate = ? WHERE id = ?',
            [id, removeArticleCategoryIdFromCsv(row.article_category, id), new Date(), Number(row.id)],
          );
        }
      }

      await connection.query('DELETE FROM idv_article_category WHERE category_id = ?', [id]);
      await deleteArticleCategoryMetadata(id, connection);
      await connection.query('DELETE FROM idv_url WHERE id_path IN (?, ?)', [`module:news/view:category/view_id:${id}`, `module:article/view:category/view_id:${id}`]);
      await connection.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', [entityType, id]);
      await rebuildNewsCategoryCache(connection);
      return { id, deleted: true, affectedArticleIds };
    }
  });

  if (table === 'idv_seller_category' && mode === 'permanent') {
    const affectedProductIds = Array.isArray((result as { affectedProductIds?: number[] }).affectedProductIds)
      ? (result as { affectedProductIds: number[] }).affectedProductIds
      : [];
    invalidateProductCardAttributeCaches();
    invalidateCategoryFeatureBoxCaches(id);
    clearPublicProductResponseCache();
    clearPublicCatalogDetailCache();
    invalidateVoucherCategoryCache();
    invalidateProductPromotionCategoryCache();
    await Promise.all(affectedProductIds.map((productId) => mutateSearchCache(productId, 'UPDATE')));
  } else if (table === 'idv_seller_category') {
    invalidateCategoryFeatureBoxCaches(id);
    invalidateVoucherCategoryCache();
    invalidateProductPromotionCategoryCache();
    clearPublicProductResponseCache();
    clearPublicCatalogDetailCache();
  }

  return result;
}

export async function bulkCategoryStatus(table: string, ids: number[], action: string) {
  const status = action === 'restore' ? 1 : 0;
  const result = await withTransaction(async (connection) => {
    await connection.query(`UPDATE ${table} SET status = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, ...ids]);
    return { ids, action: action === 'restore' ? 'restore' : 'hide' };
  });
  if (table === 'idv_seller_category') {
    invalidateCategoryFeatureBoxCaches();
    invalidateVoucherCategoryCache();
    invalidateProductPromotionCategoryCache();
    clearPublicProductResponseCache();
    clearPublicCatalogDetailCache();
  }
  return result;
}

export async function listArticlesFromRequest(url: string) {
  const params = clampListParams(new URL(url).searchParams);
  const filters: string[] = [];
  const values: unknown[] = [];
  if (params.search) {
    filters.push('(n.id LIKE ? OR n.title LIKE ? OR n.url LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.status === '0' || params.status === '1') {
    filters.push('n.status = ?');
    values.push(Number(params.status));
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM idv_seller_news n ${where}`, values),
    pool.query<RowDataPacket[]>(
      `
        SELECT n.*, c.name AS categoryName
        FROM idv_seller_news n
        LEFT JOIN idv_seller_news_category c ON c.id = n.catId
        ${where}
        ORDER BY n.createDate DESC
        LIMIT ? OFFSET ?
      `,
      [...values, params.limit, params.offset],
    ),
  ]);
  const total = Number(countResult[0][0]?.total || 0);
  return {
    items: listResult[0],
    pagination: buildPagination(total, params.page, params.limit),
  };
}

export async function getArticle(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT n.*, nc.content
      FROM idv_seller_news n
      LEFT JOIN idv_seller_news_content nc ON nc.id = n.id
      WHERE n.id = ?
    `,
    [id],
  );
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay bai viet');
  return rows[0];
}

export async function saveArticle(payload: Record<string, unknown>, id?: number) {
  return withTransaction(async (connection) => {
    const title = requireText(payload.title, 'title', 'Tieu de', 255);
    const categoryIds = parseIdList(payload.categoryIds || payload.categories || payload.catId, 100);
    await assertRowsExist(connection, 'idv_seller_news_category', 'id', categoryIds, 'Danh muc bai viet');
    const [existingRows] = id
      ? await connection.query<RowDataPacket[]>('SELECT catId FROM idv_seller_news WHERE id = ? LIMIT 1', [id])
      : [[] as RowDataPacket[]];
    const existingCatId = toInt(existingRows[0]?.catId);
    const primaryCategoryId = payload.catId !== undefined ? toInt(payload.catId) : (existingCatId || toInt(categoryIds[0], 0));
    const slug = normalizeSlug(payload.slug || payload.url || title);
    if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug khong hop le');
    const now = new Date();
    const status = toBoolInt(payload.status, 1);
    const ordering = toInt(payload.ordering);
    const isFeatured = toBoolInt(payload.isFeatured ?? payload.is_featured, 0);
    const thumbnail = maybeText(payload.thumbnail || payload.thumnail, 255);
    const imageBackground = maybeText(payload.imageBackground || payload.image_background, 255);
    const tags = maybeText(payload.tags);
    const articleTimeSet = toBoolInt(payload.articleTimeSet ?? payload.article_time_set, 0);
    const articleTime = articleTimeSet ? toInt(payload.articleTime ?? payload.article_time) : 0;
    const articleDisplayTimeSet = toBoolInt(payload.articleDisplayTimeSet ?? payload.article_display_time_set, 0);
    const articleDisplayTime = articleDisplayTimeSet ? toInt(payload.articleDisplayTime ?? payload.article_display_time) : 0;

    if (id) {
      await connection.query(
        `
          UPDATE idv_seller_news
          SET title = ?, url = ?, request_path = ?, catId = ?, article_category = ?, summary = ?, status = ?,
              thumnail = ?, image_background = ?, tags = ?, ordering = ?, is_featured = ?,
              article_time = ?, article_time_set = ?, article_display_time = ?, article_display_time_set = ?,
              meta_title = ?, meta_keywords = ?, meta_description = ?, lastUpdate = ?
          WHERE id = ?
        `,
        [
          title,
          slug,
          `/${slug}`,
          primaryCategoryId,
          csvArticleIds(categoryIds),
          maybeText(payload.summary),
          status,
          thumbnail,
          imageBackground,
          tags,
          ordering,
          isFeatured,
          articleTime,
          articleTimeSet,
          articleDisplayTime,
          articleDisplayTimeSet,
          maybeText(payload.metaTitle || payload.meta_title, 255),
          maybeText(payload.metaKeyword || payload.meta_keyword, 255),
          maybeText(payload.metaDescription || payload.meta_description, 512),
          now,
          id,
        ],
      );
    } else {
      const [insert] = await connection.query(
        `
          INSERT INTO idv_seller_news
            (title, url, request_path, catId, article_category, summary, status, thumnail, image_background, tags, ordering, is_featured, article_time, article_time_set, article_display_time, article_display_time_set, meta_title, meta_keywords, meta_description, createDate, lastUpdate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          title,
          slug,
          `/${slug}`,
          primaryCategoryId,
          csvArticleIds(categoryIds),
          maybeText(payload.summary),
          status,
          thumbnail,
          imageBackground,
          tags,
          ordering,
          isFeatured,
          articleTime,
          articleTimeSet,
          articleDisplayTime,
          articleDisplayTimeSet,
          maybeText(payload.metaTitle || payload.meta_title, 255),
          maybeText(payload.metaKeyword || payload.meta_keyword, 255),
          maybeText(payload.metaDescription || payload.meta_description, 512),
          now,
          now,
        ],
      );
      id = resultId(insert);
      await markRegistry(connection, 'article', id);
    }

    await connection.query(
      `
        INSERT INTO idv_seller_news_content (id, content)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE content = VALUES(content)
      `,
      [id, maybeText(payload.content)],
    );
    await connection.query('DELETE FROM idv_article_category WHERE article_id = ?', [id]);
    const unixNow = Math.floor(now.getTime() / 1000);
    for (const categoryId of categoryIds) {
      await connection.query(
        `
          INSERT INTO idv_article_category
            (article_id, category_id, article_type, status, is_featured, ordering, create_time, article_update_time, article_display_time)
          VALUES (?, ?, 'article', 1, ?, ?, ?, ?, ?)
        `,
        [id, categoryId, isFeatured, ordering, unixNow, articleTime || unixNow, articleDisplayTime],
      );
    }
    await upsertUrlWithAliases(
      connection,
      `module:article/view:detail/view_id:${id}`,
      [`module:news/view:detail/view_id:${id}`],
      slug,
    );
    return { id, slug };
  });
}

export async function deleteArticle(id: number, mode: string) {
  return withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_seller_news WHERE id = ? LIMIT 1', [id]);
    if (!existingRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay bai viet');

    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_seller_news SET status = 0 WHERE id = ?', [id]);
      return { id, hidden: true };
    }

    await connection.query('DELETE FROM idv_article_category WHERE article_id = ?', [id]);
    await connection.query('DELETE FROM idv_url WHERE id_path IN (?, ?)', [
      `module:article/view:detail/view_id:${id}`,
      `module:news/view:detail/view_id:${id}`,
    ]);
    await connection.query('DELETE FROM idv_seller_news_content WHERE id = ?', [id]);
    await connection.query('DELETE FROM idv_seller_news WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['article', id]);
    return { id, deleted: true };
  });
}

export async function bulkArticleStatus(ids: number[], action: string) {
  const status = action === 'restore' ? 1 : 0;
  return withTransaction(async (connection) => {
    await connection.query(`UPDATE idv_seller_news SET status = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, ...ids]);
    return { ids, action: action === 'restore' ? 'restore' : 'hide' };
  });
}

export async function deleteBrand(id: number, mode: string) {
  const result = await withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_brand WHERE id = ? LIMIT 1', [id]);
    if (!existingRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay thuong hieu');

    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_brand SET status = 0 WHERE id = ?', [id]);
      return { id, hidden: true, affectedProductIds: [] };
    }

    const [products] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_sell_product_store WHERE brandId = ?', [id]);
    const affectedProductIds = products.map((row) => Number(row.id || 0)).filter((productId) => productId > 0);
    await connection.query('UPDATE idv_sell_product_store SET brandId = 0, lastUpdate = ? WHERE brandId = ?', [new Date(), id]);
    await connection.query('DELETE FROM idv_brand_info WHERE id = ?', [id]);
    await connection.query('DELETE FROM idv_brand_category WHERE brandId = ?', [id]);
    await connection.query('DELETE FROM idv_brand WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['brand', id]);
    return { id, deleted: true, affectedProductIds };
  });

  invalidateProductCardAttributeCaches();
  if (mode === 'permanent') {
    await Promise.all(result.affectedProductIds.map((productId) => mutateSearchCache(productId, 'UPDATE')));
  }
  return result;
}

export async function deleteComboSet(id: number, mode: string) {
  return withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>('SELECT id FROM combo_set WHERE id = ? LIMIT 1', [id]);
    if (!existingRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay combo set');

    if (mode !== 'permanent') {
      await connection.query('UPDATE combo_set SET status = 0 WHERE id = ?', [id]);
      return { id, hidden: true };
    }

    await connection.query('DELETE FROM combo_set_product WHERE set_id = ?', [id]);
    await connection.query('DELETE FROM combo_set WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['combo-set', id]);
    return { id, deleted: true };
  });
}

export async function deleteCollection(id: number, mode: string) {
  return withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_product_deal_collection WHERE id = ? LIMIT 1', [id]);
    if (!existingRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay bo suu tap');

    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_product_deal_collection SET status = 0 WHERE id = ?', [id]);
      return { id, hidden: true };
    }

    const [children] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_product_deal_collection WHERE parent_id = ? LIMIT 1', [id]);
    if (children.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Bo suu tap con van ton tai');
    await connection.query('DELETE FROM idv_product_deal_collection_item WHERE collection_id = ?', [id]);
    await connection.query('DELETE FROM idv_product_deal_collection WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['collection', id]);
    return { id, deleted: true };
  });
}

export async function deleteBanner(id: number, mode: string) {
  return withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_seller_ad WHERE id = ? LIMIT 1', [id]);
    if (!existingRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay banner');

    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_seller_ad SET status = 0 WHERE id = ?', [id]);
      return { id, hidden: true };
    }

    await connection.query('DELETE FROM idv_seller_ad_category WHERE adId = ?', [id]);
    await connection.query('DELETE FROM idv_seller_ad WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['banner', id]);
    return { id, deleted: true };
  });
}

export async function listArticleCategories() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.*, COALESCE(meta.is_featured, 0) AS is_featured
     FROM idv_seller_news_category c
     LEFT JOIN ${ARTICLE_CATEGORY_METADATA_TABLE} meta ON meta.category_id = c.id
     ORDER BY c.parentId ASC, c.ordering DESC, c.id ASC`,
  );
  return rows;
}

export async function getArticleCategory(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.*, COALESCE(meta.is_featured, 0) AS is_featured
     FROM idv_seller_news_category c
     LEFT JOIN ${ARTICLE_CATEGORY_METADATA_TABLE} meta ON meta.category_id = c.id
     WHERE c.id = ?`,
    [id],
  );
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay danh muc bai viet');
  return rows[0];
}

export function saveArticleCategory(payload: Record<string, unknown>, id?: number) {
  return saveCategory({ table: 'idv_seller_news_category', entityType: 'article-category', slugPrefix: 'module:news/view:category/view_id:', payload, id });
}

export async function setArticleCategoryFeatured(id: number, value: unknown) {
  return withTransaction(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_seller_news_category WHERE id = ? LIMIT 1 FOR UPDATE',
      [id],
    );
    if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay danh muc bai viet');
    const isFeatured = await saveArticleCategoryFeatured(id, value, connection);
    return { id, isFeatured };
  });
}

export async function runAdminMigration() {
  await ensureAdminAccessTables();
  await ensureAdminTables();
  await ensureArticleCategoryMetadataTable();
  await ensureBuyingGuideTables();
  await ensureProductGroupIndexes();
  const { ensureHeaderMenuSeeded } = await import('@/lib/admin/menus');
  await ensureHeaderMenuSeeded();
  return { migrated: true };
}
