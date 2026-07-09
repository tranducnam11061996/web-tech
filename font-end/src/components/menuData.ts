export type MenuCategory = {
  id: string;
  name: string;
  label?: string;
  icon: string;
  iconKey?: string;
  suffix?: string;
  suffixText?: string;
  badgeText?: string;
  backgroundColor?: string;
  imageUrl?: string;
  subText?: string;
  url?: string;
  cols: Array<{
    id?: string;
    title: string;
    label?: string;
    items: MenuLinkItem[];
  }>;
};

export type MenuLinkObject = {
  id?: string;
  label?: string;
  name?: string;
  url?: string;
  suffix?: string;
  suffixText?: string;
  badgeText?: string;
  icon?: string;
  iconKey?: string;
  backgroundColor?: string;
  imageUrl?: string;
  subText?: string;
};

export type MenuLinkItem = string | MenuLinkObject;

export type HeaderMenuLabels = {
  zones: string;
  faves: string;
};

export type HeaderMenuData = {
  zones: MenuCategory[];
  faves: MenuLinkObject[];
  topNav: MenuLinkObject[];
  utilityLinks: MenuLinkObject[];
  circleStory: MenuLinkObject[];
  shopByCategory: MenuLinkObject[];
  labels: HeaderMenuLabels;
  meta?: Record<string, unknown>;
};

