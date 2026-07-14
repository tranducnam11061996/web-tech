import type { HeaderMenuDraft, HeaderMenuDraftNode } from './admin/menus';

export const BOTTOM_FOOTER_MENU_HEADING = 'Trusted Partners';

export const BOTTOM_FOOTER_MENU_LINKS = [
  'Adata',
  'Alienware',
  'AMD',
  'Antec',
  'AOC',
  'Apple',
  'Arozzi',
  'ASRock',
  'Asus',
  'AutoFull',
  'Cololight',
  'Cooler Master',
  'Corsair',
  'Cougar',
  'Cudy',
  'Dahua',
  'Deepcool',
  'Dell',
  'Einarex',
] as const;

function link(label: string, index: number): HeaderMenuDraftNode {
  return {
    id: `bottom-footer-link-${index}`,
    nodeType: 'link',
    label,
    customUrl: '#',
    linkMode: 'custom',
    suffixText: '',
    isActive: true,
    desktopVisible: true,
    mobileVisible: true,
    children: [],
  };
}

export function createBottomFooterMenuDraft(): HeaderMenuDraft {
  return {
    zones: [{
      id: 'bottom-footer-menu',
      nodeType: 'zone',
      label: 'Bottom Footer',
      isActive: true,
      desktopVisible: true,
      mobileVisible: true,
      children: [{
        id: 'bottom-footer-group',
        nodeType: 'group',
        label: BOTTOM_FOOTER_MENU_HEADING,
        isActive: true,
        desktopVisible: true,
        mobileVisible: true,
        children: BOTTOM_FOOTER_MENU_LINKS.map(link),
      }],
    }],
    faves: [],
    topNav: [],
    utilityLinks: [],
    circleStory: [],
    shopByCategory: [],
  };
}
