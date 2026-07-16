import Link from "next/link";
import CategoryFeatureProductGrid from "../CategoryFeatureProductGrid";
import { safeCategoryFeatureColor, type CategoryFeatureBoxData } from "../CategoryFeatureBox";
import type { ProductGridCardData } from "../ProductGridCard";
import { internalApiUrl } from '@/lib/apiUrl';

const API_URL = internalApiUrl('');

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
        <p>Experience Next-Level Gaming Performance With Our PC &amp; Laptop Range</p>
      </div>

      {sections.map((section, index) => (
        <section key={section.category.id} className="py-8 bg-dark-200" id={index === 0 ? "section-11" : `section-11-${section.category.id}`}>
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
            <div
              data-category-feature-section
              className="rounded-2xl border border-[#1a1a1e] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)]"
              style={{ backgroundColor: safeCategoryFeatureColor(section.featureBox.containerBackgroundColor, "#0f0f14") }}
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 data-category-feature-title className="text-2xl font-black text-cyan-300 sm:text-3xl">
                  {section.category.name}
                </h2>
                <Link
                  href={`/${normalizeSlug(section.category.slug)}`}
                  className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-black uppercase tracking-wide text-white transition hover:border-cyan-300/50 hover:text-cyan-200"
                >
                  Xem tất cả
                </Link>
              </div>

              <div data-category-feature-grid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <CategoryFeatureProductGrid
                  products={section.products || []}
                  featureBox={section.featureBox}
                  emptyState={null}
                />
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
