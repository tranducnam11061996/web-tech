import CatalogDetailLayout from "@/components/catalog/CatalogDetailLayout";
import type { ProductGridCardData } from "@/components/ProductGridCard";
import type { CollectionSort } from "@/lib/collectionPage";

type CollectionInfo = {
  id: number;
  name: string;
  url: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  productCount: number;
};

type PriceBounds = {
  min: number;
  max: number;
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CollectionApiResponse = {
  success: boolean;
  collection: CollectionInfo;
  data: ProductGridCardData[];
  priceBounds: PriceBounds;
  pagination: PaginationData;
  message?: string;
};

type CollectionClientProps = {
  slug: string;
  initialData: CollectionApiResponse;
  currentSort: CollectionSort;
};

export default function CollectionClient({ slug, initialData, currentSort }: CollectionClientProps) {
  return (
    <CatalogDetailLayout
      kind="collection"
      name={initialData.collection.name}
      description={initialData.collection.description}
      basePath={`/collection/${encodeURIComponent(slug)}`}
      products={initialData.data || []}
      pagination={initialData.pagination}
      currentSort={currentSort}
    />
  );
}
