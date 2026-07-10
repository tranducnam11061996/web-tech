import { Suspense } from "react";
import { notFound } from "next/navigation";
import CollectionClient, { type CollectionApiResponse } from "./CollectionClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendSearchParams(url: URL, searchParams: Awaited<SearchParams> | undefined) {
  const page = firstParam(searchParams?.page) || "1";
  url.searchParams.set("page", page);
  url.searchParams.set("limit", "24");

  for (const key of ["sort", "min-price", "max-price"]) {
    const value = firstParam(searchParams?.[key]);
    if (value) url.searchParams.set(key, value);
  }
}

async function getCollection(slug: string, searchParams: Awaited<SearchParams> | undefined) {
  const url = new URL(`${API_URL}/api/collections/${encodeURIComponent(slug)}`);
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

  if (!initialData?.success) notFound();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-500" />
        </div>
      }
    >
      <CollectionClient slug={params.slug} initialData={initialData} />
    </Suspense>
  );
}
