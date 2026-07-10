import HomepageProductSection, {
  type HomepageProductSectionConfig,
  type HomepageProductSectionsPromise,
} from "./HomepageProductSection";

export const section6HomepageProductConfig: HomepageProductSectionConfig = {
  sectionId: "section-6",
  categoryId: 178,
  productLimit: 8,
  ctaTitleLines: [
    { text: "PC" },
    { text: "GAMING", className: "highlight" },
    { text: "Cao cấp" },
  ],
  ctaButtonLabel: "Show Now",
};

export default function Section6({
  sectionDataPromise,
}: {
  sectionDataPromise: HomepageProductSectionsPromise;
}) {
  return <HomepageProductSection config={section6HomepageProductConfig} sectionDataPromise={sectionDataPromise} />;
}
