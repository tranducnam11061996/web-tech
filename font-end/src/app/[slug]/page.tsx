import { Suspense } from "react";
import { notFound } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import CategoryClient from "../category/CategoryClient";
import ProductCarousel from "../../components/ProductCarousel";
{/* ====================
import RelatedArticles from "../../components/RelatedArticles";
import ProductReviews from "../../components/ProductReviews";
import ProductComments from "../../components/ProductComments";
==================== */}
import SimilarProducts from "../../components/SimilarProducts";
import DeferredRecentlyViewed from "../../components/DeferredRecentlyViewed";
import RelatedPosts from "../../components/RelatedPosts";
import WhyBuyFaq from "../../components/WhyBuyFaq";
import ProgressiveImage from "../../components/ProgressiveImage";
import ProductDescription from "../../components/ProductDescription";
import ProductSpecifications from "../../components/ProductSpecifications";
import ProductSidebar from "../../components/ProductSidebar";
import Breadcrumb from "../../components/Breadcrumb";
import { internalApiUrl } from "@/lib/apiUrl";
import { CATALOG_PAGE_SIZE, normalizeCatalogPage } from "@/lib/pagination";
import type { ProductSupplementalData } from "@/types/product-detail";

async function fetchSlugData(slug: string) {
  try {
    const res = await fetch(
      internalApiUrl(`/api/products/${encodeURIComponent(slug)}?include=core`),
      {
        next: { revalidate: 60 },
      },
    );
    const json = await res.json();
    return json.success
      ? { data: json.data, error: null, status: res.status }
      : { data: null, error: json.message || "Product not found", status: res.status };
  } catch {
    return { data: null, error: "Error fetching product", status: 500 };
  }
}

export async function generateMetadata(props: any) {
  const params = await props.params;
  const slug = String(params?.slug || '');
  const { data, status } = await fetchSlugData(slug);
  if (status === 404) notFound();
  if (!data) return {};
  return {
    title: data.metaTitle || data.name || 'TrucTiepGAME',
    description: data.metaDescription || data.summary || undefined,
  };
}

async function fetchSupplementalData(slug: string): Promise<ProductSupplementalData> {
  try {
    const response = await fetch(
      internalApiUrl(`/api/products/${encodeURIComponent(slug)}/supplemental`),
      { next: { revalidate: 300 } },
    );
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error("Supplemental request failed");
    return payload.data;
  } catch {
    return { similarProducts: [], relatedPosts: [], buyingGuide: null };
  }
}

async function ProductRelatedSections({ data }: { data: Promise<ProductSupplementalData> }) {
  const supplemental = await data;
  return <><SimilarProducts products={supplemental.similarProducts || []} /><RelatedPosts posts={supplemental.relatedPosts || []} /></>;
}

async function ProductBuyingGuide({ data }: { data: Promise<ProductSupplementalData> }) {
  const supplemental = await data;
  return <WhyBuyFaq buyingGuide={supplemental.buyingGuide} />;
}

function appendSearchParams(
  url: URL,
  searchParams: Record<string, any> | undefined,
) {
  if (!searchParams) return;

  Object.entries(searchParams).forEach(([key, value]) => {
    if (["id", "page", "limit", "category_id"].includes(key) || value == null)
      return;
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (normalizedValue) url.searchParams.set(key, String(normalizedValue));
  });
}

async function fetchCategoryInitialData(
  categoryId: number | string,
  searchParams: Record<string, any> | undefined,
) {
  const productUrl = new URL(internalApiUrl("/api/products"));
  productUrl.searchParams.set("limit", String(CATALOG_PAGE_SIZE));
  productUrl.searchParams.set("page", String(normalizeCatalogPage(searchParams?.page)));
  productUrl.searchParams.set("category_id", String(categoryId));
  appendSearchParams(productUrl, searchParams);

  let products = { data: [], pagination: { totalPages: 1, total: 0 } };
  let categories = { data: [] };
  let priceBounds = { data: { min: 0, max: 200000000 } };
  let attributes = { data: [] };

  try {
    const [productsRes, categoriesRes, priceBoundsRes, attributesRes] =
      await Promise.all([
        fetch(productUrl.toString(), { next: { revalidate: 60 } }),
        fetch(internalApiUrl(`/api/categories?parentId=${categoryId}`), {
          next: { revalidate: 300 },
        }),
        fetch(
          internalApiUrl(`/api/categories/price-bounds?categoryId=${categoryId}`),
          { next: { revalidate: 300 } },
        ),
        fetch(internalApiUrl(`/api/categories/attributes?categoryId=${categoryId}`), {
          next: { revalidate: 300 },
        }),
      ]);

    if (productsRes.ok) products = await productsRes.json();
    if (categoriesRes.ok) categories = await categoriesRes.json();
    if (priceBoundsRes.ok) priceBounds = await priceBoundsRes.json();
    if (attributesRes.ok) attributes = await attributesRes.json();
  } catch (err) {
    console.error("Error fetching SSR data for slug category page:", err);
  }

  return {
    products,
    categories,
    priceBounds,
    attributes,
  };
}

