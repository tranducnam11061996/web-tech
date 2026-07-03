// CATEGORY MOCK DATA
    const categories = [
      {
        id: 'laptops', name: 'Laptops & NoteBooks', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        cols: [
          { title: 'Laptops On Special', items: ['Laptop Best Sellers 🔥', 'Gaming laptops on Special', 'AMD Laptops on Special', 'Intel Laptops on Special', 'AI Laptop Finder 🤖', 'All Laptops on Special'] },
          { title: 'Gaming Laptops', items: ['GeForce Gaming Laptops', 'Intel Gaming Laptops', 'AMD Gaming Laptops', 'Gaming Laptops Under R20k', 'Gaming Laptops Above R20k'] },
          { title: 'Intel Laptops', items: ['Intel Core i3 Laptops', 'Intel Core i5 Laptops', 'Intel Core i7 Laptops'] },
          { title: 'Laptops by Brand', items: ['ASUS Laptops', 'MSI Laptops', 'Lenovo Laptops', 'HP Laptops', 'Dell Laptops'] }
        ]
      },
      {
        id: 'desktops', name: 'Desktop & Gaming PCs', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        cols: [
          { title: 'Gaming PCs', items: ['Intel Core i5 Gaming PCs', 'Intel Core i7 Gaming PCs', 'Intel Core i9 Gaming PCs', 'AMD Ryzen 5 Gaming PCs', 'AMD Ryzen 7 Gaming PCs', 'AMD Ryzen 9 Gaming PCs'] },
          { title: 'Pre-Built Systems', items: ['Budget Gaming PCs', 'High-End Gaming PCs', 'Streaming PCs', 'Workstations'] },
          { title: 'Upgrades', items: ['PC Upgrade Kits', 'Memory Upgrades', 'Storage Upgrades'] },
          { title: 'Accessories', items: ['Monitors', 'Keyboards', 'Mice'] }
        ]
      },
      {
        id: 'bestsellers', name: 'Best Sellers', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', suffix: '🔥',
        cols: [
          { title: 'Top Components', items: ['Top Selling CPUs', 'Top Selling GPUs', 'Top Selling Motherboards'] },
          { title: 'Top Peripherals', items: ['Top Selling Mice', 'Top Selling Keyboards', 'Top Selling Headsets'] },
          { title: 'Top Systems', items: ['Top Selling Laptops', 'Top Selling Desktops'] },
          { title: 'Offers', items: ['Clearance Sale', 'Flash Deals'] }
        ]
      },
      {
        id: 'collectables', name: 'Collectables', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
        cols: [
          { title: 'Figures', items: ['Anime Figures', 'Gaming Figures', 'Pop Vinyls'] },
          { title: 'Merchandise', items: ['T-Shirts', 'Hoodies', 'Caps'] },
          { title: 'Posters', items: ['Gaming Posters', 'Movie Posters'] },
          { title: 'Other', items: ['Mugs', 'Keychains'] }
        ]
      },
      {
        id: 'cases', name: 'Computer Cases', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        cols: [
          { title: 'Case Sizes', items: ['Full Tower', 'Mid Tower', 'Mini ITX', 'Micro ATX'] },
          { title: 'Brands', items: ['Corsair', 'NZXT', 'Lian Li', 'Phanteks', 'Cooler Master'] },
          { title: 'Features', items: ['Tempered Glass', 'RGB Lighting', 'Silent Cases'] },
          { title: 'Accessories', items: ['Case Fans', 'Lighting Strips', 'Vertical GPU Mounts'] }
        ]
      },
      {
        id: 'chairs', name: 'Chairs & Furniture', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
        cols: [
          { title: 'Gaming Chairs', items: ['DXRacer', 'Secretlab', 'Corsair', 'Cougar'] },
          { title: 'Office Chairs', items: ['Ergonomic Chairs', 'Mesh Chairs', 'Executive Chairs'] },
          { title: 'Gaming Desks', items: ['RGB Desks', 'Standing Desks', 'L-Shaped Desks'] },
          { title: 'Accessories', items: ['Floor Mats', 'Footrests', 'Monitor Arms'] }
        ]
      },
      {
        id: 'graphics', name: 'Graphics Cards', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
        cols: [
          { title: 'Nvidia GeForce', items: ['RTX 4090', 'RTX 4080', 'RTX 4070', 'RTX 4060', 'RTX 3060'] },
          { title: 'AMD Radeon', items: ['RX 7900 XTX', 'RX 7900 XT', 'RX 7800 XT', 'RX 7700 XT', 'RX 7600'] },
          { title: 'Brands', items: ['ASUS', 'MSI', 'Gigabyte', 'Zotac', 'Sapphire'] },
          { title: 'Other', items: ['Workstation GPUs', 'External GPUs', 'Water Blocks'] }
        ]
      },
      {
        id: 'headsets', name: 'Headsets', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
        cols: [
          { title: 'Gaming Headsets', items: ['Wireless Headsets', 'Wired Headsets', 'Surround Sound'] },
          { title: 'Brands', items: ['HyperX', 'SteelSeries', 'Razer', 'Corsair', 'Logitech'] },
          { title: 'Audiophile', items: ['Studio Headphones', 'DACs & Amps', 'Microphones'] },
          { title: 'Accessories', items: ['Ear Cushions', 'Headset Stands', 'Cables'] }
        ]
      },
      {
        id: 'keyboards', name: 'Keyboards', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
        cols: [
          { title: 'Mechanical Keyboards', items: ['Cherry MX Red', 'Cherry MX Blue', 'Cherry MX Brown', 'Custom Switches'] },
          { title: 'Form Factors', items: ['Full Size (100%)', 'TKL (80%)', 'Compact (60%)', 'Macropads'] },
          { title: 'Brands', items: ['Keychron', 'Razer', 'Corsair', 'Ducky', 'Logitech'] },
          { title: 'Accessories', items: ['Keycaps', 'Wrist Rests', 'Switches', 'Lube Kits'] }
        ]
      },
      {
        id: 'memory', name: 'Memory (RAM)', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        cols: [
          { title: 'Desktop Memory', items: ['DDR5 RAM', 'DDR4 RAM', 'DDR3 RAM'] },
          { title: 'Laptop Memory', items: ['SO-DIMM DDR5', 'SO-DIMM DDR4'] },
          { title: 'Capacities', items: ['64GB Kits', '32GB Kits', '16GB Kits', '8GB Kits'] },
          { title: 'Brands', items: ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'TeamGroup'] }
        ]
      },
      {
        id: 'monitors', name: 'Monitors', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        cols: [
          { title: 'Resolutions', items: ['4K Monitors', '1440p Monitors', '1080p Monitors', 'Ultrawide Monitors'] },
          { title: 'Refresh Rates', items: ['360Hz Monitors', '240Hz Monitors', '144Hz Monitors', '60Hz Monitors'] },
          { title: 'Panel Types', items: ['OLED', 'IPS', 'VA', 'TN'] },
          { title: 'Brands', items: ['ASUS', 'Alienware', 'LG', 'Samsung', 'AOC'] }
        ]
      },
      {
        id: 'motherboards', name: 'Motherboards', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
        cols: [
          { title: 'Intel Motherboards', items: ['Z790 Motherboards', 'B760 Motherboards', 'Z690 Motherboards', 'B660 Motherboards'] },
          { title: 'AMD Motherboards', items: ['X670 Motherboards', 'B650 Motherboards', 'X570 Motherboards', 'B550 Motherboards'] },
          { title: 'Form Factors', items: ['ATX', 'Micro ATX', 'Mini ITX', 'E-ATX'] },
          { title: 'Brands', items: ['ASUS', 'MSI', 'Gigabyte', 'ASRock'] }
        ]
      },
      {
        id: 'mouse', name: 'Mouse', icon: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122',
        cols: [
          { title: 'Gaming Mice', items: ['Wireless Mice', 'Wired Mice', 'MMO Mice', 'Ultralight Mice'] },
          { title: 'Office Mice', items: ['Ergonomic Mice', 'Trackballs', 'Mobile Mice'] },
          { title: 'Brands', items: ['Logitech', 'Razer', 'SteelSeries', 'Glorious', 'Pulsar'] },
          { title: 'Accessories', items: ['Mousepads', 'Mouse Bungees', 'Grip Tapes', 'Skates'] }
        ]
      },
      {
        id: 'powersupply', name: 'Power Supply', icon: 'M13 10V3L4 14h7v7l9-11h-7z',
        cols: [
          { title: 'Wattage', items: ['1000W+ PSUs', '850W PSUs', '750W PSUs', '650W PSUs', 'Under 600W PSUs'] },
          { title: 'Efficiency', items: ['80+ Titanium', '80+ Platinum', '80+ Gold', '80+ Bronze'] },
          { title: 'Form Factor', items: ['ATX PSUs', 'SFX PSUs', 'TFX PSUs'] },
          { title: 'Brands', items: ['Corsair', 'SeaSonic', 'EVGA', 'Be Quiet!', 'FSP'] }
        ]
      },
      {
        id: 'processors', name: 'Processors / Coolers', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
        cols: [
          { title: 'Intel CPUs', items: ['Core i9 Processors', 'Core i7 Processors', 'Core i5 Processors', 'Core i3 Processors'] },
          { title: 'AMD CPUs', items: ['Ryzen 9 Processors', 'Ryzen 7 Processors', 'Ryzen 5 Processors', 'Threadripper'] },
          { title: 'Air Coolers', items: ['Tower Coolers', 'Low Profile Coolers', 'Thermal Paste'] },
          { title: 'Liquid Coolers', items: ['360mm AIOs', '240mm AIOs', 'Custom Loop Parts'] }
        ]
      },
      {
        id: 'storage', name: 'SSDs & Storage', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2',
        cols: [
          { title: 'NVMe SSDs', items: ['Gen 5 NVMe SSDs', 'Gen 4 NVMe SSDs', 'Gen 3 NVMe SSDs'] },
          { title: 'SATA SSDs', items: ['2.5" SATA SSDs', 'M.2 SATA SSDs'] },
          { title: 'Hard Drives', items: ['Desktop HDDs', 'NAS HDDs', 'Enterprise HDDs'] },
          { title: 'External Storage', items: ['External SSDs', 'External HDDs', 'USB Flash Drives'] }
        ]
      },
      {
        id: 'upgradekits', name: 'Upgrade Kits', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        cols: [
          { title: 'Intel Kits', items: ['i9 Upgrade Kits', 'i7 Upgrade Kits', 'i5 Upgrade Kits'] },
          { title: 'AMD Kits', items: ['Ryzen 9 Upgrade Kits', 'Ryzen 7 Upgrade Kits', 'Ryzen 5 Upgrade Kits'] },
          { title: 'Combo Deals', items: ['CPU + Motherboard', 'CPU + RAM', 'Mobo + RAM'] },
          { title: 'Barebones', items: ['Intel NUCs', 'ASUS Mini PCs', 'DeskMini'] }
        ]
      },
      {
        id: 'more', name: 'More', icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z',
        cols: [
          { title: 'Software', items: ['Windows OS', 'Antivirus', 'Office Applications'] },
          { title: 'Networking', items: ['Routers', 'Switches', 'Network Cards', 'Cables'] },
          { title: 'Cables & Adapters', items: ['DisplayPort Cables', 'HDMI Cables', 'USB Cables'] },
          { title: 'Services', items: ['PC Assembly', 'Laptop Repair', 'Data Recovery'] }
        ]
      }
    ];

    let currentDesktopActive = 'laptops';
    let isMenuOpen = false;

    // Render initialization
    document.addEventListener("DOMContentLoaded", () => {
      renderDesktopMenu();
      renderMobileGrid();
    });

    // Desktop Hover Renderer
    function renderDesktopMenu() {
      const sidebar = document.getElementById('desktopSidebarList');
      const content = document.getElementById('desktopContentContainer');
      if (!sidebar || !content) return;

      // 1. Render Sidebar
      let sidebarHtml = '';
      categories.forEach(cat => {
        const isActive = cat.id === currentDesktopActive;
        let iconClass = isActive ? 'bg-gradient-active' : '';
        let suffix = cat.suffix ? `<span class="text-orange-500 ml-1">${cat.suffix}</span>` : '';

        sidebarHtml += `
        <div class="sidebar-item ${isActive ? 'active' : ''}" onmouseenter="setDesktopActive('${cat.id}')">
          <div class="faux-icon ${iconClass}"></div>
          <span class="flex-1 ${isActive ? 'font-bold' : ''}">${cat.name}${suffix}</span>
          ${isActive ? '<span class="text-gray-500">›</span>' : ''}
        </div>
      `;
      });
      sidebar.innerHTML = sidebarHtml;

      // 2. Render Content
      const activeCat = categories.find(c => c.id === currentDesktopActive);
      if (activeCat) {
        let contentHtml = '<div class="grid grid-cols-4 gap-12">';
        activeCat.cols.forEach(col => {
          contentHtml += `<div>
          <h3 class="title-gradient font-bold text-base mb-6">${col.title}</h3>
          <ul class="space-y-3.5">
            ${col.items.map(item => `<li><a href="#" class="sub-link">${item}</a></li>`).join('')}
          </ul>
        </div>`;
        });
        contentHtml += '</div>';
        content.innerHTML = contentHtml;
      }
    }

    function setDesktopActive(id) {
      if (currentDesktopActive !== id) {
        currentDesktopActive = id;
        renderDesktopMenu();
      }
    }

    // Mobile Renderer
    function renderMobileGrid() {
      const grid = document.getElementById('mobileGridContainer');
      if (!grid) return;
      let gridHtml = '';
      categories.forEach(cat => {
        let suffix = cat.suffix ? `<span class="text-orange-500 ml-1">${cat.suffix}</span>` : '';
        gridHtml += `
        <div class="bg-[#111115] rounded-xl p-3 flex flex-col items-center justify-center gap-3 text-center border border-transparent hover:border-gray-700 transition" onclick="openMobileSub('${cat.id}')">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${cat.icon}"></path></svg>
          <span class="text-[11px] text-gray-300 font-semibold leading-tight">${cat.name}${suffix}</span>
        </div>
      `;
      });
      grid.innerHTML = gridHtml;
    }

    function openMobileSub(id) {
      const cat = categories.find(c => c.id === id);
      if (!cat) return;

      const titleEl = document.getElementById('mobileSubTitle');
      const listEl = document.getElementById('mobileSubContentList');
      if (!titleEl || !listEl) return;

      titleEl.innerText = cat.name;

      let listHtml = '';
      cat.cols.forEach(col => {
        listHtml += `
        <div>
          <h3 class="title-gradient font-bold text-[16px] mb-4">${col.title}</h3>
          <ul class="space-y-4">
            ${col.items.map(item => `
              <li class="flex items-center gap-3 text-[14px] text-gray-400">
                <span class="text-gray-600 text-lg leading-none">☆</span> ${item}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
      });

      document.getElementById('mobileSubContentList').innerHTML = listHtml;

      document.getElementById('mobileGrid').classList.add('hidden');
      document.getElementById('mobileSubView').classList.remove('hidden');
    }

    function closeMobileSub() {
      document.getElementById('mobileGrid').classList.remove('hidden');
      document.getElementById('mobileSubView').classList.add('hidden');
    }

    function toggleMenu() {
      const menu = document.getElementById('megaMenu');
      const borderDesktop = document.getElementById('menuBorderDesktop');
      const iconDesktop = document.getElementById('menuIconDesktop');
      const borderMobile = document.getElementById('menuBorderMobile');
      const iconMobile = document.getElementById('menuIconMobile');

      isMenuOpen = !isMenuOpen;

      if (isMenuOpen) {
        menu.classList.remove('hidden-menu');
        menu.classList.add('show-menu');
        document.body.classList.add('mobile-menu-open');

        if (borderDesktop && iconDesktop) {
          borderDesktop.className = "p-[1px] rounded-full bg-gradient-to-r from-teal-400 to-green-500 cursor-pointer transition-all shrink-0";
          iconDesktop.innerHTML = '✕';
          iconDesktop.classList.remove('text-lg', 'mt-[-2px]');
          iconDesktop.classList.add('text-[14px]');
        }
        if (borderMobile && iconMobile) {
          borderMobile.className = "w-10 h-10 rounded-full p-[1px] bg-gradient-to-r from-teal-400 to-green-500 cursor-pointer shrink-0 flex items-center justify-center transition-all";
          iconMobile.innerHTML = '✕';
        }
      } else {
        menu.classList.remove('show-menu');
        menu.classList.add('hidden-menu');
        document.body.classList.remove('mobile-menu-open');

        if (borderDesktop && iconDesktop) {
          borderDesktop.className = "p-[1px] rounded-full bg-gradient-to-r from-green-400 via-purple-500 to-orange-500 cursor-pointer transition-all shrink-0";
          iconDesktop.innerHTML = '≡';
          iconDesktop.classList.remove('text-[14px]');
          iconDesktop.classList.add('text-lg', 'mt-[-2px]');
        }
        if (borderMobile && iconMobile) {
          borderMobile.className = "w-10 h-10 rounded-full p-[1px] bg-gradient-to-r from-green-400 via-purple-500 to-orange-500 cursor-pointer shrink-0 flex items-center justify-center transition-all";
          iconMobile.innerHTML = '≡';
        }

        setTimeout(closeMobileSub, 300);
      }
    }

    document.addEventListener('click', function(e) {
      if (!isMenuOpen) return;
      const menu = document.getElementById('megaMenu');
      const borderDesktop = document.getElementById('menuBorderDesktop');
      const borderMobile = document.getElementById('menuBorderMobile');
      
      if (menu && menu.contains(e.target)) return;
      if (borderDesktop && borderDesktop.contains(e.target)) return;
      if (borderMobile && borderMobile.contains(e.target)) return;
      
      toggleMenu();
    });

