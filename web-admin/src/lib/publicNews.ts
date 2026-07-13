import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getCategoryTrail, getNewsCategoryTrailForArticle } from '@/lib/publicBreadcrumbs';
import { resolveNewsImageUrl } from '@/lib/newsImageUrl';

export type PublicNewsQuery = { page: number; limit: number };

function item(row: RowDataPacket) {
  return {
    id: Number(row.id),
    title: String(row.title || ''),
    url: String(row.url || ''),
    request_path: String(row.request_path || ''),
    thumnail: resolveNewsImageUrl(row.thumnail),
    summary: String(row.summary || ''),
    createDate: row.createDate,
    lastUpdate: row.lastUpdate,
    visit: Number(row.visit || 0),
    comment_count: Number(row.comment_count || 0),
    category_name: row.category_name ? String(row.category_name) : null,
    category_id: Number(row.catId || row.category_id || 0),
  };
}

export async function listPublicNews(query: PublicNewsQuery) {
  const offset = (query.page - 1) * query.limit;
  const [itemsResult, totalResult, categoriesResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,n.visit,n.comment_count,
             n.catId,c.name AS category_name
      FROM idv_seller_news n
      LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
      WHERE n.status=1
      ORDER BY n.createDate DESC,n.id DESC LIMIT ? OFFSET ?
    `, [query.limit, offset]),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM idv_seller_news WHERE status=1'),
    pool.query<RowDataPacket[]>(`
      SELECT c.id,c.name,c.url,c.summary,c.description,c.imgUrl,
             COUNT(m.article_id) AS totalNews
      FROM idv_seller_news_category c
      LEFT JOIN (
        SELECT n.id AS article_id,n.catId AS category_id
        FROM idv_seller_news n WHERE n.status=1 AND n.catId>0
        UNION DISTINCT
        SELECT ac.article_id,ac.category_id
        FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
        JOIN idv_seller_news n ON n.id=ac.article_id AND n.status=1
        WHERE ac.status=1 AND ac.article_type='article'
      ) m ON m.category_id=c.id
      WHERE c.status=1
      GROUP BY c.id,c.name,c.url,c.summary,c.description,c.imgUrl
      ORDER BY c.ordering,c.id
    `),
  ]);
  const total = Number(totalResult[0][0]?.total || 0);
  return {
    items: itemsResult[0].map(item),
    categories: categoriesResult[0].map((row) => ({
      id: Number(row.id), name: String(row.name), url: String(row.url), summary: String(row.summary || ''),
      description: String(row.description || ''), image: resolveNewsImageUrl(row.imgUrl), totalNews: Number(row.totalNews || 0),
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function loadPublicNewsArticle(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT n.*,nc.content,c.name AS category_name
    FROM idv_seller_news n
    LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
    LEFT JOIN idv_seller_news_content nc ON nc.id=n.id
    WHERE n.url=? AND n.status=1 LIMIT 1
  `, [slug]);
  const row = rows[0];
  if (!row) return null;
  const categoryTrail = await getNewsCategoryTrailForArticle(Number(row.id), row.catId, row.article_category);
  const [categoryRows] = await pool.query<RowDataPacket[]>(`
    SELECT DISTINCT category_id FROM idv_article_category FORCE INDEX (idx_webtech_news_article_category)
    WHERE article_id=? AND status=1 AND article_type='article' ORDER BY category_id
  `, [row.id]);
  const categoryIds = [...new Set([Number(row.catId || 0), ...categoryRows.map((entry) => Number(entry.category_id))])]
    .filter((id) => id > 0);
  let relatedRows: RowDataPacket[] = [];
  if (categoryIds.length) {
    const [related] = await pool.query<RowDataPacket[]>(`
      SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,n.visit,n.comment_count,
             n.catId,c.name AS category_name
      FROM (
        SELECT n.id AS article_id FROM idv_seller_news n
        WHERE n.catId IN (${categoryIds.map(() => '?').join(',')})
        UNION DISTINCT
        SELECT ac.article_id FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
        WHERE ac.status=1 AND ac.article_type='article'
          AND ac.category_id IN (${categoryIds.map(() => '?').join(',')})
      ) membership
      JOIN idv_seller_news n ON n.id=membership.article_id
      LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
      WHERE n.status=1 AND n.id<>?
      ORDER BY n.createDate DESC,n.id DESC LIMIT 4
    `, [...categoryIds, ...categoryIds, row.id]);
    relatedRows = related;
  }
  if (relatedRows.length < 4) {
    const excluded = [Number(row.id), ...relatedRows.map((entry) => Number(entry.id))];
    const [fallback] = await pool.query<RowDataPacket[]>(`
      SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,n.visit,n.comment_count,
             n.catId,c.name AS category_name
      FROM idv_seller_news n LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
      WHERE n.status=1 AND n.id NOT IN (${excluded.map(() => '?').join(',')})
      ORDER BY n.createDate DESC,n.id DESC LIMIT ?
    `, [...excluded, 4 - relatedRows.length]);
    relatedRows.push(...fallback);
  }
  return {
    ...row,
    id: Number(row.id),
    status: Number(row.status),
    thumnail: resolveNewsImageUrl(row.thumnail),
    category_name: categoryTrail.at(-1)?.name || row.category_name || null,
    categoryTrail,
    relatedNews: relatedRows.map(item),
  };
}

export async function loadPublicNewsCategory(slug: string, query: PublicNewsQuery) {
  const [categories] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM idv_seller_news_category WHERE url=? AND status=1 LIMIT 1', [slug],
  );
  const category = categories[0];
  if (!category) return null;
  const offset = (query.page - 1) * query.limit;
  const membershipSql = `
    SELECT n.id AS article_id FROM idv_seller_news n WHERE n.catId=?
    UNION DISTINCT
    SELECT ac.article_id FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
    WHERE ac.category_id=? AND ac.status=1 AND ac.article_type='article'
  `;
  const [countRows, newsRows, categoryTrail] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS total
      FROM (${membershipSql}) membership
      JOIN idv_seller_news n ON n.id=membership.article_id
      WHERE n.status=1
    `, [category.id, category.id]),
    pool.query<RowDataPacket[]>(`
      SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,n.visit,n.comment_count,
             n.catId,c.name AS category_name
      FROM (${membershipSql}) membership
      JOIN idv_seller_news n ON n.id=membership.article_id
      LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
      WHERE n.status=1 ORDER BY n.createDate DESC,n.id DESC LIMIT ? OFFSET ?
    `, [category.id, category.id, query.limit, offset]),
    getCategoryTrail('news', Number(category.id)),
  ]);
  const totalNews = Number(countRows[0][0]?.total || 0);
  return {
    data: { ...category, id: Number(category.id), imgUrl: resolveNewsImageUrl(category.imgUrl), categoryTrail },
    news: newsRows[0].map(item),
    totalNews,
    pagination: { page: query.page, limit: query.limit, total: totalNews, totalPages: Math.ceil(totalNews / query.limit) },
  };
}
