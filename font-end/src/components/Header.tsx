"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  ChevronRight,
  Heart,
  Menu as MenuGlyph,
  Moon,
  MoreVertical,
  Search,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react';
import { useCartSummary } from '@/lib/cart';
import CustomerAccountMenu from './CustomerAccountMenu';
import { cleanMenuText } from '@/lib/menuUtils';
import { fallbackHeaderMenu, type HeaderMenuData, type MenuCategory, type MenuLinkItem } from './menuData';

const API_URL = '';
const HEADER_MENU_FALLBACK_CACHE_MS = 10 * 1000;
const HEADER_MENU_CLIENT_CACHE_MS = 60 * 1000;
const SUBMENU_TOP_ZONE_PX = 64;
const SUBMENU_HIDE_DISTANCE_PX = 72;
const SUBMENU_SHOW_DISTANCE_PX = 48;
const SUBMENU_DELTA_DEADBAND_PX = 3;
const SUBMENU_TRANSITION_COOLDOWN_MS = 450;
const SUBMENU_SCROLL_IDLE_RESET_MS = 180;
let cachedHeaderMenu: HeaderMenuData | null = null;
let cachedHeaderMenuExpiresAt = 0;
let headerMenuRequest: Promise<HeaderMenuData> | null = null;

const HEADER_MENU_ICON_PATHS: Record<string, string> = {
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

const TEXT_REPAIRS: Record<string, string> = {
  'Danh Má»¥c': 'Danh Mục',
  'Ná»•i báº­t': 'Nổi bật',
  'ðŸ”¥': '🔥',
  'Ã°Å¸â€Â¥': '🔥',
  'ðŸ’»': '💻',
  'Ã°Å¸â€™Â»': '💻',
  'ðŸ¤–': '🤖',
  'Ã°Å¸Â¤â€“': '🤖',
  'ðŸ› ï¸': '🛠️',
  'ðŸ·ï¸': '🏷️',
  'Ã°Å¸ÂÂ·Ã¯Â¸Â': '🏷️',
  'â³': '⏳',
  'Ã¢ÂÂ³': '⏳',
  'â›„': '⛄',
  'Ã¢â€ºâ€ž': '⛄',
  'âœ¨': '✨',
  'Ã¢Å“Â¨': '✨',
  'âš¡': '⚡',
  'Ã¢Å¡Â¡': '⚡',
  'âš™ï¸': '⚙️',
  'Ã¢Å¡â„¢Ã¯Â¸Â': '⚙️',
  'â˜…': '★',
  'Ã¢Ëœâ€¦': '★',
  'â˜†': '☆',
  'Ã¢Ëœâ€ ': '☆',
  'â€º': '›',
  'Ã¢â‚¬Âº': '›',
};

const FINAL_TEXT_REPAIRS: Record<string, string> = {
  'Danh Má»¥c': 'Danh Mục',
  'Ná»•i báº­t': 'Nổi bật',
  'ðŸ”¥': '🔥',
  'ðŸ’»': '💻',
  'ðŸ¤–': '🤖',
  'ðŸ› ï¸': '🛠️',
  'ðŸ·ï¸': '🏷️',
  'â³': '⏳',
  'â›„': '⛄',
  'âœ¨': '✨',
  'âš¡': '⚡',
  'âš™ï¸': '⚙️',
  'â˜…': '★',
  'â˜†': '☆',
  'â€º': '›',
};

function cleanHeaderText(value: unknown) {
  return cleanMenuText(value);
}

function normalizeHeaderMenuPayload(data: any): HeaderMenuData {
  return {
    zones: data?.zones?.length ? data.zones : fallbackHeaderMenu.zones,
    faves: data?.faves || [],
    topNav: data?.topNav || [],
    utilityLinks: data?.utilityLinks || [],
    circleStory: [],
    shopByCategory: [],
    labels: {
      zones: cleanHeaderText(data?.labels?.zones || data?.settings?.zonesLabel || fallbackHeaderMenu.labels.zones),
      faves: cleanHeaderText(data?.labels?.faves || data?.settings?.favesLabel || fallbackHeaderMenu.labels.faves),
    },
    meta: data?.meta,
  };
}

function loadHeaderMenu() {
  const now = Date.now();
  if (cachedHeaderMenu && cachedHeaderMenuExpiresAt > now) return Promise.resolve(cachedHeaderMenu);
  if (headerMenuRequest) return headerMenuRequest;

  headerMenuRequest = fetch(`${API_URL}/api/menu/header`)
    .then((response) => response.json())
    .then((payload) => {
      if (!payload?.success || !payload.data) throw new Error('Invalid header menu response');
      const nextMenu = normalizeHeaderMenuPayload(payload.data);
      cachedHeaderMenu = nextMenu;
      cachedHeaderMenuExpiresAt = Date.now() + (nextMenu.meta?.fallback ? HEADER_MENU_FALLBACK_CACHE_MS : HEADER_MENU_CLIENT_CACHE_MS);
      return nextMenu;
    })
    .catch(() => {
      cachedHeaderMenu = fallbackHeaderMenu;
      cachedHeaderMenuExpiresAt = Date.now() + HEADER_MENU_FALLBACK_CACHE_MS;
      return fallbackHeaderMenu;
    })
    .finally(() => {
      headerMenuRequest = null;
    });

  return headerMenuRequest;
}

function linkLabel(item: MenuLinkItem | MenuCategory) {
  if (typeof item === 'string') return cleanHeaderText(item);
  return cleanHeaderText(item.label || item.name || '');
}

function linkUrl(item: MenuLinkItem | MenuCategory) {
  if (typeof item === 'string') return '#';
  return item.url || '#';
}

function linkSuffix(item: MenuLinkItem | MenuCategory) {
  if (typeof item === 'string') return '';
  return cleanHeaderText(item.suffixText || item.suffix || '');
}

function linkBadge(item: MenuLinkItem | MenuCategory) {
  if (typeof item === 'string') return '';
  return cleanHeaderText(item.badgeText || '');
}

function MenuLinkBadge({ item }: { item: MenuLinkItem | MenuCategory }) {
  const badge = linkBadge(item);
  if (!badge) return null;
  return <span className="menu-link-badge">{badge}</span>;
}

function linkIconPath(item: MenuLinkItem | MenuCategory) {
  if (typeof item === 'string') return '';
  return item.icon || (item.iconKey ? HEADER_MENU_ICON_PATHS[item.iconKey] || '' : '');
}

function MenuLinkIcon({ item, className = 'h-3.5 w-3.5 shrink-0 text-gray-500' }: { item: MenuLinkItem | MenuCategory; className?: string }) {
  const path = linkIconPath(item);
  if (!path) return null;
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={path} />
    </svg>
  );
}

