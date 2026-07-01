/**
 * Type declarations for global functions defined in public/main.js
 * These functions are loaded via <Script> and called from React components
 */
interface Window {
  // Menu functions (Header)
  toggleMenu: () => void;
  closeMobileSub: () => void;
  setDesktopActive: (id: string) => void;
  openMobileSub: (id: string) => void;

  // Category sidebar filter functions
  toggleSidebarSearch: () => void;
  filterSidebar: () => void;
  closeSidebarSearch: () => void;
  clearAllFilters: () => void;
  toggleFilter: (el: any) => void;
  updatePriceSlider: () => void;
  switchTab: (tabId: string, el: any) => void;
  toggleAccordion: (el: any) => void;
  switchRTab: (tabId: string, el: any) => void;
  toggleShow: (id: string) => void;
}
