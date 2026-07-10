import HomepageProductSection, {
  type HomepageProductSectionConfig,
  type HomepageProductSectionsPromise,
} from "./HomepageProductSection";

export const section17HomepageProductConfig: HomepageProductSectionConfig = {
  sectionId: "section-17",
  categoryId: 1087,
  productLimit: 8,
  ctaTitleLines: [
    { text: "Find The" },
    { text: "Perfect", className: "highlight" },
    { text: "Gift" },
  ],
  ctaButtonLabel: "Show Now",
};

export default function Section17({
  sectionDataPromise,
}: {
  sectionDataPromise: HomepageProductSectionsPromise;
}) {
  return <HomepageProductSection config={section17HomepageProductConfig} sectionDataPromise={sectionDataPromise} />;
}
