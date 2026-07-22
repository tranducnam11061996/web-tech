import HomepageProductSection, {
  type HomepageProductSectionConfig,
  type HomepageProductSectionsPromise,
} from "./HomepageProductSection";

export const section10HomepageProductConfig: HomepageProductSectionConfig = {
  sectionId: "section-10",
  categoryId: 521,
  productLimit: 8,
  ctaTitleLines: [
    { text: "Chạy mượt" },
    { text: "Office", className: "highlight" },
    { text: "Hỗ trợ 24/7" },
  ],
  ctaButtonLabel: "Chọn ngay",
  productCardVariant: "shared-grid",
};

export default function Section10({
  sectionDataPromise,
}: {
  sectionDataPromise: HomepageProductSectionsPromise;
}) {
  return <HomepageProductSection config={section10HomepageProductConfig} sectionDataPromise={sectionDataPromise} />;
}
