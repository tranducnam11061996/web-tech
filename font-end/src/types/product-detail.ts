export type ProductGalleryImage = {
  url: string;
  alt?: string;
  type?: string;
};

export type ProductDetailData = {
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
};
