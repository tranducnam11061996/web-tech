import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getCategoryTrail, getNewsCategoryTrailForArticle } from '@/lib/publicBreadcrumbs';
import { resolveNewsImageUrl } from '@/lib/newsImageUrl';
import { ARTICLE_CATEGORY_METADATA_TABLE } from '@/lib/articleCategoryMetadata';

export type PublicNewsSort = 'latest' | 'popular';
export type PublicNewsQuery = { page: number; limit: number; sort?: PublicNewsSort };

const PUBLIC_NEWS_ORDER = {
  latest: 'n.createDate DESC,n.id DESC',
  popular: 'visit DESC,n.createDate DESC,n.id DESC',
} as const satisfies Record<PublicNewsSort, string>;

export function parsePublicNewsSort(value: unknown): PublicNewsSort | null {
  if (value === undefined || value === null || value === '' || value === 'latest') return 'latest';
  return value === 'popular' ? 'popular' : null;
}

export function publicNewsOrderBy(sort: PublicNewsSort = 'latest') {
  return PUBLIC_NEWS_ORDER[sort];
}

export function displayedNewsCategoryId(categoryTrail: Array<{ id: number }> | null | undefined) {
  const id = Number(categoryTrail?.at(-1)?.id || 0);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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
    category_id: Number(row.display_category_id || row.catId || row.category_id || 0),
  };
}

export const NEWS_LANDING_CATEGORY_SLUGS = [
  'tin-cong-nghe.html',
  'thu-thuat-may-tinh.html',
  'game',
  'tin-khuyen-mai',
  'ung-dung-phan-mem',
] as const;

export const NEWS_LANDING_REVIEW_SLUG = 'review-san-pham';

type LandingCategory = {
  id: number;
  name: string;
  url: string;
  priority: number;
};

export function resolveLandingCategoryScopes(rows: RowDataPacket[]) {
  const bySlug = new Map(rows.map((row) => [String(row.url), row]));
  const newsCategories = NEWS_LANDING_CATEGORY_SLUGS.flatMap((slug, priority) => {
    const row = bySlug.get(slug);
    return row ? [{ id: Number(row.id), name: String(row.name || ''), url: slug, priority }] : [];
  });
  const reviewRow = bySlug.get(NEWS_LANDING_REVIEW_SLUG);
  const reviewCategory = reviewRow
    ? { id: Number(reviewRow.id), name: String(reviewRow.name || ''), url: NEWS_LANDING_REVIEW_SLUG, priority: 0 }
    : null;
  return { newsCategories, reviewCategory };
}

async function loadLandingNewsForCategories(categories: LandingCategory[], limit: number) {
  if (categories.length === 0) return [];
  const selectedCategorySql = categories
    .map((_, index) => index === 0 ? 'SELECT ? AS category_id,? AS priority' : 'SELECT ?,?')
    .join(' UNION ALL ');
  const selectedCategoryParams = categories.flatMap((category) => [category.id, category.priority]);
  const [rows] = await pool.query<RowDataPacket[]>(`
    WITH selected_categories AS (
      ${selectedCategorySql}
    ), membership AS (
      SELECT n.id AS article_id,n.catId AS category_id
      FROM idv_seller_news n
      JOIN selected_categories selected ON selected.category_id=n.catId
      WHERE n.status=1
      UNION DISTINCT
      SELECT ac.article_id,ac.category_id
      FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
      JOIN selected_categories selected ON selected.category_id=ac.category_id
      JOIN idv_seller_news n ON n.id=ac.article_id AND n.status=1
      WHERE ac.status=1 AND ac.article_type='article'
    ), scoped_articles AS (
      SELECT membership.article_id,MIN(selected.priority) AS fallback_priority
      FROM membership
      JOIN selected_categories selected ON selected.category_id=membership.category_id
      GROUP BY membership.article_id
    )
    SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,
           COALESCE(pv.view_count,n.visit,0) AS visit,n.comment_count,
           n.catId,display_category.id AS display_category_id,display_category.name AS category_name
    FROM scoped_articles scoped
    JOIN idv_seller_news n ON n.id=scoped.article_id AND n.status=1
    LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
    JOIN selected_categories fallback_selected ON fallback_selected.priority=scoped.fallback_priority
    LEFT JOIN selected_categories primary_selected ON primary_selected.category_id=n.catId
    JOIN idv_seller_news_category display_category
      ON display_category.id=COALESCE(primary_selected.category_id,fallback_selected.category_id)
     AND display_category.status=1
    ORDER BY n.createDate DESC,n.id DESC
    LIMIT ?
  `, [...selectedCategoryParams, limit]);
  return rows.map(item);
}

