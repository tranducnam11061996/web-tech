export type HeaderMenuSeedNode = {
  label: string;
  nodeType: 'zone' | 'group' | 'link';
  iconKey?: string;
  suffixText?: string;
  badgeText?: string;
  backgroundColor?: string;
  imageUrl?: string;
  subText?: string;
  linkMode?: 'custom' | 'entity' | 'system';
  entityType?: 'product-category' | 'article-category';
  entityId?: number;
  customUrl?: string;
  urlOverride?: string;
  isActive?: boolean;
  desktopVisible?: boolean;
  mobileVisible?: boolean;
  children?: HeaderMenuSeedNode[];
};

export type HeaderMenuSeed = {
  zones: HeaderMenuSeedNode[];
  faves: HeaderMenuSeedNode[];
  topNav: HeaderMenuSeedNode[];
  utilityLinks: HeaderMenuSeedNode[];
  circleStory: HeaderMenuSeedNode[];
  shopByCategory: HeaderMenuSeedNode[];
};

function link(label: string, customUrl = '#', extra: Partial<HeaderMenuSeedNode> = {}): HeaderMenuSeedNode {
  return {
    nodeType: 'link',
    label,
    linkMode: 'custom',
    customUrl,
    ...extra,
  };
}

function shopCategory(label: string, extra: Partial<HeaderMenuSeedNode> = {}): HeaderMenuSeedNode {
  return link(label, '#', {
    backgroundColor: '16161a',
    imageUrl: '',
    ...extra,
  });
}

function group(label: string, items: HeaderMenuSeedNode[]): HeaderMenuSeedNode {
  return {
    nodeType: 'group',
    label,
    children: items,
  };
}

function zone(label: string, iconKey: string, children: HeaderMenuSeedNode[], extra: Partial<HeaderMenuSeedNode> = {}): HeaderMenuSeedNode {
  return {
    nodeType: 'zone',
    label,
    iconKey,
    children,
    ...extra,
  };
}

export const HEADER_MENU_ICON_PATHS: Record<string, string> = {
  laptop: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  desktop: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  star: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z',
  case: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  chair: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  gpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  headset: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  keyboard: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  memory: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  cpu: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  storage: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  more: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 110-2 1 1 0 012 0zm7 0a1 1 0 110-2 1 1 0 012 0zm7 0a1 1 0 110-2 1 1 0 012 0z',
};

