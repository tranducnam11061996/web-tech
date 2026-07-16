import { Suspense } from "react";
import { notFound } from "next/navigation";
import CollectionClient, { type CollectionApiResponse } from "./CollectionClient";
import { internalApiUrl } from "@/lib/apiUrl";
import { normalizeCollectionPage, normalizeCollectionSort } from "@/lib/collectionPage";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function appendSearchParams(url: URL, searchParams: Awaited<SearchParams> | undefined) {
  const page = normalizeCollectionPage(searchParams?.page);
  const sort = normalizeCollectionSort(searchParams?.sort);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", "24");
  if (sort) url.searchParams.set("sort", sort);
}

async function getCollection(slug: string, searchParams: Awaited<SearchParams> | undefined) {
  const url = new URL(internalApiUrl(`/api/collections/${encodeURIComponent(slug)}`));
  appendSearchParams(url, searchParams);

  const response = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to fetch collection");
  return (await response.json()) as CollectionApiResponse;
}

export default async function CollectionPage(props: {
  params: Promise<{ slug: string }>;
  searchParams?: SearchParams;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const initialData = await getCollection(params.slug, searchParams);
  const currentSort = normalizeCollectionSort(searchParams?.sort);

  if (!initialData?.success) notFound();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-500" />
        </div>
      }
    >
      <CollectionClient slug={params.slug} initialData={initialData} currentSort={currentSort} />
    </Suspense>
  );
}
