import { type CSSProperties } from 'react';
import { type MenuLinkObject } from '../menuData';
import { cleanMenuTextTrimmed, resolveMenuHexColor, resolveMenuMediaUrl } from '@/lib/menuUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function cleanText(value: unknown) {
  return cleanMenuTextTrimmed(value);
}

function resolveImageUrl(value?: string) {
  return resolveMenuMediaUrl(value);
}

function resolveColor(value?: string) {
  return resolveMenuHexColor(value, '#16161a');
}

function cardStyle(item: MenuLinkObject): CSSProperties {
  return { backgroundColor: resolveColor(item.backgroundColor) };
}

function iconStyle(item: MenuLinkObject): CSSProperties | undefined {
  const imageUrl = resolveImageUrl(item.imageUrl);
  return imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined;
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

export default async function Section4() {
  const items = await getShopByCategoryItems();

  return (
    <>
  {/*  START section-4  */}
  <section className="section-4 shop-by-category py-10 bg-dark-200" id="section-4">
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">

      {/*  Section Header  */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Shop by Category</h2>
        <div className="flex items-center gap-3">
          <button id="prevBtn"
            className="hidden md:flex w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            aria-label="Previous">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button id="nextBtn"
            className="hidden md:flex w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-all"
            aria-label="Next">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className="h-10 px-5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 flex items-center justify-center text-sm font-semibold text-white hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-900/20">
            View All
          </button>
        </div>
      </div>

      {/*  Carousel Container  */}
      <div className="relative overflow-hidden" id="carouselContainer">

        {/*  Track  */}
        <div className="carousel-track" id="carouselTrack">

          {items.map((item, index) => {
            const label = cleanText(item.label || item.name);
            const badgeText = cleanText(item.badgeText);
            const path = iconPath(item);

            return (
              <div className="shrink-0 w-[160px] md:w-[180px] px-1.5 group cursor-pointer" key={item.id || `${label}-${index}`}>
                <div
                  className="relative bg-dark-lighter rounded-xl border border-white/5 overflow-hidden aspect-square flex items-center justify-center mb-2.5 group-hover:border-primary/30 transition-all duration-300"
                  style={cardStyle(item)}
                >
                  <div className="w-16 h-16 bg-dark rounded-lg flex items-center justify-center bg-cover bg-center" style={iconStyle(item)}>
                    {resolveImageUrl(item.imageUrl) ? null : path ? (
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={path} />
                      </svg>
                    ) : (
                      <span className="text-white text-xs font-bold">{label}</span>
                    )}
                  </div>
                  {badgeText ? (
                    <span
                      className="absolute top-2 left-2 bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide">{badgeText}</span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-400 text-center font-medium">{label}</p>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  </section>

  {/*  END section-4  */}
    </>
  );
}
