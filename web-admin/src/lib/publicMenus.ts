import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { HEADER_MENU_SEED, type HeaderMenuSeed, type HeaderMenuSeedNode } from '@/lib/header-menu-seed';

type HeaderMenuArea = 'zones' | 'faves' | 'topNav' | 'utilityLinks' | 'circleStory' | 'shopByCategory';
type HeaderMenuNodeType = 'zone' | 'group' | 'link';
type HeaderMenuLinkMode = 'custom' | 'entity' | 'system';
type HeaderMenuEntityType = 'product-category' | 'article-category';

type MenuVersionRow = RowDataPacket & {
  id: number;
  version_number: number;
  published_at: Date | null;
  settings_json: string | null;
};

type MenuItemRow = RowDataPacket & {
  id: number;
  version_id: number;
  area: HeaderMenuArea;
  parent_id: number | null;
  node_type: HeaderMenuNodeType;
  label: string;
  icon_key: string;
  badge_text: string;
  suffix_text: string;
  background_color: string;
  image_url: string;
  sub_text: string;
  link_mode: HeaderMenuLinkMode;
  entity_type: HeaderMenuEntityType | '';
  entity_id: number | null;
  custom_url: string;
  url_override: string;
  ordering: number;
  is_active: number;
  desktop_visible: number;
  mobile_visible: number;
};

type UrlMaps = { product: Map<number, string>; article: Map<number, string> };
type PublicMenu = ReturnType<typeof buildPublicMenu>;

const HEADER_MENU_AREAS: HeaderMenuArea[] = ['zones', 'faves', 'topNav', 'utilityLinks', 'circleStory', 'shopByCategory'];
const HEADER_RUNTIME_AREAS: HeaderMenuArea[] = ['zones', 'faves', 'topNav', 'utilityLinks'];
const HOMEPAGE_RUNTIME_AREAS: HeaderMenuArea[] = ['circleStory', 'shopByCategory'];
const DEFAULT_SETTINGS = { zonesLabel: 'Danh Mục', favesLabel: 'Nổi bật' };
const CACHE_TTL_MS = 5 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 10 * 1000;

let cachedMenu: { value: PublicMenu; expiresAt: number } | null = null;
let menuFlight: Promise<PublicMenu> | null = null;
let cacheGeneration = 0;

const MENU_TEXT_REPAIRS: Array<[RegExp, string]> = [
  [/Danh M\u00e1\u00bb\u00a5c/g, 'Danh Mục'],
  [/N\u00e1\u00bb\u2022i b\u00e1\u00ba\u00adt/g, 'Nổi bật'],
  [/\u00f0\u0178\u201d\u00a5/g, '🔥'],
  [/\u00f0\u0178\u2019\u00bb/g, '💻'],
  [/\u00f0\u0178\u00a4\u2013/g, '🤖'],
  [/\u00f0\u0178\u008f\u00b7\u00ef\u00b8\u008f/g, '🏷️'],
  [/\u00e2\u008f\u00b3/g, '⏳'],
  [/\u00e2\u203a\u201e/g, '⛄'],
  [/\u00e2\u0153\u00a8/g, '✨'],
  [/\u00e2\u0161\u00a1/g, '⚡'],
  [/\u00e2\u0161\u2122\u00ef\u00b8\u008f/g, '⚙️'],
];

function repairMenuText(value: unknown) {
  let text = String(value || '');
  for (const [broken, fixed] of MENU_TEXT_REPAIRS) text = text.replace(broken, fixed);
  return text;
}