export default async function ProductPage(props: any) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const slug = params?.slug as string;
  const { data: productData, error, status } = await fetchSlugData(slug);

  if (error) {
    if (status === 404) notFound();
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f11] text-red-500 text-xl">
        {error}
      </div>
    );
  }

  if (!productData) return null;

  if (productData.type === "category") {
    const supplemental = await fetchSupplementalData(slug);
    const initialData = await fetchCategoryInitialData(
      productData.id,
      searchParams,
    );

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
          </div>
        }
      >
        <CategoryClient
          categoryId={productData.id}
          params={params}
          searchParams={searchParams}
          initialData={initialData}
          categoryInfo={{ ...productData, buyingGuide: supplemental.buyingGuide }}
        />
      </Suspense>
    );
  }

  const productBreadcrumbItems = [
    ...(Array.isArray(productData.categoryTrail) ? productData.categoryTrail : []).map(
      (category: { name: string; slug: string }) => ({
        label: category.name,
        href: `/${category.slug}`,
      }),
    ),
    { label: productData.name },
  ];
  const currentProductCard = {
    id: Number(productData.id),
    slug: productData.slug || slug,
    name: productData.name,
    sku: productData.sku || "",
    thumbnail: productData.thumbnail || "",
    price: Number(productData.price || 0),
    marketPrice: Number(productData.marketPrice || 0),
    brand: productData.brand || "",
    cardBadges: [],
  };
  const productDescriptionThumbnail =
    productData.thumbnail ||
    productData.imageGroups?.product?.[0]?.url ||
    (typeof productData.images?.[0] === "string"
      ? productData.images[0]
      : productData.images?.[0]?.url) ||
    "";
  const supplementalPromise = fetchSupplementalData(slug);

  return (
    <>
      <Header />

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
        <Breadcrumb items={productBreadcrumbItems} />

        <div className="product-hero-grid">
          <ProductCarousel productData={productData} />
          <ProductSidebar productData={productData} />
        </div>
      </div>

      <section
        className="max-w-[1800px] mx-auto border-t border-[#202027] px-4 md:py-8 md:border-t-0 md:px-6"
        id="content-sanpham"
      >
        <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-start">
          <ProductDescription
            productName={productData.name}
            description={productData.description}
            thumbnail={productDescriptionThumbnail}
            proSummary={productData.proSummary}
          />
          <ProductSpecifications
            productName={productData.name}
            specs={productData.specs}
            hasSpecifications={productData.hasSpecifications === true}
          />
        </div>
      </section>
{/* ====================
      <section className="max-w-[1800px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="lg:w-[60%] lg:sticky lg:top-6 lg:self-start flex flex-col gap-6">
            <div className="card-box">
              <h3 className="font-bold text-lg text-white mb-4">
                Chuyên mục nổi bật:
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-cyan-500">
                <li>
                  <a href="#" className="hover:text-cyan-400 transition">
                    Hệ thống chuỗi Cửa hàng - Showroom của TrucTiepGAME
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-cyan-400 transition">
                    Bản tin công nghệ hàng ngày
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-cyan-400 transition">
                    Chuyên mục TrucTiepGAME Give Away Quà Giá Trị
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-cyan-400 transition">
                    List sản phẩm Flash Sale TrucTiepGAME
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-cyan-400 transition">
                    Build PC nhận chiết khấu "khủng"
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-cyan-400 transition">
                    TrucTiepGAME Xả Kho - Thanh Lý
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-cyan-400 transition">
                    Hàng Hiệu đã qua sử dụng
                  </a>
                </li>
              </ul>
            </div>

            <ProductReviews />
            <ProductComments />
          </div>

          <div className="lg:w-[40%]">
            <RelatedArticles />
          </div>
        </div>
      </section>
==================== */}
      <Suspense fallback={<div className="product-supplemental-skeleton" aria-hidden="true" />}>
        <ProductRelatedSections data={supplementalPromise} />
      </Suspense>
      <DeferredRecentlyViewed currentProduct={currentProductCard} />
      <Suspense fallback={null}><ProductBuyingGuide data={supplementalPromise} /></Suspense>
      <Footer />
    </>
  );
}
