import Footer from "../components/Footer";
import Header from "../components/Header";
import HomepageCarouselScript from "../components/HomepageCarouselScript";
import Section2 from "../components/sections/Section2";
import Section3 from "../components/sections/Section3";
import Section4 from "../components/sections/Section4";
import Section5 from "../components/sections/Section5";
import Section6, { section6HomepageProductConfig } from "../components/sections/Section6";
import Section7 from "../components/sections/Section7";
import Section8, {
  section8FeaturedCollectionConfig,
  type Section8FeaturedCollection,
} from "../components/sections/Section8";
import Section9 from "../components/sections/Section9";
import Section10, { section10HomepageProductConfig } from "../components/sections/Section10";
import Section11 from "../components/sections/Section11";
import Section12 from "../components/sections/Section12";
import Section13 from "../components/sections/Section13";
import Section14 from "../components/sections/Section14";
import Section15, { type HomepageBrand } from "../components/sections/Section15";
import Section16 from "../components/sections/Section16";
import Section17, { section17HomepageProductConfig } from "../components/sections/Section17";
import type {
  HomepageProductSectionConfig,
  HomepageProductSectionData,
  HomepageProductSectionsPromise,
} from "../components/sections/HomepageProductSection";
import type { HeaderMenuData } from "../components/menuData";
import type { MenuLinkObject } from "../components/menuData";
import type { HeroBanner } from "../components/sections/HeroBannerCarousel";
import { internalApiUrl } from "@/lib/apiUrl";

const HOMEPAGE_PRODUCT_SECTION_CONFIGS: HomepageProductSectionConfig[] = [
  section6HomepageProductConfig,
  section10HomepageProductConfig,
  section17HomepageProductConfig,
];

function getHomepageProductCategoryIds(configs: HomepageProductSectionConfig[]) {
  return Array.from(
    new Set(
      configs
        .map((config) => Number(config.categoryId || 0))
        .filter((categoryId) => Number.isInteger(categoryId) && categoryId > 0),
    ),
  );
}

async function fetchHomepageProductSections(configs: HomepageProductSectionConfig[]): Promise<HomepageProductSectionData[]> {
  const categoryIds = getHomepageProductCategoryIds(configs);
  if (categoryIds.length === 0) return [];

  const productLimit = Math.max(1, Math.min(24, Math.max(...configs.map((config) => config.productLimit || 8))));
  const url = new URL(internalApiUrl("/api/categories/homepage-product-sections"));
  url.searchParams.set("categoryIds", categoryIds.join(","));
  url.searchParams.set("productLimit", String(productLimit));

  try {
    const response = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!response.ok) return [];

    const payload = await response.json();
    return Array.isArray(payload?.data?.sections) ? payload.data.sections as HomepageProductSectionData[] : [];
  } catch {
    return [];
  }
}

type HomepageBootstrap = {
  headerMenu: HeaderMenuData;
  homepageMenu: { circleStory?: MenuLinkObject[]; shopByCategory?: MenuLinkObject[] };
  banners: { locations?: Array<{ key: string; banners?: HeroBanner[] }> };
  productSections: { sections?: HomepageProductSectionData[] };
  featureSections: { sections?: any[] };
  brands?: HomepageBrand[];
  featuredCollection?: Section8FeaturedCollection | null;
};

async function fetchHomepageBootstrap(): Promise<HomepageBootstrap | null> {
  try {
    const url = new URL(internalApiUrl("/api/homepage/bootstrap"));
    url.searchParams.set("collectionId", String(section8FeaturedCollectionConfig.collectionId));
    url.searchParams.set("collectionSlug", section8FeaturedCollectionConfig.collectionSlug);
    url.searchParams.set("collectionLimit", String(section8FeaturedCollectionConfig.productLimit));
    const response = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.success && payload.data ? payload.data as HomepageBootstrap : null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const bootstrap = await fetchHomepageBootstrap();
  const homepageProductSectionsPromise = bootstrap?.productSections?.sections
    ? Promise.resolve(bootstrap.productSections.sections)
    : fetchHomepageProductSections(HOMEPAGE_PRODUCT_SECTION_CONFIGS);
  const locations = bootstrap?.banners?.locations || [];
  const primary = locations.find((location) => location.key === 'banner_slider_homepage_temp2019');
  const fallback = locations.find((location) => location.key === 'fake_slide_trang_chu');
  const heroBanners = (primary?.banners?.length ? primary.banners : fallback?.banners) || undefined;

  return (
    <>
      <Header initialMenu={bootstrap?.headerMenu} />

      <Section2 initialItems={bootstrap?.homepageMenu?.circleStory} />
      <Section3 initialBanners={heroBanners} />
      <Section4 initialItems={bootstrap?.homepageMenu?.shopByCategory} />
      <Section5 />
      <Section6 sectionDataPromise={homepageProductSectionsPromise} />
      <Section7 />
      <Section8 featuredCollection={bootstrap?.featuredCollection} />
      <Section9 />
      <Section10 sectionDataPromise={homepageProductSectionsPromise} />
      <Section11 initialSections={bootstrap?.featureSections?.sections} />
      <Section12 />
      <Section13 />
      <Section14 />
      <Section15 brands={bootstrap?.brands} />
      <Section16 />
      <Section17 sectionDataPromise={homepageProductSectionsPromise} />

      <Footer />
      <HomepageCarouselScript />
    </>
  );
}
