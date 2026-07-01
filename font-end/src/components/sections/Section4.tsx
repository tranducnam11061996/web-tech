export default function Section4() {
  return (
    <>
  {/*  START section-4  */}
  <section className="section-4 shop-by-category py-10 bg-dark-200" id="section-4">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      {/*  Section Header  */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Shop by Category</h2>
        <div className="flex items-center gap-3">
          <button id="prevBtn"
            className="hidden md:flex w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            aria-label="Previous">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button id="nextBtn"
            className="hidden md:flex w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            aria-label="Next">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="h-10 px-5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 flex items-center justify-center text-sm font-semibold text-white hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-900/20">
            View All
          </button>
        </div>
      </div>

      {/*  Carousel Container  */}
      <div className="relative overflow-hidden" id="carouselContainer">

        {/*  Track  */}
        <div className="carousel-track" id="carouselTrack">

          {/*  Card 1: ASUS (with NEW badge)  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">ASUS</span>
              </div>
              <span
                className="absolute top-2 left-2 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide">NEW</span>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">ASUS</p>
          </div>

          {/*  Card 2: MacBook  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="14" rx="2" strokeWidth="1.5" />
                  <path strokeWidth="1.5" d="M2 8h20" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">MacBook</p>
          </div>

          {/*  Card 3: Gaming Setups  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Gaming Setups</p>
          </div>

          {/*  Card 4: Mini PCs  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="6" width="16" height="12" rx="1.5" strokeWidth="1.5" />
                  <circle cx="12" cy="12" r="2" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Mini PCs</p>
          </div>

          {/*  Card 5: Graphics Cards  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Graphics Cards</p>
          </div>

          {/*  Card 6: Collectables  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Collectables</p>
          </div>

          {/*  Card 7: SSD's  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="7" width="18" height="10" rx="1.5" strokeWidth="1.5" />
                  <path strokeWidth="1.5" d="M7 11h4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">SSD's</p>
          </div>

          {/*  Card 8: PC Monitors  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.5" />
                  <path strokeWidth="1.5" d="M8 21h8M12 17v4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">PC Monitors</p>
          </div>

          {/*  Card 9: Handhelds  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="2" width="12" height="20" rx="3" strokeWidth="1.5" />
                  <path strokeWidth="1.5" d="M12 18h.01" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Handhelds</p>
          </div>

          {/*  Card 10: Gaming Chairs  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M5 3h14l-1 8H6L5 3zM5 11h14M7 19v3m5-3v3m5-3v3M4 21h16" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Gaming Chairs</p>
          </div>

          {/*  Card 11: Headphones  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M3 18v-6a9 9 0 0118 0v6M3 18h18M9 14l-3 3m0 0l3 3m-3-3h12a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Headphones</p>
          </div>

          {/*  Card 12: Keyboards  */}
          <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer">
            <div
              className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="6" width="20" height="12" rx="2" strokeWidth="1.5" />
                  <path strokeWidth="1.5" d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center font-medium">Keyboards</p>
          </div>

        </div>
      </div>
    </div>
  </section>

  {/*  END section-4  */}
    </>
  );
}
