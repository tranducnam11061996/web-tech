"use client";
import React, { useState, useEffect, useRef } from 'react';

interface ProductSpecificationsProps {
  productName: string;
  specs: string;
}

export default function ProductSpecifications({ productName, specs }: ProductSpecificationsProps) {
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [showSpecBtn, setShowSpecBtn] = useState(true);
  const specRef = useRef<HTMLDivElement>(null);

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

  if (!specs) return null;

  return (
    <>
      <div className="lg:w-2/5" id="cot-thongsokythuat">
        <div className="lg:sticky lg:top-6">
          <div id="specCol" ref={specRef} className="pt-6 relative" style={{ maxHeight: "66vh", overflow: "hidden" }}>

            <div className="pb-4 border-b border-[#1a1a1e]">
              <h3 className="font-bold text-lg text-white">Thông số kỹ thuật</h3>
            </div>

            <div className="px-2 product-spec-list" dangerouslySetInnerHTML={{ __html: specs }}>
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
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>

          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#1a1a1e] sticky top-0 bg-[#111115] z-10 rounded-t-2xl">
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

          {/* Section Title */}
          <div className="px-5 pt-5 pb-3">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Thông số chung</h4>
          </div>

          {/* Full Spec Table */}
          <div className="px-3 pb-5">
            <div className="product-spec-list" dangerouslySetInnerHTML={{ __html: specs }}>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