document.addEventListener('DOMContentLoaded', () => {
      const track = document.getElementById('storyTrack');
      const container = document.getElementById('storyContainer');
      if (!track || !container) return;
      let cards = Array.from(track.children);

      let currentIndex = 0;
      let autoSlideInterval;
      let isDesktop = window.matchMedia("(min-width: 1920px)");

      function getCardWidth() {
        return cards[0].offsetWidth + 24; // width + gap
      }

      function getMaxIndex() {
        // how many cards fit in the container
        const visible = Math.max(1, Math.floor(container.offsetWidth / getCardWidth()));
        return Math.max(0, cards.length - visible);
      }

      function setPosition() {
        if (isDesktop.matches) return;
        track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        track.style.transform = `translateX(-${currentIndex * getCardWidth()}px)`;
      }

      function nextSlide() {
        if (isDesktop.matches) return;

        if (currentIndex >= getMaxIndex()) {
          currentIndex = 0; // loop back
        } else {
          currentIndex++;
        }
        setPosition();
      }

      function startAutoSlide() {
        if (isDesktop.matches) return;
        stopAutoSlide();
        autoSlideInterval = setInterval(nextSlide, 3000);
      }

      function stopAutoSlide() {
        if (autoSlideInterval) {
          clearInterval(autoSlideInterval);
          autoSlideInterval = null;
        }
      }

      // Hover to pause
      container.addEventListener('mouseenter', stopAutoSlide);
      container.addEventListener('mouseleave', () => {
        if (!isDragging) startAutoSlide();
      });

      // Drag & Swipe Logic
      let isDragging = false;
      let startX = 0;
      let currentTranslate = 0;
      let prevTranslate = 0;
      let animationID;

      track.addEventListener('mousedown', touchStart);
      track.addEventListener('touchstart', touchStart, { passive: true });
      track.addEventListener('mouseup', touchEnd);
      track.addEventListener('mouseleave', touchEnd);
      track.addEventListener('touchend', touchEnd);
      track.addEventListener('mousemove', touchMove);
      track.addEventListener('touchmove', touchMove, { passive: true });

      function touchStart(event) {
        if (isDesktop.matches) return;
        isDragging = true;
        startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        track.classList.add('dragging');
        stopAutoSlide();
        animationID = requestAnimationFrame(animation);
      }

      function touchMove(event) {
        if (!isDragging || isDesktop.matches) return;
        const currentX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        const diff = currentX - startX;
        currentTranslate = prevTranslate + diff;
      }

      function touchEnd() {
        if (!isDragging || isDesktop.matches) return;
        isDragging = false;
        cancelAnimationFrame(animationID);
        track.classList.remove('dragging');

        const movedBy = currentTranslate - prevTranslate;
        const cw = getCardWidth();
        const threshold = cw * 0.3; // 30% swipe to change

        if (movedBy < -threshold && currentIndex < getMaxIndex()) {
          currentIndex++;
        } else if (movedBy > threshold && currentIndex > 0) {
          currentIndex--;
        }

        setPosition();
        prevTranslate = -currentIndex * cw;
        startAutoSlide();
      }

      function animation() {
        if (isDragging) {
          track.style.transform = `translateX(${currentTranslate}px)`;
          requestAnimationFrame(animation);
        }
      }

      // Desktop check
      function handleResize() {
        if (isDesktop.matches) {
          stopAutoSlide();
          track.style.transform = `translateX(0px)`;
          track.classList.remove('draggable');
        } else {
          track.classList.add('draggable');
          if (currentIndex > getMaxIndex()) currentIndex = getMaxIndex();
          setPosition();
          prevTranslate = -currentIndex * getCardWidth();
          startAutoSlide();
        }
      }

      isDesktop.addEventListener('change', handleResize);
      window.addEventListener('resize', () => {
        if (!isDesktop.matches) {
          handleResize();
        }
      });

      // Init
      handleResize();
    });

