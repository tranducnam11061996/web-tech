"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProductVideoSummary } from "@/types/product-detail";
import { useDialogAccessibility } from "./useDialogAccessibility";

type ProductVideoModalProps = {
  productName: string;
  videos: ProductVideoSummary[];
  isOpen: boolean;
  onClose: () => void;
};

export default function ProductVideoModal({ productName, videos, isOpen, onClose }: ProductVideoModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useDialogAccessibility(isOpen, onClose);

  useEffect(() => {
    if (isOpen) setActiveIndex(0);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, videos.length - 1)));
  }, [videos.length]);

  const activeVideo = videos[activeIndex];
  if (!isOpen || !activeVideo) return null;

  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < videos.length - 1;
  return (
    <div className="product-video-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="product-video-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-video-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="product-video-modal-header">
          <div>
            <h2 id="product-video-modal-title">Video sản phẩm</h2>
            <p>{productName}</p>
          </div>
          <button type="button" className="product-video-modal-close" onClick={onClose} aria-label="Đóng video sản phẩm">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="product-video-modal-viewport">
          <div className="product-video-modal-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
            {videos.map((video, index) => (
              <section className="product-video-modal-slide" key={video.id} aria-hidden={index !== activeIndex}>
                {index === activeIndex ? (
                  <iframe
                    src={video.embedUrl}
                    title={`${productName} - video ${index + 1}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : null}
              </section>
            ))}
          </div>
        </div>

        <footer className="product-video-modal-footer">
          <p className="product-video-modal-description">{activeVideo.description || "Video giới thiệu sản phẩm"}</p>
          <div className="product-video-modal-navigation">
            <span role="status" aria-live="polite">{activeIndex + 1} / {videos.length}</span>
            <button type="button" onClick={() => setActiveIndex((current) => current - 1)} disabled={!hasPrevious} aria-label="Video trước">
              <ChevronLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setActiveIndex((current) => current + 1)} disabled={!hasNext} aria-label="Video tiếp theo">
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
