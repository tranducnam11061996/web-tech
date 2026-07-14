export type FooterMenuLink = {
  id: string;
  label: string;
  url: string;
  suffixText: string;
};

export type FooterMenuGroup = {
  id: string;
  label: string;
  links: FooterMenuLink[];
};

export type FooterMenuData = {
  groups: FooterMenuGroup[];
  meta?: { fallback?: boolean };
};

const GROUPS: Array<[string, string[]]> = [
  ['Shop', ['Best Sellers', 'PCs', 'Laptops', 'Graphics Cards', 'Monitors', 'Chairs', 'Upgrade Kits', 'Gaming Accessories', 'Components']],
  ['Support', ['Terms & Conditions', 'Credit Card Security', 'Contact Us', 'My Orders', 'FAQs']],
  ['Info', ['About Us', 'Why Buy From Us?', 'Shipping', 'Payment Options', 'Ordering Info', 'Careers (Jobs)', 'EveZone']],
  ['Build', ['AI PC Builder', 'AI Laptop Finder', 'Specials', 'Laptops Deals', 'Brands we Supply']],
];

export const fallbackFooterMenu: FooterMenuData = {
  groups: GROUPS.map(([label, labels], groupIndex) => ({
    id: `fallback-group-${groupIndex}`,
    label,
    links: labels.map((linkLabel, linkIndex) => ({
      id: `fallback-${groupIndex}-${linkIndex}`,
      label: linkLabel,
      url: '#',
      suffixText: linkLabel === 'Best Sellers' ? '🔥' : '',
    })),
  })),
  meta: { fallback: true },
};

let cachedFooterMenu: FooterMenuData | null = null;
let cachedFooterMenuExpiresAt = 0;
let footerMenuRequest: Promise<FooterMenuData> | null = null;

function normalizeFooterMenu(data: unknown): FooterMenuData {
  const source = data as { groups?: FooterMenuGroup[]; meta?: FooterMenuData['meta'] } | null;
  if (!Array.isArray(source?.groups) || source.groups.length !== GROUPS.length) return fallbackFooterMenu;
  const valid = source.groups.every((group, index) => Array.isArray(group?.links) && group.links.length === GROUPS[index][1].length);
  if (!valid) return fallbackFooterMenu;
  return { groups: source.groups, meta: source.meta };
}

export function loadFooterMenu() {
  const now = Date.now();
  if (cachedFooterMenu && cachedFooterMenuExpiresAt > now) return Promise.resolve(cachedFooterMenu);
  if (footerMenuRequest) return footerMenuRequest;

  footerMenuRequest = fetch('/api/menu/footer')
    .then((response) => response.json())
    .then((payload) => {
      if (!payload?.success || !payload.data) throw new Error('Invalid footer menu response');
      const menu = normalizeFooterMenu(payload.data);
      cachedFooterMenu = menu;
      cachedFooterMenuExpiresAt = Date.now() + (menu.meta?.fallback ? 10_000 : 60_000);
      return menu;
    })
    .catch(() => {
      cachedFooterMenu = fallbackFooterMenu;
      cachedFooterMenuExpiresAt = Date.now() + 10_000;
      return fallbackFooterMenu;
    })
    .finally(() => {
      footerMenuRequest = null;
    });

  return footerMenuRequest;
}