document.addEventListener('DOMContentLoaded', () => {
      const container = document.getElementById('heroCarousel');
      const track = document.getElementById('heroTrack');
      const dashes = document.querySelectorAll('.indicator-dash');
      if (!container || !track) return;

      let slides = Array.from(track.children);
      let currentIndex = 0;
      const maxIndex = slides.length - 1;
      let autoSlideInterval;

      function updateIndicators() {
        dashes.forEach(d => d.classList.remove('active'));
        // Map the 3 slides to the 15 dashes proportionally
        let progress = currentIndex / maxIndex;
        let dashIndex = Math.round(progress * (dashes.length - 1));
        dashes[dashIndex].classList.add('active');
      }

      function setPosition() {
        const width = container.offsetWidth;
        track.style.transform = `translateX(-${currentIndex * width}px)`;
        updateIndicators();
      }

      function nextSlide() {
        if (currentIndex >= maxIndex) {
          currentIndex = 0;
        } else {
          currentIndex++;
        }
        setPosition();
      }

      function prevSlide() {
        if (currentIndex <= 0) {
          currentIndex = maxIndex;
        } else {
          currentIndex--;
        }
        setPosition();
      }

      function startAutoSlide() {
        stopAutoSlide();
        autoSlideInterval = setInterval(nextSlide, 3000);
      }

      function stopAutoSlide() {
        if (autoSlideInterval) {
          clearInterval(autoSlideInterval);
        }
      }

      container.addEventListener('mouseenter', stopAutoSlide);
      container.addEventListener('mouseleave', () => {
        if (!isDragging) startAutoSlide();
      });

      // Drag & Swipe
      let isDragging = false;
      let startX = 0;
      let currentTranslate = 0;
      let prevTranslate = 0;
      let animationID;

      track.addEventListener('mousedown', touchStart);
      track.addEventListener('touchstart', touchStart, { passive: true });
      track.addEventListener('mouseup', touchEnd);
      track.addEventListener('mouseleave', touchEnd);
      track.addEventListener('touchend', touchEnd);
      track.addEventListener('mousemove', touchMove);
      track.addEventListener('touchmove', touchMove, { passive: true });

      function touchStart(event) {
        isDragging = true;
        startX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        track.classList.add('dragging');
        stopAutoSlide();
        animationID = requestAnimationFrame(animation);
      }

      function touchMove(event) {
        if (!isDragging) return;
        const currentX = event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
        currentTranslate = prevTranslate + (currentX - startX);
      }

      function touchEnd() {
        if (!isDragging) return;
        isDragging = false;
        cancelAnimationFrame(animationID);
        track.classList.remove('dragging');

        const movedBy = currentTranslate - prevTranslate;
        const width = container.offsetWidth;
        const threshold = width * 0.2; // swipe 20% to change

        if (movedBy < -threshold && currentIndex < maxIndex) {
          currentIndex++;
        } else if (movedBy > threshold && currentIndex > 0) {
          currentIndex--;
        }

        setPosition();
        prevTranslate = -currentIndex * width;
        startAutoSlide();
      }

      function animation() {
        if (isDragging) {
          track.style.transform = `translateX(${currentTranslate}px)`;
          requestAnimationFrame(animation);
        }
      }

      // Handle Resize
      window.addEventListener('resize', () => {
        setPosition();
        prevTranslate = -currentIndex * container.offsetWidth;
      });

      // Init
      setPosition();
      startAutoSlide();
    });

