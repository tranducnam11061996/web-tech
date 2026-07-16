import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGridCard, { type ProductGridCardData } from "@/components/ProductGridCard";
import {
  collectionPageHref,
  collectionPaginationRange,
  type CollectionSort,
} from "@/lib/collectionPage";
import { sanitizeLegacyHtml } from "@/lib/sanitizeHtml";

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(Number(value || 0))));
}

function EmptyState() {
  return (
    <div className="col-span-full my-4 flex flex-col items-center justify-center rounded-2xl border border-[#1a1a1e] bg-[#111115] px-5 py-20 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300">
        <svg className="size-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
      </div>
      <h2 className="mb-2 text-lg font-bold text-white">Bộ sưu tập chưa có sản phẩm</h2>
      <p className="max-w-md text-[15px] leading-relaxed text-gray-500">
        Hiện chưa có sản phẩm đang hiển thị trong bộ sưu tập này.
      </p>
    </div>
  );
}

function PaginationLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-xl bg-[#18181b] text-gray-400 transition-colors hover:bg-[#27272a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      {children}
    </Link>
  );
}

export default function CollectionClient({ slug, initialData, currentSort }: CollectionClientProps) {
  const { collection, data: products = [], pagination } = initialData;
  const currentPage = Math.max(1, Number(pagination.page || 1));
  const safeDescription = sanitizeLegacyHtml(collection.description).trim();
  const sortOptions: Array<{ value: Exclude<CollectionSort, "">; label: string }> = [
    { value: "price_asc", label: "Giá từ Thấp - Cao" },
    { value: "price_desc", label: "Giá từ Cao - Thấp" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0c] text-white">
      <Header />

      <main className="mx-auto max-w-[1800px] px-4 pb-10 pt-5 md:px-6">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-white">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <span className="text-cyan-400">Bộ sưu tập</span>
          <span aria-hidden="true">/</span>
          <span className="text-gray-300">{collection.name}</span>
        </nav>

        <h1
          className="mb-6 max-w-[40ch] break-words text-balance text-2xl font-extrabold leading-tight tracking-tight text-white md:mb-8 md:text-3xl"
          data-collection-heading
        >
          {collection.name}
        </h1>

        {safeDescription ? (
          <section className="mb-8 min-w-0" aria-label={`Giới thiệu ${collection.name}`} data-collection-description>
            <div
              className="collection-description-content min-w-0 overflow-x-auto [&_img]:h-auto [&_img]:max-w-full [&_table]:max-w-full [&_video]:h-auto [&_video]:max-w-full"
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          </section>
        ) : null}

        <section aria-labelledby="collection-products-heading">
          <div className="mb-5 flex flex-col gap-4 border-b border-[#1a1a1e] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <h2
              id="collection-products-heading"
              className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-bold leading-snug text-white sm:text-xl"
            >
              <span
                className="min-w-0 break-words bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-transparent forced-colors:bg-none forced-colors:text-[CanvasText]"
                data-collection-title-gradient
              >
                {collection.name}
              </span>{" "}
              <span
                className="whitespace-nowrap text-sm font-semibold text-gray-300 sm:text-base"
                data-collection-product-count
              >
                ({formatNumber(pagination.total)} sản phẩm)
              </span>
            </h2>

            <nav className="flex flex-wrap items-center gap-2 lg:shrink-0" aria-label="Sắp xếp sản phẩm theo giá">
              {sortOptions.map((option) => {
                const active = currentSort === option.value;
                return (
                  <Link
                    key={option.value}
                    href={collectionPageHref(slug, option.value)}
                    aria-current={active ? "true" : undefined}
                    data-collection-sort={option.value}
                    className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                      active
                        ? "border-cyan-500 bg-cyan-500/15 text-cyan-200"
                        : "border-[#303036] bg-[#151518] text-gray-300 hover:border-cyan-700 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            id="productGrid"
            data-collection-product-grid
          >
            {products.length > 0
              ? products.map((product) => <ProductGridCard key={product.id} product={product} />)
              : <EmptyState />}
          </div>

          {pagination.totalPages > 1 ? (
            <nav className="mb-10 mt-12 flex items-center justify-center gap-2" aria-label="Phân trang bộ sưu tập">
              {currentPage > 1 ? (
                <PaginationLink
                  href={collectionPageHref(slug, currentSort, currentPage - 1)}
                  label="Trang trước"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m15 18-6-6 6-6" />
                  </svg>
                </PaginationLink>
              ) : (
                <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#18181b] text-gray-600 opacity-40">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m15 18-6-6 6-6" />
                  </svg>
                </span>
              )}

              <div className="flex flex-wrap justify-center gap-2">
                {collectionPaginationRange(currentPage, pagination.totalPages).map((page, index) => (
                  page === "..." ? (
                    <span key={`dots-${index}`} className="flex size-10 items-center justify-center rounded-xl bg-[#18181b] font-medium text-gray-500">
                      ...
                    </span>
                  ) : page === currentPage ? (
                    <span
                      key={page}
                      aria-current="page"
                      aria-label={`Trang ${page}`}
                      className="flex size-10 items-center justify-center rounded-xl bg-[#0b63e5] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(11,99,229,0.3)]"
                    >
                      {page}
                    </span>
                  ) : (
                    <Link
                      key={page}
                      href={collectionPageHref(slug, currentSort, page)}
                      aria-label={`Đến trang ${page}`}
                      className="flex size-10 items-center justify-center rounded-xl bg-[#18181b] text-[15px] font-semibold text-gray-400 transition-colors hover:bg-[#27272a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                      {page}
                    </Link>
                  )
                ))}
              </div>

              {currentPage < pagination.totalPages ? (
                <PaginationLink
                  href={collectionPageHref(slug, currentSort, currentPage + 1)}
                  label="Trang sau"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 18 6-6-6-6" />
                  </svg>
                </PaginationLink>
              ) : (
                <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#18181b] text-gray-600 opacity-40">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              )}
            </nav>
          ) : null}
        </section>
      </main>

      <Footer />
    </div>
  );
}
