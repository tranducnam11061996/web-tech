"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartSummary } from '@/lib/cart';
import { menuCategories } from './menuData';

export default function Header() {
  const router = useRouter();
  const [showSubMenu, setShowSubMenu] = useState(true);
  const lastScrollY = useRef(0);
  const topHeaderRef = useRef<HTMLElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuButtonRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const [headerHeight, setHeaderHeight] = useState(73);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDesktopMenuId, setActiveDesktopMenuId] = useState(menuCategories[0]?.id || '');
  const [activeMobileMenuId, setActiveMobileMenuId] = useState<string | null>(null);
  const { totalQuantity } = useCartSummary();

  const activeDesktopMenu = useMemo(
    () => menuCategories.find((category) => category.id === activeDesktopMenuId) || menuCategories[0],
    [activeDesktopMenuId],
  );

  const activeMobileMenu = useMemo(
    () => menuCategories.find((category) => category.id === activeMobileMenuId) || null,
    [activeMobileMenuId],
  );

  // Search navigation: lấy giá trị từ input và navigate
  const navigateToSearch = useCallback((inputRef: React.RefObject<HTMLInputElement>) => {
    const value = inputRef.current?.value?.trim();
    if (value) {
      router.push(`/tim?q=${encodeURIComponent(value)}`);
    }
  }, [router]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (topHeaderRef.current) {
        setHeaderHeight(topHeaderRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setShowSubMenu(true);
      } else if (currentScrollY > lastScrollY.current) {
        setShowSubMenu(false);
      } else {
        setShowSubMenu(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', isMenuOpen);
    return () => document.body.classList.remove('mobile-menu-open');
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

  return (
    <>
      {/* START Header */}
      <header ref={topHeaderRef} className="bg-dark border-b border-dark-border sticky top-0 z-[100] w-full">
        {/* Max-width container 1800px */}
        <div className="max-w-[1800px] mx-auto relative px-0 md:px-6">

          {/* MOBILE TOP ROW (< 768px) */}
          <div className="flex md:hidden items-center justify-between w-full py-3 px-4 gap-3 bg-dark z-50 relative">
            {/* Logo */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 via-purple-500 to-blue-500 flex items-center justify-center p-[2px] shrink-0">
              <div className="w-full h-full bg-dark rounded-full flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
            </div>

            {/* Search (mobile) */}
            <div className="flex-1 search-glow-container">
              <div className="search-input-box rounded-full flex items-center px-4 h-10">
                <span
                  className="text-gray-500 mr-2 text-sm cursor-pointer hover:text-white transition-colors"
                  onClick={() => navigateToSearch(mobileSearchRef)}
                >🔍</span>
                <input
                  ref={mobileSearchRef}
                  type="text"
                  placeholder="Search..."
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
                <span id="menuIconMobile" className="mt-[-2px]">{isMenuOpen ? '✕' : '≡'}</span>
              </div>
            </div>
          </div>

          {/* DESKTOP TOP ROW (>= 768px) */}
          <div className="hidden md:flex items-center justify-between py-2" id="top-header-search">
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 via-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl p-[2px]">
                <div className="w-full h-full bg-dark rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                </div>
              </div>
              <span className="text-white font-semibold text-2xl tracking-tight">evetech</span>
            </div>

            {/* Search Bar (desktop) */}
            <div className="flex-1 max-w-4xl mx-8">
              <div className="search-glow-container">
                <div className="search-input-box rounded-full flex items-center px-4 py-2.5">
                  <span
                    className="text-gray-500 mr-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => navigateToSearch(desktopSearchRef)}
                  >🔍</span>
                  <input
                    ref={desktopSearchRef}
                    type="text"
                    placeholder="Search for products, pages and posts ..."
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
              <button className="hover:text-white transition-colors">👤</button>
              <Link href="/gio-hang" className="hover:text-white transition-colors relative">
                🛒<span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">{totalQuantity}</span>
              </Link>
              <button className="hover:text-white transition-colors">♡</button>
              <button className="hover:text-white transition-colors">🤖</button>
              <div className="w-px h-5 bg-dark-border mx-2"></div>
              <button className="hover:text-white transition-colors">🌙</button>
              <button className="hover:text-white transition-colors">⋮</button>
            </div>
          </div>

        </div>
      </header>

      <div className={`bg-[#000] border-b border-dark-border sticky z-[90] transition-transform duration-300 ${showSubMenu ? 'translate-y-0' : '-translate-y-full'}`} style={{ top: headerHeight + 'px' }}>
        <div className="max-w-[1800px] mx-auto relative px-0 md:px-6">
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
                <span id="menuIconDesktop" className={`${isMenuOpen ? 'text-[14px]' : 'text-lg mt-[-2px]'} leading-none`}>{isMenuOpen ? '✕' : '≡'}</span>
                <span>Menu</span>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="flex items-center gap-6 ml-8 overflow-x-auto no-scrollbar w-full">
              <a href="#" className="nav-link">Components</a>
              <a href="#" className="nav-link"><span className="text-blue-400">💻</span> Laptops Special</a>
              <a href="#" className="nav-link">Pre Built PCs</a>
              <a href="#" className="nav-link"><span className="text-orange-500">🔥</span> Best Sellers</a>
              <a href="#" className="nav-link"><span className="text-yellow-500">⏳</span> Flash Deals <span className="badge-new">NEW</span></a>
              <a href="#" className="nav-link"><span className="text-blue-300">⛄</span> Winter Special</a>
              <a href="#" className="nav-link"><span className="text-yellow-300">✨</span> AI PC Builder</a>
              <a href="#" className="nav-link">Upgrade Kits</a>
              <a href="#" className="nav-link">New Arrivals</a>
              <a href="#" className="nav-link"><span className="text-red-500">⚡</span> Specials</a>
              <a href="#" className="nav-link"><span className="text-yellow-600">🏷️</span> Clearance</a>
              <a href="#" className="nav-link"><span className="text-gray-400">⚙️</span> Elegoo <span className="badge-new">NEW</span></a>
            </nav>
          </div>

          <nav className="flex md:hidden items-center gap-6 px-4 py-3 overflow-x-auto no-scrollbar border-b border-dark-border flex-shrink-0">
            <a href="#" className="nav-link"><span className="text-blue-300">⛄</span> Winter Special</a>
            <a href="#" className="nav-link"><span className="text-red-500">⚡</span> Specials</a>
            <a href="#" className="nav-link"><span className="text-blue-400">💻</span> Laptops Special</a>
            <a href="#" className="nav-link">Components</a>
            <a href="#" className="nav-link">Pre Built PCs</a>
          </nav>

          {/* MEGA MENU DROPDOWN */}
          <div id="megaMenu" ref={megaMenuRef} className={`${isMenuOpen ? 'show-menu' : 'hidden-menu'} fixed top-[64px] bottom-[60px] md:absolute md:top-[100%] md:bottom-auto left-0 w-full bg-[#0a0a0c] md:border-t border-dark-border shadow-2xl flex-col md:flex-row z-40 overflow-y-auto md:overflow-visible min-h-600`}>

            {/* MOBILE NAV LINKS */}

            {/* MOBILE GRID VIEW */}
            <div id="mobileGrid" className={`${activeMobileMenu ? 'hidden' : 'flex-1'} md:hidden p-4`}>
              {/* Tabs */}
              <div className="bg-[#131317] rounded-full flex p-1 mb-6">
                <button className="flex-1 rounded-full bg-dark text-white py-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-md"><span className="text-cyan-400">⊞</span> Zones</button>
                <button className="flex-1 py-2 text-gray-500 flex items-center justify-center gap-2 text-sm font-semibold"><span className="text-orange-500">★</span> Faves</button>
              </div>

              {/* 3-Col Grid Container */}
              <div id="mobileGridContainer" className="grid grid-cols-3 gap-3">
                {menuCategories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-[#111115] rounded-xl p-3 flex flex-col items-center justify-center gap-3 text-center border border-transparent hover:border-gray-700 transition"
                    onClick={() => setActiveMobileMenuId(category.id)}
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={category.icon}></path>
                    </svg>
                    <span className="text-[11px] text-gray-300 font-semibold leading-tight">
                      {category.name}
                      {category.suffix ? <span className="text-orange-500 ml-1">{category.suffix}</span> : null}
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
                  className="w-9 h-9 rounded-full bg-[#131317] flex items-center justify-center text-gray-400 hover:text-white transition"
                  onClick={() => setActiveMobileMenuId(null)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <h2 id="mobileSubTitle" className="text-xl font-bold title-gradient tracking-tight">{activeMobileMenu?.name}</h2>
                </div>
              </div>

              {/* List Content */}
              <div id="mobileSubContentList" className="space-y-8">
                {activeMobileMenu?.cols.map((column) => (
                  <div key={column.title}>
                    <h3 className="title-gradient font-bold text-[16px] mb-4">{column.title}</h3>
                    <ul className="space-y-4">
                      {column.items.map((item) => (
                        <li key={item} className="flex items-center gap-3 text-[14px] text-gray-400">
                          <span className="text-gray-600 text-lg leading-none">☆</span> {item}
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
                  <button className="flex-1 py-4 flex items-center justify-center gap-2 text-cyan-400 border-b-2 border-cyan-400 font-semibold text-sm bg-[#131317]">
                    <span className="grid grid-cols-2 gap-[2px]">
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                      <div className="w-1.5 h-1.5 bg-cyan-400"></div>
                    </span>
                    Zones
                  </button>
                  <button className="flex-1 py-2 flex items-center justify-center gap-2 text-gray-400 font-semibold text-sm hover:text-white transition-colors">
                    <span className="text-orange-500">★</span> Faves
                  </button>
                  <button className="px-4 text-gray-500 hover:text-white hidden md:block">🔍</button>
                </div>

                {/* Categories List */}
                <div id="desktopSidebarList" className="flex-1 overflow-y-auto py-4">
                  {menuCategories.map((category) => {
                    const isActive = category.id === activeDesktopMenuId;
                    return (
                      <div
                        key={category.id}
                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                        onMouseEnter={() => setActiveDesktopMenuId(category.id)}
                      >
                        <div className={`faux-icon ${isActive ? 'bg-gradient-active' : ''}`}></div>
                        <span className={`flex-1 ${isActive ? 'font-bold' : ''}`}>
                          {category.name}
                          {category.suffix ? <span className="text-orange-500 ml-1">{category.suffix}</span> : null}
                        </span>
                        {isActive ? <span className="text-gray-500">›</span> : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div id="desktopContentContainer" className="flex-1 p-10 overflow-y-auto bg-[#0a0a0c]">
                <div className="grid grid-cols-4 gap-12">
                  {activeDesktopMenu?.cols.map((column) => (
                    <div key={column.title}>
                      <h3 className="title-gradient font-bold text-base mb-6">{column.title}</h3>
                      <ul className="space-y-3.5">
                        {column.items.map((item) => (
                          <li key={item}><a href="#" className="sub-link">{item}</a></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV BAR (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-[60px] bg-dark border-t border-dark-border flex items-center justify-between px-6 z-50">
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </button>
        <Link href="/gio-hang" className="text-gray-400 hover:text-white transition-colors relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">{totalQuantity}</span>
        </Link>
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
        </button>
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
        </button>
      </div>

      {/* END Header */}
    </>
  );
}
