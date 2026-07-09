import { Suspense } from 'react';
import { ProductCardAttributeManager } from '@/components/product-card-attributes/ProductCardAttributeManager';
import { getProductCardAttributeEditorData } from '@/lib/productCardAttributes';

export default async function ProductCardAttributesPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const categoryParam = Array.isArray(searchParams?.categoryId)
    ? searchParams?.categoryId[0]
    : searchParams?.categoryId;
  const categoryId = Number(categoryParam || 0);
  const initialData = await getProductCardAttributeEditorData(Number.isInteger(categoryId) && categoryId > 0 ? categoryId : undefined);

  return (
    <div className="flex h-full w-full flex-col p-2 animate-in fade-in duration-300">
      <Suspense fallback={<div className="h-full rounded-lg border border-gray-800 bg-gray-950/50" />}>
        <ProductCardAttributeManager initialData={initialData} />
      </Suspense>
    </div>
  );
}
