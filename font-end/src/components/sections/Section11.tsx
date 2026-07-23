import Link from "next/link";
import CategoryFeatureBox, {
  safeCategoryFeatureColor,
  type CategoryFeatureBoxData,
} from "../CategoryFeatureBox";
import ProductGridCard, { type ProductGridCardData } from "../ProductGridCard";
import { internalApiUrl } from "@/lib/apiUrl";

const API_URL = internalApiUrl("");

type HomepageFeatureSection = {
  category: {
    id: number;
    name: string;
    slug: string;
  };
  featureBox: CategoryFeatureBoxData;
  products: ProductGridCardData[];
};

async function fetchHomepageFeatureSections() {
  try {
    const response = await fetch(`${API_URL}/api/categories/homepage-feature-sections?limit=3&productLimit=9`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data?.sections) ? payload.data.sections as HomepageFeatureSection[] : [];
  } catch {
    return [];
  }
}

function normalizeSlug(value: string) {
  return String(value || "").replace(/^\/+/, "");
}

export default async function Section11({ initialSections }: { initialSections?: HomepageFeatureSection[] }) {
  const sections = initialSections || await fetchHomepageFeatureSections();
  if (sections.length === 0) return null;

  return (
    <>
      <div className="announce-bar">
        <p>Nâng tầm trải nghiệm chơi game và học tập - phù hợp với ngân sách của bạn</p>
      </div>

      {sections.map((section, index) => {
        const sectionId = index === 0 ? "section-11" : `section-11-${section.category.id}`;
        const featureDesktopColumn = section.featureBox.boxPosition === "right"
          ? "xl:col-start-4"
          : "xl:col-start-1";
        const products = section.products || [];

        return (
          <section
            key={section.category.id}
            id={sectionId}
            aria-labelledby={`${sectionId}-title`}
            className="bg-dark-200 py-4 sm:py-8"
          >
            <div className="mx-auto max-w-[1800px] sm:px-6 lg:px-8">
              <div
                data-category-feature-section
                className="sm:rounded-2xl sm:border sm:border-[#1a1a1e] sm:p-5 sm:shadow-[0_18px_70px_rgba(0,0,0,0.25)]"
                style={{
                  backgroundColor: safeCategoryFeatureColor(
                    section.featureBox.containerBackgroundColor,
                    "#0f0f14",
                  ),
                }}
              >
                <div
                  data-category-feature-grid
                  className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6"
                >
                  <CategoryFeatureBox
                    featureBox={section.featureBox}
                    mobileVariant="homepage-compact"
                    className={`order-1 mx-4 h-[130px] sm:order-none sm:mx-0 sm:h-auto sm:col-span-2 lg:col-span-3 xl:row-start-2 xl:col-span-3 xl:min-h-full ${featureDesktopColumn}`}
                  />

                  <div
                    data-section11-header
                    className="order-2 mx-4 flex min-w-0 items-center justify-between gap-4 sm:order-first sm:col-span-full sm:mx-0 sm:mb-1"
                  >
                    <h2
                      id={`${sectionId}-title`}
                      data-category-feature-title
                      className="min-w-0 truncate text-xl font-black text-cyan-300 sm:text-3xl"
                    >
                      {section.category.name}
                    </h2>
                    <Link
                      href={`/${normalizeSlug(section.category.slug)}`}
                      className="shrink-0 rounded-full border border-cyan-300/30 bg-gradient-to-r from-cyan-400/10 to-purple-500/10 px-3 py-1.5 text-[11px] font-black normal-case tracking-wide text-white hover:border-cyan-300/50 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111212] motion-safe:transition-[border-color,color] motion-safe:duration-200 sm:rounded-md sm:border-white/10 sm:bg-none sm:bg-white/5 sm:px-4 sm:py-2 sm:text-sm sm:uppercase"
                    >
                      Xem tất cả
                    </Link>
                  </div>

                  {products.length > 0 ? (
                    <div className="order-3 border-white/10 sm:contents">
                      <div
                        data-section11-carousel
                        data-homepage-carousel="mobile"
                        role="region"
                        aria-label={`Sản phẩm ${section.category.name}`}
                        className="-mx-4 touch-pan-x overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:contents"
                      >
                        <div
                          data-section11-carousel-track
                          data-homepage-carousel-track="mobile"
                          className="flex w-max snap-x snap-mandatory gap-4 pl-7 pr-4 sm:contents"
                        >
                          {products.map((product) => (
                            <div
                              key={product.id}
                              data-section11-slide
                              className="w-[calc((100vw-45px)/1.8)] flex-none snap-start sm:contents"
                            >
                              <ProductGridCard product={product} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
