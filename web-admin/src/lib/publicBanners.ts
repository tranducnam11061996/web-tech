import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';

export type BannerScope = 'homepage' | 'global';

type BannerRow = RowDataPacket & {
  id: number; template_page: string; location: number; location_index: string; location_name: string;
  name: string; summary: string; fileUrl: string; desUrl: string; width: number; height: number;
  status: number; ordering: number; from_time: number; to_time: number; show_in_mobile: number;
  lastUpdate: number; click: number; mobile_file_url?: string; alt_text?: string; headline?: string;
  subheading?: string; cta_label?: string; background_color?: string; text_color?: string;
  render_mode?: string; style_json?: string;
};

type CacheKey = 'homepage' | 'global' | `location:${string}`;
type PublicPayload = {
  locations: Array<{ id: number; key: string; templatePage: string; name: string; description: string; banners: ReturnType<typeof formatPublicBanner>[] }>;
  meta: Record<string, unknown>;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 10 * 1000;
const DEFAULT_BANNER_LOCATION_KEY = 'unassigned';
const cache = new Map<CacheKey, { value: PublicPayload; expiresAt: number }>();
const flights = new Map<CacheKey, Promise<PublicPayload>>();
let generation = 0;
let metaTableExists: boolean | null = null;

function normalizeHex(value: unknown) {
  const text = String(value || '').trim().replace(/^#/, '').toLowerCase();
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/.test(text) ? text : '';
}

function parseStyleJson(value: unknown) {
  try { return value ? (typeof value === 'string' ? JSON.parse(value) : value) : {}; } catch { return {}; }
}

function formatPublicBanner(row: BannerRow) {
  return {
    id: Number(row.id), locationKey: String(row.location_index || ''), name: String(row.name || ''),
    imageUrl: String(row.fileUrl || ''), mobileImageUrl: String(row.mobile_file_url || ''), targetUrl: String(row.desUrl || ''),
    altText: String(row.alt_text || row.name || ''), ordering: Number(row.ordering || 0),
    renderMode: String(row.render_mode || 'image') === 'hybrid' ? 'hybrid' : 'image',
    text: { headline: String(row.headline || ''), subheading: String(row.subheading || row.summary || ''), ctaLabel: String(row.cta_label || '') },
    style: { backgroundColor: normalizeHex(row.background_color), textColor: normalizeHex(row.text_color), extra: parseStyleJson(row.style_json) },
    display: { status: Number(row.status || 0), showInMobile: Number(row.show_in_mobile || 0) === 1, fromTime: Number(row.from_time || 0), toTime: Number(row.to_time || 0) },
    meta: { width: Number(row.width || 0), height: Number(row.height || 0), click: Number(row.click || 0), lastUpdate: Number(row.lastUpdate || 0) },
  };
}

async function hasMetaTable() {
  if (metaTableExists !== null) return metaTableExists;
  const [rows] = await pool.query<RowDataPacket[]>("SHOW TABLES LIKE 'web_admin_banner_meta'");
  metaTableExists = rows.length > 0;
  return metaTableExists;
}

function publicSelect(withMeta: boolean) {
  return `
    SELECT ad.*, loc.name AS location_name,
      ${withMeta ? 'meta.mobile_file_url' : "''"} AS mobile_file_url,
      ${withMeta ? 'meta.alt_text' : "''"} AS alt_text,
      ${withMeta ? 'meta.headline' : "''"} AS headline,
      ${withMeta ? 'meta.subheading' : "''"} AS subheading,
      ${withMeta ? 'meta.cta_label' : "''"} AS cta_label,
      ${withMeta ? 'meta.background_color' : "''"} AS background_color,
      ${withMeta ? 'meta.text_color' : "''"} AS text_color,
      ${withMeta ? 'meta.render_mode' : "'image'"} AS render_mode,
      ${withMeta ? 'meta.style_json' : "''"} AS style_json
    FROM idv_seller_ad ad
    LEFT JOIN idv_seller_ad_location loc ON loc.id = ad.location
    ${withMeta ? 'LEFT JOIN web_admin_banner_meta meta ON meta.ad_id = ad.id' : ''}
  `;
}

function activeWhere(now: number) {
  return `ad.status = 1 AND (ad.from_time = 0 OR ad.from_time <= ${now}) AND (ad.to_time = 0 OR ad.to_time >= ${now})`;
}

function payloadMeta(key: CacheKey, fallback = false) { return { cacheKey: key, fallback, cacheCreatedAt: new Date().toISOString() }; }

async function loadPayload(key: CacheKey, where: string, params: unknown[]) {
  const [rows] = await pool.query<BannerRow[]>(`${publicSelect(await hasMetaTable())} WHERE ${where} ORDER BY loc.template_page ASC, loc.id ASC, ad.ordering DESC, ad.id DESC`, params);
  const grouped = new Map<number, { row: BannerRow; banners: BannerRow[] }>();
  for (const row of rows) {
    const locationId = Number(row.location || 0);
    const group = grouped.get(locationId) || { row, banners: [] };
    group.banners.push(row);
    grouped.set(locationId, group);
  }
  return { locations: Array.from(grouped.values()).map(({ row, banners }) => ({ id: Number(row.location || 0), key: String(row.location_index || ''), templatePage: String(row.template_page || ''), name: String(row.location_name || ''), description: '', banners: banners.map(formatPublicBanner) })), meta: payloadMeta(key) };
}

async function withCache(key: CacheKey, loader: () => Promise<PublicPayload>) {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value;
  const flight = flights.get(key);
  if (flight) return flight;
  const currentGeneration = generation;
  const next = loader().then((value) => {
    if (currentGeneration === generation) cache.set(key, { value, expiresAt: Date.now() + (value.meta.fallback ? FALLBACK_CACHE_TTL_MS : CACHE_TTL_MS) });
    return value;
  }).finally(() => { if (currentGeneration === generation) flights.delete(key); });
  flights.set(key, next);
  return next;
}

export function clearPublicBannerCache() { generation += 1; cache.clear(); flights.clear(); }

export async function getPublicBannersByScope(scope: BannerScope) {
  return withCache(scope, async () => {
    try {
      const now = Math.trunc(Date.now() / 1000);
      return await loadPayload(
        scope,
        `${scope === 'homepage' ? "loc.template_page = 'homepage'" : "loc.template_page <> 'homepage'"} AND loc.index_key <> ? AND ${activeWhere(now)}`,
        [DEFAULT_BANNER_LOCATION_KEY],
      );
    } catch (error) {
      console.error('[PublicBanners] scope fallback:', error);
      return { locations: [], meta: payloadMeta(scope, true) };
    }
  });
}

export async function getPublicBannersByLocation(locationKey: string) {
  const key = `location:${locationKey}` as const;
  return withCache(key, async () => {
    try {
      if (locationKey === DEFAULT_BANNER_LOCATION_KEY) return { locations: [], meta: payloadMeta(key) };
      return await loadPayload(
        key,
        `loc.index_key = ? AND loc.index_key <> ? AND ${activeWhere(Math.trunc(Date.now() / 1000))}`,
        [locationKey, DEFAULT_BANNER_LOCATION_KEY],
      );
    }
    catch (error) {
      console.error('[PublicBanners] location fallback:', error);
      return { locations: [], meta: payloadMeta(key, true) };
    }
  });
}
