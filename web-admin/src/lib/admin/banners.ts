import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import {
  AdminApiError,
  maybeText,
  requireText,
  resultId,
  toBoolInt,
  toInt,
  withTransaction,
} from '@/lib/admin/common';

export type BannerScope = 'homepage' | 'global';

type BannerRow = RowDataPacket & {
  id: number;
  template_page: string;
  location: number;
  location_index: string;
  location_name: string;
  name: string;
  summary: string;
  fileUrl: string;
  desUrl: string;
  type: string;
  width: number;
  height: number;
  status: number;
  ordering: number;
  from_time: number;
  to_time: number;
  show_in_mobile: number;
  lastUpdate: number;
  click: number;
  mobile_file_url?: string;
  alt_text?: string;
  headline?: string;
  subheading?: string;
  cta_label?: string;
  background_color?: string;
  text_color?: string;
  render_mode?: string;
  style_json?: string;
};

type LocationRow = RowDataPacket & {
  id: number;
  template_page: string;
  index_key: string;
  name: string;
  description: string;
  last_update: Date | string;
  total_banners?: number;
  active_banners?: number;
};

type PublicBannerCacheKey = 'homepage' | 'global' | `location:${string}`;
type PublicBannerPayload = {
  locations: Array<{
    id: number;
    key: string;
    templatePage: string;
    name: string;
    description: string;
    banners: ReturnType<typeof formatPublicBanner>[];
  }>;
  meta: Record<string, unknown>;
};
type PublicBannerCacheEntry = {
  value: PublicBannerPayload;
  expiresAt: number;
};

const PUBLIC_BANNER_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_BANNER_FALLBACK_CACHE_TTL_MS = 10 * 1000;
const publicBannerCache = new Map<PublicBannerCacheKey, PublicBannerCacheEntry>();
const publicBannerInflight = new Map<PublicBannerCacheKey, Promise<PublicBannerPayload>>();
let publicBannerCacheGeneration = 0;

