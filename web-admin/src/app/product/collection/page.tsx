import { CollectionFilter } from '@/components/collections/CollectionFilter';
import { CollectionTable } from '@/components/collections/CollectionTable';
import { parsePaginationParams } from '@/lib/admin/pagination';
import { listSpecialCollections } from '@/lib/admin/special-collections';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const storefrontUrl = process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildCollectionFrontEndUrl(slug: string) {
  const cleanSlug = String(slug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) return '';
  return `${storefrontUrl.replace(/\/+$/g, '')}/collection/${cleanSlug}`;
}

export default async function CollectionPage(props: { searchParams?: SearchParams }) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();
  const { page, limit } = parsePaginationParams(searchParams);
  const search = firstParam(searchParams?.search);
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  if (search) params.set('search', search);

  const data = await listSpecialCollections(params);
  const collections = data.items.map((collection) => ({
    ...collection,
    frontEndUrl: buildCollectionFrontEndUrl(collection.url),
  }));

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <div className="flex flex-col flex-1 h-full min-h-0">
        <CollectionFilter initialSearch={search || ''} />

        <div className="flex-1 min-h-0 mt-2">
          <CollectionTable collections={collections} pagination={data.pagination} />
        </div>
      </div>
    </div>
  );
}
