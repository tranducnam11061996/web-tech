import Footer from "../components/Footer";
import Header from "../components/Header";
import Section2 from "../components/sections/Section2";
import Section3 from "../components/sections/Section3";
import Section4 from "../components/sections/Section4";
import Section5 from "../components/sections/Section5";
import Section6, { section6HomepageProductConfig } from "../components/sections/Section6";
import Section7 from "../components/sections/Section7";
import Section8 from "../components/sections/Section8";
import Section9 from "../components/sections/Section9";
import Section10, { section10HomepageProductConfig } from "../components/sections/Section10";
import Section11 from "../components/sections/Section11";
import Section12 from "../components/sections/Section12";
import Section13 from "../components/sections/Section13";
import Section14 from "../components/sections/Section14";
import Section15 from "../components/sections/Section15";
import Section16 from "../components/sections/Section16";
import Section17, { section17HomepageProductConfig } from "../components/sections/Section17";
import type {
  HomepageProductSectionConfig,
  HomepageProductSectionData,
  HomepageProductSectionsPromise,
} from "../components/sections/HomepageProductSection";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
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
  const url = new URL(`${API_URL}/api/categories/homepage-product-sections`);
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

export default function Page() {
  const homepageProductSectionsPromise = fetchHomepageProductSections(HOMEPAGE_PRODUCT_SECTION_CONFIGS);

  return (
    <>
      <Header />

      <Section2 />
      <Section3 />
      <Section4 />
      <Section5 />
      <Section6 sectionDataPromise={homepageProductSectionsPromise} />
      <Section7 />
      <Section8 />
      <Section9 />
      <Section10 sectionDataPromise={homepageProductSectionsPromise} />
      <Section11 />
      <Section12 />
      <Section13 />
      <Section14 />
      <Section15 />
      <Section16 />
      <Section17 sectionDataPromise={homepageProductSectionsPromise} />

      <Footer />
    </>
  );
}
