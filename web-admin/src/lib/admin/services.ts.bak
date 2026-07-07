import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
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

type ListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
};

function clampListParams(searchParams: URLSearchParams): ListParams {
  return {
    page: Math.max(1, toInt(searchParams.get('page'), 1)),
    limit: Math.min(100, Math.max(1, toInt(searchParams.get('limit'), 20))),
    search: String(searchParams.get('search') || searchParams.get('q') || '').trim(),
    status: String(searchParams.get('status') || '').trim(),
  };
}

async function assertSlugUnique(connection: PoolConnection, slug: string, idPath: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT id_path FROM idv_url WHERE request_path = ? AND id_path <> ? LIMIT 1',
    [`/${slug}`, idPath],
  );
  if (rows.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Slug da ton tai');
}

async function upsertUrl(connection: PoolConnection, idPath: string, slug: string, targetPath = '') {
  const requestPath = `/${slug}`;
  await assertSlugUnique(connection, slug, idPath);
  const [updateResult] = await connection.query(
    `
      UPDATE idv_url
      SET request_path = ?, request_path_index = ?, target_path = ?
      WHERE id_path = ?
    `,
    [requestPath, requestPathIndex(slug), targetPath, idPath],
  );
  if ((updateResult as { affectedRows?: number }).affectedRows) return;

  await connection.query(
    `
      INSERT INTO idv_url (request_path, request_path_index, id_path, target_path, redirect_code)
      VALUES (?, ?, ?, ?, '')
    `,
    [requestPath, requestPathIndex(slug), idPath, targetPath],
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

export async function listProductsFromRequest(url: string) {
  const params = clampListParams(new URL(url).searchParams);
  const offset = (params.page - 1) * params.limit;
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.search) {
    filters.push('(p.id LIKE ? OR p.storeSKU LIKE ? OR p.proName LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
  }
  if (params.status === '0' || params.status === '1') {
    filters.push('pr.isOn = ?');
    values.push(Number(params.status));
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM idv_sell_product_store p LEFT JOIN idv_sell_product_price pr ON pr.id = p.id ${where}`, values),
    pool.query<RowDataPacket[]>(
      `
        SELECT p.id, p.storeSKU, p.proName, p.brandId, p.proThum, p.product_cat, p.image_count,
               pr.price, pr.market_price, pr.isOn, pr.ordering,
               b.name AS brandName, u.request_path AS slug
        FROM idv_sell_product_store p
        LEFT JOIN idv_sell_product_price pr ON pr.id = p.id
        LEFT JOIN idv_brand b ON b.id = p.brandId
        LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
        ${where}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `,
      [...values, params.limit, offset],
    ),
  ]);

  const total = Number(countResult[0][0]?.total || 0);
  return {
    items: listResult[0],
    pagination: { total, page: params.page, limit: params.limit, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
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

export async function saveProduct(payload: Record<string, unknown>, id?: number) {
  return withTransaction(async (connection) => {
      const name = requireText(payload.name || payload.proName, 'name', 'Ten san pham', 255);
    const sku = requireText(payload.sku || payload.storeSKU, 'sku', 'SKU', 15);
    const productId = id || (await allocateProductId(connection));
    const brandId = toInt(payload.brandId);
    const price = Math.max(0, Number(payload.price || 0));
    const marketPrice = Math.max(0, Number(payload.marketPrice || payload.market_price || 0));
    const status = toBoolInt(payload.status ?? payload.isOn, 1);
    const categoryIds = parseIdList(payload.categoryIds || payload.categories || payload.categoryId, 100);
    const attrValueIds = Array.isArray(payload.attributeValueIds) ? parseIdList(payload.attributeValueIds, 500) : [];
    const slug = normalizeSlug(payload.slug || payload.url || name);
    if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug khong hop le', { slug: 'invalid' });

    await assertRowsExist(connection, 'idv_seller_category', 'id', categoryIds, 'Danh muc');
    if (attrValueIds.length > 0) await assertRowsExist(connection, 'idv_attribute_value', 'id', attrValueIds, 'Thuoc tinh');

    const skuRows = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_sell_product_store WHERE storeSKU = ? AND id <> ? LIMIT 1',
      [sku, productId],
    );
    if (skuRows[0].length > 0) throw new AdminApiError(409, 'CONFLICT', 'SKU da ton tai');

    const images = serializeProductImages(normalizeImages(payload.images));
    const now = new Date();

    await connection.query(
      `
        INSERT INTO idv_sell_product_store
          (id, storeSKU, proName, brandId, proThum, product_cat, image_collection, image_count, proSummary, specialOffer, promotion, cond, postDate, lastUpdate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          storeSKU = VALUES(storeSKU),
          proName = VALUES(proName),
          brandId = VALUES(brandId),
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
        'INSERT INTO idv_product_category (category_id, pro_id, brandId, price, ordering, status) VALUES (?, ?, ?, ?, ?, ?)',
        [categoryId, productId, brandId, Math.round(price), toInt(payload.ordering), status],
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

    await upsertUrl(connection, `module:product/view:product-detail/view_id:${productId}`, slug);
    if (!id) await markRegistry(connection, 'product', productId);

    return { id: productId, slug };
  });
}

export async function deleteProduct(id: number, mode: string) {
  return withTransaction(async (connection) => {
    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_sell_product_price SET isOn = 0 WHERE id = ?', [id]);
      return { id, deleted: false, hidden: true };
    }
    if (!(await isRegistered(connection, 'product', id))) {
      throw new AdminApiError(409, 'CONFLICT', 'Chi duoc xoa vinh vien san pham do API moi tao');
    }
    await connection.query('DELETE FROM idv_product_attribute WHERE pro_id = ?', [id]);
    await connection.query('DELETE FROM idv_product_category WHERE pro_id = ?', [id]);
    await connection.query('DELETE FROM idv_url WHERE id_path = ?', [`module:product/view:product-detail/view_id:${id}`]);
    await connection.query('DELETE FROM idv_sell_product_info WHERE id = ?', [id]);
    await connection.query('DELETE FROM idv_sell_product_price WHERE id = ?', [id]);
    await connection.query('DELETE FROM idv_sell_product_store WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['product', id]);
    return { id, deleted: true };
  });
}

export async function bulkProducts(ids: number[], action: string) {
  if (action === 'delete-permanent') {
    for (const id of ids) await deleteProduct(id, 'permanent');
    return { ids, action };
  }
  return withTransaction(async (connection) => {
    const status = action === 'restore' ? 1 : 0;
    await connection.query(`UPDATE idv_sell_product_price SET isOn = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, ...ids]);
    return { ids, action: action === 'restore' ? 'restore' : 'hide' };
  });
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
    const name = requireText(payload.name, 'name', 'Ten danh muc', 255);
    const categoryId = id || 0;
    const parentId = toInt(payload.parentId);
    if (categoryId > 0 && parentId > 0 && (await hasDescendant(connection, table, categoryId, parentId))) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Danh muc cha khong duoc la chinh no hoac hau due');
    }

    const slug = normalizeSlug(payload.slug || payload.url || name);
    if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug khong hop le');

    if (id) {
      await connection.query(
        `
          UPDATE ${table}
          SET name = ?, parentId = ?, url = ?, status = ?, ordering = ?, description = ?,
              meta_title = ?, meta_keyword = ?, meta_description = ?
          WHERE id = ?
        `,
        [
          name,
          parentId,
          slug,
          toBoolInt(payload.status, 1),
          toInt(payload.ordering),
          maybeText(payload.description),
          maybeText(payload.metaTitle || payload.meta_title, 255),
          maybeText(payload.metaKeyword || payload.meta_keyword, 255),
          maybeText(payload.metaDescription || payload.meta_description, 512),
          id,
        ],
      );
    } else {
      const [insert] = await connection.query(
        `
          INSERT INTO ${table}
            (name, parentId, url, status, ordering, description, meta_title, meta_keyword, meta_description)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          name,
          parentId,
          slug,
          toBoolInt(payload.status, 1),
          toInt(payload.ordering),
          maybeText(payload.description),
          maybeText(payload.metaTitle || payload.meta_title, 255),
          maybeText(payload.metaKeyword || payload.meta_keyword, 255),
          maybeText(payload.metaDescription || payload.meta_description, 512),
        ],
      );
      id = resultId(insert);
      await markRegistry(connection, entityType, id);
    }

    await upsertUrl(connection, `${slugPrefix}${id}`, slug);
    if (table === 'idv_seller_news_category') await rebuildNewsCategoryCache(connection);
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
  return rows[0];
}

export function saveProductCategory(payload: Record<string, unknown>, id?: number) {
  return saveCategory({ table: 'idv_seller_category', entityType: 'product-category', slugPrefix: 'module:product/view:category/view_id:', payload, id });
}

export async function deleteCategory(entityType: AdminEntityType, table: string, id: number, mode: string) {
  return withTransaction(async (connection) => {
    if (mode !== 'permanent') {
      await connection.query(`UPDATE ${table} SET status = 0 WHERE id = ?`, [id]);
      return { id, hidden: true };
    }
    if (!(await isRegistered(connection, entityType, id))) {
      throw new AdminApiError(409, 'CONFLICT', 'Chi duoc xoa vinh vien danh muc do API moi tao');
    }
    const [children] = await connection.query<RowDataPacket[]>(`SELECT id FROM ${table} WHERE parentId = ? LIMIT 1`, [id]);
    if (children.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Danh muc con van ton tai');
    if (table === 'idv_seller_category') {
      const [products] = await connection.query<RowDataPacket[]>('SELECT pro_id FROM idv_product_category WHERE category_id = ? LIMIT 1', [id]);
      if (products.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Danh muc van co san pham');
      const [attrs] = await connection.query<RowDataPacket[]>('SELECT attr_id FROM idv_attribute_category WHERE category_id = ? LIMIT 1', [id]);
      if (attrs.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Danh muc van co thuoc tinh');
    } else {
      const [articles] = await connection.query<RowDataPacket[]>('SELECT news_id FROM idv_article_category WHERE category_id = ? LIMIT 1', [id]);
      if (articles.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Danh muc van co bai viet');
    }
    await connection.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', [entityType, id]);
    return { id, deleted: true };
  });
}

export async function bulkCategoryStatus(table: string, ids: number[], action: string) {
  const status = action === 'restore' ? 1 : 0;
  return withTransaction(async (connection) => {
    await connection.query(`UPDATE ${table} SET status = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, ...ids]);
    return { ids, action: action === 'restore' ? 'restore' : 'hide' };
  });
}

export async function listArticlesFromRequest(url: string) {
  const params = clampListParams(new URL(url).searchParams);
  const offset = (params.page - 1) * params.limit;
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
      [...values, params.limit, offset],
    ),
  ]);
  const total = Number(countResult[0][0]?.total || 0);
  return {
    items: listResult[0],
    pagination: { total, page: params.page, limit: params.limit, totalPages: Math.max(1, Math.ceil(total / params.limit)) },
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
    const primaryCategoryId = toInt(payload.catId, categoryIds[0]);
    const slug = normalizeSlug(payload.slug || payload.url || title);
    if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug khong hop le');
    const now = new Date();

    if (id) {
      await connection.query(
        `
          UPDATE idv_seller_news
          SET title = ?, url = ?, request_path = ?, catId = ?, article_category = ?, summary = ?, status = ?,
              thumnail = ?, ordering = ?, meta_title = ?, meta_keyword = ?, meta_description = ?, lastUpdate = ?
          WHERE id = ?
        `,
        [
          title,
          slug,
          `/${slug}`,
          primaryCategoryId,
          csvArticleIds(categoryIds),
          maybeText(payload.summary),
          toBoolInt(payload.status, 1),
          maybeText(payload.thumbnail || payload.thumnail, 255),
          toInt(payload.ordering),
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
            (title, url, request_path, catId, article_category, summary, status, thumnail, ordering, meta_title, meta_keyword, meta_description, createDate, lastUpdate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          title,
          slug,
          `/${slug}`,
          primaryCategoryId,
          csvArticleIds(categoryIds),
          maybeText(payload.summary),
          toBoolInt(payload.status, 1),
          maybeText(payload.thumbnail || payload.thumnail, 255),
          toInt(payload.ordering),
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
    await connection.query('DELETE FROM idv_article_category WHERE news_id = ?', [id]);
    for (const categoryId of categoryIds) {
      await connection.query('INSERT INTO idv_article_category (news_id, category_id) VALUES (?, ?)', [id, categoryId]);
    }
    await upsertUrl(connection, `module:news/view:detail/view_id:${id}`, slug);
    return { id, slug };
  });
}

export async function deleteArticle(id: number, mode: string) {
  return withTransaction(async (connection) => {
    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_seller_news SET status = 0 WHERE id = ?', [id]);
      return { id, hidden: true };
    }
    if (!(await isRegistered(connection, 'article', id))) {
      throw new AdminApiError(409, 'CONFLICT', 'Chi duoc xoa vinh vien bai viet do API moi tao');
    }
    await connection.query('DELETE FROM idv_article_category WHERE news_id = ?', [id]);
    await connection.query('DELETE FROM idv_url WHERE id_path = ?', [`module:news/view:detail/view_id:${id}`]);
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

export async function listArticleCategories() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM idv_seller_news_category ORDER BY parentId ASC, ordering DESC, id ASC',
  );
  return rows;
}

export async function getArticleCategory(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM idv_seller_news_category WHERE id = ?', [id]);
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay danh muc bai viet');
  return rows[0];
}

export function saveArticleCategory(payload: Record<string, unknown>, id?: number) {
  return saveCategory({ table: 'idv_seller_news_category', entityType: 'article-category', slugPrefix: 'module:news/view:category/view_id:', payload, id });
}

export async function runAdminMigration() {
  await ensureAdminTables();
  return { migrated: true };
}