document.addEventListener('DOMContentLoaded', function () {
      const grid = document.getElementById('brandsGrid');
      const overlay = document.getElementById('expandOverlay');
      const btn = document.getElementById('expandBtn');
      if (!grid || !overlay || !btn) return;
      let expanded = false;

      btn.addEventListener('click', function () {
        expanded = !expanded;

        if (expanded) {
          grid.classList.add('expanded');
          overlay.classList.add('hidden');
          btn.classList.add('rotated');
          // Show collapse button after a moment
          setTimeout(() => {
            overlay.classList.remove('hidden');
            overlay.style.background = 'none';
            overlay.style.height = 'auto';
            overlay.style.position = 'relative';
            overlay.style.paddingBottom = '20px';
            overlay.style.paddingTop = '12px';
          }, 100);
        } else {
          grid.classList.remove('expanded');
          btn.classList.remove('rotated');
          overlay.style.background = '';
          overlay.style.height = '';
          overlay.style.position = '';
          overlay.style.paddingBottom = '';
          overlay.style.paddingTop = '';
          // Scroll to section top
          document.getElementById('brandsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

document.addEventListener('DOMContentLoaded', () => {
      const tracks = document.querySelectorAll('.carousel-track');

      tracks.forEach(track => {
        if (track.id === 'heroTrack') return; // Handled by its own script
        if (track.children.length === 0) return;

        const container = track.closest('.carousel-wrapper, .carousel-container, [id="carouselContainer"]') || track.parentElement;
        if (!container) return;

        const section = container.closest('section') || container.parentElement;
        const prevBtn = section.querySelector('#prevBtn, .prev-btn, button[aria-label="Previous"], button[aria-label="previous"]');
        const nextBtn = section.querySelector('#nextBtn, .next-btn, button[aria-label="Next"], button[aria-label="next"]');
        const dots = section.querySelectorAll('.indicator-dot');

        let cardWidth = 0;
        let autoSlideInterval = null;
        const AUTO_SLIDE_DELAY = 3000;
        let isAnimating = false;
        let currentTranslate = 0;
        
        const originalChildren = Array.from(track.children);
        const totalOriginal = originalChildren.length;
        originalChildren.forEach((child, i) => {
          child.dataset.originalIndex = i;
        });

        function getCardWidth() {
          const firstCard = track.children[0];
          if (!firstCard) return 0;
          const style = window.getComputedStyle(track);
          const gap = parseInt(style.gap) || parseInt(style.columnGap) || 16;
          return firstCard.offsetWidth + gap;
        }

        function getVisibleCards() {
          if (cardWidth === 0) return 1;
          return Math.floor(container.offsetWidth / cardWidth);
        }

        function updateDots() {
          if (dots.length === 0 || track.children.length < 2) return;
          const visibleCard = track.children[1];
          if (!visibleCard) return;
          const origIdx = parseInt(visibleCard.dataset.originalIndex);
          
          let dotIndex = origIdx;
          if (dots.length < totalOriginal) {
            dotIndex = Math.floor((origIdx / totalOriginal) * dots.length);
          }
          dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === dotIndex);
          });
        }

        function initLoop() {
          cardWidth = getCardWidth();
          if (cardWidth === 0) return;
          
          let visibleCards = getVisibleCards();
          if (track.children.length <= visibleCards + 1) {
            originalChildren.forEach(child => {
              const clone = child.cloneNode(true);
              clone.classList.add('cloned-item');
              track.appendChild(clone);
            });
          }
          
          if (track.children.length > 1) {
            track.style.transition = 'none';
            track.prepend(track.lastElementChild);
            currentTranslate = -cardWidth;
            track.style.transform = `translateX(${currentTranslate}px)`;
            updateDots();
          }
        }

        function goNext() {
          if (isAnimating || track.children.length < 2) return;
          isAnimating = true;
          cardWidth = getCardWidth();
          
          track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
          track.style.transform = `translateX(-${cardWidth * 2}px)`;
          
          setTimeout(() => {
            track.style.transition = 'none';
            track.appendChild(track.firstElementChild);
            currentTranslate = -cardWidth;
            track.style.transform = `translateX(${currentTranslate}px)`;
            updateDots();
            isAnimating = false;
          }, 400);
        }

        function goPrev() {
          if (isAnimating || track.children.length < 2) return;
          isAnimating = true;
          cardWidth = getCardWidth();
          
          track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
          track.style.transform = `translateX(0px)`;
          
          setTimeout(() => {
            track.style.transition = 'none';
            track.prepend(track.lastElementChild);
            currentTranslate = -cardWidth;
            track.style.transform = `translateX(${currentTranslate}px)`;
            updateDots();
            isAnimating = false;
          }, 400);
        }

        function startAutoSlide() {
          stopAutoSlide();
          autoSlideInterval = setInterval(goNext, AUTO_SLIDE_DELAY);
        }

        function stopAutoSlide() {
          if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
          }
        }

        if (prevBtn) {
          prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            goPrev();
            startAutoSlide();
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            goNext();
            startAutoSlide();
          });
        }

        if (dots.length > 0) {
          dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
              if (isAnimating || track.children.length < 2) return;
              
              let targetOrigIdx = i;
              if (dots.length < totalOriginal) {
                targetOrigIdx = Math.floor((i / (dots.length - 1)) * (totalOriginal - 1));
              }
              
              const visibleCard = track.children[1];
              if (!visibleCard) return;
              const currentOrigIdx = parseInt(visibleCard.dataset.originalIndex);
              
              let steps = targetOrigIdx - currentOrigIdx;
              if (steps === 0) return;
              
              stopAutoSlide();
              track.style.transition = 'none';
              
              if (steps > 0) {
                for (let j = 0; j < steps; j++) {
                  track.appendChild(track.firstElementChild);
                }
              } else {
                for (let j = 0; j < -steps; j++) {
                  track.prepend(track.lastElementChild);
                }
              }
              
              updateDots();
              startAutoSlide();
            });
          });
        }

        let isDragging = false;
        let startX = 0;
        let dragDiff = 0;

        track.addEventListener('mousedown', dragStart);
        track.addEventListener('touchstart', dragStart, { passive: true });
        window.addEventListener('mousemove', dragMove);
        window.addEventListener('touchmove', dragMove, { passive: true });
        window.addEventListener('mouseup', dragEnd);
        window.addEventListener('touchend', dragEnd);

        function dragStart(e) {
          if (e.target.closest('a') && e.type === 'mousedown') {
            e.preventDefault();
          }
          if (isAnimating || track.children.length < 2) return;
          isDragging = true;
          track.style.transition = 'none';
          track.classList.add('dragging');
          stopAutoSlide();
          startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
          cardWidth = getCardWidth();
          dragDiff = 0;
        }

        function dragMove(e) {
          if (!isDragging) return;
          const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
          dragDiff = x - startX;
          track.style.transform = `translateX(${currentTranslate + dragDiff}px)`;
        }

        function dragEnd(e) {
          if (!isDragging) return;
          isDragging = false;
          track.classList.remove('dragging');
          
          const threshold = cardWidth * 0.2;
          
          if (dragDiff < -threshold) {
            goNext();
          } else if (dragDiff > threshold) {
            goPrev();
          } else {
            track.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
            track.style.transform = `translateX(${currentTranslate}px)`;
          }
          
          startAutoSlide();
        }

        container.addEventListener('mouseenter', stopAutoSlide);
        container.addEventListener('mouseleave', startAutoSlide);

        track.addEventListener('touchstart', stopAutoSlide, { passive: true });
        track.addEventListener('touchend', startAutoSlide, { passive: true });

        setTimeout(() => {
          initLoop();
          startAutoSlide();
        }, 100);

        let resizeTimeout;
        window.addEventListener('resize', () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            cardWidth = getCardWidth();
            if (track.children.length > 1) {
              track.style.transition = 'none';
              currentTranslate = -cardWidth;
              track.style.transform = `translateX(${currentTranslate}px)`;
            }
          }, 100);
        });
      });
    });

