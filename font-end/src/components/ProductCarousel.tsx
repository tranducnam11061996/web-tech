"use client";

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pause,
  Play,
  Share2,
  Users,
  Video,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ProductDetailData,
  ProductGalleryImage,
} from "@/types/product-detail";
import ProgressiveImage from "./ProgressiveImage";
import FavoriteButton from "./FavoriteButton";
import { openProductSpecifications } from "./ProductSpecificationsOpenButton";

const ProductVideoModal = dynamic(() => import("./ProductVideoModal"), { ssr: false });

function normalizeGalleryImages(input: unknown): ProductGalleryImage[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (typeof item === "string") return { url: item };
      const record = item as Partial<ProductGalleryImage>;
      return record.url
        ? { url: record.url, alt: record.alt, type: record.type }
        : null;
    })
    .filter(Boolean) as ProductGalleryImage[];
}

function copyWithLegacyFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function ProductCarousel({
  productData,
}: {
  productData: ProductDetailData;
}) {
  const productImages = useMemo(() => {
    const grouped = normalizeGalleryImages(productData.imageGroups?.product);
    return grouped.length > 0
      ? grouped
      : normalizeGalleryImages(productData.images);
  }, [productData.imageGroups?.product, productData.images]);
  const customerImages = useMemo(
    () => normalizeGalleryImages(productData.imageGroups?.customer),
    [productData.imageGroups?.customer],
  );
  const [activeImageTab, setActiveImageTab] = useState<"product" | "customer">(
    "product",
  );
  const [actionMessage, setActionMessage] = useState("");
  const currentGallery =
    activeImageTab === "customer" && customerImages.length > 0
      ? customerImages
      : productImages;
  const videos = productData.videos || [];
  const hasSpecifications = productData.hasSpecifications === true;
  const totalSlides = currentGallery.length || 1;
  const [curSlide, setCurSlide] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const dragTranslateRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canScrollRailLeft, setCanScrollRailLeft] = useState(false);
  const [canScrollRailRight, setCanScrollRailRight] = useState(false);

  const checkRailScroll = useCallback(() => {
    if (railRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
      setCanScrollRailLeft(scrollLeft > 0);
      setCanScrollRailRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  useEffect(() => {
    checkRailScroll();
    window.addEventListener("resize", checkRailScroll);
    return () => window.removeEventListener("resize", checkRailScroll);
  }, [checkRailScroll, totalSlides]);

  const showMessage = useCallback((message: string) => {
    setActionMessage(message);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setActionMessage(""), 2400);
  }, []);

  const stopAuto = useCallback(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    if (totalSlides <= 1 || isAutoPaused) return;
    autoTimerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setCurSlide((previous) => previous + 1);
    }, 4200);
  }, [isAutoPaused, stopAuto, totalSlides]);

  const resetAuto = useCallback(() => {
    stopAuto();
    startAuto();
  }, [startAuto, stopAuto]);

  const realIndex =
    curSlide === 0
      ? totalSlides - 1
      : curSlide === totalSlides + 1
        ? 0
        : curSlide - 1;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setIsAutoPaused(media.matches);
    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);
    return () => media.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    setIsTransitioning(false);
    setCurSlide(1);
  }, [activeImageTab]);

  useEffect(() => {
    startAuto();
    const handleVisibilityChange = () => {
      if (document.hidden) stopAuto();
      else startAuto();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopAuto();
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [startAuto, stopAuto]);

  useEffect(() => {
    if (curSlide === totalSlides + 1) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurSlide(1);
      }, 400);
      return () => clearTimeout(timer);
    }
    if (curSlide === 0) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurSlide(totalSlides);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [curSlide, totalSlides]);

  const nextSlide = useCallback(() => {
    if (curSlide >= totalSlides + 1) return;
    setIsTransitioning(true);
    setCurSlide((previous) => previous + 1);
    resetAuto();
  }, [curSlide, resetAuto, totalSlides]);

  const prevSlide = useCallback(() => {
    if (curSlide <= 0) return;
    setIsTransitioning(true);
    setCurSlide((previous) => previous - 1);
    resetAuto();
  }, [curSlide, resetAuto]);

  const dragStart = (event: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current =
      "touches" in event ? event.touches[0].clientX : event.pageX;
    dragTranslateRef.current = 0;
    stopAuto();
  };

  const dragMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const x = "touches" in event ? event.touches[0].clientX : event.pageX;
    dragTranslateRef.current = x - startXRef.current;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(-${curSlide * 100}% + ${dragTranslateRef.current}px))`;
    }
  };

  const dragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const width = mainRef.current?.offsetWidth || 1;
    if (dragTranslateRef.current < -width * 0.15) nextSlide();
    else if (dragTranslateRef.current > width * 0.15) prevSlide();
    else if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${curSlide * 100}%)`;
    }
    dragTranslateRef.current = 0;
    startAuto();
  };

  const fallback =
    typeof productData.images?.[0] === "string"
      ? productData.images[0]
      : "https://placehold.co/800x680/111115/71717a?text=No+Image";
  const images = useMemo(
    () =>
      Array.from({ length: totalSlides }).map(
        (_, index) =>
          currentGallery[index] || currentGallery[0] || { url: fallback },
      ),
    [currentGallery, fallback, totalSlides],
  );
  const clonedImages = useMemo(
    () => [images[images.length - 1], ...images, images[0]],
    [images],
  );

  const handleShare = async () => {
    const shareData = {
      title: productData.name,
      text: productData.name,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showMessage("Đã mở bảng chia sẻ");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
      } else {
        copyWithLegacyFallback(shareData.url);
      }
      showMessage("Đã sao chép đường dẫn sản phẩm");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        copyWithLegacyFallback(shareData.url);
        showMessage("Đã sao chép đường dẫn sản phẩm");
      } catch {
        showMessage("Chưa thể sao chép đường dẫn");
      }
    }
  };

  return (
    <section className="product-gallery-column" aria-label="Hình ảnh sản phẩm">
      <div
        className="product-gallery-stage"
        ref={mainRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Bộ ảnh ${productData.name}`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") prevSlide();
          if (event.key === "ArrowRight") nextSlide();
        }}
        onMouseEnter={stopAuto}
        onMouseLeave={() => {
          if (isDragging) dragEnd();
          else startAuto();
        }}
        onMouseDown={dragStart}
        onMouseMove={dragMove}
        onMouseUp={dragEnd}
        onTouchStart={dragStart}
        onTouchMove={dragMove}
        onTouchEnd={dragEnd}
        onFocusCapture={stopAuto}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) startAuto();
        }}
      >
        <div className="product-gallery-actions">
          <FavoriteButton
            productId={Number(productData.id)}
            variant="gallery"
            onChange={(favorited) => showMessage(
              favorited
                ? "Đã thêm sản phẩm vào danh sách yêu thích"
                : "Đã bỏ sản phẩm khỏi danh sách yêu thích",
            )}
          />
          <button
            type="button"
            className="product-gallery-icon-button"
            aria-label="Chia sẻ sản phẩm"
            onClick={handleShare}
          >
            <Share2 aria-hidden="true" />
          </button>
          {totalSlides > 1 && (
            <button
              type="button"
              className="product-gallery-icon-button"
              aria-label={isAutoPaused ? "Tiếp tục tự chuyển ảnh" : "Tạm dừng tự chuyển ảnh"}
              aria-pressed={isAutoPaused}
              onClick={() => setIsAutoPaused((current) => !current)}
            >
              {isAutoPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </button>
          )}
        </div>

        <div
          ref={trackRef}
          className="product-gallery-track"
          style={{
            transform: `translateX(-${curSlide * 100}%)`,
            transition:
              isDragging || !isTransitioning
                ? "none"
                : "transform .4s cubic-bezier(.25,1,.5,1)",
          }}
        >
          {clonedImages.map((image, index) => (
            <div className="product-gallery-slide" key={`${image.url}-${index}`} aria-hidden={index !== curSlide}>
              <ProgressiveImage
                src={image.url}
                alt={image.alt || `${productData.name} - ảnh ${index + 1}`}
                loading={index === 1 ? "eager" : "lazy"}
                fetchPriority={index === 1 ? "high" : "auto"}
                draggable={false}
                disableLoadingEffects
                className="product-gallery-image"
              />
            </div>
          ))}
        </div>

        {totalSlides > 1 && (
          <>
            <button
              type="button"
              className="product-gallery-arrow is-left"
              aria-label="Ảnh trước"
              onClick={prevSlide}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="product-gallery-arrow is-right"
              aria-label="Ảnh tiếp theo"
              onClick={nextSlide}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        )}

        {customerImages.length > 0 && (
          <div className="product-gallery-tabs" role="group" aria-label="Nhóm ảnh">
            <button
              type="button"
              className={activeImageTab === "product" ? "is-active" : ""}
              onClick={() => setActiveImageTab("product")}
            >
              <Camera aria-hidden="true" /> Ảnh sản phẩm
            </button>
            <button
              type="button"
              className={activeImageTab === "customer" ? "is-active" : ""}
              onClick={() => setActiveImageTab("customer")}
            >
              <Users aria-hidden="true" /> Ảnh khách hàng
            </button>
          </div>
        )}
      </div>
      <p className="product-gallery-note">
        Hình ảnh mang tính chất minh họa / tham khảo
      </p>
      <div className="product-gallery-rail-container">
        {canScrollRailLeft && (
          <button
            type="button"
            className="product-gallery-rail-arrow is-left"
            aria-label="Cuộn ảnh sang trái"
            onClick={() => {
              if (railRef.current) {
                railRef.current.scrollBy({ left: -300, behavior: "smooth" });
              }
            }}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        )}
        <div
          ref={railRef}
          className="product-gallery-rail"
          aria-label="Điều hướng hình ảnh"
          onScroll={checkRailScroll}
        >
          {videos.length > 0 ? (
            <button
              type="button"
              className="product-gallery-utility"
              aria-label="Mở video sản phẩm"
              onClick={() => setIsVideoModalOpen(true)}
            >
              <Video aria-hidden="true" />
              <span>Video</span>
            </button>
          ) : null}
          {hasSpecifications ? (
            <button
              type="button"
              className="product-gallery-utility"
              aria-label="Mở thông số kỹ thuật"
              onClick={openProductSpecifications}
            >
              <ClipboardList aria-hidden="true" />
              <span>Thông số</span>
            </button>
          ) : null}
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image.url}-thumb-${index}`}
              className={`product-gallery-thumbnail ${realIndex === index ? "is-active" : ""}`}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-current={realIndex === index ? "true" : undefined}
              onClick={() => {
                setIsTransitioning(true);
                setCurSlide(index + 1);
                resetAuto();
              }}
            >
              <ProgressiveImage
                src={image.url}
                alt=""
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
        {canScrollRailRight && (
          <button
            type="button"
            className="product-gallery-rail-arrow is-right"
            aria-label="Cuộn ảnh sang phải"
            onClick={() => {
              if (railRef.current) {
                railRef.current.scrollBy({ left: 300, behavior: "smooth" });
              }
            }}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>
      {isVideoModalOpen ? (
        <ProductVideoModal
          productName={productData.name}
          videos={videos}
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
        />
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {actionMessage}
      </p>
    </section>
  );
}
