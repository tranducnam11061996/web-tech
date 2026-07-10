import HomepageProductSection, {
  type HomepageProductSectionConfig,
  type HomepageProductSectionsPromise,
} from "./HomepageProductSection";

export const section10HomepageProductConfig: HomepageProductSectionConfig = {
  sectionId: "section-10",
  categoryId: 137,
  productLimit: 8,
  ctaTitleLines: [
    { text: "Find The" },
    { text: "Perfect", className: "highlight" },
    { text: "Gift" },
  ],
  ctaButtonLabel: "Show Now",
};

export default function Section10({
  sectionDataPromise,
}: {
  sectionDataPromise: HomepageProductSectionsPromise;
}) {
  return <HomepageProductSection config={section10HomepageProductConfig} sectionDataPromise={sectionDataPromise} />;
}
