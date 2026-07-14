export type BottomFooterMenuLink = {
  id: string;
  label: string;
  url: string;
};

export type BottomFooterMenuData = {
  heading: string;
  links: BottomFooterMenuLink[];
  meta?: { fallback?: boolean };
};

const PARTNERS = [
  'Adata', 'Alienware', 'AMD', 'Antec', 'AOC', 'Apple', 'Arozzi', 'ASRock', 'Asus', 'AutoFull',
  'Cololight', 'Cooler Master', 'Corsair', 'Cougar', 'Cudy', 'Dahua', 'Deepcool', 'Dell', 'Einarex',
];

export const fallbackBottomFooterMenu: BottomFooterMenuData = {
  heading: 'Trusted Partners',
  links: PARTNERS.map((label, index) => ({ id: `fallback-partner-${index}`, label, url: '#' })),
  meta: { fallback: true },
};

let cachedBottomFooterMenu: BottomFooterMenuData | null = null;
let cachedBottomFooterMenuExpiresAt = 0;
let bottomFooterMenuRequest: Promise<BottomFooterMenuData> | null = null;

function normalizeBottomFooterMenu(data: unknown): BottomFooterMenuData {
  const source = data as BottomFooterMenuData | null;
  if (!source?.heading || !Array.isArray(source.links) || source.links.length !== PARTNERS.length) return fallbackBottomFooterMenu;
  return { heading: source.heading, links: source.links, meta: source.meta };
}

export function loadBottomFooterMenu() {
  const now = Date.now();
  if (cachedBottomFooterMenu && cachedBottomFooterMenuExpiresAt > now) return Promise.resolve(cachedBottomFooterMenu);
  if (bottomFooterMenuRequest) return bottomFooterMenuRequest;

  bottomFooterMenuRequest = fetch('/api/menu/bottom-footer')
    .then((response) => response.json())
    .then((payload) => {
      if (!payload?.success || !payload.data) throw new Error('Invalid bottom footer menu response');
      const menu = normalizeBottomFooterMenu(payload.data);
      cachedBottomFooterMenu = menu;
      cachedBottomFooterMenuExpiresAt = Date.now() + (menu.meta?.fallback ? 10_000 : 60_000);
      return menu;
    })
    .catch(() => {
      cachedBottomFooterMenu = fallbackBottomFooterMenu;
      cachedBottomFooterMenuExpiresAt = Date.now() + 10_000;
      return fallbackBottomFooterMenu;
    })
    .finally(() => {
      bottomFooterMenuRequest = null;
    });

  return bottomFooterMenuRequest;
}