export async function ensureBannerMetaTable(db: PoolConnection | typeof pool = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_banner_meta (
      ad_id int unsigned NOT NULL,
      mobile_file_url varchar(512) NOT NULL DEFAULT '',
      alt_text varchar(255) NOT NULL DEFAULT '',
      headline varchar(255) NOT NULL DEFAULT '',
      subheading varchar(512) NOT NULL DEFAULT '',
      cta_label varchar(120) NOT NULL DEFAULT '',
      background_color varchar(16) NOT NULL DEFAULT '',
      text_color varchar(16) NOT NULL DEFAULT '',
      render_mode varchar(24) NOT NULL DEFAULT 'image',
      style_json text NULL,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (ad_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function bannerMetaTableExists(db: PoolConnection | typeof pool = pool) {
  const [rows] = await db.query<RowDataPacket[]>(`SHOW TABLES LIKE 'web_admin_banner_meta'`);
  return rows.length > 0;
}

function normalizeRenderMode(value: unknown) {
  return String(value || 'image') === 'hybrid' ? 'hybrid' : 'image';
}

function normalizeHex(value: unknown) {
  const text = String(value || '').trim().replace(/^#/, '').toLowerCase();
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/.test(text) ? text : '';
}

function unixTime(value: unknown) {
  if (!value) return 0;
  if (typeof value === 'number') return Math.max(0, Math.trunc(value));
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? Math.trunc(parsed / 1000) : 0;
}

function isoInputTime(value: unknown) {
  const seconds = toInt(value);
  if (!seconds) return '';
  return new Date(seconds * 1000).toISOString().slice(0, 16);
}

function parseStyleJson(value: unknown) {
  if (!value) return {};
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return {};
  }
}

function formatPublicBanner(row: BannerRow) {
  const renderMode = normalizeRenderMode(row.render_mode);
  return {
    id: Number(row.id),
    locationKey: String(row.location_index || ''),
    name: String(row.name || ''),
    imageUrl: String(row.fileUrl || ''),
    mobileImageUrl: String(row.mobile_file_url || ''),
    targetUrl: String(row.desUrl || ''),
    altText: String(row.alt_text || row.name || ''),
    ordering: Number(row.ordering || 0),
    renderMode,
    text: {
      headline: String(row.headline || ''),
      subheading: String(row.subheading || row.summary || ''),
      ctaLabel: String(row.cta_label || ''),
    },
    style: {
      backgroundColor: normalizeHex(row.background_color),
      textColor: normalizeHex(row.text_color),
      extra: parseStyleJson(row.style_json),
    },
    display: {
      status: Number(row.status || 0),
      showInMobile: Number(row.show_in_mobile || 0) === 1,
      fromTime: Number(row.from_time || 0),
      toTime: Number(row.to_time || 0),
    },
    meta: {
      width: Number(row.width || 0),
      height: Number(row.height || 0),
      click: Number(row.click || 0),
      lastUpdate: Number(row.lastUpdate || 0),
    },
  };
}

function formatAdminBanner(row: BannerRow, categoryIds: number[] = []) {
  return {
    ...formatPublicBanner(row),
    templatePage: String(row.template_page || ''),
    locationId: Number(row.location || 0),
    locationName: String(row.location_name || ''),
    summary: String(row.summary || ''),
    type: String(row.type || 'banner'),
    status: Number(row.status || 0),
    fromTimeInput: isoInputTime(row.from_time),
    toTimeInput: isoInputTime(row.to_time),
    categoryIds,
  };
}

function formatLocation(row: LocationRow) {
  return {
    id: Number(row.id),
    templatePage: String(row.template_page || ''),
    key: String(row.index_key || ''),
    name: String(row.name || ''),
    description: String(row.description || ''),
    lastUpdate: row.last_update,
    totalBanners: Number(row.total_banners || 0),
    activeBanners: Number(row.active_banners || 0),
  };
}

function publicHeadersMeta(key: PublicBannerCacheKey, fallback = false) {
  return {
    cacheKey: key,
    fallback,
    cacheCreatedAt: new Date().toISOString(),
  };
}

async function getCachedPublicBanners(key: PublicBannerCacheKey, loader: () => Promise<PublicBannerPayload>) {
  const now = Date.now();
  const cached = publicBannerCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inflight = publicBannerInflight.get(key);
  if (inflight) return inflight;

  const generation = publicBannerCacheGeneration;
  const promise = loader()
    .then((payload) => {
      const ttl = payload.meta?.fallback ? PUBLIC_BANNER_FALLBACK_CACHE_TTL_MS : PUBLIC_BANNER_CACHE_TTL_MS;
      if (generation === publicBannerCacheGeneration) {
        publicBannerCache.set(key, { value: payload, expiresAt: Date.now() + ttl });
      }
      return payload;
    })
    .finally(() => {
      if (generation === publicBannerCacheGeneration) publicBannerInflight.delete(key);
    });

  publicBannerInflight.set(key, promise);
  return promise;
}

export function clearPublicBannerCache() {
  publicBannerCacheGeneration += 1;
  publicBannerCache.clear();
  publicBannerInflight.clear();
}

function adminBannerSelect(metaExists: boolean) {
  return `
    SELECT ad.*,
           loc.name AS location_name,
           ${metaExists ? 'meta.mobile_file_url' : "''"} AS mobile_file_url,
           ${metaExists ? 'meta.alt_text' : "''"} AS alt_text,
           ${metaExists ? 'meta.headline' : "''"} AS headline,
           ${metaExists ? 'meta.subheading' : "''"} AS subheading,
           ${metaExists ? 'meta.cta_label' : "''"} AS cta_label,
           ${metaExists ? 'meta.background_color' : "''"} AS background_color,
           ${metaExists ? 'meta.text_color' : "''"} AS text_color,
           ${metaExists ? 'meta.render_mode' : "'image'"} AS render_mode,
           ${metaExists ? 'meta.style_json' : "''"} AS style_json
    FROM idv_seller_ad ad
    LEFT JOIN idv_seller_ad_location loc ON loc.id = ad.location
    ${metaExists ? 'LEFT JOIN web_admin_banner_meta meta ON meta.ad_id = ad.id' : ''}
  `;
}

function activePublicWhere(now: number) {
  return `
    ad.status = 1
    AND (ad.from_time = 0 OR ad.from_time <= ${now})
    AND (ad.to_time = 0 OR ad.to_time >= ${now})
  `;
}

async function loadPublicPayload(key: PublicBannerCacheKey, where: string, params: unknown[]) {
  const metaExists = await bannerMetaTableExists();
  const rows = await pool.query<BannerRow[]>(
    `
      ${adminBannerSelect(metaExists)}
      WHERE ${where}
      ORDER BY loc.template_page ASC, loc.id ASC, ad.ordering DESC, ad.id DESC
    `,
    params,
  ).then(([result]) => result);

  const grouped = new Map<number, { row: BannerRow; banners: BannerRow[] }>();
  for (const row of rows) {
    const locationId = Number(row.location || 0);
    if (!grouped.has(locationId)) grouped.set(locationId, { row, banners: [] });
    grouped.get(locationId)!.banners.push(row);
  }

  return {
    locations: Array.from(grouped.values()).map(({ row, banners }) => ({
      id: Number(row.location || 0),
      key: String(row.location_index || ''),
      templatePage: String(row.template_page || ''),
      name: String(row.location_name || ''),
      description: '',
      banners: banners.map(formatPublicBanner),
    })),
    meta: publicHeadersMeta(key),
  };
}

export async function getPublicBannersByScope(scope: BannerScope) {
  const key: PublicBannerCacheKey = scope;
  return getCachedPublicBanners(key, async () => {
    try {
      const now = Math.trunc(Date.now() / 1000);
      const where = scope === 'homepage'
        ? `loc.template_page = 'homepage' AND ${activePublicWhere(now)}`
        : `loc.template_page <> 'homepage' AND ${activePublicWhere(now)}`;
      return await loadPublicPayload(key, where, []);
    } catch (error) {
      console.error('[Banners] public scope fallback:', error);
      return { locations: [], meta: publicHeadersMeta(key, true) };
    }
  });
}

export async function getPublicBannersByLocation(locationKey: string) {
  const key: PublicBannerCacheKey = `location:${locationKey}`;
  return getCachedPublicBanners(key, async () => {
    try {
      const now = Math.trunc(Date.now() / 1000);
      return await loadPublicPayload(key, `loc.index_key = ? AND ${activePublicWhere(now)}`, [locationKey]);
    } catch (error) {
      console.error('[Banners] public location fallback:', error);
      return { locations: [], meta: publicHeadersMeta(key, true) };
    }
  });
}

export async function listBannerLocations(searchParams = new URLSearchParams()) {
  const templatePage = String(searchParams.get('templatePage') || '').trim();
  const query = `%${String(searchParams.get('q') || searchParams.get('search') || '').trim()}%`;
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (templatePage) {
    clauses.push('loc.template_page = ?');
    params.push(templatePage);
  }
  if (query !== '%%') {
    clauses.push('(loc.name LIKE ? OR loc.index_key LIKE ? OR loc.description LIKE ?)');
    params.push(query, query, query);
  }

  const [rows] = await pool.query<LocationRow[]>(
    `
      SELECT loc.*,
             COUNT(ad.id) AS total_banners,
             SUM(CASE WHEN ad.status = 1 THEN 1 ELSE 0 END) AS active_banners
      FROM idv_seller_ad_location loc
      LEFT JOIN idv_seller_ad ad ON ad.location = loc.id
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      GROUP BY loc.id
      ORDER BY loc.template_page ASC, loc.id ASC
    `,
    params,
  );
  return { items: rows.map(formatLocation) };
}

export async function saveBannerLocation(payload: Record<string, unknown>, id?: number) {
  return withTransaction(async (connection) => {
    const templatePage = requireText(payload.templatePage || payload.template_page, 'templatePage', 'Template page', 100);
    const indexKey = requireText(payload.key || payload.indexKey || payload.index_key, 'key', 'Ma vi tri', 100);
    const name = requireText(payload.name, 'name', 'Ten vi tri', 150);
    const description = maybeText(payload.description, 250);

    const [duplicates] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_seller_ad_location WHERE index_key = ? AND id <> ? LIMIT 1',
      [indexKey, id || 0],
    );
    if (duplicates.length > 0) throw new AdminApiError(409, 'CONFLICT', 'Ma vi tri da ton tai');

    if (id) {
      await connection.query(
        `
          UPDATE idv_seller_ad_location
          SET template_page = ?, index_key = ?, name = ?, description = ?, last_update = NOW()
          WHERE id = ?
        `,
        [templatePage, indexKey, name, description, id],
      );
      await connection.query('UPDATE idv_seller_ad SET template_page = ?, location_index = ? WHERE location = ?', [templatePage, indexKey, id]);
      clearPublicBannerCache();
      return { id };
    }

    const [result] = await connection.query(
      `
        INSERT INTO idv_seller_ad_location (template_page, index_key, name, description, last_update)
        VALUES (?, ?, ?, ?, NOW())
      `,
      [templatePage, indexKey, name, description],
    );
    clearPublicBannerCache();
    return { id: resultId(result) };
  });
}

export async function listAdminBanners(searchParams = new URLSearchParams()) {
  const metaExists = await bannerMetaTableExists();
  const page = Math.max(1, toInt(searchParams.get('page'), 1));
  const limit = Math.min(100, Math.max(1, toInt(searchParams.get('limit'), 20)));
  const offset = (page - 1) * limit;
  const templatePage = String(searchParams.get('templatePage') || '').trim();
  const locationKey = String(searchParams.get('locationKey') || '').trim();
  const status = String(searchParams.get('status') || '').trim();
  const query = `%${String(searchParams.get('q') || searchParams.get('search') || '').trim()}%`;
  const now = Math.trunc(Date.now() / 1000);
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (templatePage) {
    clauses.push('ad.template_page = ?');
    params.push(templatePage);
  }
  if (locationKey) {
    clauses.push('ad.location_index = ?');
    params.push(locationKey);
  }
  if (status === '0' || status === '1') {
    clauses.push('ad.status = ?');
    params.push(Number(status));
  } else if (status === 'active') {
    clauses.push(activePublicWhere(now));
  } else if (status === 'scheduled') {
    clauses.push('(ad.from_time > ? OR (ad.to_time > 0 AND ad.to_time < ?))');
    params.push(now, now);
  }
  if (query !== '%%') {
    clauses.push('(ad.name LIKE ? OR ad.summary LIKE ? OR ad.desUrl LIKE ? OR ad.fileUrl LIKE ? OR loc.name LIKE ? OR loc.index_key LIKE ?)');
    params.push(query, query, query, query, query, query);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const [countRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS total
      FROM idv_seller_ad ad
      LEFT JOIN idv_seller_ad_location loc ON loc.id = ad.location
      ${where}
    `,
    params,
  );
  const [rows] = await pool.query<BannerRow[]>(
    `
      ${adminBannerSelect(metaExists)}
      ${where}
      ORDER BY ad.ordering DESC, ad.id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
  );
  return {
    items: rows.map((row) => formatAdminBanner(row)),
    page,
    limit,
    total: Number(countRows[0]?.total || 0),
  };
}

export async function getAdminBanner(id: number) {
  const metaExists = await bannerMetaTableExists();
  const [rows] = await pool.query<BannerRow[]>(
    `
      ${adminBannerSelect(metaExists)}
      WHERE ad.id = ?
      LIMIT 1
    `,
    [id],
  );
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay banner');
  const [categoryRows] = await pool.query<RowDataPacket[]>('SELECT catId FROM idv_seller_ad_category WHERE adId = ?', [id]);
  return formatAdminBanner(rows[0], categoryRows.map((row) => Number(row.catId || 0)).filter((catId) => catId > 0));
}

async function getLocation(connection: PoolConnection, locationId: number) {
  const [rows] = await connection.query<LocationRow[]>('SELECT * FROM idv_seller_ad_location WHERE id = ? LIMIT 1', [locationId]);
  if (!rows[0]) throw new AdminApiError(400, 'BAD_REQUEST', 'Vi tri banner khong hop le');
  return rows[0];
}

export async function saveAdminBanner(payload: Record<string, unknown>, id?: number) {
  return withTransaction(async (connection) => {
    await ensureBannerMetaTable(connection);
    const locationId = toInt(payload.locationId || payload.location);
    const location = await getLocation(connection, locationId);
    const name = requireText(payload.name, 'name', 'Ten banner', 150);
    const imageUrl = requireText(payload.imageUrl || payload.fileUrl, 'imageUrl', 'Anh banner', 512);
    const targetUrl = maybeText(payload.targetUrl || payload.desUrl, 250);
    const summary = maybeText(payload.summary, 250);
    const width = Math.max(0, toInt(payload.width, 0));
    const height = Math.max(0, toInt(payload.height, 0));
    const ordering = toInt(payload.ordering, 0);
    const status = toBoolInt(payload.status, 1);
    const showInMobile = toBoolInt(payload.showInMobile ?? payload.show_in_mobile, 1);
    const fromTime = unixTime(payload.fromTime || payload.from_time);
    const toTime = unixTime(payload.toTime || payload.to_time);
    const now = Math.trunc(Date.now() / 1000);
    const categoryIds = Array.from(new Set((Array.isArray(payload.categoryIds) ? payload.categoryIds : String(payload.categoryIds || '').split(','))
      .map((item) => toInt(item))
      .filter((categoryId) => categoryId > 0)));
    const categoryList = categoryIds.join(',');

    let bannerId = id || 0;
    if (bannerId) {
      await connection.query(
        `
          UPDATE idv_seller_ad
          SET template_page = ?, location = ?, location_index = ?, name = ?, summary = ?, category_list = ?,
              fileUrl = ?, desUrl = ?, type = ?, width = ?, height = ?, status = ?,
              ordering = ?, from_time = ?, to_time = ?, show_in_mobile = ?, lastUpdate = ?
          WHERE id = ?
        `,
        [
          location.template_page,
          location.id,
          location.index_key,
          name,
          summary,
          categoryList,
          imageUrl,
          targetUrl,
          maybeText(payload.type || 'banner', 10) || 'banner',
          width,
          height,
          status,
          ordering,
          fromTime,
          toTime,
          showInMobile,
          now,
          bannerId,
        ],
      );
    } else {
      const [result] = await connection.query(
        `
          INSERT INTO idv_seller_ad
            (template_page, location, location_index, name, summary, category_list, fileUrl, desUrl,
             type, width, height, status, ordering, from_time, to_time, show_in_mobile, lastUpdate, click)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `,
        [
          location.template_page,
          location.id,
          location.index_key,
          name,
          summary,
          categoryList,
          imageUrl,
          targetUrl,
          maybeText(payload.type || 'banner', 10) || 'banner',
          width,
          height,
          status,
          ordering,
          fromTime,
          toTime,
          showInMobile,
          now,
        ],
      );
      bannerId = resultId(result);
    }

    await connection.query('DELETE FROM idv_seller_ad_category WHERE adId = ?', [bannerId]);
    for (const categoryId of categoryIds) {
      await connection.query('INSERT INTO idv_seller_ad_category (adId, catId, sellerId) VALUES (?, ?, 0)', [bannerId, categoryId]);
    }

    await connection.query(
      `
        INSERT INTO web_admin_banner_meta
          (ad_id, mobile_file_url, alt_text, headline, subheading, cta_label,
           background_color, text_color, render_mode, style_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          mobile_file_url = VALUES(mobile_file_url),
          alt_text = VALUES(alt_text),
          headline = VALUES(headline),
          subheading = VALUES(subheading),
          cta_label = VALUES(cta_label),
          background_color = VALUES(background_color),
          text_color = VALUES(text_color),
          render_mode = VALUES(render_mode),
          style_json = VALUES(style_json)
      `,
      [
        bannerId,
        maybeText(payload.mobileImageUrl || payload.mobile_file_url, 512),
        maybeText(payload.altText || payload.alt_text, 255),
        maybeText(payload.headline, 255),
        maybeText(payload.subheading, 512),
        maybeText(payload.ctaLabel || payload.cta_label, 120),
        normalizeHex(payload.backgroundColor || payload.background_color),
        normalizeHex(payload.textColor || payload.text_color),
        normalizeRenderMode(payload.renderMode || payload.render_mode),
        typeof payload.style === 'object' && payload.style ? JSON.stringify(payload.style) : maybeText(payload.styleJson || payload.style_json),
      ],
    );

    clearPublicBannerCache();
    return { id: bannerId };
  });
}

export async function deleteBanner(id: number, mode: string) {
  return withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_seller_ad WHERE id = ? LIMIT 1', [id]);
    if (!existingRows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay banner');

    if (mode !== 'permanent') {
      await connection.query('UPDATE idv_seller_ad SET status = 0 WHERE id = ?', [id]);
      clearPublicBannerCache();
      return { id, hidden: true };
    }

    await connection.query('DELETE FROM idv_seller_ad_category WHERE adId = ?', [id]);
    await connection.query('DELETE FROM web_admin_banner_meta WHERE ad_id = ?', [id]);
    await connection.query('DELETE FROM idv_seller_ad WHERE id = ?', [id]);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ?', ['banner', id]);
    clearPublicBannerCache();
    return { id, deleted: true };
  });
}
