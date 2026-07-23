import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { FOOTER_MENU_GROUPS } from '@/lib/footer-menu-seed';

export type FooterMenuProjectionRow = {
  id: number;
  area: string;
  parent_id: number | null;
  node_type: 'zone' | 'group' | 'link';
  label: string;
  suffix_text: string;
  custom_url: string;
  url_override: string;
  ordering: number;
  is_active: number;
  desktop_visible: number;
  mobile_visible: number;
};
type FooterItemRow = RowDataPacket & FooterMenuProjectionRow;

export type PublicFooterMenu = {
  groups: Array<{ id: string; label: string; links: Array<{ id: string; label: string; url: string; suffixText: string }> }>;
  meta: { fallback: boolean; versionNumber?: number; publishedAt?: Date | null };
};

let cachedFooterMenu: { value: PublicFooterMenu; expiresAt: number } | null = null;
let footerMenuFlight: Promise<PublicFooterMenu> | null = null;
let cacheGeneration = 0;

function fallbackFooterMenu(): PublicFooterMenu {
  let id = 0;
  return {
    groups: FOOTER_MENU_GROUPS.map((group) => ({
      id: `fallback-group-${id++}`,
      label: group.label,
      links: group.links.map((label) => ({ id: `fallback-link-${id++}`, label, url: '#', suffixText: label === 'Best Sellers' ? '🔥' : '' })),
    })),
    meta: { fallback: true },
  };
}

export function projectPublishedFooterMenu(
  rows: readonly FooterMenuProjectionRow[],
  meta: { versionNumber: number; publishedAt: Date | null },
): PublicFooterMenu | null {
  if (rows.some((row) => row.area !== 'zones')) return null;
  const byId = new Map<number, FooterMenuProjectionRow>();
  const byParent = new Map<number | null, FooterMenuProjectionRow[]>();

  for (const row of rows) {
    const id = Number(row.id);
    if (!id || byId.has(id)) return null;
    byId.set(id, row);
    const parent = row.parent_id ? Number(row.parent_id) : null;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(row);
  }

  const roots = byParent.get(null) || [];
  if (roots.length !== 1 || roots[0].node_type !== 'zone' || !String(roots[0].label || '').trim()) return null;
  const root = roots[0];
  const groupRows = byParent.get(Number(root.id)) || [];
  if (groupRows.some((row) => row.node_type !== 'group' || !String(row.label || '').trim())) return null;

  let reachableCount = 1 + groupRows.length;
  for (const group of groupRows) {
    const links = byParent.get(Number(group.id)) || [];
    if (links.some((row) => row.node_type !== 'link' || !String(row.label || '').trim() || (byParent.get(Number(row.id)) || []).length > 0)) return null;
    reachableCount += links.length;
  }
  if (reachableCount !== rows.length) return null;

  const groups = root.is_active === 1
    ? groupRows.flatMap((group) => {
        if (group.is_active !== 1) return [];
        const links = (byParent.get(Number(group.id)) || [])
          .filter((link) => link.is_active === 1)
          .map((link) => ({
            id: String(link.id),
            label: String(link.label),
            url: String(link.url_override || link.custom_url || '#'),
            suffixText: String(link.suffix_text || ''),
          }));
        if (links.length === 0) return [];
        return [{ id: String(group.id), label: String(group.label), links }];
      })
    : [];

  return {
    groups,
    meta: {
      fallback: false,
      versionNumber: meta.versionNumber,
      publishedAt: meta.publishedAt,
    },
  };
}

export function clearFooterMenuCache() {
  cacheGeneration += 1;
  cachedFooterMenu = null;
  footerMenuFlight = null;
}

async function loadPublishedFooterMenu(): Promise<PublicFooterMenu> {
  try {
    const [versions] = await pool.query<RowDataPacket[]>(
      `SELECT v.id, v.version_number, v.published_at FROM web_admin_menu_versions v
       JOIN web_admin_menus m ON m.id = v.menu_id
       WHERE m.code = ? AND v.status = 'published' ORDER BY v.published_at DESC, v.id DESC LIMIT 1`,
      ['footer'],
    );
    const version = versions[0];
    if (!version) return fallbackFooterMenu();
    const [rows] = await pool.query<FooterItemRow[]>(
      'SELECT * FROM web_admin_menu_items WHERE version_id = ? ORDER BY parent_id ASC, ordering ASC, id ASC',
      [version.id],
    );
    return projectPublishedFooterMenu(rows, {
      versionNumber: Number(version.version_number),
      publishedAt: version.published_at || null,
    }) || fallbackFooterMenu();
  } catch (error) {
    console.error('[FooterMenu] Falling back to seed:', error);
    return fallbackFooterMenu();
  }
}

export async function getPublishedFooterMenu() {
  const now = Date.now();
  if (cachedFooterMenu && cachedFooterMenu.expiresAt > now) return cachedFooterMenu.value;
  if (footerMenuFlight) return footerMenuFlight;
  const generation = cacheGeneration;
  footerMenuFlight = loadPublishedFooterMenu().then((value) => {
    if (generation === cacheGeneration) cachedFooterMenu = { value, expiresAt: Date.now() + (value.meta.fallback ? 10_000 : 5 * 60_000) };
    return value;
  }).finally(() => {
    if (generation === cacheGeneration) footerMenuFlight = null;
  });
  return footerMenuFlight;
}
