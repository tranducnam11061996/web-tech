import { Suspense } from "react";
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
import WhyBuyFaq from "../../components/WhyBuyFaq";
import ProgressiveImage from "../../components/ProgressiveImage";
import ProductDescription from "../../components/ProductDescription";
import ProductSpecifications from "../../components/ProductSpecifications";
import ProductSidebar from "../../components/ProductSidebar";
import ProductBreadcrumbHeader from "../../components/ProductBreadcrumbHeader";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function fetchSlugData(slug: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/products/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 60 },
      },
    );
    const json = await res.json();
    return json.success
      ? { data: json.data, error: null }
      : { data: null, error: json.message || "Product not found" };
  } catch {
    return { data: null, error: "Error fetching product" };
  }
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
  const productUrl = new URL(`${API_URL}/api/products`);
  productUrl.searchParams.set("limit", "24");
  productUrl.searchParams.set("page", "1");
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
        fetch(`${API_URL}/api/categories?parentId=${categoryId}`, {
          next: { revalidate: 300 },
        }),
        fetch(
          `${API_URL}/api/categories/price-bounds?categoryId=${categoryId}`,
          { next: { revalidate: 300 } },
        ),
        fetch(`${API_URL}/api/categories/attributes?categoryId=${categoryId}`, {
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
  const { data: productData, error } = await fetchSlugData(slug);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0f11] text-red-500 text-xl">
        {error}
      </div>
    );
  }

  if (!productData) return null;

  if (productData.type === "category") {
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
          categoryInfo={productData}
        />
      </Suspense>
    );
  }

  return (
    <>
      <Header />

      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
        <ProductBreadcrumbHeader productData={productData} />

        <div className="product-hero-grid">
          <ProductCarousel productData={productData} />
          <ProductSidebar productData={productData} />
        </div>
      </div>

      <section
        className="max-w-[1800px] mx-auto border-t border-[#202027] px-4 md:py-8 md:border-t-0 md:px-6"
        id="content-sanpham"
      >
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <ProductDescription
            productName={productData.name}
            description={productData.description}
          />
          <ProductSpecifications
            productName={productData.name}
            specs={productData.specs}
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
      <SimilarProducts />
      <WhyBuyFaq />      
      <Footer />
    </>
  );
}