// === ss20.html ===
const ss20_products = [
  { name:'MSI GeForce GT 710 2GD3H LP 2GB DDR3', gpu:'GT 710', mem:'2GB', memType:'GDDR3', cores:'192', brand:'MSI', price:'1,099', badge:'', color:'#6b7280' },
  { name:'MSI GeForce RTX 3050 VENTUS 2X 6G OC', gpu:'RTX 3050', mem:'6GB', memType:'GDDR6', cores:'2304', brand:'MSI', price:'4,299', badge:'Trending', color:'#22d3ee' },
  { name:'MSI GeForce RTX 5060 8GB Shadow 2X OC', gpu:'RTX 5060', mem:'8GB', memType:'GDDR7', cores:'3840', brand:'MSI', price:'6,999', badge:'Trending', color:'#22d3ee' },
  { name:'MSI RTX 5060 Ventus 2X 8G OC White', gpu:'RTX 5060', mem:'8GB', memType:'GDDR7', cores:'3840', brand:'MSI', price:'7,399', badge:'', color:'#a3e635' },
  { name:'MSI RTX 5060 Ventus 2X 8G OC', gpu:'RTX 5060', mem:'8GB', memType:'GDDR7', cores:'3840', brand:'MSI', price:'8,499', badge:'', color:'#a3e635' },
  { name:'MSI GeForce RTX 5060 Ti 8G Shadow 2X...', gpu:'RTX 5060 Ti', mem:'8GB', memType:'GDDR7', cores:'4608', brand:'MSI', price:'8,699', badge:'', color:'#facc15' },
  { name:'MSI RTX 5060 8G Gaming Trio OC', gpu:'RTX 5060', mem:'8GB', memType:'GDDR7', cores:'3840', brand:'MSI', price:'9,499', badge:'', color:'#a3e635' },
  { name:'MSI RTX 5060 Ti 8G VENTUS 2X OC Plus', gpu:'RTX 5060 Ti', mem:'8GB', memType:'GDDR7', cores:'4608', brand:'MSI', price:'9,999', badge:'', color:'#facc15' },
  { name:'MSI RTX 5070 12GB Shadow 2X OC', gpu:'RTX 5070', mem:'12GB', memType:'GDDR7', cores:'6144', brand:'MSI', price:'11,999', badge:'', color:'#a3e635' },
  { name:'MSI RTX 5070 Ventus 2X 12G OC', gpu:'RTX 5070', mem:'12GB', memType:'GDDR7', cores:'6144', brand:'MSI', price:'13,999', badge:'', color:'#a3e635' },
  { name:'MSI GeForce RTX 5070 12GB SHADOW 3X...', gpu:'RTX 5070', mem:'12GB', memType:'GDDR7', cores:'6144', brand:'MSI', price:'13,999', badge:'', color:'#a3e635' },
  { name:'MSI GeForce RTX 5070 12G Inspire OC', gpu:'RTX 5070', mem:'12GB', memType:'GDDR7', cores:'6144', brand:'MSI', price:'14,499', badge:'', color:'#a3e635' },
  { name:'MSI GeForce RTX 5070 12G VENTUS 3X OC', gpu:'RTX 5070', mem:'12GB', memType:'GDDR7', cores:'6144', brand:'MSI', price:'14,999', badge:'', color:'#a3e635' },
  { name:'MSI GeForce RTX 5070 12G Gaming Trio...', gpu:'RTX 5070', mem:'12GB', memType:'GDDR7', cores:'6144', brand:'MSI', price:'15,199', badge:'', color:'#a3e635' },
  { name:'MSI RTX 5070 12GB Midnight Light OC', gpu:'RTX 5070', mem:'12GB', memType:'GDDR7', cores:'6144', brand:'MSI', price:'17,999', badge:'', color:'#c084fc' },
  { name:'MSI GeForce RTX 5080 16G Gaming Trio', gpu:'RTX 5080', mem:'16GB', memType:'GDDR7', cores:'10752', brand:'MSI', price:'31,999', badge:'', color:'#fb923c' },
  { name:'MSI GeForce RTX 5090 32G Lightning Z', gpu:'RTX 5090', mem:'32GB', memType:'GDDR7', cores:'21760', brand:'MSI', price:'109,999', badge:'', color:'#f87171' },
];

