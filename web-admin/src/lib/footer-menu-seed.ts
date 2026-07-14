import type { HeaderMenuDraft, HeaderMenuDraftNode } from './admin/menus';

export type FooterMenuGroupDefinition = {
  label: string;
  links: string[];
};

export const FOOTER_MENU_GROUPS: FooterMenuGroupDefinition[] = [
  { label: 'Shop', links: ['Best Sellers', 'PCs', 'Laptops', 'Graphics Cards', 'Monitors', 'Chairs', 'Upgrade Kits', 'Gaming Accessories', 'Components'] },
  { label: 'Support', links: ['Terms & Conditions', 'Credit Card Security', 'Contact Us', 'My Orders', 'FAQs'] },
  { label: 'Info', links: ['About Us', 'Why Buy From Us?', 'Shipping', 'Payment Options', 'Ordering Info', 'Careers (Jobs)', 'EveZone'] },
  { label: 'Build', links: ['AI PC Builder', 'AI Laptop Finder', 'Specials', 'Laptops Deals', 'Brands we Supply'] },
];

function link(label: string, index: number): HeaderMenuDraftNode {
  return {
    id: `footer-link-${index}`,
    nodeType: 'link',
    label,
    customUrl: '#',
    linkMode: 'custom',
    suffixText: label === 'Best Sellers' ? '🔥' : '',
    isActive: true,
    desktopVisible: true,
    mobileVisible: true,
    children: [],
  };
}

export function createFooterMenuDraft(): HeaderMenuDraft {
  let linkIndex = 0;
  return {
    zones: [{
      id: 'footer-menu',
      nodeType: 'zone',
      label: 'Footer Menu',
      isActive: true,
      desktopVisible: true,
      mobileVisible: true,
      children: FOOTER_MENU_GROUPS.map((group, groupIndex) => ({
        id: `footer-group-${groupIndex}`,
        nodeType: 'group',
        label: group.label,
        isActive: true,
        desktopVisible: true,
        mobileVisible: true,
        children: group.links.map((label) => link(label, linkIndex++)),
      })),
    }],
    faves: [],
    topNav: [],
    utilityLinks: [],
    circleStory: [],
    shopByCategory: [],
  };
}