export const menuCategories: MenuCategory[] = [
  {
    id: "laptops",
    name: "Laptops & NoteBooks",
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    cols: [
      { title: "Laptops On Special", items: ["Laptop Best Sellers \uD83D\uDD25", "Gaming laptops on Special", "AMD Laptops on Special", "Intel Laptops on Special", "AI Laptop Finder \uD83E\uDD16", "All Laptops on Special"] },
      { title: "Gaming Laptops", items: ["GeForce Gaming Laptops", "Intel Gaming Laptops", "AMD Gaming Laptops", "Gaming Laptops Under R20k", "Gaming Laptops Above R20k"] },
      { title: "Intel Laptops", items: ["Intel Core i3 Laptops", "Intel Core i5 Laptops", "Intel Core i7 Laptops"] },
      { title: "Laptops by Brand", items: ["ASUS Laptops", "MSI Laptops", "Lenovo Laptops", "HP Laptops", "Dell Laptops"] },
    ],
  },
  {
    id: "desktops",
    name: "Desktop & Gaming PCs",
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    cols: [
      { title: "Gaming PCs", items: ["Intel Core i5 Gaming PCs", "Intel Core i7 Gaming PCs", "Intel Core i9 Gaming PCs", "AMD Ryzen 5 Gaming PCs", "AMD Ryzen 7 Gaming PCs", "AMD Ryzen 9 Gaming PCs"] },
      { title: "Pre-Built Systems", items: ["Budget Gaming PCs", "High-End Gaming PCs", "Streaming PCs", "Workstations"] },
      { title: "Upgrades", items: ["PC Upgrade Kits", "Memory Upgrades", "Storage Upgrades"] },
      { title: "Accessories", items: ["Monitors", "Keyboards", "Mice"] },
    ],
  },
  {
    id: "bestsellers",
    name: "Best Sellers",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    suffix: "\uD83D\uDD25",
    cols: [
      { title: "Top Components", items: ["Top Selling CPUs", "Top Selling GPUs", "Top Selling Motherboards"] },
      { title: "Top Peripherals", items: ["Top Selling Mice", "Top Selling Keyboards", "Top Selling Headsets"] },
      { title: "Top Systems", items: ["Top Selling Laptops", "Top Selling Desktops"] },
      { title: "Offers", items: ["Clearance Sale", "Flash Deals"] },
    ],
  },
  {
    id: "collectables",
    name: "Collectables",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    cols: [
      { title: "Figures", items: ["Anime Figures", "Gaming Figures", "Pop Vinyls"] },
      { title: "Merchandise", items: ["T-Shirts", "Hoodies", "Caps"] },
      { title: "Posters", items: ["Gaming Posters", "Movie Posters"] },
      { title: "Other", items: ["Mugs", "Keychains"] },
    ],
  },
  {
    id: "cases",
    name: "Computer Cases",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    cols: [
      { title: "Case Sizes", items: ["Full Tower", "Mid Tower", "Mini ITX", "Micro ATX"] },
      { title: "Brands", items: ["Corsair", "NZXT", "Lian Li", "Phanteks", "Cooler Master"] },
      { title: "Features", items: ["Tempered Glass", "RGB Lighting", "Silent Cases"] },
      { title: "Accessories", items: ["Case Fans", "Lighting Strips", "Vertical GPU Mounts"] },
    ],
  },
  {
    id: "chairs",
    name: "Chairs & Furniture",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    cols: [
      { title: "Gaming Chairs", items: ["DXRacer", "Secretlab", "Corsair", "Cougar"] },
      { title: "Office Chairs", items: ["Ergonomic Chairs", "Mesh Chairs", "Executive Chairs"] },
      { title: "Gaming Desks", items: ["RGB Desks", "Standing Desks", "L-Shaped Desks"] },
      { title: "Accessories", items: ["Floor Mats", "Footrests", "Monitor Arms"] },
    ],
  },
  {
    id: "graphics",
    name: "Graphics Cards",
    icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
    cols: [
      { title: "Nvidia GeForce", items: ["RTX 4090", "RTX 4080", "RTX 4070", "RTX 4060", "RTX 3060"] },
      { title: "AMD Radeon", items: ["RX 7900 XTX", "RX 7900 XT", "RX 7800 XT", "RX 7700 XT", "RX 7600"] },
      { title: "Brands", items: ["ASUS", "MSI", "Gigabyte", "Zotac", "Sapphire"] },
      { title: "Other", items: ["Workstation GPUs", "External GPUs", "Water Blocks"] },
    ],
  },
  {
    id: "headsets",
    name: "Headsets",
    icon: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
    cols: [
      { title: "Gaming Headsets", items: ["Wireless Headsets", "Wired Headsets", "Surround Sound"] },
      { title: "Brands", items: ["HyperX", "SteelSeries", "Razer", "Corsair", "Logitech"] },
      { title: "Audiophile", items: ["Studio Headphones", "DACs & Amps", "Microphones"] },
      { title: "Accessories", items: ["Ear Cushions", "Headset Stands", "Cables"] },
    ],
  },
  {
    id: "keyboards",
    name: "Keyboards",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
    cols: [
      { title: "Mechanical Keyboards", items: ["Cherry MX Red", "Cherry MX Blue", "Cherry MX Brown", "Custom Switches"] },
      { title: "Form Factors", items: ["Full Size (100%)", "TKL (80%)", "Compact (60%)", "Macropads"] },
      { title: "Brands", items: ["Keychron", "Razer", "Corsair", "Ducky", "Logitech"] },
      { title: "Accessories", items: ["Keycaps", "Wrist Rests", "Switches", "Lube Kits"] },
    ],
  },
  {
    id: "memory",
    name: "Memory (RAM)",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    cols: [
      { title: "Desktop Memory", items: ["DDR5 RAM", "DDR4 RAM", "DDR3 RAM"] },
      { title: "Laptop Memory", items: ["SO-DIMM DDR5", "SO-DIMM DDR4"] },
      { title: "Capacities", items: ["64GB Kits", "32GB Kits", "16GB Kits", "8GB Kits"] },
      { title: "Brands", items: ["Corsair", "G.Skill", "Kingston", "Crucial", "TeamGroup"] },
    ],
  },
  {
    id: "monitors",
    name: "Monitors",
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    cols: [
      { title: "Resolutions", items: ["4K Monitors", "1440p Monitors", "1080p Monitors", "Ultrawide Monitors"] },
      { title: "Refresh Rates", items: ["360Hz Monitors", "240Hz Monitors", "144Hz Monitors", "60Hz Monitors"] },
      { title: "Panel Types", items: ["OLED", "IPS", "VA", "TN"] },
      { title: "Brands", items: ["ASUS", "Alienware", "LG", "Samsung", "AOC"] },
    ],
  },
  {
    id: "motherboards",
    name: "Motherboards",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
    cols: [
      { title: "Intel Motherboards", items: ["Z790 Motherboards", "B760 Motherboards", "Z690 Motherboards", "B660 Motherboards"] },
      { title: "AMD Motherboards", items: ["X670 Motherboards", "B650 Motherboards", "X570 Motherboards", "B550 Motherboards"] },
      { title: "Form Factors", items: ["ATX", "Micro ATX", "Mini ITX", "E-ATX"] },
      { title: "Brands", items: ["ASUS", "MSI", "Gigabyte", "ASRock"] },
    ],
  },
  {
    id: "mouse",
    name: "Mouse",
    icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122",
    cols: [
      { title: "Gaming Mice", items: ["Wireless Mice", "Wired Mice", "MMO Mice", "Ultralight Mice"] },
      { title: "Office Mice", items: ["Ergonomic Mice", "Trackballs", "Mobile Mice"] },
      { title: "Brands", items: ["Logitech", "Razer", "SteelSeries", "Glorious", "Pulsar"] },
      { title: "Accessories", items: ["Mousepads", "Mouse Bungees", "Grip Tapes", "Skates"] },
    ],
  },
  {
    id: "powersupply",
    name: "Power Supply",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    cols: [
      { title: "Wattage", items: ["1000W+ PSUs", "850W PSUs", "750W PSUs", "650W PSUs", "Under 600W PSUs"] },
      { title: "Efficiency", items: ["80+ Titanium", "80+ Platinum", "80+ Gold", "80+ Bronze"] },
      { title: "Form Factor", items: ["ATX PSUs", "SFX PSUs", "TFX PSUs"] },
      { title: "Brands", items: ["Corsair", "SeaSonic", "EVGA", "Be Quiet!", "FSP"] },
    ],
  },
  {
    id: "processors",
    name: "Processors / Coolers",
    icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
    cols: [
      { title: "Intel CPUs", items: ["Core i9 Processors", "Core i7 Processors", "Core i5 Processors", "Core i3 Processors"] },
      { title: "AMD CPUs", items: ["Ryzen 9 Processors", "Ryzen 7 Processors", "Ryzen 5 Processors", "Threadripper"] },
      { title: "Air Coolers", items: ["Tower Coolers", "Low Profile Coolers", "Thermal Paste"] },
      { title: "Liquid Coolers", items: ["360mm AIOs", "240mm AIOs", "Custom Loop Parts"] },
    ],
  },
  {
    id: "storage",
    name: "SSDs & Storage",
    icon: "M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2",
    cols: [
      { title: "NVMe SSDs", items: ["Gen 5 NVMe SSDs", "Gen 4 NVMe SSDs", "Gen 3 NVMe SSDs"] },
      { title: "SATA SSDs", items: ["2.5\" SATA SSDs", "M.2 SATA SSDs"] },
      { title: "Hard Drives", items: ["Desktop HDDs", "NAS HDDs", "Enterprise HDDs"] },
      { title: "External Storage", items: ["External SSDs", "External HDDs", "USB Flash Drives"] },
    ],
  },
  {
    id: "upgradekits",
    name: "Upgrade Kits",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    cols: [
      { title: "Intel Kits", items: ["i9 Upgrade Kits", "i7 Upgrade Kits", "i5 Upgrade Kits"] },
      { title: "AMD Kits", items: ["Ryzen 9 Upgrade Kits", "Ryzen 7 Upgrade Kits", "Ryzen 5 Upgrade Kits"] },
      { title: "Combo Deals", items: ["CPU + Motherboard", "CPU + RAM", "Mobo + RAM"] },
      { title: "Barebones", items: ["Intel NUCs", "ASUS Mini PCs", "DeskMini"] },
    ],
  },
  {
    id: "more",
    name: "More",
    icon: "M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z",
    cols: [
      { title: "Software", items: ["Windows OS", "Antivirus", "Office Applications"] },
      { title: "Networking", items: ["Routers", "Switches", "Network Cards", "Cables"] },
      { title: "Cables & Adapters", items: ["DisplayPort Cables", "HDMI Cables", "USB Cables"] },
      { title: "Services", items: ["PC Assembly", "Laptop Repair", "Data Recovery"] },
    ],
  },
];