function ss20_renderProducts(){
  const grid = document.getElementById('productGrid');
  let html = '';
  ss20_products.forEach(p => {
    const badgeHtml = p.badge ? `<span class="absolute top-2 left-2 bg-cyan-500/20 text-cyan-400 text-[9px] font-bold px-2 py-0.5 rounded-full">${p.badge}</span>` : '';
    html += `
    <div class="product-card">
      <div class="product-img">
        ${badgeHtml}
        <div class="gpu-box" style="background:linear-gradient(135deg, #0f1a14 0%, #111115 50%, #141418 100%); border:1px solid #1a2e1f;">
          <div class="gpu-specs" style="color:${p.color}">
            <div class="gpu-name">${p.gpu}</div>
            <div class="gpu-detail">
              <span style="font-size:10px;font-weight:900">${p.mem}</span>
              <span class="gpu-badge" style="background:${p.color}22;color:${p.color}">${p.memType}</span>
            </div>
            <div class="gpu-detail">
              <span style="font-size:10px;font-weight:900">${p.cores}</span>
              <span class="gpu-badge" style="background:#facc1522;color:#facc15">CUDA CORES</span>
            </div>
            <div class="flex items-center gap-1 mt-1">
              <span class="gpu-badge" style="background:#f9731622;color:#f97316;font-size:6px;padding:2px 3px">3 YEARS</span>
              <span class="gpu-badge" style="background:${p.color}22;color:${p.color};font-size:7px;padding:2px 4px;font-weight:900">OC</span>
              <span class="gpu-badge" style="background:#a855f722;color:#a855f7;font-size:5px;padding:2px 3px">EDITION</span>
            </div>
          </div>
          <div class="gpu-img-placeholder">
            <div class="w-[70%] h-[60%] bg-gradient-to-br from-[#27272a] to-[#18181b] rounded-lg opacity-60"></div>
          </div>
        </div>
      </div>
      <div class="p-4">
        <p class="text-[10px] text-gray-500 font-semibold text-center mb-1">${p.brand}</p>
        <p class="text-[12px] text-gray-300 font-medium text-center leading-tight mb-3 line-clamp-2 h-[32px]">${p.name}</p>
        <div class="flex items-center justify-between">
          <span class="text-white font-extrabold text-[15px]">R ${p.price}</span>
          <div class="flex items-center gap-2">
            <span class="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">● In Stock</span>
            <button class="text-gray-600 hover:text-white transition text-sm">⋮</button>
          </div>
        </div>
      </div>
    </div>`;
  });
  grid.innerHTML = html;
}

// document.addEventListener('DOMContentLoaded', ss20_renderProducts);

// === ss21.html ===
function switchTab(tabId, btn) {
  // Hide all tabs
  document.getElementById('tab-whybuy').classList.add('hidden');
  document.getElementById('tab-faq').classList.add('hidden');
  // Show selected
  document.getElementById('tab-' + tabId).classList.remove('hidden');
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function toggleAccordion(header) {
  const item = header.parentElement;
  const isOpen = item.classList.contains('open');
  // Close all siblings in same accordion
  const parent = item.parentElement;
  parent.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('open'));
  // Toggle clicked
  if (!isOpen) item.classList.add('open');
}

// === ss22.html ===
const brandColors = {
  'Deepcool':'#1e6b4f','Asus':'#3b82f6','Antec':'#ef4444','MSI':'#f97316','Corsair':'#8b5cf6',
  'NZXT':'#ec4899','Gigabyte':'#f59e0b','Cooler Master':'#6366f1','Thermaltake':'#14b8a6','Lian Li':'#a3e635'
};

const productsData = [
  {brand:'Deepcool',name:'Deepcool GH-01 A-RGB Graphics Card...',price:'349',label:'ADJUSTABLE\nGPU HOLDER'},
  {brand:'Asus',name:'ASUS ROG Herculx Graphics Card Holde...',price:'999',label:'ROG HERCULX\nGPU HOLDER'},
  {brand:'Asus',name:'ASUS ROG Herculx Graphics Card Holde...',price:'899',label:'ROG HERCULX\nGPU HOLDER'},
  {brand:'Antec',name:'Antec ARGB GPU Holder - Black',price:'399',label:'RGB GPU\nSUPPORT BRACKET'},
  {brand:'Asus',name:'ASUS RTX 5070 + B850-BTF Bundle / ASU...',price:'19,399',label:'PRIME RTX 5070\n+ TUF B850-BTF'},
  {brand:'MSI',name:'MSI MAG GPU Support Stand',price:'299',label:'MAG GPU\nSUPPORT'},
  {brand:'Corsair',name:'Corsair GPU Anti-Sag Bracket RGB',price:'449',label:'ANTI-SAG\nBRACKET'},
  {brand:'NZXT',name:'NZXT Vertical GPU Mount Kit',price:'1,299',label:'VERTICAL\nGPU MOUNT'},
  {brand:'Gigabyte',name:'Gigabyte RTX 5070 + Z890 Bundle',price:'22,999',label:'RTX 5070\nBUNDLE'},
  {brand:'Cooler Master',name:'Cooler Master V-Brace GPU Support',price:'249',label:'V-BRACE\nSUPPORT'},
  {brand:'Asus',name:'ASUS TUF GPU Anti-Sag Holder',price:'599',label:'TUF GPU\nHOLDER'},
  {brand:'Thermaltake',name:'Thermaltake ARGB GPU Riser Cable',price:'899',label:'ARGB RISER\nCABLE'},
  {brand:'Lian Li',name:'Lian Li GPU Anti-Sag Bracket',price:'349',label:'ANTI-SAG\nBRACKET'},
  {brand:'MSI',name:'MSI RTX 5060 + B760 Combo Deal',price:'12,499',label:'RTX 5060\nCOMBO'},
  {brand:'Corsair',name:'Corsair Premium GPU Power Cable',price:'199',label:'GPU POWER\nCABLE'},
];

const pagesData = [
  {title:'Best GPU for Gaming in 2025 - Buying Guide',thumb:'🎮'},
  {title:'How to Choose the Right Graphics Card',thumb:'📊'},
  {title:'NVIDIA vs AMD: Complete Comparison Guide',thumb:'⚔️'},
  {title:'GPU Bottleneck Calculator - Find Your Match',thumb:'🔧'},
  {title:'Top 10 Budget GPUs Under R10,000',thumb:'💰'},
  {title:'Ray Tracing Explained: Everything You Need',thumb:'✨'},
  {title:'PCIe Gen 5 vs Gen 4: Does It Matter?',thumb:'🔌'},
  {title:'How Much VRAM Do You Really Need?',thumb:'💾'},
  {title:'GPU Overclocking Guide for Beginners',thumb:'⚡'},
  {title:'Best Monitors to Pair With RTX 5070',thumb:'🖥️'},
  {title:'Water Cooling Your GPU: Complete Guide',thumb:'💧'},
  {title:'SLI & NVLink: Is Multi-GPU Worth It?',thumb:'🔗'},
  {title:'GPU Thermal Paste Replacement Guide',thumb:'🌡️'},
  {title:'Understanding GPU Architecture: CUDA vs RDNA',thumb:'🧠'},
  {title:'Future of GPUs: What to Expect in 2026',thumb:'🚀'},
];

