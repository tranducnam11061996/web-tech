import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { BOTTOM_FOOTER_MENU_HEADING, BOTTOM_FOOTER_MENU_LINKS } from '@/lib/bottom-footer-menu-seed';

type BottomFooterItemRow = RowDataPacket & {
  id: number;
  parent_id: number | null;
  node_type: 'zone' | 'group' | 'link';
  label: string;
  custom_url: string;
  url_override: string;
  ordering: number;
  is_active: number;
};

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
      'SELECT * FROM web_admin_menu_items WHERE version_id = ? AND is_active = 1 ORDER BY parent_id ASC, ordering ASC, id ASC',
      [version.id],
    );
    const byParent = new Map<number | null, BottomFooterItemRow[]>();
    for (const row of rows) {
      const parent = row.parent_id ? Number(row.parent_id) : null;
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent)!.push(row);
    }
    const root = (byParent.get(null) || []).find((row) => row.node_type === 'zone');
    const group = root ? (byParent.get(Number(root.id)) || []).find((row) => row.node_type === 'group') : null;
    const links = group ? (byParent.get(Number(group.id)) || []).filter((row) => row.node_type === 'link').map((link) => ({
      id: String(link.id),
      label: String(link.label),
      url: String(link.url_override || link.custom_url || '#'),
    })) : [];
    if (!group || links.length !== BOTTOM_FOOTER_MENU_LINKS.length) return fallbackBottomFooterMenu();
    return { heading: String(group.label), links, meta: { fallback: false, versionNumber: Number(version.version_number), publishedAt: version.published_at || null } };
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
