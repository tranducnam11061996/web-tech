import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { BOTTOM_FOOTER_MENU_HEADING, BOTTOM_FOOTER_MENU_LINKS } from '@/lib/bottom-footer-menu-seed';

export type BottomFooterMenuProjectionRow = {
  id: number;
  area: string;
  parent_id: number | null;
  node_type: 'zone' | 'group' | 'link';
  label: string;
  custom_url: string;
  url_override: string;
  ordering: number;
  is_active: number;
};
type BottomFooterItemRow = RowDataPacket & BottomFooterMenuProjectionRow;

export type PublicBottomFooterMenu = {
  heading: string;
  links: Array<{ id: string; label: string; url: string }>;
  meta: { fallback: boolean; versionNumber?: number; publishedAt?: Date | null };
};

let cachedBottomFooterMenu: { value: PublicBottomFooterMenu; expiresAt: number } | null = null;
let bottomFooterMenuFlight: Promise<PublicBottomFooterMenu> | null = null;
let cacheGeneration = 0;

function fallbackBottomFooterMenu(): PublicBottomFooterMenu {
  return {
    heading: BOTTOM_FOOTER_MENU_HEADING,
    links: BOTTOM_FOOTER_MENU_LINKS.map((label, index) => ({ id: `fallback-link-${index}`, label, url: '#' })),
    meta: { fallback: true },
  };
}

export function projectPublishedBottomFooterMenu(
  rows: readonly BottomFooterMenuProjectionRow[],
  meta: { versionNumber: number; publishedAt: Date | null },
): PublicBottomFooterMenu | null {
  if (rows.some((row) => row.area !== 'zones')) return null;
  const byId = new Map<number, BottomFooterMenuProjectionRow>();
  const byParent = new Map<number | null, BottomFooterMenuProjectionRow[]>();

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
  const groups = byParent.get(Number(root.id)) || [];
  if (groups.length !== 1 || groups[0].node_type !== 'group' || !String(groups[0].label || '').trim()) return null;
  const group = groups[0];
  const linkRows = byParent.get(Number(group.id)) || [];
  if (linkRows.some((row) => row.node_type !== 'link' || !String(row.label || '').trim() || (byParent.get(Number(row.id)) || []).length > 0)) return null;
  if (2 + linkRows.length !== rows.length) return null;

  const links = root.is_active === 1 && group.is_active === 1
    ? linkRows
        .filter((link) => link.is_active === 1)
        .map((link) => ({
          id: String(link.id),
          label: String(link.label),
          url: String(link.url_override || link.custom_url || '#'),
        }))
    : [];

  return {
    heading: String(group.label),
    links,
    meta: {
      fallback: false,
      versionNumber: meta.versionNumber,
      publishedAt: meta.publishedAt,
    },
  };
}

export function clearBottomFooterMenuCache() {
  cacheGeneration += 1;
  cachedBottomFooterMenu = null;
  bottomFooterMenuFlight = null;
}

async function loadPublishedBottomFooterMenu(): Promise<PublicBottomFooterMenu> {
  try {
    const [versions] = await pool.query<RowDataPacket[]>(
      `SELECT v.id, v.version_number, v.published_at FROM web_admin_menu_versions v
       JOIN web_admin_menus m ON m.id = v.menu_id
       WHERE m.code = ? AND v.status = 'published' ORDER BY v.published_at DESC, v.id DESC LIMIT 1`,
      ['bottom_footer'],
    );
    const version = versions[0];
    if (!version) return fallbackBottomFooterMenu();
    const [rows] = await pool.query<BottomFooterItemRow[]>(
      'SELECT * FROM web_admin_menu_items WHERE version_id = ? ORDER BY parent_id ASC, ordering ASC, id ASC',
      [version.id],
    );
    return projectPublishedBottomFooterMenu(rows, {
      versionNumber: Number(version.version_number),
      publishedAt: version.published_at || null,
    }) || fallbackBottomFooterMenu();
  } catch (error) {
    console.error('[BottomFooterMenu] Falling back to seed:', error);
    return fallbackBottomFooterMenu();
  }
}

export async function getPublishedBottomFooterMenu() {
  const now = Date.now();
  if (cachedBottomFooterMenu && cachedBottomFooterMenu.expiresAt > now) return cachedBottomFooterMenu.value;
  if (bottomFooterMenuFlight) return bottomFooterMenuFlight;
  const generation = cacheGeneration;
  bottomFooterMenuFlight = loadPublishedBottomFooterMenu().then((value) => {
    if (generation === cacheGeneration) cachedBottomFooterMenu = { value, expiresAt: Date.now() + (value.meta.fallback ? 10_000 : 5 * 60_000) };
    return value;
  }).finally(() => {
    if (generation === cacheGeneration) bottomFooterMenuFlight = null;
  });
  return bottomFooterMenuFlight;
}