const postsData = [
  {title:'RTX 5070 vs RTX 4080: Real-World Benchmarks',thumb:'📈'},
  {title:'We Tested 10 GPU Holders - Here\'s the Best',thumb:'🏆'},
  {title:'Building a R15K Gaming PC in 2025',thumb:'🛠️'},
  {title:'GPU Prices Are Dropping: Best Time to Buy?',thumb:'📉'},
  {title:'Unboxing the MSI RTX 5090 Lightning Z',thumb:'📦'},
  {title:'ASUS ROG Swift Monitor + RTX 5080 Review',thumb:'⭐'},
  {title:'How We Build PCs at Evetech HQ',thumb:'🏭'},
  {title:'The Quietest GPUs Money Can Buy',thumb:'🔇'},
  {title:'Gaming at 4K 120fps: Is It Finally Here?',thumb:'🎯'},
  {title:'AMD RX 8800 XT: First Look & Leaks',thumb:'🔍'},
  {title:'Best PSU for RTX 5080: Our Picks',thumb:'⚡'},
  {title:'Compact ITX Build with RTX 5070',thumb:'📐'},
  {title:'GPU Coil Whine: Causes and Fixes',thumb:'🔊'},
  {title:'Our Top Staff Picks for June 2025',thumb:'👨‍💻'},
  {title:'Evetech Community Build Showcase #12',thumb:'🎪'},
];

const expanded = {products:false,pages:false,posts:false};

function renderProducts(){
  const grid=document.getElementById('products-grid');
  if(!grid) return;
  const count=expanded.products?15:5;
  let html='';
  for(let i=0;i<count;i++){
    const p=productsData[i];
    const bc=brandColors[p.brand]||'#3f3f46';
    html+=`<div class="pcard">
      <div class="pcard-img">
        <div class="pcard-thumb">
          <div class="pcard-label" style="background:linear-gradient(135deg,${bc},${bc}99)">
            <span style="font-size:9px;font-weight:900;color:#fff;opacity:.7">${p.brand}</span>
            <span class="pcard-label-title" style="margin-top:4px">${p.label.replace(/\n/g,'<br>')}</span>
          </div>
          <div class="pcard-placeholder"><div class="pcard-placeholder-inner"></div></div>
        </div>
      </div>
      <div class="p-4">
        <p class="text-[10px] text-gray-500 font-semibold text-center mb-1">${p.brand}</p>
        <p class="text-[12px] text-gray-300 font-medium text-center leading-tight mb-3 line-clamp-2 h-[32px]">${p.name}</p>
        <div class="flex items-center justify-between">
          <span class="text-white font-extrabold text-[15px]">R ${p.price}</span>
          <button class="text-gray-600 hover:text-white transition text-sm">⋮</button>
        </div>
      </div>
    </div>`;
  }
  grid.innerHTML=html;
  document.getElementById('products-btn').textContent=expanded.products?'Show Less':'Show All (15)';
}

function renderPages(){
  const grid=document.getElementById('pages-grid');
  if(!grid) return;
  const count=expanded.pages?15:5;
  let html='';
  for(let i=0;i<count;i++){
    const p=pagesData[i];
    html+=`<div class="pcard">
      <div class="pcard-img" style="aspect-ratio:16/9;background:linear-gradient(135deg,#0f1520,#111115)">
        <span style="font-size:48px;opacity:.6">${p.thumb}</span>
      </div>
      <div class="p-4">
        <p class="text-[12px] text-gray-300 font-medium leading-tight line-clamp-2 h-[32px]">${p.title}</p>
        <p class="text-[10px] text-cyan-500 mt-2 font-semibold">Read More →</p>
      </div>
    </div>`;
  }
  grid.innerHTML=html;
  document.getElementById('pages-btn').textContent=expanded.pages?'Show Less':'Show All (15)';
}

function renderPosts(){
  const grid=document.getElementById('posts-grid');
  if(!grid) return;
  const count=expanded.posts?15:5;
  let html='';
  for(let i=0;i<count;i++){
    const p=postsData[i];
    html+=`<div class="pcard">
      <div class="pcard-img" style="aspect-ratio:16/9;background:linear-gradient(135deg,#15100f,#111115)">
        <span style="font-size:48px;opacity:.6">${p.thumb}</span>
      </div>
      <div class="p-4">
        <p class="text-[12px] text-gray-300 font-medium leading-tight line-clamp-2 h-[32px]">${p.title}</p>
        <p class="text-[10px] text-purple-400 mt-2 font-semibold">Read Post →</p>
      </div>
    </div>`;
  }
  grid.innerHTML=html;
  document.getElementById('posts-btn').textContent=expanded.posts?'Show Less':'Show All (15)';
}

function toggleShow(type){
  expanded[type]=!expanded[type];
  if(type==='products') renderProducts();
  else if(type==='pages') renderPages();
  else renderPosts();
}

function switchRTab(tabId,btn){
  ['products','pages','posts'].forEach(t=>{
    document.getElementById('rtab-'+t).classList.add('hidden');
  });
  document.getElementById('rtab-'+tabId).classList.remove('hidden');
  document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded',()=>{
  renderProducts();
  renderPages();
  renderPosts();
  
  // Initialize Active Filters
  const checkboxes = document.querySelectorAll('#sidebar-category .filter-checkbox input[type="checkbox"]');
  checkboxes.forEach((box, index) => {
    if (!box.id) box.id = 'filter-cb-' + index;
    box.addEventListener('change', updateActiveFilters);
  });
  updateActiveFilters();
});

// === Sidebar Filter Functionality ===
function toggleFilter(header) {
  const section = header.parentElement;
  const content = section.querySelector('.filter-content');
  if (content) {
    section.classList.toggle('open');
    if (window.jQuery) {
      $(content).slideToggle(200);
    } else {
      content.style.display = section.classList.contains('open') ? 'block' : 'none';
    }
  }
}

function updateActiveFilters() {
  // Disabled in Next.js environment to prevent conflicts with React state
  // This is now handled entirely by CategoryPage.tsx
}

function updatePriceSlider() {
  const minSlider = document.getElementById('price-min');
  const maxSlider = document.getElementById('price-max');
  const track = document.getElementById('price-track');
  const valMin = document.getElementById('price-val-min');
  const valMax = document.getElementById('price-val-max');
  
  let minValue = parseInt(minSlider.value);
  let maxValue = parseInt(maxSlider.value);
  
  // Prevent crossing handles
  if (minValue > maxValue) {
    let tmp = minValue;
    minValue = maxValue;
    maxValue = tmp;
    minSlider.value = minValue;
    maxSlider.value = maxValue;
  }
  
  const minPercent = (minValue / minSlider.max) * 100;
  const maxPercent = (maxValue / maxSlider.max) * 100;
  
  track.style.left = minPercent + "%";
  track.style.right = (100 - maxPercent) + "%";
  
  valMin.textContent = 'R ' + minValue.toLocaleString();
  valMax.textContent = 'R ' + maxValue.toLocaleString();

  updateActiveFilters();
}

function resetPriceFilter() {
  const minSlider = document.getElementById('price-min');
  const maxSlider = document.getElementById('price-max');
  if(minSlider && maxSlider) {
    minSlider.value = minSlider.min;
    maxSlider.value = maxSlider.max;
    updatePriceSlider();
  }
}

function uncheckFilter(boxId) {
  const box = document.getElementById(boxId);
  if (box) {
    box.checked = false;
    updateActiveFilters();
  }
}

function clearAllFilters() {
  const checkedBoxes = document.querySelectorAll('#sidebar-category .filter-checkbox input[type="checkbox"]:checked');
  checkedBoxes.forEach(box => {
    box.checked = false;
  });
  resetPriceFilter(); // Automatically triggers updateActiveFilters()
}

function toggleSidebarSearch() {
  const container = document.getElementById('sidebar-search-container');
  const input = document.getElementById('sidebar-search-input');
  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    input.focus();
  } else {
    closeSidebarSearch();
  }
}

function closeSidebarSearch() {
  const container = document.getElementById('sidebar-search-container');
  const input = document.getElementById('sidebar-search-input');
  container.classList.add('hidden');
  input.value = '';
  filterSidebar(); // reset filters
}

