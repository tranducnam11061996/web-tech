"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import ProgressiveImage from "./ProgressiveImage";

export default function ProductCarousel({ productData }: { productData: any }) {
  const totalSlides = productData?.images?.length || 5;
  const [curSlide, setCurSlide] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const dragTranslateRef = useRef(0);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const realIndex = curSlide === 0 ? totalSlides - 1 : curSlide === totalSlides + 1 ? 0 : curSlide - 1;

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
    };
  }, [totalSlides]);

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

  const nextSlide = () => {
    if (curSlide >= totalSlides + 1) return;
    setIsTransitioning(true);
    setCurSlide((prev) => prev + 1);
    resetAuto();
  };

  const prevSlide = () => {
    if (curSlide <= 0) return;
    setIsTransitioning(true);
    setCurSlide((prev) => prev - 1);
    resetAuto();
  };

  const startAuto = () => {
    stopAuto();
    autoTimerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setCurSlide((prev) => prev + 1);
    }, 3000);
  };

  const stopAuto = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
  };

  const resetAuto = () => {
    stopAuto();
    startAuto();
  };

  const dStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = "touches" in e ? e.touches[0].clientX : e.pageX;
    dragTranslateRef.current = 0;
    stopAuto();
  };

  const dMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const x = "touches" in e ? e.touches[0].clientX : e.pageX;
    dragTranslateRef.current = x - startXRef.current;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(-${curSlide * 100}% + ${dragTranslateRef.current}px))`;
    }
  };

  const dEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const w = mainRef.current?.offsetWidth || 1;
    if (dragTranslateRef.current < -w * 0.15) {
      setIsTransitioning(true);
      setCurSlide((prev) => prev + 1);
    } else if (dragTranslateRef.current > w * 0.15) {
      setIsTransitioning(true);
      setCurSlide((prev) => prev - 1);
    }
    dragTranslateRef.current = 0;
    startAuto();
  };

  const images = useMemo(
    () => Array.from({ length: totalSlides }).map((_, i) => productData?.images?.[i] || productData?.images?.[0] || ""),
    [productData?.images, totalSlides],
  );
  const clonedImages = useMemo(
    () => [images[images.length - 1], ...images, images[0]],
    [images],
  );

  return (
    <div className="w-full lg:w-[60%] lg:sticky lg:top-6 lg:self-start min-w-0">
      <div className="flex flex-col-reverse lg:flex-row gap-3 lg:items-stretch min-w-0">
        {/* Thumbnails */}
        <div className="w-full lg:w-[15%] shrink-0" style={{ containerType: "inline-size" }}>
          <div
            className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 lg:pb-0 h-full lg:max-h-[calc(5*100cqi+4*0.75rem)]"
            id="thumbList"
          >
            {images.map((imgSrc, i) => (
              <div
                key={i}
                className={`thumb ${
                  realIndex === i ? "active" : ""
                } shrink-0 w-[23%] lg:w-full lg:aspect-square border border-[#27272a] rounded-md overflow-hidden cursor-pointer`}
                onClick={() => {
                  setIsTransitioning(true);
                  setCurSlide(i + 1);
                  resetAuto();
                }}
              >
                <ProgressiveImage
                  src={imgSrc}
                  alt={`${productData.name} thumb ${i + 1}`}
                  className="w-full h-full object-cover text-transparent text-[0px]"
                />
              </div>
            ))}
          </div>
        </div>
        {/* Main carousel */}
        <div className="w-full lg:flex-1 relative lg:h-auto min-w-0">
          <div
            className="carousel-main aspect-[4/3] lg:aspect-auto lg:h-full lg:w-full overflow-hidden rounded-xl bg-black"
            id="carouselMain"
            ref={mainRef}
            onMouseEnter={stopAuto}
            onMouseLeave={() => {
              if (!isDragging) startAuto();
            }}
            onMouseDown={dStart}
            onTouchStart={dStart}
            onMouseMove={dMove}
            onTouchMove={dMove}
            onMouseUp={dEnd}
            onTouchEnd={dEnd}
          >
            <div
              ref={trackRef}
              className="carousel-track"
              id="carTrack"
              style={{
                transform: `translateX(-${curSlide * 100}%)`,
                transition: isDragging || !isTransitioning ? "none" : "transform .4s cubic-bezier(.25,1,.5,1)",
              }}
            >
              {clonedImages.map((imgSrc, i) => (
                <div className="carousel-slide" key={i}>
                  <div className="w-full h-full p-2 lg:p-6 flex items-center justify-center">
                    <ProgressiveImage
                      src={imgSrc}
                      alt={`${productData.name} image ${i}`}
                      className="w-full h-full object-contain text-transparent text-[0px] drop-shadow-xl"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="car-arrow left-3" onClick={prevSlide}>
              ‹
            </div>
            <div className="car-arrow right-3" onClick={nextSlide}>
              ›
            </div>
          </div>
        </div>
      </div>

      <p className="text-[14px] text-gray-600 text-center mt-3 italic lg:pl-[calc(15%+0.75rem)]">
        Hình ảnh mang tính chất minh họa / tham khảo !
      </p>

      {/* Nav Buttons */}
      <div className="flex gap-3 mt-5 justify-center flex-wrap lg:pl-[calc(15%+0.75rem)]">
        <a href="#sec-images" className="nav-btn">
          <div className="icon">📷</div>
          <span>
            Hình ảnh<br />
            sản phẩm
          </span>
        </a>
        <a href="#sec-specs" className="nav-btn">
          <div className="icon">📋</div>
          <span>
            Thông số<br />
            kỹ thuật
          </span>
        </a>
        <a href="#sec-faq" className="nav-btn">
          <div className="icon">💬</div>
          <span>
            Câu hỏi<br />
            thường gặp
          </span>
        </a>
        <a href="#sec-reviews" className="nav-btn">
          <div className="icon">⭐</div>
          <span>
            Đánh giá<br />
            sản phẩm
          </span>
        </a>
      </div>
    </div>
  );
}