export function mapPublicNewsCategory(row: RowDataPacket) {
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    url: String(row.url || ''),
    summary: String(row.summary || ''),
    description: String(row.description || ''),
    image: resolveNewsImageUrl(row.imgUrl),
    totalNews: Number(row.totalNews || 0),
    visit: Number(row.visit || 0),
    isFeatured: Number(row.is_featured || 0) === 1,
  };
}

export async function loadPublicNewsCategories() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT c.id,c.name,c.url,c.summary,c.description,c.imgUrl,
           COALESCE(category_views.view_count,c.visit,0) AS visit,
           COALESCE(meta.is_featured,0) AS is_featured,
           COUNT(m.article_id) AS totalNews
    FROM idv_seller_news_category c
    LEFT JOIN web_admin_page_view_totals category_views
      ON category_views.entity_type='article_category' AND category_views.entity_id=c.id
    LEFT JOIN ${ARTICLE_CATEGORY_METADATA_TABLE} meta ON meta.category_id=c.id
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
    GROUP BY c.id,c.name,c.url,c.summary,c.description,c.imgUrl,c.visit,
             category_views.view_count,meta.is_featured,c.ordering
    ORDER BY c.ordering DESC,c.id ASC
  `);
  return rows.map(mapPublicNewsCategory);
}

export async function loadPublicNewsLanding() {
  const slugs = [...NEWS_LANDING_CATEGORY_SLUGS, NEWS_LANDING_REVIEW_SLUG];
  const publicCategoriesPromise = loadPublicNewsCategories();
  const [scopeRows] = await pool.query<RowDataPacket[]>(`
    SELECT id,name,url
    FROM idv_seller_news_category
    WHERE status=1 AND url IN (${slugs.map(() => '?').join(',')})
  `, slugs);
  const { newsCategories, reviewCategory } = resolveLandingCategoryScopes(scopeRows);
  const [news, reviews, categories] = await Promise.all([
    loadLandingNewsForCategories(newsCategories, 11),
    loadLandingNewsForCategories(reviewCategory ? [reviewCategory] : [], 6),
    publicCategoriesPromise,
  ]);
  return { news, reviews, categories };
}

export async function loadPopularPublicNews(limit = 4) {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,
           COALESCE(pv.view_count,n.visit,0) AS visit,n.comment_count,
           n.catId,c.name AS category_name
    FROM idv_seller_news n
    LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
    LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
    WHERE n.status=1
    ORDER BY ${PUBLIC_NEWS_ORDER.popular} LIMIT ?
  `, [limit]);
  return rows.map(item);
}

