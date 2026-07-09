import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from './db';
import { AdminApiError, maybeText, toBoolInt } from './admin/common';
import { clearPublicProductResponseCache } from './publicProductCache';
import { getProductCardBadgesForProductIds } from './productCardAttributes';

export type CategoryFeatureBoxPosition = 'left' | 'right';
export type CategoryFeatureBoxRenderMode = 'image' | 'hybrid';
export type CategoryFeatureBoxScope = 'homepage' | 'category';

export type CategoryFeatureBox = {
  categoryId: number;
  homepageEnabled: boolean;
  categoryPageEnabled: boolean;
  boxPosition: CategoryFeatureBoxPosition;
  renderMode: CategoryFeatureBoxRenderMode;
  backgroundImageUrl: string;
  mobileBackgroundImageUrl: string;
  targetUrl: string;
  headline: string;
  subheading: string;
  ctaLabel: string;
  textColor: string;
  overlayColor: string;
  buttonStyle: Record<string, unknown>;
  updatedAt: string | null;
};

type FeatureBoxRow = RowDataPacket & {
  category_id: number;
  homepage_enabled: number;
  category_page_enabled: number;
  box_position: string | null;
  render_mode: string | null;
  background_image_url: string | null;
  mobile_background_image_url: string | null;
  target_url: string | null;
  headline: string | null;
  subheading: string | null;
  cta_label: string | null;
  text_color: string | null;
  overlay_color: string | null;
  button_style_json: string | null;
  updated_at: Date | string | null;
};

type HomepageSectionCacheEntry = {
  value: HomepageCategoryFeatureSectionPayload;
  expiresAt: number;
};

const TABLE_NAME = 'web_admin_category_feature_boxes';
const CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 10 * 1000;
const featureBoxCache = new Map<string, { value: CategoryFeatureBox | null; expiresAt: number }>();
const featureBoxInflight = new Map<string, Promise<CategoryFeatureBox | null>>();
const homepageSectionsCache = new Map<string, HomepageSectionCacheEntry>();
const homepageSectionsInflight = new Map<string, Promise<HomepageCategoryFeatureSectionPayload>>();
let tableExistsCache: boolean | null = null;

export type HomepageCategoryFeatureProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  marketPrice: number;
  savings: number;
  thumbnail: string;
  slug: string;
  brand: string;
  cardBadges: unknown[];
};

export type HomepageCategoryFeatureSection = {
  category: {
    id: number;
    name: string;
    slug: string;
  };
  featureBox: CategoryFeatureBox;
  products: HomepageCategoryFeatureProduct[];
};

export type HomepageCategoryFeatureSectionPayload = {
  sections: HomepageCategoryFeatureSection[];
  meta: {
    generatedAt: string;
    fallback?: boolean;
  };
};

