import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { FOOTER_MENU_GROUPS } from '@/lib/footer-menu-seed';

type FooterItemRow = RowDataPacket & {
  id: number;
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
      'SELECT * FROM web_admin_menu_items WHERE version_id = ? AND is_active = 1 ORDER BY parent_id ASC, ordering ASC, id ASC',
      [version.id],
    );
    const byParent = new Map<number | null, FooterItemRow[]>();
    for (const row of rows) {
      const parent = row.parent_id ? Number(row.parent_id) : null;
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent)!.push(row);
    }
    const root = (byParent.get(null) || []).find((row) => row.node_type === 'zone');
    if (!root) return fallbackFooterMenu();
    const groups = (byParent.get(Number(root.id)) || []).filter((row) => row.node_type === 'group').map((group) => ({
      id: String(group.id),
      label: String(group.label),
      links: (byParent.get(Number(group.id)) || []).filter((link) => link.node_type === 'link').map((link) => ({
        id: String(link.id),
        label: String(link.label),
        url: String(link.url_override || link.custom_url || '#'),
        suffixText: String(link.suffix_text || ''),
      })),
    }));
    if (groups.length !== FOOTER_MENU_GROUPS.length || groups.some((group, index) => group.links.length !== FOOTER_MENU_GROUPS[index].links.length)) return fallbackFooterMenu();
    return { groups, meta: { fallback: false, versionNumber: Number(version.version_number), publishedAt: version.published_at || null } };
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
