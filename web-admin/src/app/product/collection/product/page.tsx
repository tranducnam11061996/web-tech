import { CollectionProductFilter } from '@/components/collection-product/CollectionProductFilter';
import { CollectionProductTable } from '@/components/collection-product/CollectionProductTable';
import { parsePaginationParams } from '@/lib/admin/pagination';
import { getSpecialCollection, listSpecialCollectionProducts } from '@/lib/admin/special-collections';
import Link from 'next/link';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CollectionProductPage(props: { searchParams?: SearchParams }) {
  const searchParams = await props.searchParams;
  const collectionId = Number(firstParam(searchParams?.id) || 0);
  const { page, limit } = parsePaginationParams(searchParams);
  const search = firstParam(searchParams?.search);

  if (!collectionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-gray-400">
        <div>ID bộ sưu tập không hợp lệ.</div>
        <Link href="/product/collection" className="mt-3 text-blue-400 hover:underline">Quay lại danh sách</Link>
      </div>
    );
  }

  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (search) params.set('search', search);

  const [collection, products] = await Promise.all([
    getSpecialCollection(collectionId),
    listSpecialCollectionProducts(collectionId, params),
  ]);

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0">
        <CollectionProductFilter collectionId={collectionId} collectionName={collection.name} initialSearch={search || ''} />

        <div className="flex-1 min-h-0 mt-2">
          <CollectionProductTable collectionId={collectionId} products={products.items} pagination={products.pagination} />
        </div>
      </div>
    </div>
  );
}