export async function ensureCategoryFeatureBoxTable(db: PoolConnection | typeof pool = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      category_id int unsigned NOT NULL,
      homepage_enabled tinyint(1) NOT NULL DEFAULT 0,
      category_page_enabled tinyint(1) NOT NULL DEFAULT 0,
      box_position varchar(16) NOT NULL DEFAULT 'left',
      render_mode varchar(24) NOT NULL DEFAULT 'image',
      background_image_url varchar(512) NOT NULL DEFAULT '',
      mobile_background_image_url varchar(512) NOT NULL DEFAULT '',
      target_url varchar(512) NOT NULL DEFAULT '',
      headline varchar(255) NOT NULL DEFAULT '',
      subheading varchar(512) NOT NULL DEFAULT '',
      cta_label varchar(120) NOT NULL DEFAULT '',
      text_color varchar(16) NOT NULL DEFAULT '#ffffff',
      overlay_color varchar(16) NOT NULL DEFAULT '#07111f',
      button_style_json text NULL,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (category_id),
      KEY idx_homepage_enabled (homepage_enabled),
      KEY idx_category_page_enabled (category_page_enabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tableExistsCache = true;
}

async function categoryFeatureBoxTableExists(db: PoolConnection | typeof pool = pool) {
  if (tableExistsCache !== null) return tableExistsCache;
  const [rows] = await db.query<RowDataPacket[]>(`SHOW TABLES LIKE '${TABLE_NAME}'`);
  tableExistsCache = rows.length > 0;
  return tableExistsCache;
}

function normalizePosition(value: unknown): CategoryFeatureBoxPosition {
  return String(value || '').trim() === 'right' ? 'right' : 'left';
}

function normalizeRenderMode(value: unknown): CategoryFeatureBoxRenderMode {
  return String(value || '').trim() === 'hybrid' ? 'hybrid' : 'image';
}

function normalizeColor(value: unknown, fallback: string) {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(withHash) ? withHash.toLowerCase() : fallback;
}

function parseButtonStyle(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeTargetUrl(value: unknown) {
  const text = maybeText(value, 512);
  if (!text) return '';
  if (/^(?:javascript|data):/i.test(text) || /^\/\//.test(text)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'URL box dau tien khong hop le', { 'featureBox.targetUrl': 'invalid' });
  }
  if (/^https?:\/\//i.test(text) || text.startsWith('/')) return text;
  return `/${text.replace(/^\/+/, '')}`;
}

function normalizeFeatureBoxInput(categoryId: number, value: unknown): CategoryFeatureBox {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const homepageEnabled = Boolean(toBoolInt(input.homepageEnabled ?? input.homepage_enabled, 0));
  const categoryPageEnabled = Boolean(toBoolInt(input.categoryPageEnabled ?? input.category_page_enabled, 0));
  const enabled = homepageEnabled || categoryPageEnabled;
  const backgroundImageUrl = maybeText(input.backgroundImageUrl ?? input.background_image_url, 512);
  const targetUrl = normalizeTargetUrl(input.targetUrl ?? input.target_url);

  if (enabled && !backgroundImageUrl) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Can chon anh background cho box dau tien', { 'featureBox.backgroundImageUrl': 'required' });
  }
  if (enabled && !targetUrl) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Can nhap URL dich cho box dau tien', { 'featureBox.targetUrl': 'required' });
  }

  return {
    categoryId,
    homepageEnabled,
    categoryPageEnabled,
    boxPosition: normalizePosition(input.boxPosition ?? input.box_position),
    renderMode: normalizeRenderMode(input.renderMode ?? input.render_mode),
    backgroundImageUrl,
    mobileBackgroundImageUrl: maybeText(input.mobileBackgroundImageUrl ?? input.mobile_background_image_url, 512),
    targetUrl,
    headline: maybeText(input.headline, 255),
    subheading: maybeText(input.subheading, 512),
    ctaLabel: maybeText(input.ctaLabel ?? input.cta_label, 120),
    textColor: normalizeColor(input.textColor ?? input.text_color, '#ffffff'),
    overlayColor: normalizeColor(input.overlayColor ?? input.overlay_color, '#07111f'),
    buttonStyle: parseButtonStyle(input.buttonStyle ?? input.button_style_json),
    updatedAt: null,
  };
}

function formatFeatureBox(row: FeatureBoxRow): CategoryFeatureBox {
  return {
    categoryId: Number(row.category_id || 0),
    homepageEnabled: Number(row.homepage_enabled || 0) === 1,
    categoryPageEnabled: Number(row.category_page_enabled || 0) === 1,
    boxPosition: normalizePosition(row.box_position),
    renderMode: normalizeRenderMode(row.render_mode),
    backgroundImageUrl: String(row.background_image_url || ''),
    mobileBackgroundImageUrl: String(row.mobile_background_image_url || ''),
    targetUrl: String(row.target_url || ''),
    headline: String(row.headline || ''),
    subheading: String(row.subheading || ''),
    ctaLabel: String(row.cta_label || ''),
    textColor: normalizeColor(row.text_color, '#ffffff'),
    overlayColor: normalizeColor(row.overlay_color, '#07111f'),
    buttonStyle: parseButtonStyle(row.button_style_json),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

function publicScopeEnabled(featureBox: CategoryFeatureBox, scope: CategoryFeatureBoxScope) {
  return scope === 'homepage' ? featureBox.homepageEnabled : featureBox.categoryPageEnabled;
}

export function invalidateCategoryFeatureBoxCaches(categoryId?: number) {
  if (categoryId) {
    for (const key of featureBoxCache.keys()) {
      if (key.startsWith(`${categoryId}:`)) featureBoxCache.delete(key);
    }
    for (const key of featureBoxInflight.keys()) {
      if (key.startsWith(`${categoryId}:`)) featureBoxInflight.delete(key);
    }
  } else {
    featureBoxCache.clear();
    featureBoxInflight.clear();
  }
  homepageSectionsCache.clear();
  homepageSectionsInflight.clear();
  clearPublicProductResponseCache();
}

export async function saveCategoryFeatureBox(categoryId: number, payload: unknown, db: PoolConnection | typeof pool = pool) {
  if (!categoryId || !payload || typeof payload !== 'object') return null;
  if (!(await categoryFeatureBoxTableExists(db))) {
    throw new AdminApiError(500, 'INTERNAL_ERROR', 'Chua co bang web_admin_category_feature_boxes. Hay chay admin:migrate truoc khi luu box dau tien.');
  }
  const featureBox = normalizeFeatureBoxInput(categoryId, payload);
  await db.query(
    `
      INSERT INTO ${TABLE_NAME}
        (category_id, homepage_enabled, category_page_enabled, box_position, render_mode,
         background_image_url, mobile_background_image_url, target_url, headline, subheading,
         cta_label, text_color, overlay_color, button_style_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        homepage_enabled = VALUES(homepage_enabled),
        category_page_enabled = VALUES(category_page_enabled),
        box_position = VALUES(box_position),
        render_mode = VALUES(render_mode),
        background_image_url = VALUES(background_image_url),
        mobile_background_image_url = VALUES(mobile_background_image_url),
        target_url = VALUES(target_url),
        headline = VALUES(headline),
        subheading = VALUES(subheading),
        cta_label = VALUES(cta_label),
        text_color = VALUES(text_color),
        overlay_color = VALUES(overlay_color),
        button_style_json = VALUES(button_style_json)
    `,
    [
      categoryId,
      featureBox.homepageEnabled ? 1 : 0,
      featureBox.categoryPageEnabled ? 1 : 0,
      featureBox.boxPosition,
      featureBox.renderMode,
      featureBox.backgroundImageUrl,
      featureBox.mobileBackgroundImageUrl,
      featureBox.targetUrl,
      featureBox.headline,
      featureBox.subheading,
      featureBox.ctaLabel,
      featureBox.textColor,
      featureBox.overlayColor,
      JSON.stringify(featureBox.buttonStyle || {}),
    ],
  );
  invalidateCategoryFeatureBoxCaches(categoryId);
  return featureBox;
}

export async function getAdminCategoryFeatureBox(categoryId: number, db: PoolConnection | typeof pool = pool) {
  if (!categoryId || !(await categoryFeatureBoxTableExists(db))) return null;
  const [rows] = await db.query<FeatureBoxRow[]>(`SELECT * FROM ${TABLE_NAME} WHERE category_id = ? LIMIT 1`, [categoryId]);
  return rows[0] ? formatFeatureBox(rows[0]) : null;
}

export async function deleteCategoryFeatureBox(categoryId: number, db: PoolConnection | typeof pool = pool) {
  if (!categoryId || !(await categoryFeatureBoxTableExists(db))) return;
  await db.query(`DELETE FROM ${TABLE_NAME} WHERE category_id = ?`, [categoryId]);
  invalidateCategoryFeatureBoxCaches(categoryId);
}

async function loadPublicCategoryFeatureBox(categoryId: number, scope: CategoryFeatureBoxScope) {
  if (!categoryId || !(await categoryFeatureBoxTableExists())) return null;
  const [rows] = await pool.query<FeatureBoxRow[]>(`SELECT * FROM ${TABLE_NAME} WHERE category_id = ? LIMIT 1`, [categoryId]);
  if (!rows[0]) return null;
  const featureBox = formatFeatureBox(rows[0]);
  return publicScopeEnabled(featureBox, scope) ? featureBox : null;
}

export async function getPublicCategoryFeatureBox(categoryId: number, scope: CategoryFeatureBoxScope = 'category') {
  const key = `${categoryId}:${scope}`;
  const now = Date.now();
  const cached = featureBoxCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const existingFlight = featureBoxInflight.get(key);
  if (existingFlight) return existingFlight;

  const flight = loadPublicCategoryFeatureBox(categoryId, scope)
    .then((value) => {
      featureBoxCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    })
    .catch((error) => {
      console.error('Failed to load category feature box:', error);
      featureBoxCache.set(key, { value: null, expiresAt: Date.now() + FALLBACK_CACHE_TTL_MS });
      return null;
    })
    .finally(() => {
      featureBoxInflight.delete(key);
    });

  featureBoxInflight.set(key, flight);
  return flight;
}

function normalizeCategorySlug(value: unknown) {
  return String(value || '').replace(/^\/+/, '');
}

async function loadHomepageCategoryFeatureSections(limit: number, productLimit: number): Promise<HomepageCategoryFeatureSectionPayload> {
  if (!(await categoryFeatureBoxTableExists())) {
    return { sections: [], meta: { generatedAt: new Date().toISOString() } };
  }

  const [featureRows] = await pool.query<Array<FeatureBoxRow & { category_name: string | null; category_slug: string | null }>>(
    `
      SELECT f.*, c.name AS category_name, COALESCE(NULLIF(c.request_path, ''), c.url) AS category_slug
      FROM ${TABLE_NAME} f
      JOIN idv_seller_category c ON c.id = f.category_id
      WHERE f.homepage_enabled = 1 AND c.status = 1
      ORDER BY c.ordering DESC, c.id DESC
      LIMIT ?
    `,
    [limit],
  );

  const sections: HomepageCategoryFeatureSection[] = [];
  for (const row of featureRows) {
    const categoryId = Number(row.category_id || 0);
    const [productRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT DISTINCT
          p.id, p.storeSKU, p.proName, p.proThum,
          pr.price, pr.market_price,
          u.request_path AS slug,
          b.name AS brandName
        FROM idv_sell_product_store p
        JOIN idv_sell_product_price pr ON p.id = pr.id
        JOIN idv_product_category pc ON pc.pro_id = p.id AND pc.category_id = ?
        LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
        LEFT JOIN idv_brand b ON p.brandId = b.id
        WHERE pr.isOn = 1
        ORDER BY p.id DESC
        LIMIT ?
      `,
      [categoryId, productLimit],
    );
    const badgesByProduct = await getProductCardBadgesForProductIds(productRows.map((product) => Number(product.id)));
    sections.push({
      category: {
        id: categoryId,
        name: String(row.category_name || ''),
        slug: normalizeCategorySlug(row.category_slug || `category?id=${categoryId}`),
      },
      featureBox: formatFeatureBox(row),
      products: productRows.map((product) => ({
        id: Number(product.id),
        name: String(product.proName || ''),
        sku: String(product.storeSKU || ''),
        price: Number(product.price || 0),
        marketPrice: Number(product.market_price || 0),
        savings: Math.max(0, Number(product.market_price || 0) - Number(product.price || 0)),
        thumbnail: product.proThum ? `https://hacom.vn/media/product/${product.proThum}` : 'https://via.placeholder.com/300',
        slug: product.slug ? normalizeCategorySlug(product.slug) : `product-${product.id}`,
        brand: String(product.brandName || 'Khac'),
        cardBadges: badgesByProduct.get(Number(product.id)) || [],
      })),
    });
  }

  return { sections, meta: { generatedAt: new Date().toISOString() } };
}

export async function getHomepageCategoryFeatureSections(limit = 3, productLimit = 9) {
  const normalizedLimit = Math.min(12, Math.max(1, Math.trunc(limit || 3)));
  const normalizedProductLimit = Math.min(24, Math.max(1, Math.trunc(productLimit || 9)));
  const key = `${normalizedLimit}:${normalizedProductLimit}`;
  const now = Date.now();
  const cached = homepageSectionsCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const existingFlight = homepageSectionsInflight.get(key);
  if (existingFlight) return existingFlight;

  const flight = loadHomepageCategoryFeatureSections(normalizedLimit, normalizedProductLimit)
    .then((value) => {
      homepageSectionsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    })
    .catch((error) => {
      console.error('Failed to load homepage category feature sections:', error);
      const fallback = { sections: [], meta: { generatedAt: new Date().toISOString(), fallback: true } };
      homepageSectionsCache.set(key, { value: fallback, expiresAt: Date.now() + FALLBACK_CACHE_TTL_MS });
      return fallback;
    })
    .finally(() => {
      homepageSectionsInflight.delete(key);
    });

  homepageSectionsInflight.set(key, flight);
  return flight;
}