export async function listPublicNews(query: PublicNewsQuery) {
  const offset = (query.page - 1) * query.limit;
  const orderBy = publicNewsOrderBy(query.sort);
  const [itemsResult, totalResult, categories] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,
             COALESCE(pv.view_count,n.visit,0) AS visit,n.comment_count,
             n.catId,c.name AS category_name
      FROM idv_seller_news n
      LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
      LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
      WHERE n.status=1
      ORDER BY ${orderBy} LIMIT ? OFFSET ?
    `, [query.limit, offset]),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM idv_seller_news WHERE status=1'),
    loadPublicNewsCategories(),
  ]);
  const total = Number(totalResult[0][0]?.total || 0);
  return {
    items: itemsResult[0].map(item),
    categories,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function loadPublicNewsArticle(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT n.*,nc.content,c.name AS category_name,
           COALESCE(pv.view_count,n.visit,0) AS visit
    FROM idv_seller_news n
    LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
    LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
    LEFT JOIN idv_seller_news_content nc ON nc.id=n.id
    WHERE n.url=? AND n.status=1 LIMIT 1
  `, [slug]);
  const row = rows[0];
  if (!row) return null;

  const categoryTrailPromise = getNewsCategoryTrailForArticle(Number(row.id), row.catId, row.article_category);
  const publicCategoriesPromise = loadPublicNewsCategories();
  const popularNewsPromise = loadPopularPublicNews(4);
  const categoryTrail = await categoryTrailPromise;
  const categoryId = displayedNewsCategoryId(categoryTrail);
  let relatedRows: RowDataPacket[] = [];
  if (categoryId) {
    const [related] = await pool.query<RowDataPacket[]>(`
      SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,
             COALESCE(pv.view_count,n.visit,0) AS visit,n.comment_count,
             n.catId,c.name AS category_name
      FROM (
        SELECT n.id AS article_id FROM idv_seller_news n
        WHERE n.catId=?
        UNION DISTINCT
        SELECT ac.article_id FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
        WHERE ac.status=1 AND ac.article_type='article'
          AND ac.category_id=?
      ) membership
      JOIN idv_seller_news n ON n.id=membership.article_id
      LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
      LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
      WHERE n.status=1 AND n.id<>?
      ORDER BY n.createDate DESC,n.id DESC LIMIT 6
    `, [categoryId, categoryId, row.id]);
    relatedRows = related;
  }

  const [categories, popularNews] = await Promise.all([publicCategoriesPromise, popularNewsPromise]);
  return {
    data: {
      ...row,
      id: Number(row.id),
      status: Number(row.status),
      thumnail: resolveNewsImageUrl(row.thumnail),
      category_name: categoryTrail.at(-1)?.name || row.category_name || null,
      categoryTrail,
      relatedNews: relatedRows.map(item),
    },
    categories,
    popularNews,
  };
}

export async function loadPublicNewsCategory(slug: string, query: PublicNewsQuery) {
  const publicCategoriesPromise = loadPublicNewsCategories();
  const popularNewsPromise = loadPopularPublicNews(4);
  const categoryResult = await pool.query<RowDataPacket[]>(`
    SELECT c.id,c.name,c.url,c.summary,c.description,c.imgUrl,c.parentId,
           COALESCE(category_views.view_count,c.visit,0) AS visit,
           c.meta_title,c.meta_keyword,c.meta_description
    FROM idv_seller_news_category c
    LEFT JOIN web_admin_page_view_totals category_views
      ON category_views.entity_type='article_category' AND category_views.entity_id=c.id
    WHERE c.url=? AND c.status=1 LIMIT 1
  `, [slug]);
  const categories = categoryResult[0];
  const category = categories[0];
  if (!category) {
    await Promise.all([publicCategoriesPromise, popularNewsPromise]);
    return null;
  }
  const offset = (query.page - 1) * query.limit;
  const orderBy = publicNewsOrderBy(query.sort);
  const membershipSql = `
    SELECT n.id AS article_id FROM idv_seller_news n WHERE n.catId=?
    UNION DISTINCT
    SELECT ac.article_id FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
    WHERE ac.category_id=? AND ac.status=1 AND ac.article_type='article'
  `;
  const membershipPromise = Promise.all([
    pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS total
        FROM (${membershipSql}) membership
        JOIN idv_seller_news n ON n.id=membership.article_id
        WHERE n.status=1
      `, [category.id, category.id]),
    pool.query<RowDataPacket[]>(`
        SELECT n.id,n.title,n.url,n.request_path,n.thumnail,n.summary,n.createDate,n.lastUpdate,
               COALESCE(pv.view_count,n.visit,0) AS visit,n.comment_count,
               n.catId,c.name AS category_name
        FROM (${membershipSql}) membership
        JOIN idv_seller_news n ON n.id=membership.article_id
        LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
        LEFT JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
        WHERE n.status=1 ORDER BY ${orderBy} LIMIT ? OFFSET ?
      `, [category.id, category.id, query.limit, offset]),
    getCategoryTrail('news', Number(category.id)),
  ]);
  const [[countRows, newsRows, categoryTrail], publicCategories, popularNews] = await Promise.all([
    membershipPromise,
    publicCategoriesPromise,
    popularNewsPromise,
  ]);
  const totalNews = Number(countRows[0][0]?.total || 0);
  return {
    data: { ...category, id: Number(category.id), imgUrl: resolveNewsImageUrl(category.imgUrl), categoryTrail },
    news: newsRows[0].map(item),
    categories: publicCategories,
    popularNews,
    totalNews,
    pagination: { page: query.page, limit: query.limit, total: totalNews, totalPages: Math.ceil(totalNews / query.limit) },
  };
}
