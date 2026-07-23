"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

export type HomepageBrand = {
  id: number;
  name: string;
  slug: string;
  image: string;
  productCount: number;
};

const BRAND_CARD_BACKGROUNDS = [
  "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.06), rgba(255,255,255,0.01))",
  "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(139,92,246,0.07), rgba(255,255,255,0.01))",
  "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(59,130,246,0.06), rgba(255,255,255,0.01))",
  "linear-gradient(135deg, rgba(163,230,53,0.07), rgba(34,197,94,0.05), rgba(255,255,255,0.01))",
  "linear-gradient(135deg, rgba(249,115,22,0.07), rgba(236,72,153,0.05), rgba(255,255,255,0.01))",
] as const;

const SECTION_GLOWS = [
  { className: "left-[-12%] top-[-24%] h-[520px] w-[520px]", color: "rgba(34,211,238,0.22)", delay: "0s" },
  { className: "right-[-10%] top-[-18%] h-[500px] w-[500px]", color: "rgba(249,115,22,0.20)", delay: "-6s" },
  { className: "bottom-[-32%] left-[24%] h-[560px] w-[560px]", color: "rgba(236,72,153,0.20)", delay: "-12s" },
  { className: "bottom-[-34%] right-[8%] h-[540px] w-[540px]", color: "rgba(139,92,246,0.24)", delay: "-18s" },
  { className: "left-[38%] top-[-26%] h-[480px] w-[480px]", color: "rgba(163,230,53,0.14)", delay: "-24s" },
] as const;

function BrandArtwork({ brand }: { brand: HomepageBrand }) {
  const [failed, setFailed] = useState(false);

  if (!brand.image || failed) {
    return (
      <span
        data-section15-brand-fallback
        className="max-w-[90%] text-center text-sm font-bold leading-tight tracking-wide text-white/60 md:text-base"
      >
        {brand.name}
      </span>
    );
  }

  return (
    // Dynamic brand media comes from the trusted server bootstrap and may use legacy remote hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.image}
      alt={`Logo ${brand.name}`}
      title={brand.name}
      width={150}
      height={50}
      loading="lazy"
      fetchPriority="low"
      onError={() => setFailed(true)}
      className="max-h-[50px] max-w-[150px] object-contain opacity-80 motion-safe:transition-[transform,opacity,filter] motion-safe:duration-500 lg:group-hover:scale-105 lg:group-hover:opacity-100 lg:group-hover:brightness-110 lg:group-focus-visible:scale-105 lg:group-focus-visible:opacity-100"
    />
  );
}

