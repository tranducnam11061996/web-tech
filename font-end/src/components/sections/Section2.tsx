import type { CSSProperties } from "react";
import { type MenuLinkObject } from "../menuData";
import { cleanMenuTextTrimmed, resolveMenuHexColor, resolveMenuMediaUrl } from "@/lib/menuUtils";
import { internalApiUrl } from "@/lib/apiUrl";

const API_URL = internalApiUrl("");

const STORY_RING_STYLE: CSSProperties = {
  background: "conic-gradient(#ef4444, #3b82f6, #22c55e, #ef4444)",
  boxShadow: "0 0 12px rgba(100, 100, 200, 0.4)",
};

const STORY_SHEEN_STYLE: CSSProperties = {
  background: "linear-gradient(145deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.08) 30%, transparent 50%, rgba(0, 0, 0, 0.05) 100%)",
};

function cleanStoryText(value: unknown) {
  return cleanMenuTextTrimmed(value);
}

function resolveStoryImageUrl(value?: string) {
  return resolveMenuMediaUrl(value);
}

function storyFallbackStyle(item: MenuLinkObject): CSSProperties {
  return {
    backgroundColor: resolveMenuHexColor(item.backgroundColor, "#26272d"),
  };
}

async function getCircleStoryItems(): Promise<MenuLinkObject[]> {
  try {
    const response = await fetch(`${API_URL}/api/menu/homepage`, { next: { revalidate: 60 } });
    if (!response.ok) return [];

    const payload = await response.json();
    if (!payload?.success || !Array.isArray(payload.data?.circleStory)) return [];

    return payload.data.circleStory;
  } catch {
    return [];
  }
}

export default async function Section2({ initialItems }: { initialItems?: MenuLinkObject[] }) {
  const circleStoryItems = initialItems || await getCircleStoryItems();

  return (
    <section
      id="section-2"
      aria-label="Circle Story"
      className="min-h-[130px] w-full bg-[#111111] pt-3 md:min-h-[168px] md:pt-4"
    >
      <div className="mx-auto w-full max-w-[1920px]">
        <div
          data-section2-carousel
          data-homepage-carousel="mobile"
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured stories"
          className="touch-pan-x overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            data-section2-track
            data-homepage-carousel-track="mobile"
            className="flex h-[118px] w-max min-w-full items-start justify-start gap-2 px-4 md:h-[152px] md:gap-8 md:px-8 min-[1920px]:justify-center min-[1920px]:px-0"
          >
            {circleStoryItems.map((item, index) => {
              const label = cleanStoryText(item.label || item.name) || "Circle Story";
              const subText = cleanStoryText(item.subText);
              const imageUrl = resolveStoryImageUrl(item.imageUrl);
              const href = cleanStoryText(item.url) || "#";

              return (
                <div
                  key={item.id || `${label}-${index}`}
                  data-section2-slide
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} / ${circleStoryItems.length}: ${label}`}
                  className="w-[73px] shrink-0 snap-start select-none md:w-24"
                >
                  <a
                    href={href}
                    data-section2-item
                    aria-label={`Xem ${label}`}
                    className="group flex w-full flex-col items-center gap-2 pb-1 pt-2 text-center focus-visible:outline-none md:gap-3"
                  >
                    <span
                      data-section2-ring
                      className="relative block size-[73px] shrink-0 md:size-24"
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(circle,rgba(100,100,200,0.4)_0%,transparent_70%)] opacity-0 blur-xl motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                      <span
                        aria-hidden="true"
                        style={STORY_RING_STYLE}
                        className="pointer-events-none absolute inset-0 rounded-full motion-safe:transition-[filter] motion-safe:duration-200 group-hover:brightness-110 group-focus-visible:brightness-110"
                      />
                      <span
                        data-section2-spacer
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-[3px] rounded-full bg-[#111111]"
                      />
                      <span
                        data-section2-artwork
                        style={storyFallbackStyle(item)}
                        className="absolute inset-[6px] overflow-hidden rounded-full bg-cover bg-center"
                      >
                        <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                          {imageUrl ? (
                            // Homepage menu media may be any validated same-origin or HTTPS URL.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={label}
                              width={96}
                              height={96}
                              loading="lazy"
                              decoding="async"
                              draggable={false}
                              className="size-full object-cover motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-105 group-focus-visible:scale-105"
                            />
                          ) : subText ? (
                            <span className="whitespace-pre-line px-1 text-center font-main text-[9px] font-black uppercase leading-[1.05] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] md:px-2 md:text-[11px]">
                              {subText}
                            </span>
                          ) : (
                            <span className="px-1 text-center font-main text-[9px] font-black uppercase leading-[1.05] text-white md:px-2 md:text-[11px]">
                              {label}
                            </span>
                          )}
                          <span
                            aria-hidden="true"
                            style={STORY_SHEEN_STYLE}
                            className="pointer-events-none absolute inset-0 rounded-full"
                          />
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[inset_0_0_0_2px_rgba(100,100,200,0.4)] motion-safe:transition-opacity motion-safe:duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                    </span>

                    <span
                      data-section2-label
                      className="line-clamp-2 max-w-[75px] font-main text-[10px] font-medium leading-tight text-white/70 motion-safe:transition-colors motion-safe:duration-200 group-hover:text-white group-focus-visible:text-white md:max-w-[100px] md:text-xs"
                    >
                      {label}
                    </span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