export const HEADER_MENU_SEED: HeaderMenuSeed = {
  zones: [
    zone('Laptops & NoteBooks', 'laptop', [
      group('Laptops On Special', [
        link('Laptop Best Sellers', '#', { suffixText: '🔥' }),
        link('Gaming laptops on Special'),
        link('AMD Laptops on Special'),
        link('Intel Laptops on Special'),
        link('AI Laptop Finder', '#', { suffixText: '🤖' }),
        link('All Laptops on Special'),
      ]),
      group('Gaming Laptops', [
        link('GeForce Gaming Laptops'),
        link('Intel Gaming Laptops'),
        link('AMD Gaming Laptops'),
        link('Gaming Laptops Under R20k'),
        link('Gaming Laptops Above R20k'),
      ]),
      group('Intel Laptops', [
        link('Intel Core i3 Laptops'),
        link('Intel Core i5 Laptops'),
        link('Intel Core i7 Laptops'),
      ]),
      group('Laptops by Brand', [
        link('ASUS Laptops'),
        link('MSI Laptops'),
        link('Lenovo Laptops'),
        link('HP Laptops'),
        link('Dell Laptops'),
      ]),
    ]),
    zone('Desktop & Gaming PCs', 'desktop', [
      group('Intel PCs', [
        link('Intel Core Ultra 5 PCs'),
        link('Intel Core Ultra 7 PCs'),
        link('Intel Core Ultra 9 PCs'),
        link('All Intel PCs'),
      ]),
      group('AMD PCs', [
        link('AMD Ryzen 5 PCs'),
        link('AMD Ryzen 7 PCs'),
        link('AMD Ryzen 9 PCs'),
        link('All AMD Ryzen PCs'),
      ]),
      group('Nvidia Gaming PCs', [
        link('RTX 3050 Gaming PCs'),
        link('RTX 5060 Gaming PCs'),
        link('RTX 5060 Ti Gaming PCs'),
        link('RTX 5070 Gaming PCs'),
        link('RTX 5070 Ti Gaming PCs'),
        link('RTX 5080 Gaming PCs'),
        link('RTX 5090 Gaming PCs'),
        link('All NVIDIA Gaming PCs'),
      ]),
      group('AMD Radeon Gaming PCs', [
        link('RX 9060 Gaming PCs'),
        link('RX 9060 XT Gaming PCs'),
        link('RX 9070 XT Gaming PCs'),
        link('AMD Radeon Gaming PCs'),
      ]),
      group('Other PCs', [
        link('PC Builder', '#', { suffixText: '🛠️' }),
        link('PC Best Sellers', '#', { suffixText: '🔥' }),
        link('Pre Built PCs'),
        link('All-in-One PCs'),
        link('iMacs'),
        link('Mini PCs'),
        link('AI PCs'),
        link('Home & Office PCs'),
        link('Budget Gaming PCs'),
        link('Best Gaming PC Deals'),
        link('DDR5 Gaming PCs'),
        link('PCs Under R20k'),
        link('PCs Above R20k'),
      ]),
      group('Workstation PCs', [
        link('RTX A400 Workstation PCs'),
        link('RTX A1000 Workstation PCs'),
        link('RTX 4000 Workstation PCs'),
        link('RTX 5000 Workstation PCs'),
        link('RTX 6000 Workstation PCs'),
        link('GT 710 Workstation PCs'),
        link('All Workstation PCs'),
      ]),
      group('FPS Gaming PCs', [
        link("ARC Raiders Gaming PC's"),
        link("Battlefield 6 Gaming PC's"),
        link("Call of Duty: Black Ops 7 Gaming PC's"),
        link("Call of Duty: Warzone 2.0 Gaming PC's"),
        link("Clair Obscur: Expedition 33 Gaming PC's"),
        link("Counter Strike 2 Gaming PC's"),
        link("Cyberpunk 2077 Gaming PC's"),
        link("Fortnite Gaming PC's"),
        link("GTA V Gaming PC's"),
        link("Minecraft Gaming PC's"),
        link("Overwatch 2 Gaming PC's"),
        link("Gaming PC's By Game"),
      ]),
      group('Intel Arc Gaming PCs', [
        link('Intel ARC A380 Gaming PCs'),
        link('Intel ARC B580 Gaming PCs'),
        link('All Intel ARC Gaming PCs'),
      ]),
    ]),
    zone('Best Sellers', 'star', [
      group('Top Components', [link('Top Selling CPUs'), link('Top Selling GPUs'), link('Top Selling Motherboards')]),
      group('Top Peripherals', [link('Top Selling Mice'), link('Top Selling Keyboards'), link('Top Selling Headsets')]),
      group('Top Systems', [link('Top Selling Laptops'), link('Top Selling Desktops')]),
      group('Offers', [link('Clearance Sale'), link('Flash Deals')]),
    ], { suffixText: '🔥' }),
    zone('Collectables', 'gift', [
      group('Figures', [link('Anime Figures'), link('Gaming Figures'), link('Pop Vinyls')]),
      group('Merchandise', [link('T-Shirts'), link('Hoodies'), link('Caps')]),
      group('Posters', [link('Gaming Posters'), link('Movie Posters')]),
      group('Other', [link('Mugs'), link('Keychains')]),
    ]),
    zone('Computer Cases', 'case', [
      group('Case Sizes', [link('Full Tower'), link('Mid Tower'), link('Mini ITX'), link('Micro ATX')]),
      group('Brands', [link('Corsair'), link('NZXT'), link('Lian Li'), link('Phanteks'), link('Cooler Master')]),
      group('Features', [link('Tempered Glass'), link('RGB Lighting'), link('Silent Cases')]),
      group('Accessories', [link('Case Fans'), link('Lighting Strips'), link('Vertical GPU Mounts')]),
    ]),
    zone('Chairs & Furniture', 'chair', [
      group('Gaming Chairs', [link('DXRacer'), link('Secretlab'), link('Corsair'), link('Cougar')]),
      group('Office Chairs', [link('Ergonomic Chairs'), link('Mesh Chairs'), link('Executive Chairs')]),
      group('Gaming Desks', [link('RGB Desks'), link('Standing Desks'), link('L-Shaped Desks')]),
      group('Accessories', [link('Floor Mats'), link('Footrests'), link('Monitor Arms')]),
    ]),
    zone('Graphics Cards', 'gpu', [
      group('Nvidia GeForce', [link('RTX 4090'), link('RTX 4080'), link('RTX 4070'), link('RTX 4060'), link('RTX 3060')]),
      group('AMD Radeon', [link('RX 7900 XTX'), link('RX 7900 XT'), link('RX 7800 XT'), link('RX 7700 XT'), link('RX 7600')]),
      group('Brands', [link('ASUS'), link('MSI'), link('Gigabyte'), link('Zotac'), link('Sapphire')]),
      group('Other', [link('Workstation GPUs'), link('External GPUs'), link('Water Blocks')]),
    ]),
    zone('Headsets', 'headset', [
      group('Gaming Headsets', [link('Wireless Headsets'), link('Wired Headsets'), link('Surround Sound')]),
      group('Brands', [link('HyperX'), link('SteelSeries'), link('Razer'), link('Corsair'), link('Logitech')]),
      group('Audiophile', [link('Studio Headphones'), link('DACs & Amps'), link('Microphones')]),
      group('Accessories', [link('Ear Cushions'), link('Headset Stands'), link('Cables')]),
    ]),
    zone('Keyboards', 'keyboard', [
      group('Mechanical Keyboards', [link('Cherry MX Red'), link('Cherry MX Blue'), link('Cherry MX Brown'), link('Custom Switches')]),
      group('Form Factors', [link('Full Size (100%)'), link('TKL (80%)'), link('Compact (60%)'), link('Macropads')]),
      group('Brands', [link('Keychron'), link('Razer'), link('Corsair'), link('Ducky'), link('Logitech')]),
      group('Accessories', [link('Keycaps'), link('Wrist Rests'), link('Switches'), link('Lube Kits')]),
    ]),
    zone('Memory (RAM)', 'memory', [
      group('Desktop Memory', [link('DDR5 RAM'), link('DDR4 RAM'), link('DDR3 RAM')]),
      group('Laptop Memory', [link('SO-DIMM DDR5'), link('SO-DIMM DDR4')]),
      group('Capacities', [link('64GB Kits'), link('32GB Kits'), link('16GB Kits'), link('8GB Kits')]),
      group('Brands', [link('Corsair'), link('G.Skill'), link('Kingston'), link('Crucial'), link('TeamGroup')]),
    ]),
    zone('Monitors', 'desktop', [
      group('Resolutions', [link('4K Monitors'), link('1440p Monitors'), link('1080p Monitors'), link('Ultrawide Monitors')]),
      group('Refresh Rates', [link('360Hz Monitors'), link('240Hz Monitors'), link('144Hz Monitors'), link('60Hz Monitors')]),
      group('Panel Types', [link('OLED'), link('IPS'), link('VA'), link('TN')]),
      group('Brands', [link('ASUS'), link('Alienware'), link('LG'), link('Samsung'), link('AOC')]),
    ]),
    zone('Motherboards', 'keyboard', [
      group('Intel Motherboards', [link('Z790 Motherboards'), link('B760 Motherboards'), link('Z690 Motherboards'), link('B660 Motherboards')]),
      group('AMD Motherboards', [link('X670 Motherboards'), link('B650 Motherboards'), link('X570 Motherboards'), link('B550 Motherboards')]),
      group('Form Factors', [link('ATX'), link('Micro ATX'), link('Mini ITX'), link('E-ATX')]),
      group('Brands', [link('ASUS'), link('MSI'), link('Gigabyte'), link('ASRock')]),
    ]),
    zone('Mouse', 'more', [
      group('Gaming Mice', [link('Wireless Mice'), link('Wired Mice'), link('MMO Mice'), link('Ultralight Mice')]),
      group('Office Mice', [link('Ergonomic Mice'), link('Trackballs'), link('Mobile Mice')]),
      group('Brands', [link('Logitech'), link('Razer'), link('SteelSeries'), link('Glorious'), link('Pulsar')]),
      group('Accessories', [link('Mousepads'), link('Mouse Bungees'), link('Grip Tapes'), link('Skates')]),
    ]),
    zone('Power Supply', 'cpu', [
      group('Wattage', [link('1000W+ PSUs'), link('850W PSUs'), link('750W PSUs'), link('650W PSUs'), link('Under 600W PSUs')]),
      group('Efficiency', [link('80+ Titanium'), link('80+ Platinum'), link('80+ Gold'), link('80+ Bronze')]),
      group('Form Factor', [link('ATX PSUs'), link('SFX PSUs'), link('TFX PSUs')]),
      group('Brands', [link('Corsair'), link('SeaSonic'), link('EVGA'), link('Be Quiet!'), link('FSP')]),
    ]),
    zone('Processors / Coolers', 'cpu', [
      group('Intel CPUs', [link('Core i9 Processors'), link('Core i7 Processors'), link('Core i5 Processors'), link('Core i3 Processors')]),
      group('AMD CPUs', [link('Ryzen 9 Processors'), link('Ryzen 7 Processors'), link('Ryzen 5 Processors'), link('Threadripper')]),
      group('Air Coolers', [link('Tower Coolers'), link('Low Profile Coolers'), link('Thermal Paste')]),
      group('Liquid Coolers', [link('360mm AIOs'), link('240mm AIOs'), link('Custom Loop Parts')]),
    ]),
    zone('SSDs & Storage', 'storage', [
      group('NVMe SSDs', [link('Gen 5 NVMe SSDs'), link('Gen 4 NVMe SSDs'), link('Gen 3 NVMe SSDs')]),
      group('SATA SSDs', [link('2.5" SATA SSDs'), link('M.2 SATA SSDs')]),
      group('Hard Drives', [link('Desktop HDDs'), link('NAS HDDs'), link('Enterprise HDDs')]),
      group('External Storage', [link('External SSDs'), link('External HDDs'), link('USB Flash Drives')]),
    ]),
    zone('Upgrade Kits', 'settings', [
      group('Intel Kits', [link('i9 Upgrade Kits'), link('i7 Upgrade Kits'), link('i5 Upgrade Kits')]),
      group('AMD Kits', [link('Ryzen 9 Upgrade Kits'), link('Ryzen 7 Upgrade Kits'), link('Ryzen 5 Upgrade Kits')]),
      group('Combo Deals', [link('CPU + Motherboard'), link('CPU + RAM'), link('Mobo + RAM')]),
      group('Barebones', [link('Intel NUCs'), link('ASUS Mini PCs'), link('DeskMini')]),
    ]),
    zone('More', 'more', [
      group('Software', [link('Windows OS'), link('Antivirus'), link('Office Applications')]),
      group('Networking', [link('Routers'), link('Switches'), link('Network Cards'), link('Cables')]),
      group('Cables & Adapters', [link('DisplayPort Cables'), link('HDMI Cables'), link('USB Cables')]),
      group('Services', [link('PC Assembly'), link('Laptop Repair'), link('Data Recovery')]),
    ]),
  ],
  faves: [
    link('Best Sellers', '#', { iconKey: 'star', suffixText: '🔥' }),
    link('PC Builder', '#', { iconKey: 'settings' }),
    link('Flash Deals', '#', { iconKey: 'star', badgeText: 'NEW' }),
  ],
  topNav: [
    link('Components'),
    link('Laptops Special', '#', { suffixText: '💻' }),
    link('Pre Built PCs'),
    link('Best Sellers', '#', { suffixText: '🔥' }),
    link('Flash Deals', '#', { suffixText: '⏳', badgeText: 'NEW' }),
    link('Winter Special', '#', { suffixText: '⛄' }),
    link('AI PC Builder', '#', { suffixText: '✨' }),
    link('Upgrade Kits'),
    link('New Arrivals'),
    link('Specials', '#', { suffixText: '⚡' }),
    link('Clearance', '#', { suffixText: '🏷️' }),
    link('Elegoo', '#', { suffixText: '⚙️', badgeText: 'NEW' }),
  ],
  utilityLinks: [
    link('Account', '#', { iconKey: 'more', linkMode: 'system', customUrl: 'account' }),
    link('Cart', '/gio-hang', { iconKey: 'case', linkMode: 'system', customUrl: 'cart' }),
    link('Favorites', '#', { iconKey: 'star', linkMode: 'system', customUrl: 'favorites' }),
    link('Assistant', '#', { iconKey: 'cpu', linkMode: 'system', customUrl: 'assistant' }),
  ],
  circleStory: [],
  shopByCategory: [
    shopCategory('ASUS', { badgeText: 'NEW' }),
    shopCategory('MacBook', { iconKey: 'laptop' }),
    shopCategory('Gaming Setups', { iconKey: 'desktop' }),
    shopCategory('Mini PCs', { iconKey: 'case' }),
    shopCategory('Graphics Cards', { iconKey: 'gpu' }),
    shopCategory('Collectables', { iconKey: 'gift' }),
    shopCategory("SSD's", { iconKey: 'storage' }),
    shopCategory('PC Monitors', { iconKey: 'desktop' }),
    shopCategory('Handhelds', { iconKey: 'more' }),
  ],
};