export default function Section15({ brands = [] }: { brands?: HomepageBrand[] }) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMore = brands.length > 8;

  if (!brands.length) return null;

  const toggleExpanded = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setExpanded((value) => !value);
  };

  return (
    <section
      id="section-15"
      aria-labelledby="homepage-brands-title"
      className="w-full bg-[#111111] pb-1 pt-5"
    >
      <div data-section15-wrapper className="mx-auto max-w-[1800px] sm:px-6 lg:px-8">
        <div
          data-section15-shell
          className="relative mx-auto mb-5 max-w-[1800px] overflow-hidden bg-[#121212] px-4 py-10 md:px-12 md:py-16 lg:rounded-2xl"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
            {SECTION_GLOWS.map((glow) => (
              <span
                key={`${glow.className}-${glow.delay}`}
                className={`section15-blob absolute rounded-full ${glow.className}`}
                style={{
                  animationDelay: glow.delay,
                  background: `radial-gradient(circle, ${glow.color} 0%, transparent 70%)`,
                }}
              />
            ))}
          </div>
          <div aria-hidden="true" className="section15-noise pointer-events-none absolute inset-0 opacity-[0.03]" />
          <div
            aria-hidden="true"
            data-section15-inner-frame
            className="pointer-events-none absolute inset-4 hidden rounded-3xl border border-white/[0.05] bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] lg:block"
          />

          <header className="relative z-10 mb-6 flex items-center justify-between gap-4 md:mb-8">
            <h2
              id="homepage-brands-title"
              className="min-w-0 bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-2xl font-bold leading-[1.2] tracking-tight text-transparent md:text-3xl"
            >
              Thương hiệu phân phối
            </h2>
            {hasMore ? (
              <button
                type="button"
                data-section15-view-all
                aria-expanded={expanded}
                aria-controls="section15-brands-grid"
                onClick={toggleExpanded}
                className="shrink-0 rounded-full border border-white/[0.15] bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-3.5 py-1.5 text-xs font-semibold text-white outline-none motion-safe:transition-[background-color,border-color,box-shadow,transform] motion-safe:duration-300 hover:border-white/30 hover:from-cyan-500/40 hover:to-purple-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] sm:px-4 sm:py-2 sm:text-sm"
              >
                {expanded ? "Thu gọn" : "Xem tất cả"}
              </button>
            ) : null}
          </header>

          <div className="relative z-10">
            <div className="relative">
              <div
                ref={scrollRef}
                data-section15-scroll
                tabIndex={expanded ? -1 : 0}
                role="region"
                aria-label="Danh sách thương hiệu phân phối"
                className={`section15-scroll w-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
                  expanded
                    ? "max-h-none overflow-visible"
                    : "max-h-[366px] overflow-y-auto xl:max-h-[378px]"
                }`}
              >
                <div
                  id="section15-brands-grid"
                  data-section15-grid
                  className={`grid grid-cols-2 gap-4 pb-2 pt-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 xl:gap-5 2xl:grid-cols-6 ${
                    expanded ? "" : "xl:pr-5"
                  }`}
                >
                  {brands.map((brand, index) => (
                    <Link
                      key={brand.id}
                      href={`/brand/${brand.slug}`}
                      data-section15-card={brand.id}
                      title={`${brand.name} · ${brand.productCount} sản phẩm`}
                      style={{ background: BRAND_CARD_BACKGROUNDS[index % BRAND_CARD_BACKGROUNDS.length] }}
                      className="group relative flex h-[80px] w-full select-none items-center justify-center overflow-hidden rounded-lg border border-purple-500/10 px-4 outline-none backdrop-blur-sm motion-safe:transition-[transform,border-color,box-shadow,background-color] motion-safe:duration-500 lg:hover:-translate-y-1.5 lg:hover:border-purple-400/25 lg:hover:shadow-[0_0_15px_rgba(168,85,247,0.14)] focus-visible:border-cyan-300/70 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
                    >
                      <BrandArtwork brand={brand} />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 -left-1/2 hidden h-full w-1/2 -skew-x-[20deg] bg-gradient-to-r from-transparent via-purple-300/[0.06] to-transparent motion-safe:transition-[left] motion-safe:duration-500 lg:block lg:group-hover:left-[150%] lg:group-focus-visible:left-[150%]"
                      />
                      <span className="sr-only">Xem {brand.productCount} sản phẩm {brand.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {hasMore ? (
                <div
                  data-section15-fade
                  className={expanded
                    ? "relative z-10 -mx-4 flex h-[72px] items-end justify-center bg-gradient-to-b from-transparent to-[#121212] pb-1 md:-mx-12"
                    : "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-14 items-end justify-center bg-gradient-to-b from-transparent via-[#121212]/85 to-[#121212] pb-1"
                  }
                >
                  <button
                    type="button"
                    data-section15-toggle
                    aria-expanded={expanded}
                    aria-controls="section15-brands-grid"
                    aria-label={expanded ? "Thu gọn danh sách thương hiệu" : "Mở rộng danh sách thương hiệu"}
                    onClick={toggleExpanded}
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full text-white/35 outline-none motion-safe:transition-[color,transform] motion-safe:duration-300 hover:text-white/75 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-8 w-8 motion-safe:transition-transform motion-safe:duration-300 ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .section15-blob {
          animation: section15-blob 20s ease-in-out infinite alternate;
        }

        .section15-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .section15-scroll {
          scrollbar-color: rgba(139, 92, 246, 0.7) rgba(255, 255, 255, 0.03);
          scrollbar-width: none;
          overscroll-behavior: contain;
        }

        .section15-scroll::-webkit-scrollbar {
          width: 0;
        }

        @media (min-width: 1024px) {
          .section15-scroll {
            scrollbar-width: thin;
          }

          .section15-scroll::-webkit-scrollbar {
            width: 6px;
          }

          .section15-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 999px;
          }

          .section15-scroll::-webkit-scrollbar-thumb {
            background: rgba(139, 92, 246, 0.7);
            border-radius: 999px;
          }
        }

        @keyframes section15-blob {
          from {
            transform: translate3d(-2%, -1%, 0) scale(0.96);
          }
          to {
            transform: translate3d(4%, 3%, 0) scale(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .section15-blob {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
