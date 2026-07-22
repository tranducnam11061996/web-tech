import { type CSSProperties } from "react";
import Link from "next/link";
import { type MenuLinkObject } from "../menuData";
import { cleanMenuTextTrimmed, resolveMenuHexColor, resolveMenuMediaUrl } from "@/lib/menuUtils";
import { internalApiUrl } from "@/lib/apiUrl";

const API_URL = internalApiUrl("");
const SECTION_4_ACCENTS = [
  "#00d4ff",
  "#ff6eb4",
  "#ff1a1a",
  "#8b5cf6",
  "#b8ff00",
  "#14b8a6",
  "#fbbf24",
  "#e879f9",
] as const;

type Section4CardStyle = CSSProperties & {
  "--section4-accent": string;
};

function cleanText(value: unknown) {
  return cleanMenuTextTrimmed(value);
}

function resolveImageUrl(value?: string) {
  return resolveMenuMediaUrl(value);
}

function resolveColor(value?: string) {
  return resolveMenuHexColor(value, "#181818");
}

function cardStyle(item: MenuLinkObject, index: number): Section4CardStyle {
  return {
    "--section4-accent": SECTION_4_ACCENTS[index % SECTION_4_ACCENTS.length],
    backgroundColor: resolveColor(item.backgroundColor),
  };
}

function iconPath(item: MenuLinkObject) {
  return cleanText(item.icon);
}

async function getShopByCategoryItems(): Promise<MenuLinkObject[]> {
  try {
    const response = await fetch(`${API_URL}/api/menu/homepage`, { next: { revalidate: 60 } });
    if (!response.ok) return [];

    const payload = await response.json();
    if (!payload?.success || !Array.isArray(payload.data?.shopByCategory)) return [];

    return payload.data.shopByCategory;
  } catch {
    return [];
  }
}

export default async function Section4({ initialItems }: { initialItems?: MenuLinkObject[] }) {
  const items = initialItems || await getShopByCategoryItems();

  return (
    <section
      id="section-4"
      aria-label="Danh mục mua sắm"
      className="relative w-full bg-[#111111] pb-4 pt-4 md:pb-9 md:pt-6"
    >
      <div className="mx-auto max-w-[1920px]">
        <div role="region" aria-roledescription="carousel" aria-label="Shop by category">
          <div
            data-section4-header
            className="mb-4 flex items-center justify-between px-4 md:mb-6 md:px-8"
          >
            <h2 className="origin-left -translate-y-[3px] scale-x-[1.03] bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text font-main text-2xl font-bold leading-[30px] tracking-tight text-transparent md:translate-y-0 md:scale-x-100 md:text-3xl md:leading-9">
              Shop by Category
            </h2>

            <div className="flex items-center gap-3">
              <div className="hidden size-[50px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5 sm:flex">
                <button
                  type="button"
                  aria-label="Next"
                  className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white/80 shadow-md motion-safe:transition-[background-color,color,transform] motion-safe:duration-200 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] active:scale-95"
                >
                  <svg aria-hidden="true" viewBox="0 0 15 15" className="size-4" fill="none">
                    <path
                      d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              <Link
                href="/category"
                data-section4-view-all
                className="relative inline-flex w-[77px] items-center justify-center overflow-hidden rounded-full border border-white/[0.15] bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-0 py-1.5 text-center text-xs font-medium text-white motion-safe:transition-[border-color,background-color] motion-safe:duration-200 hover:border-white/30 hover:from-cyan-400/30 hover:to-purple-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
              >
                View All
              </Link>
            </div>
          </div>

          <div
            id="section4-carousel-container"
            data-section4-carousel
            className="carousel-wrapper relative overflow-hidden px-4 md:px-8"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-[#111111] to-transparent md:w-12"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-[#111111] to-transparent md:w-12"
            />

            <div
              id="section4-carousel-track"
              data-section4-track
              className="carousel-track -ml-2.5 md:-ml-4 lg:-ml-6"
              style={{ gap: 1, padding: 0 }}
            >
              {items.map((item, index) => {
                const label = cleanText(item.label || item.name) || "Danh mục";
                const badgeText = cleanText(item.badgeText);
                const imageUrl = resolveImageUrl(item.imageUrl);
                const path = iconPath(item);
                const href = cleanText(item.url) || "#";

                return (
                  <div
                    key={item.id || `${label}-${index}`}
                    role="group"
                    aria-roledescription="slide"
                    data-section4-slide
                    className="min-w-0 shrink-0 grow-0 basis-[99px] select-none pl-2.5 sm:basis-[114px] md:basis-[129px] md:pl-4 lg:basis-[153px] lg:pl-6"
                  >
                    <div className="h-[95px] md:h-[110px]">
                      <a
                        href={href}
                        aria-label={`Xem danh mục ${label}`}
                        data-section4-card
                        style={cardStyle(item, index)}
                        className="group relative block h-full w-[90px] cursor-pointer overflow-hidden rounded-xl border border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--section4-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] sm:w-[105px] md:w-[114px] lg:w-[130px]"
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_80%_50%_at_20%_20%,rgba(255,255,255,0.08)_0%,transparent_50%)]"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-4 top-0 z-20 h-0.5 origin-center scale-x-0 rounded-full bg-[var(--section4-accent)] motion-safe:transition-transform motion-safe:duration-200 lg:group-hover:scale-x-100 lg:group-focus-visible:scale-x-100"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 shadow-[inset_0_0_0_1px_var(--section4-accent),0_20px_40px_-15px_var(--section4-accent)] motion-safe:transition-opacity motion-safe:duration-200 lg:group-hover:opacity-25 lg:group-focus-visible:opacity-25"
                        />

                        {badgeText ? (
                          <span className="absolute right-0 top-0 z-20 rounded-bl-xl bg-pink-700/90 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-3 text-pink-100 md:px-2 md:text-xs md:leading-4">
                            {badgeText}
                          </span>
                        ) : null}

                        <span className="relative z-10 flex h-full flex-col items-center px-2 pb-1.5 pt-2">
                          <span className="relative flex size-16 shrink-0 items-center justify-center motion-safe:transition-transform motion-safe:duration-200 lg:group-hover:-translate-y-1 lg:group-hover:scale-110 lg:group-focus-visible:-translate-y-1 lg:group-focus-visible:scale-110">
                            {imageUrl ? (
                              // Dynamic menu media may use any validated same-origin or HTTPS URL.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageUrl}
                                alt={label}
                                width={64}
                                height={64}
                                loading="lazy"
                                draggable={false}
                                className="size-16 object-contain drop-shadow-lg"
                              />
                            ) : path ? (
                              <svg aria-hidden="true" className="size-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={path} />
                              </svg>
                            ) : (
                              <span className="text-center text-xs font-bold text-white/70">{label}</span>
                            )}
                          </span>

                          <span className="mt-1 flex min-h-0 w-full flex-1 items-center justify-center">
                            <span className="line-clamp-2 text-center font-main text-[9px] font-medium leading-tight text-white/60 motion-safe:transition-colors motion-safe:duration-200 group-hover:text-white/80 group-focus-visible:text-white/80 md:text-xs">
                              {label}
                            </span>
                          </span>
                        </span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