export const fallbackHeaderMenu: HeaderMenuData = {
  labels: {
    zones: 'Danh M\u1ee5c',
    faves: 'N\u1ed5i b\u1eadt',
  },
  zones: menuCategories,
  faves: [
    { id: 'fav-best-sellers', label: 'Best Sellers', url: '#', suffixText: '\uD83D\uDD25' },
    { id: 'fav-builder', label: 'PC Builder', url: '#' },
    { id: 'fav-flash', label: 'Flash Deals', url: '#', badgeText: 'NEW' },
  ],
  topNav: [
    { id: 'components', label: 'Components', url: '#' },
    { id: 'laptops-special', label: 'Laptops Special', url: '#', suffixText: '\uD83D\uDCBB' },
    { id: 'pre-built', label: 'Pre Built PCs', url: '#' },
    { id: 'best-sellers', label: 'Best Sellers', url: '#', suffixText: '\uD83D\uDD25' },
    { id: 'flash-deals', label: 'Flash Deals', url: '#', suffixText: '\u23F3', badgeText: 'NEW' },
    { id: 'winter-special', label: 'Winter Special', url: '#', suffixText: '\u26C4' },
    { id: 'ai-builder', label: 'AI PC Builder', url: '#', suffixText: '\u2728' },
    { id: 'upgrade-kits', label: 'Upgrade Kits', url: '#' },
    { id: 'new-arrivals', label: 'New Arrivals', url: '#' },
    { id: 'specials', label: 'Specials', url: '#', suffixText: '\u26A1' },
    { id: 'clearance', label: 'Clearance', url: '#', suffixText: '\uD83C\uDFF7\uFE0F' },
    { id: 'elegoo', label: 'Elegoo', url: '#', suffixText: '\u2699\uFE0F', badgeText: 'NEW' },
  ],
  utilityLinks: [
    { id: 'account', label: 'Account', url: '#' },
    { id: 'cart', label: 'Cart', url: '/gio-hang' },
    { id: 'favorites', label: 'Favorites', url: '#' },
    { id: 'assistant', label: 'Assistant', url: '#' },
  ],
  circleStory: [],
  shopByCategory: [],
};