function normalizeSettings(value: unknown) {
  let parsed: Record<string, unknown> = {};
  try {
    if (typeof value === 'string' && value.trim()) parsed = JSON.parse(value) as Record<string, unknown>;
    else if (value && typeof value === 'object') parsed = value as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  return {
    zonesLabel: repairMenuText(parsed.zonesLabel || DEFAULT_SETTINGS.zonesLabel),
    favesLabel: repairMenuText(parsed.favesLabel || DEFAULT_SETTINGS.favesLabel),
  };
}

async function loadUrlMaps(rows: MenuItemRow[]): Promise<UrlMaps> {
  const productIds = Array.from(new Set(rows.filter((row) => row.entity_type === 'product-category' && row.entity_id).map((row) => Number(row.entity_id))));
  const articleIds = Array.from(new Set(rows.filter((row) => row.entity_type === 'article-category' && row.entity_id).map((row) => Number(row.entity_id))));
  const product = new Map<number, string>();
  const article = new Map<number, string>();

  const [productRows, articleRows] = await Promise.all([
    productIds.length > 0
      ? pool.query<RowDataPacket[]>(`SELECT id, url FROM idv_seller_category WHERE id IN (${productIds.map(() => '?').join(',')})`, productIds)
      : Promise.resolve([[]] as unknown as [RowDataPacket[]]),
    articleIds.length > 0
      ? pool.query<RowDataPacket[]>(`SELECT id, url FROM idv_seller_news_category WHERE id IN (${articleIds.map(() => '?').join(',')})`, articleIds)
      : Promise.resolve([[]] as unknown as [RowDataPacket[]]),
  ]);

  for (const row of productRows[0]) product.set(Number(row.id), row.url ? `/${String(row.url).replace(/^\/+/, '')}` : `/category?id=${row.id}`);
  for (const row of articleRows[0]) article.set(Number(row.id), row.url ? `/tin-tuc/${String(row.url).replace(/^\/+/, '')}` : `/tin-tuc?category=${row.id}`);
  return { product, article };
}

function resolveUrl(row: MenuItemRow, maps: UrlMaps) {
  if (row.url_override) return row.url_override;
  if (row.link_mode === 'entity' && row.entity_type === 'product-category' && row.entity_id) return maps.product.get(Number(row.entity_id)) || `/category?id=${row.entity_id}`;
  if (row.link_mode === 'entity' && row.entity_type === 'article-category' && row.entity_id) return maps.article.get(Number(row.entity_id)) || `/tin-tuc?category=${row.entity_id}`;
  if (row.link_mode === 'system') return row.custom_url === 'cart' ? '/gio-hang' : row.custom_url === 'search' ? '/tim' : '#';
  return row.custom_url || '#';
}

function toPublicLink(row: MenuItemRow, maps: UrlMaps) {
  const label = repairMenuText(row.label);
  const suffixText = repairMenuText(row.suffix_text);
  return {
    id: String(row.id), label, url: resolveUrl(row, maps), iconKey: row.icon_key || '',
    badgeText: repairMenuText(row.badge_text), suffixText,
    backgroundColor: row.background_color || '', imageUrl: row.image_url || '', subText: repairMenuText(row.sub_text || ''),
  };
}

function buildPublicMenu(rows: MenuItemRow[], maps: UrlMaps, meta: Record<string, unknown>) {
  const settings = normalizeSettings(meta.labels || DEFAULT_SETTINGS);
  const labels = { zones: settings.zonesLabel, faves: settings.favesLabel };
  const byParent = new Map<number | null, MenuItemRow[]>();
  for (const row of rows) {
    const parent = row.parent_id ? Number(row.parent_id) : null;
    const items = byParent.get(parent) || [];
    items.push(row);
    byParent.set(parent, items);
  }
  for (const items of byParent.values()) items.sort((a, b) => (a.ordering - b.ordering) || (a.id - b.id));
  const rootLinks = (area: HeaderMenuArea) => (byParent.get(null) || []).filter((row) => row.area === area && row.node_type === 'link').map((row) => toPublicLink(row, maps));
  const zones = (byParent.get(null) || []).filter((row) => row.area === 'zones' && row.node_type === 'zone').map((zone) => ({
    ...toPublicLink(zone, maps),
    cols: (byParent.get(Number(zone.id)) || []).filter((group) => group.node_type === 'group').map((group) => ({
      id: String(group.id), title: repairMenuText(group.label),
      items: (byParent.get(Number(group.id)) || []).filter((item) => item.node_type === 'link').map((item) => toPublicLink(item, maps)),
    })),
  }));
  return { zones, faves: rootLinks('faves'), topNav: rootLinks('topNav'), utilityLinks: rootLinks('utilityLinks'), circleStory: rootLinks('circleStory'), shopByCategory: rootLinks('shopByCategory'), labels, settings, meta: { ...meta, labels, settings } };
}

function seedToRows(data: HeaderMenuSeed) {
  let id = 1;
  const rows: MenuItemRow[] = [];
  const add = (area: HeaderMenuArea, parentId: number | null, nodes: HeaderMenuSeedNode[]) => {
    for (const [index, node] of nodes.entries()) {
      const rowId = id++;
      rows.push({ id: rowId, version_id: 0, area, parent_id: parentId, node_type: node.nodeType, label: node.label, icon_key: node.iconKey || '', badge_text: node.badgeText || '', suffix_text: node.suffixText || '', background_color: node.backgroundColor || '', image_url: node.imageUrl || '', sub_text: node.subText || '', link_mode: node.linkMode || 'custom', entity_type: node.entityType || '', entity_id: node.entityId || null, custom_url: node.customUrl || '#', url_override: node.urlOverride || '', ordering: index, is_active: node.isActive === false ? 0 : 1, desktop_visible: node.desktopVisible === false ? 0 : 1, mobile_visible: node.mobileVisible === false ? 0 : 1 } as MenuItemRow);
      if (node.children?.length) add(area, rowId, node.children);
    }
  };
  for (const area of HEADER_MENU_AREAS) add(area, null, data[area] || []);
  return rows;
}

function buildPublicMenuFromSeed() {
  return buildPublicMenu(seedToRows(HEADER_MENU_SEED), { product: new Map(), article: new Map() }, { fallback: true, labels: DEFAULT_SETTINGS });
}

async function loadPublishedMenu(): Promise<PublicMenu> {
  try {
    const [versions] = await pool.query<MenuVersionRow[]>(`
      SELECT v.id, v.version_number, v.published_at, v.settings_json
      FROM web_admin_menu_versions v
      JOIN web_admin_menus m ON m.id = v.menu_id
      WHERE m.code = ? AND v.status = 'published'
      ORDER BY v.published_at DESC, v.id DESC
      LIMIT 1
    `, ['header']);
    const version = versions[0];
    if (!version) return buildPublicMenuFromSeed();
    const [rows] = await pool.query<MenuItemRow[]>('SELECT * FROM web_admin_menu_items WHERE version_id = ? AND is_active = 1 ORDER BY area ASC, parent_id ASC, ordering ASC, id ASC', [version.id]);
    return buildPublicMenu(rows, await loadUrlMaps(rows), { versionNumber: version.version_number, publishedAt: version.published_at, fallback: false, labels: normalizeSettings(version.settings_json) });
  } catch (error) {
    console.error('[PublicMenu] Falling back to seed:', error);
    return buildPublicMenuFromSeed();
  }
}

async function getPublishedMenu() {
  const now = Date.now();
  if (cachedMenu && cachedMenu.expiresAt > now) return cachedMenu.value;
  if (menuFlight) return menuFlight;
  const generation = cacheGeneration;
  menuFlight = loadPublishedMenu().then((value) => {
    const withMeta = { ...value, meta: { ...value.meta, cacheCreatedAt: new Date().toISOString() } };
    if (generation === cacheGeneration) {
      const isFallback = Boolean((withMeta.meta as Record<string, unknown>).fallback);
      cachedMenu = { value: withMeta, expiresAt: Date.now() + (isFallback ? FALLBACK_CACHE_TTL_MS : CACHE_TTL_MS) };
    }
    return withMeta;
  }).finally(() => { if (generation === cacheGeneration) menuFlight = null; });
  return menuFlight;
}

function publicMeta(menu: PublicMenu, cacheKey: string) {
  const meta = menu.meta as Record<string, unknown>;
  return { cacheKey, fallback: Boolean(meta.fallback), versionNumber: meta.versionNumber, publishedAt: meta.publishedAt };
}

function pickHeader(menu: PublicMenu) {
  return { zones: menu.zones, faves: menu.faves, topNav: menu.topNav, utilityLinks: menu.utilityLinks, labels: menu.labels, meta: publicMeta(menu, 'header') };
}

function pickHomepage(menu: PublicMenu) {
  return { circleStory: menu.circleStory, shopByCategory: menu.shopByCategory, meta: publicMeta(menu, 'homepage') };
}

export function clearPublicMenuCache() {
  cacheGeneration += 1;
  cachedMenu = null;
  menuFlight = null;
}

export async function getPublishedHeaderMenu() { return pickHeader(await getPublishedMenu()); }
export async function getPublishedHomepageMenu() { return pickHomepage(await getPublishedMenu()); }
export async function getPublishedMenuBundle() {
  const menu = await getPublishedMenu();
  return { headerMenu: pickHeader(menu), homepageMenu: pickHomepage(menu) };
}
