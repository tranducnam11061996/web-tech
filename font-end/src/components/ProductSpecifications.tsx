"use client";
import React, { useState, useEffect, useRef } from 'react';
import { sanitizeLegacyHtml } from '@/lib/sanitizeHtml';

interface ProductSpecificationsProps {
  productName: string;
  specs: string;
}

export default function ProductSpecifications({ productName, specs }: ProductSpecificationsProps) {
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [showSpecBtn, setShowSpecBtn] = useState(true);
  const [headers, setHeaders] = useState<Array<{ index: number, title: string }>>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  
  // Drag to scroll and scroll sync refs for NavBar
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
    isClickScrolling: false,
    clickTimeout: null as NodeJS.Timeout | null
  });
  

  const specRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let specObserver: ResizeObserver | null = null;
    if (specRef.current) {
      specObserver = new ResizeObserver(() => {
        if (specRef.current) {
          setShowSpecBtn(specRef.current.scrollHeight > specRef.current.clientHeight);
        }
      });
      specObserver.observe(specRef.current);
    }
    return () => specObserver?.disconnect();
  }, [specs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSpecModalOpen(false);
      }
    };

    if (specModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [specModalOpen]);

  useEffect(() => {
    if (specModalOpen && modalScrollRef.current) {
      // Small timeout ensures DOM is fully painted after modal opens
      setTimeout(() => {
        if (!modalScrollRef.current) return;
        const elements = modalScrollRef.current.querySelectorAll('.product-spec-list td[colspan="2"]');
        
        const newHeaders: Array<{ index: number, title: string }> = [];
        Array.from(elements).forEach((el, index) => {
          newHeaders.push({ index, title: el.textContent?.trim() || '' });
        });
        
        setHeaders(newHeaders);
        if (newHeaders.length > 0) {
          setActiveIndex(0);
        }
      }, 50);
    }
  }, [specModalOpen, specs]);

  const getHeaderElements = () => {
    if (!modalScrollRef.current) return [];
    return Array.from(modalScrollRef.current.querySelectorAll('.product-spec-list td[colspan="2"]')) as HTMLElement[];
  };

  const handleScroll = () => {
    // Detect when scrolling completely stops to release the click-scroll lock
    if (dragRef.current.isClickScrolling) {
      if (dragRef.current.clickTimeout) clearTimeout(dragRef.current.clickTimeout);
      dragRef.current.clickTimeout = setTimeout(() => {
        dragRef.current.isClickScrolling = false;
      }, 150);
    }

    if (!modalScrollRef.current || headers.length === 0) return;
    
    const elements = getHeaderElements();
    if (elements.length !== headers.length) return;
    
    const container = modalScrollRef.current;
    const containerTop = container.getBoundingClientRect().top;
    
    let currentActive = 0;
    for (let i = 0; i < headers.length; i++) {
      const el = elements[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        // With headers outside the scroll container, threshold is now small
        if (rect.top - containerTop <= 35) { 
          currentActive = i;
        } else {
          break; 
        }
      }
    }
    
    // Check if scrolled to bottom
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
      currentActive = headers.length - 1;
    }

    if (currentActive !== activeIndex) {
      // If the scroll was triggered by a click, we trust the click's activeIndex 
      // and prevent the scroll spy from overriding it mid-scroll or at the bottom bounds.
      if (!dragRef.current.isClickScrolling) {
        setActiveIndex(currentActive);
        
        if (navScrollRef.current) {
          const activeBtn = navScrollRef.current.querySelector(`#btn-spec-${currentActive}`) as HTMLElement;
          if (activeBtn) {
            const navRect = navScrollRef.current.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            
            if (btnRect.left < navRect.left || btnRect.right > navRect.right) {
              activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
          }
        }
      }
    }
  };

  const scrollToHeader = (index: number) => {
    const elements = getHeaderElements();
    const el = elements[index];
    if (el && modalScrollRef.current) {
      // Prevent nav bar from auto-scrolling and cancelling this smooth scroll.
      // We rely on handleScroll to detect when the scroll actually finishes.
      dragRef.current.isClickScrolling = true;
      if (dragRef.current.clickTimeout) clearTimeout(dragRef.current.clickTimeout);
      dragRef.current.clickTimeout = setTimeout(() => {
        dragRef.current.isClickScrolling = false;
      }, 150);

      const container = modalScrollRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      // Since headers are now outside the scroll area, offset is just a visual padding
      const offset = 15; 
      
      container.scrollTo({
        top: container.scrollTop + (elRect.top - containerRect.top) - offset,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!navScrollRef.current) return;
    dragRef.current.isDragging = true;
    dragRef.current.hasDragged = false;
    dragRef.current.startX = e.pageX - navScrollRef.current.offsetLeft;
    dragRef.current.scrollLeft = navScrollRef.current.scrollLeft;
    navScrollRef.current.style.cursor = 'grabbing';
  };

  const handleMouseLeave = () => {
    dragRef.current.isDragging = false;
    if (navScrollRef.current) navScrollRef.current.style.cursor = 'grab';
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    if (navScrollRef.current) navScrollRef.current.style.cursor = 'grab';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.isDragging || !navScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - navScrollRef.current.offsetLeft;
    const walk = (x - dragRef.current.startX) * 2; 
    
    // Threshold to differentiate drag from accidental click jitter
    if (Math.abs(walk) > 5) {
      dragRef.current.hasDragged = true;
    }
    
    navScrollRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  if (!specs) return null;

  return (
    <>
      <div className="lg:w-2/5" id="cot-thongsokythuat">
        <div className="lg:sticky lg:top-6">
          <div id="specCol" ref={specRef} className="pt-6 relative" style={{ maxHeight: "66vh", overflow: "hidden" }}>

            <div className="pb-4 border-b border-[#1a1a1e]">
              <h3 className="font-bold text-lg text-white">Thông số kỹ thuật</h3>
            </div>

            <div className="px-2 product-spec-list" dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(specs) }}>
            </div>

            {/* Fade overlay + expand button */}
            {showSpecBtn && (
              <>
                <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-t from-[#111115] via-[#111115]/80 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                  <button className="px-6 py-2.5 bg-red-600/90 backdrop-blur-md text-white text-sm font-bold rounded-lg hover:bg-red-500 transition flex items-center gap-2 shadow-md shadow-black/20" onClick={() => setSpecModalOpen(true)}>
                    Xem thêm cấu hình chi tiết
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* MODAL: Thông số kỹ thuật chi tiết */}
      <div id="specModal" className={`modal-backdrop ${specModalOpen ? "active" : ""}`} onClick={() => setSpecModalOpen(false)}>
        <div className="modal-content flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

          <div className="flex-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1a1a1e] bg-[#111115] rounded-t-2xl">
              <h3 className="font-bold text-base text-white">Thông số kỹ thuật</h3>
              <button className="w-8 h-8 rounded-full bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition" onClick={() => setSpecModalOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Product Title */}
            <div className="flex items-center gap-3 p-5 border-b border-[#1a1a1e]">
              <div className="w-12 h-12 bg-[#0d0d10] border border-[#1a1a1e] rounded-lg flex items-center justify-center shrink-0">
                <span className="text-xl opacity-30">🖥️</span>
              </div>
              <p className="text-sm font-medium text-white">{productName}</p>
            </div>

            {/* Scrollable Nav Bar */}
            {headers.length > 0 ? (
              <div className="bg-[#111115] border-b border-[#1a1a1e]">
                <div 
                  ref={navScrollRef}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  className="flex items-center overflow-x-auto whitespace-nowrap px-5 gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-grab select-none"
                >
                  {headers.map(header => (
                    <button
                      key={header.index}
                      id={`btn-spec-${header.index}`}
                      onClick={(e) => {
                        if (dragRef.current.hasDragged) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        scrollToHeader(header.index);
                      }}
                      className={`py-3 text-[13px] font-bold border-b-2 transition-colors ${activeIndex === header.index ? 'text-red-500 border-red-500' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
                    >
                      {header.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-5 pt-5 pb-3">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Thông số chung</h4>
              </div>
            )}
          </div>

          {/* Full Spec Table */}
          <div className="flex-1 overflow-y-auto" ref={modalScrollRef} onScroll={handleScroll}>
            <div className="px-3 pb-5 pt-3">
              <div className="product-spec-list" dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(specs) }}>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
