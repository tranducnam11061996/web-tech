"use client";

import { useId, useState, type ReactNode } from "react";

export default function ProductDescriptionDisclosure({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();

  return (
    <div className="product-description-disclosure py-6" data-expanded={isExpanded}>
      <div id={contentId} data-testid="product-description-content" className="product-description-content relative">
        {children}
      </div>
      <button
        type="button"
        className="product-description-toggle"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        {isExpanded ? "Thu gọn" : "Xem thêm"}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
