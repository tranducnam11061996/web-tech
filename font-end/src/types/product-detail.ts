import type { CategoryTrailItem } from "./breadcrumb";
import type { ProductGridCardData } from "../components/ProductGridCard";
import type { RelatedPostData } from "../components/RelatedPosts";
import type { BuyingGuideData } from "./buying-guide";

export type ProductGalleryImage = {
  url: string;
  alt?: string;
  type?: string;
};

export type ProductCoreData = {
  id: number | string;
  slug?: string;
  name: string;
  sku?: string;
  brand?: string;
  warranty?: string;
  price?: number;
  marketPrice?: number;
  savings?: number;
  views?: number | string;
  proSummary?: string;
  images?: Array<string | ProductGalleryImage>;
  imageGroups?: {
    product?: ProductGalleryImage[];
    customer?: ProductGalleryImage[];
  };
  specs?: string;
  hasSpecifications?: boolean;
  videos?: ProductVideoSummary[];
  categoryTrail?: CategoryTrailItem[];
  thumbnail?: string;
  comboSets?: ComboSetSummary[];
  vouchers?: ProductVoucherSummary[];
  productPromotions?: ProductPromotionSummary[];
  productGroup?: ProductGroupDetail | null;
  supplementalAvailable?: boolean;
};

export type ProductSupplementalData = {
  similarProducts: ProductGridCardData[];
  relatedPosts: RelatedPostData[];
  buyingGuide: BuyingGuideData | null;
};

export type ProductDetailData = ProductCoreData & Partial<ProductSupplementalData>;

export type ProductGroupValue = {
  attributeId: number;
  attributeName: string;
  valueId: number;
  valueName: string;
};

export type ProductGroupDetail = {
  id: number;
  name: string;
  displayLabel: string;
  items: Array<{
    productId: number;
    slug: string;
    sku: string;
    name: string;
    price: number;
    marketPrice: number;
    isCurrent: boolean;
    thumbnail: string;
    values: ProductGroupValue[];
    displayName: string;
  }>;
};

export type ProductVoucherSummary = {
  id: number;
  code: string;
  title: string;
  description: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  maxDiscount: number | null;
  minimumOrderValue: number;
  startsAt: string | null;
  endsAt: string | null;
  categoryNames: string[];
};

export type ProductPromotionSummary = {
  id: number;
  text: string;
  detailUrl: string;
};

export type ProductVideoSummary = {
  id: string;
  embedUrl: string;
  description: string;
};

export type ComboGroupSummary = {
  groupIndex: number;
  title: string;
  productCount: number;
  image: string;
  discountLabel: string;
};

export type ComboSetSummary = {
  id: number;
  title: string;
  revision: string;
  ordering: number;
  groups: ComboGroupSummary[];
};