export default function Header({ initialMenu }: { initialMenu?: HeaderMenuData }) {
  const router = useRouter();
  const [showSubMenu, setShowSubMenu] = useState(true);
  const showSubMenuRef = useRef(true);
  const lastScrollY = useRef(0);
  const lastScrollAt = useRef(0);
  const scrollDistance = useRef(0);
  const scrollDirection = useRef<'up' | 'down' | null>(null);
  const transitionLockedUntil = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const isMenuOpenRef = useRef(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuButtonRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const [headerMenu, setHeaderMenu] = useState<HeaderMenuData>(initialMenu || fallbackHeaderMenu);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDesktopTab, setActiveDesktopTab] = useState<'zones' | 'faves'>('zones');
  const [activeMobileTab, setActiveMobileTab] = useState<'zones' | 'faves'>('zones');
  const [activeDesktopMenuId, setActiveDesktopMenuId] = useState(fallbackHeaderMenu.zones[0]?.id || '');
  const [activeMobileMenuId, setActiveMobileMenuId] = useState<string | null>(null);
  const { totalQuantity } = useCartSummary();

  const menuCategories = headerMenu.zones.length > 0 ? headerMenu.zones : fallbackHeaderMenu.zones;

  const activeDesktopMenu = useMemo(
    () => menuCategories.find((category) => category.id === activeDesktopMenuId) || menuCategories[0],
    [activeDesktopMenuId, menuCategories],
  );

  const activeMobileMenu = useMemo(
    () => menuCategories.find((category) => category.id === activeMobileMenuId) || null,
    [activeMobileMenuId, menuCategories],
  );

  useEffect(() => {
    if (initialMenu) {
      cachedHeaderMenu = initialMenu;
      cachedHeaderMenuExpiresAt = Date.now() + HEADER_MENU_CLIENT_CACHE_MS;
      return;
    }
    let cancelled = false;
    loadHeaderMenu()
      .then((nextMenu) => {
        if (cancelled) return;
        setHeaderMenu(nextMenu);
        setActiveDesktopMenuId(nextMenu.zones[0]?.id || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialMenu]);

  // Search navigation: lấy giá trị từ input và chuyển trang.
  const navigateToSearch = useCallback((inputRef: React.RefObject<HTMLInputElement | null>) => {
    const value = inputRef.current?.value?.trim();
    if (value) {
      router.push(`/tim?q=${encodeURIComponent(value)}`);
    }
  }, [router]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    lastScrollAt.current = performance.now();

    const resetScrollIntent = () => {
      scrollDistance.current = 0;
      scrollDirection.current = null;
    };

    const setSubMenuVisibility = (visible: boolean, now: number, lock = true) => {
      if (showSubMenuRef.current === visible) {
        if (!lock) transitionLockedUntil.current = 0;
        return;
      }
      showSubMenuRef.current = visible;
      setShowSubMenu(visible);
      if (!visible && window.matchMedia('(min-width: 768px)').matches && isMenuOpenRef.current) {
        isMenuOpenRef.current = false;
        setIsMenuOpen(false);
        setActiveMobileMenuId(null);
      }
      transitionLockedUntil.current = lock ? now + SUBMENU_TRANSITION_COOLDOWN_MS : 0;
      resetScrollIntent();
    };

    const updateFromScroll = () => {
      scrollFrame.current = null;
      const now = performance.now();
      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      if (currentScrollY < SUBMENU_TOP_ZONE_PX || (isMenuOpenRef.current && window.innerWidth < 768)) {
        resetScrollIntent();
        lastScrollAt.current = now;
        setSubMenuVisibility(true, now, false);
        return;
      }

      if (Math.abs(delta) <= SUBMENU_DELTA_DEADBAND_PX) return;

      if (now - lastScrollAt.current > SUBMENU_SCROLL_IDLE_RESET_MS) {
        resetScrollIntent();
      }
      lastScrollAt.current = now;

      if (now < transitionLockedUntil.current) {
        resetScrollIntent();
        return;
      }

      const nextDirection = delta > 0 ? 'down' : 'up';
      if (scrollDirection.current !== nextDirection) {
        scrollDirection.current = nextDirection;
        scrollDistance.current = 0;
      }

      scrollDistance.current += Math.abs(delta);

      if (nextDirection === 'down' && scrollDistance.current >= SUBMENU_HIDE_DISTANCE_PX) {
        setSubMenuVisibility(false, now);
      } else if (nextDirection === 'up' && scrollDistance.current >= SUBMENU_SHOW_DISTANCE_PX) {
        setSubMenuVisibility(true, now);
      }
    };

    const handleScroll = () => {
      if (scrollFrame.current === null) {
        scrollFrame.current = window.requestAnimationFrame(updateFromScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollFrame.current !== null) {
        window.cancelAnimationFrame(scrollFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
    lastScrollY.current = Math.max(0, window.scrollY);
    lastScrollAt.current = performance.now();
    scrollDistance.current = 0;
    scrollDirection.current = null;
    transitionLockedUntil.current = performance.now() + SUBMENU_TRANSITION_COOLDOWN_MS;
    if (isMenuOpen && window.innerWidth < 768 && !showSubMenuRef.current) {
      showSubMenuRef.current = true;
      setShowSubMenu(true);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 767px)');
    const syncBodyScrollLock = () => {
      document.body.classList.toggle('mobile-menu-open', isMenuOpen && mobileViewport.matches);
    };

    syncBodyScrollLock();
    mobileViewport.addEventListener('change', syncBodyScrollLock);
    return () => {
      mobileViewport.removeEventListener('change', syncBodyScrollLock);
      document.body.classList.remove('mobile-menu-open');
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (megaMenuRef.current?.contains(target)) return;
      if (desktopMenuButtonRef.current?.contains(target)) return;
      if (mobileMenuButtonRef.current?.contains(target)) return;

      setIsMenuOpen(false);
      setActiveMobileMenuId(null);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen((open) => {
      if (open) setActiveMobileMenuId(null);
      return !open;
    });
  };

  const isSubMenuVisible = showSubMenu;
  const menuLabels = {
    zones: cleanHeaderText(headerMenu.labels?.zones || fallbackHeaderMenu.labels.zones),
    faves: cleanHeaderText(headerMenu.labels?.faves || fallbackHeaderMenu.labels.faves),
  };

  return (
    <>
      {/* START Header */}
      <div className="sticky top-0 z-[100] w-full bg-[#000]">
        <header className="bg-dark border-b border-dark-border w-full">
        {/* Max-width container 1800px */}
        <div className="max-w-[1800px] mx-auto relative px-0 md:px-6">

          {/* MOBILE TOP ROW (< 768px) */}
          <div className="flex md:hidden items-center justify-between w-full py-3 px-4 gap-3 bg-dark z-50 relative">
            {/* Logo */}
            <Link href="/" aria-label="Trang chủ" className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 via-purple-500 to-blue-500 flex items-center justify-center p-[2px] shrink-0">
              <div className="w-full h-full bg-dark rounded-full flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
            </Link>

            {/* Search (mobile) */}
            <div className="flex-1 search-glow-container">
              <div className="search-input-box rounded-full flex items-center px-4 h-10">
                <button
                  type="button"
                  className="text-gray-500 mr-2 hover:text-white transition-colors"
                  onClick={() => navigateToSearch(mobileSearchRef)}
                  aria-label={'T\u00ecm ki\u1ebfm'}
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  ref={mobileSearchRef}
                  type="text"
                  maxLength={100}
                  placeholder={'T\u00ecm ki\u1ebfm...'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      navigateToSearch(mobileSearchRef);
                    }
                  }}
                  className="bg-transparent w-full focus:outline-none text-sm text-white placeholder-gray-500"
                />
              </div>
            </div>

            {/* Menu Btn */}
            <div
              id="menuBorderMobile"
              ref={mobileMenuButtonRef}
              className={`w-10 h-10 rounded-full p-[1px] cursor-pointer shrink-0 flex items-center justify-center transition-all ${isMenuOpen ? 'bg-gradient-to-r from-teal-400 to-green-500' : 'bg-gradient-to-r from-green-400 via-purple-500 to-orange-500'}`}
              onClick={toggleMenu}
            >
              <div className="w-full h-full bg-[#111113] rounded-full flex items-center justify-center text-white text-lg font-bold">
                {isMenuOpen ? <X id="menuIconMobile" className="h-5 w-5" aria-hidden="true" /> : <MenuGlyph id="menuIconMobile" className="h-5 w-5" aria-hidden="true" />}
              </div>
            </div>
          </div>

          {/* DESKTOP TOP ROW (>= 768px) */}
          <div className="hidden md:flex items-center justify-between py-2" id="top-header-search">
            {/* Logo */}
            <Link href="/" aria-label="Trang chủ" className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl p-[2px]">
                <div className="w-full h-full bg-dark rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              </div>
              <span className="text-white font-semibold text-xl tracking-tight">TrucTiepGAME</span>
            </Link>

            {/* Search Bar (desktop) */}
            <div className="flex-1 max-w-4xl mx-8">
              <div className="search-glow-container">
                <div className="search-input-box rounded-full flex items-center px-4 py-2.5">
                  <button
                    type="button"
                    className="text-gray-500 mr-3 hover:text-white transition-colors"
                    onClick={() => navigateToSearch(desktopSearchRef)}
                    aria-label={'T\u00ecm ki\u1ebfm'}
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <input
                    ref={desktopSearchRef}
                    type="text"
                    maxLength={100}
                    placeholder={'B\u1ea1n \u0111ang c\u1ea7n t\u00ecm s\u1ea3n ph\u1ea9m g\u00ec?'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        navigateToSearch(desktopSearchRef);
                      }
                    }}
                    className="bg-transparent w-full focus:outline-none text-sm text-white placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-6 text-gray-400 shrink-0">
              <CustomerAccountMenu />
              <Link href="/gio-hang" className="hover:text-white transition-colors relative" aria-label={'Gi\u1ecf h\u00e0ng'}>
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">{totalQuantity}</span>
              </Link>
              <Link href="/yeu-thich" className="hover:text-white transition-colors" aria-label={'Y\u00eau th\u00edch'}>
                <Heart className="h-5 w-5" aria-hidden="true" />
              </Link>
              <button type="button" className="hover:text-white transition-colors" aria-label={'Tr\u1ee3 l\u00fd'}>
                <Bot className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="w-px h-5 bg-dark-border mx-2"></div>
              <button type="button" className="hover:text-white transition-colors" aria-label={'Ch\u1ebf \u0111\u1ed9 t\u1ed1i'}>
                <Moon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" className="hover:text-white transition-colors" aria-label={'Th\u00eam t\u00f9y ch\u1ecdn'}>
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

        </div>
        </header>

        <div className="bg-[#000]">
          <div className="max-w-[1800px] mx-auto relative px-0 md:px-6">
            <div
              className={`header-submenu-motion grid border-b border-dark-border ${isSubMenuVisible ? 'is-visible' : 'is-hidden'}`}
              aria-hidden={!isSubMenuVisible}
              inert={!isSubMenuVisible}
            >
              <div className="min-h-0 overflow-hidden">
          {/* DESKTOP BOTTOM ROW (NAV) */}
          <div className="hidden md:flex items-center py-2 border-t md:border-t-0 border-dark-border relative" id="bottom-header-menu">
            {/* Menu Button */}
            <div
              id="menuBorderDesktop"
              ref={desktopMenuButtonRef}
              className={`p-[1px] rounded-full cursor-pointer transition-all shrink-0 ${isMenuOpen ? 'bg-gradient-to-r from-teal-400 to-green-500' : 'bg-gradient-to-r from-green-400 via-purple-500 to-orange-500'}`}
              onClick={toggleMenu}
            >
              <div className="bg-dark rounded-full px-5 py-2 flex items-center gap-2 text-white text-sm font-semibold">
                {isMenuOpen ? <X id="menuIconDesktop" className="h-4 w-4" aria-hidden="true" /> : <MenuGlyph id="menuIconDesktop" className="h-4 w-4" aria-hidden="true" />}
                <span>Menu</span>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="flex items-center gap-6 ml-8 overflow-x-auto no-scrollbar w-full">
              {(headerMenu.topNav.length ? headerMenu.topNav : fallbackHeaderMenu.topNav).map((item) => (
                <a key={item.id || item.label} href={item.url || '#'} className="nav-link">
                  <MenuLinkIcon item={item} className="mr-1 inline h-3.5 w-3.5 text-blue-300 align-[-2px]" />
                  {linkSuffix(item) ? <span className="mr-1 text-blue-300">{linkSuffix(item)}</span> : null}
                  {linkLabel(item)}
                  <MenuLinkBadge item={item} />
                </a>
              ))}
            </nav>
          </div>

          <nav className="flex md:hidden items-center gap-6 px-4 py-3 overflow-x-auto no-scrollbar border-b border-dark-border flex-shrink-0">
            {(headerMenu.topNav.length ? headerMenu.topNav : fallbackHeaderMenu.topNav).slice(0, 6).map((item) => (
              <a key={item.id || item.label} href={item.url || '#'} className="nav-link">
                <MenuLinkIcon item={item} className="mr-1 inline h-3.5 w-3.5 text-blue-300 align-[-2px]" />
                {linkSuffix(item) ? <span className="mr-1 text-blue-300">{linkSuffix(item)}</span> : null}
                {linkLabel(item)}
                <MenuLinkBadge item={item} />
              </a>
            ))}
          </nav>
              </div>
            </div>

            {/* MEGA MENU DROPDOWN */}
          <div id="megaMenu" ref={megaMenuRef} className={`${isMenuOpen ? 'show-menu' : 'hidden-menu'} fixed top-[64px] bottom-[60px] md:absolute md:top-[100%] md:bottom-auto left-0 w-full bg-[#0a0a0c] md:border-t border-dark-border shadow-2xl flex-col md:flex-row z-40 overflow-y-auto md:overflow-visible min-h-600`}>

            {/* MOBILE NAV LINKS */}

            {/* MOBILE GRID VIEW */}
            <div id="mobileGrid" className={`${activeMobileMenu ? 'hidden' : 'flex-1'} md:hidden p-4`}>
              {/* Tabs */}
              <div className="bg-[#131317] rounded-full flex p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveMobileTab('zones')}
                  className={`flex-1 rounded-full py-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-md ${activeMobileTab === 'zones' ? 'bg-dark text-white' : 'text-gray-500'}`}
                >
                  <span className="text-cyan-400">{menuLabels.zones}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMobileTab('faves')}
                  className={`flex-1 rounded-full py-2 flex items-center justify-center gap-2 text-sm font-semibold ${activeMobileTab === 'faves' ? 'bg-dark text-white' : 'text-gray-500'}`}
                >
                  <Star className="h-4 w-4 text-orange-500" fill="currentColor" aria-hidden="true" />
                  <span>{menuLabels.faves}</span>
                </button>
              </div>

              {/* 3-Col Grid Container */}
              <div id="mobileGridContainer" className="grid grid-cols-3 gap-3">
                {activeMobileTab === 'faves' && (headerMenu.faves.length ? headerMenu.faves : fallbackHeaderMenu.faves).map((item) => (
                  <a
                    key={item.id || item.label}
                    href={item.url || '#'}
                    className="bg-[#111115] rounded-xl p-3 flex flex-col items-center justify-center gap-3 text-center border border-transparent hover:border-gray-700 transition"
                  >
                    <span className="text-lg">{linkIconPath(item) ? <MenuLinkIcon item={item} className="h-5 w-5 text-orange-500" /> : linkSuffix(item) || <Star className="h-5 w-5 text-orange-500" aria-hidden="true" />}</span>
                    <span className="text-[11px] text-gray-300 font-semibold leading-tight">
                      {linkLabel(item)}
                      <MenuLinkBadge item={item} />
                    </span>
                  </a>
                ))}
                {(activeMobileTab === 'zones' ? menuCategories : []).map((category) => (
                  <div
                    key={category.id}
                    className="bg-[#111115] rounded-xl p-3 flex flex-col items-center justify-center gap-3 text-center border border-transparent hover:border-gray-700 transition"
                    onClick={() => setActiveMobileMenuId(category.id)}
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={category.icon}></path>
                    </svg>
                    <span className="text-[11px] text-gray-300 font-semibold leading-tight">
                      {linkLabel(category)}
                      {linkSuffix(category) ? <span className="text-orange-500 ml-1">{linkSuffix(category)}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* MOBILE SUB-CATEGORY VIEW (Drill-down) */}
            <div id="mobileSubView" className={`${activeMobileMenu ? '' : 'hidden'} md:hidden p-4 flex-1`}>
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full bg-[#131317] flex items-center justify-center text-gray-400 hover:text-white transition"
                  onClick={() => setActiveMobileMenuId(null)}
                  aria-label={'Quay l\u1ea1i'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <h2 id="mobileSubTitle" className="text-xl font-bold title-gradient tracking-tight">{activeMobileMenu ? linkLabel(activeMobileMenu) : ''}</h2>
                </div>
              </div>

              {/* List Content */}
              <div id="mobileSubContentList" className="space-y-8">
                {activeMobileMenu?.cols.map((column) => (
                  <div key={column.title}>
                    <h3 className="title-gradient font-bold text-[16px] mb-4">{cleanHeaderText(column.title)}</h3>
                    <ul className="space-y-4">
                      {column.items.map((item) => (
                        <li key={typeof item === 'string' ? item : item.id || item.label || item.name}>
                          <a href={linkUrl(item)} className="flex items-center gap-3 text-[14px] text-gray-400">
                            {linkIconPath(item) ? <MenuLinkIcon item={item} className="h-4 w-4 shrink-0 text-gray-600" /> : <Star className="h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />}
                            <span>{linkSuffix(item) ? `${linkSuffix(item)} ` : ''}{linkLabel(item)}<MenuLinkBadge item={item} /></span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* DESKTOP MENU SECTIONS */}
            <div className="hidden md:flex w-full">
              {/* Sidebar */}
              <div className="w-80 border-r border-dark-border flex flex-col shrink-0 bg-[#0c0c0e]">
                {/* Tabs */}
                <div className="flex items-center border-b border-dark-border">
                  <button
                    type="button"
                    onClick={() => setActiveDesktopTab('zones')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold text-sm ${activeDesktopTab === 'zones' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-[#131317]' : 'text-gray-400 hover:text-white transition-colors'}`}
                  >
                    <span className="grid grid-cols-2 gap-[2px]">
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                    </span>
                    {menuLabels.zones}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDesktopTab('faves')}
                    className={`flex-1 py-2 flex items-center justify-center gap-2 font-semibold text-sm ${activeDesktopTab === 'faves' ? 'text-orange-400 border-b-2 border-orange-400 bg-[#131317]' : 'text-gray-400 hover:text-white transition-colors'}`}
                  >
                    <Star className="h-4 w-4 text-orange-500" fill="currentColor" aria-hidden="true" /> {menuLabels.faves}
                  </button>
                  <button type="button" className="px-4 text-gray-500 hover:text-white hidden md:block" aria-label={'T\u00ecm trong menu'}><Search className="h-4 w-4" aria-hidden="true" /></button>
                </div>

                {/* Categories List */}
                <div id="desktopSidebarList" className="flex-1 overflow-y-auto py-4">
                  {activeDesktopTab === 'zones' ? menuCategories.map((category) => {
                    const isActive = category.id === activeDesktopMenuId;
                    return (
                      <div
                        key={category.id}
                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                        onMouseEnter={() => setActiveDesktopMenuId(category.id)}
                      >
                        <div className={`faux-icon ${isActive ? 'bg-gradient-active' : ''}`}></div>
                        <span className={`flex-1 ${isActive ? 'font-bold' : ''}`}>
                          {linkLabel(category)}
                          {linkSuffix(category) ? <span className="text-orange-500 ml-1">{linkSuffix(category)}</span> : null}
                        </span>
                        {isActive ? <ChevronRight className="h-4 w-4 text-gray-500" aria-hidden="true" /> : null}
                      </div>
                    );
                  }) : (headerMenu.faves.length ? headerMenu.faves : fallbackHeaderMenu.faves).map((item) => (
                    <a key={item.id || item.label} href={item.url || '#'} className="sidebar-item">
                      {linkIconPath(item) ? <MenuLinkIcon item={item} className="h-4 w-4 shrink-0 text-gray-400" /> : <div className="faux-icon"></div>}
                      <span className="flex-1">
                        {linkLabel(item)}
                        {linkSuffix(item) ? <span className="text-orange-500 ml-1">{linkSuffix(item)}</span> : null}
                        <MenuLinkBadge item={item} />
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div id="desktopContentContainer" className="flex-1 p-10 overflow-y-auto bg-[#0a0a0c]">
                <div className="grid grid-cols-4 gap-12">
                  {activeDesktopTab === 'zones' ? activeDesktopMenu?.cols.map((column) => (
                    <div key={column.title}>
                      <h3 className="title-gradient font-bold text-base mb-6">{cleanHeaderText(column.title)}</h3>
                      <ul className="space-y-3.5">
                        {column.items.map((item) => (
                          <li key={typeof item === 'string' ? item : item.id || item.label || item.name}>
                            <a href={linkUrl(item)} className="sub-link">
                              <MenuLinkIcon item={item} />
                              {linkSuffix(item) ? <span className="mr-1">{linkSuffix(item)}</span> : null}
                              {linkLabel(item)}
                              <MenuLinkBadge item={item} />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )) : (
                    <div>
                      <h3 className="title-gradient font-bold text-base mb-6">{menuLabels.faves}</h3>
                      <ul className="space-y-3.5">
                        {(headerMenu.faves.length ? headerMenu.faves : fallbackHeaderMenu.faves).map((item) => (
                          <li key={item.id || item.label}><a href={item.url || '#'} className="sub-link"><MenuLinkIcon item={item} />{linkSuffix(item) ? <span className="mr-1">{linkSuffix(item)}</span> : null}{linkLabel(item)}<MenuLinkBadge item={item} /></a></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* MOBILE BOTTOM NAV BAR (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-[60px] bg-dark border-t border-dark-border flex items-center justify-between px-6 z-50">
        <CustomerAccountMenu mobile />
        <Link href="/gio-hang" className="text-gray-400 hover:text-white transition-colors relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">{totalQuantity}</span>
        </Link>
        <Link href="/yeu-thich" aria-label="Sản phẩm yêu thích" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </Link>
        <button type="button" aria-label="Hỗ trợ khách hàng" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>
        <button type="button" aria-label="Ứng dụng di động" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
        </button>
        <button type="button" aria-label="Mở thêm tùy chọn" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
        </button>
      </div>

      {/* END Header */}
    </>
  );
}