function filterSidebar() {
  const keyword = document.getElementById('sidebar-search-input').value.toLowerCase();
  const sections = document.querySelectorAll('#sidebar-category .filter-section');
  
  sections.forEach(section => {
    const titleText = section.querySelector('.filter-title').textContent.toLowerCase();
    const checkboxes = section.querySelectorAll('.filter-checkbox');
    let hasVisibleCheckbox = false;
    
    // For sections with checkboxes
    checkboxes.forEach(label => {
      const labelText = label.textContent.toLowerCase();
      if (labelText.includes(keyword)) {
        label.style.display = '';
        hasVisibleCheckbox = true;
      } else {
        label.style.display = 'none';
      }
    });
    
    // Check if it's the price range section (no checkboxes)
    if (section.id === 'price-range-sidebar') {
      if (titleText.includes(keyword) || keyword === '') {
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
      return;
    }
    
    // Show section if title matches or any of its checkboxes match
    if (titleText.includes(keyword) || hasVisibleCheckbox) {
       section.style.display = '';
       // If title matches but no checkbox matches specifically, show all checkboxes inside it
       if (titleText.includes(keyword) && !hasVisibleCheckbox && keyword !== '') {
         checkboxes.forEach(label => label.style.display = '');
       }
    } else {
       section.style.display = 'none';
    }
  });
}

function updateUrlParams() {
  const url = new URL(window.location);
  
  const sections = document.querySelectorAll('#sidebar-category .filter-section[data-group]');
  sections.forEach(section => {
    const group = section.getAttribute('data-group');
    const checked = Array.from(section.querySelectorAll('.filter-checkbox input[type="checkbox"]:checked')).map(cb => cb.value);
    if (checked.length > 0) {
      url.searchParams.set(group, checked.join(','));
    } else {
      url.searchParams.delete(group);
    }
  });
  
  const minSlider = document.getElementById('price-min');
  const maxSlider = document.getElementById('price-max');
  if (minSlider && maxSlider) {
    const minValue = parseInt(minSlider.value);
    const maxValue = parseInt(maxSlider.value);
    const minConfig = parseInt(minSlider.min);
    const maxConfig = parseInt(maxSlider.max);
    
    if (minValue > minConfig) {
      url.searchParams.set('min-price', minValue);
    } else {
      url.searchParams.delete('min-price');
    }
    
    if (maxValue < maxConfig) {
      url.searchParams.set('max-price', maxValue);
    } else {
      url.searchParams.delete('max-price');
    }
  }
  
  window.history.replaceState({}, '', url);
}

/* === FROM main-product.js === */

// Carousel
let prodCurSlide=0;const prodTotalSlides=5;let prodAutoTimer,prodIsDragging=false,prodStartX=0,prodCurTranslate=0,prodPrevTranslate=0;
const prodTrack=document.getElementById('carTrack');const prodMain=document.getElementById('carouselMain');

function prodSetSlide(animate){
  if(!prodTrack) return;
  if(animate!==false)prodTrack.style.transition='transform .4s cubic-bezier(.25,1,.5,1)';
  else prodTrack.style.transition='none';
  prodTrack.style.transform=`translateX(-${prodCurSlide*100}%)`;
  document.querySelectorAll('.thumb').forEach((t,i)=>{t.classList.toggle('active',i===prodCurSlide)});
}
function prodGoSlide(i){prodCurSlide=i;prodSetSlide();prodResetAuto()}
function prodNextSlide(){prodCurSlide=(prodCurSlide+1)%prodTotalSlides;prodSetSlide();prodResetAuto()}
function prodPrevSlide(){prodCurSlide=(prodCurSlide-1+prodTotalSlides)%prodTotalSlides;prodSetSlide();prodResetAuto()}
function prodStartAuto(){if(!prodTrack) return;prodStopAuto();prodAutoTimer=setInterval(()=>{prodCurSlide=(prodCurSlide+1)%prodTotalSlides;prodSetSlide()},3000)}
function prodStopAuto(){if(prodAutoTimer){clearInterval(prodAutoTimer);prodAutoTimer=null}}
function prodResetAuto(){prodStopAuto();prodStartAuto()}

if (prodMain) prodMain.addEventListener('mouseenter',prodStopAuto);
if (prodMain) prodMain.addEventListener('mouseleave',()=>{if(!prodIsDragging)prodStartAuto()});

// Drag/swipe
if (prodMain) {
  prodMain.addEventListener('mousedown',prodDStart);
  prodMain.addEventListener('touchstart',prodDStart,{passive:true});
  prodMain.addEventListener('mousemove',prodDMove);
  prodMain.addEventListener('touchmove',prodDMove,{passive:true});
  prodMain.addEventListener('mouseup',prodDEnd);
  prodMain.addEventListener('mouseleave',prodDEnd);
  prodMain.addEventListener('touchend',prodDEnd);
}

function prodDStart(e){prodIsDragging=true;prodStartX=e.type.includes('mouse')?e.pageX:e.touches[0].clientX;prodTrack.classList.add('dragging');prodStopAuto()}
function prodDMove(e){if(!prodIsDragging)return;const x=e.type.includes('mouse')?e.pageX:e.touches[0].clientX;prodCurTranslate=x-prodStartX}
function prodDEnd(){if(!prodIsDragging)return;prodIsDragging=false;prodTrack.classList.remove('dragging');
  const w=prodMain.offsetWidth;if(prodCurTranslate<-w*0.15&&prodCurSlide<prodTotalSlides-1)prodCurSlide++;
  else if(prodCurTranslate>w*0.15&&prodCurSlide>0)prodCurSlide--;
  prodCurTranslate=0;prodSetSlide();prodStartAuto()}

// Quantity
function changeQty(d){const i=document.getElementById('qtyInput');if(!i)return;let v=parseInt(i.value)||1;v=Math.max(1,v+d);i.value=v}

// Promo toggle
function togglePromo(id){const el=document.getElementById(id);if(el)el.classList.toggle('open')}

// Smooth scroll for nav buttons
document.querySelectorAll('.nav-btn').forEach(b=>{b.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(b.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'})})});

prodStartAuto();


// Toggle description column expand/collapse
function toggleDesc() {
  const col = document.getElementById('descCol');
  const collapseBtn = document.getElementById('descCollapseBtn');
  if(!col || !collapseBtn) return;
  col.classList.toggle('expanded');
  if (col.classList.contains('expanded')) {
    collapseBtn.classList.remove('hidden');
    collapseBtn.classList.add('flex');
    col.style.maxHeight = 'none';
  } else {
    collapseBtn.classList.add('hidden');
    collapseBtn.classList.remove('flex');
    syncHeights();
    col.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function syncHeights() {
  const left = document.getElementById('descCol');
  const right = document.getElementById('specCol');
  if (left && right && !left.classList.contains('expanded')) {
    // Only sync height on desktop/tablet where they are side by side
    if (window.innerWidth >= 1024) {
      left.style.maxHeight = right.offsetHeight + 'px';
    } else {
      left.style.maxHeight = '66vh'; // Reset on mobile
    }
  }
}

window.addEventListener('load', syncHeights);
window.addEventListener('resize', syncHeights);

// Open spec modal
function openSpecModal() {
  const m = document.getElementById('specModal');
  if(m) {
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close spec modal
function closeSpecModal(e) {
  if (e && e.target !== e.currentTarget) return;
  const m = document.getElementById('specModal');
  if(m) {
    m.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeSpecModal();
  }
});

// Ensure DOMContentLoaded fires if script loaded late
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function() {
        var event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
    }, 50);
}