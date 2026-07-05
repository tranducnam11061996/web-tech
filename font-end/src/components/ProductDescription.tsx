"use client";
import React, { useState, useEffect, useRef } from 'react';

interface ProductDescriptionProps {
  productName: string;
  description: string;
}

export default function ProductDescription({ productName, description }: ProductDescriptionProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDescBtn, setShowDescBtn] = useState(true);
  const descRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let descObserver: ResizeObserver | null = null;
    if (descRef.current) {
      descObserver = new ResizeObserver(() => {
        if (descRef.current) {
          setShowDescBtn(descRef.current.scrollHeight > descRef.current.clientHeight);
        }
      });
      descObserver.observe(descRef.current);
    }
    return () => descObserver?.disconnect();
  }, [descExpanded]);

  if (!description) return null;

  return (
    <div className="lg:w-3/5 scroll-mt-[15vh]" id="cot-motasanpham">
      <div id="descCol" ref={descRef} className={`relative py-6 transition-all duration-700 ease-in-out col-collapsed ${descExpanded ? "expanded" : ""}`} style={{ maxHeight: descExpanded ? `${descRef.current?.scrollHeight || 2000}px` : "66vh", overflow: "hidden" }}>

        <h2 className="text-lg font-bold text-white mb-6 border-b border-[#1a1a1e] pb-4">Đánh giá: {productName}</h2>

        {/* Article content */}
        <div 
          className={`static-html-content transition-all duration-500 ease-in-out text-gray-300 text-[15px] leading-relaxed 
            [&>h1]:text-white [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6
            [&>h2]:text-white [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5
            [&>h3]:text-white [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-4
            [&>p]:mb-4 [&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-4
            [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4
            [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4`}
          dangerouslySetInnerHTML={{ __html: description }}
        />

        {/* Fade overlay + expand button */}
        {showDescBtn && !descExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-[#111115] via-[#111115]/90 to-transparent pointer-events-none" />
        )}

        {showDescBtn && !descExpanded && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
            <button
              className="bg-[#18181b] border border-[#27272a] hover:border-[#0b63e5] hover:text-[#0b63e5] text-white font-medium px-6 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-md shadow-black/10"
              onClick={() => setDescExpanded(true)}
            >
              Xem thêm
              <svg
                className="w-4 h-4 transition-transform duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Expand button when already expanded (shown below content) */}
      <div id="descCollapseBtn" className={`${descExpanded ? "flex" : "hidden"} mt-6 justify-center relative z-10`}>
        <button 
          className="bg-[#18181b] border border-[#27272a] hover:border-[#0b63e5] hover:text-[#0b63e5] text-white font-medium px-6 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-md shadow-black/10" 
          onClick={() => {
            setDescExpanded(false);
            const el = document.getElementById('cot-motasanpham');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Thu gọn
          <svg
            className="w-4 h-4 transition-transform duration-300 rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
