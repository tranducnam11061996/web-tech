"use client";

import React, { useState, useEffect, useRef } from 'react';
import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { useParams } from 'next/navigation';
import CategoryClient from '../category/CategoryClient';
import ProductCarousel from '../../components/ProductCarousel';
import RelatedArticles from '../../components/RelatedArticles';
import ProductReviews from '../../components/ProductReviews';
import ProductComments from '../../components/ProductComments';
import ProductDescription from '../../components/ProductDescription';
import ProductSpecifications from '../../components/ProductSpecifications';
import ProductSidebar from '../../components/ProductSidebar';
import ProductBreadcrumbHeader from '../../components/ProductBreadcrumbHeader';

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`);
        const json = await res.json();
        if (json.success) {
          setProductData(json.data);
        } else {
          setError(json.message || "Product not found");
        }
      } catch (err) {
        setError("Error fetching product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);
  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0f0f11] text-white text-xl">Đang tải sản phẩm...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-[#0f0f11] text-red-500 text-xl">{error}</div>;
  if (!productData) return null;

  if (productData.type === 'category') {
    return <CategoryClient categoryId={productData.id} params={params} categoryInfo={productData} />;
  }

  return (
    <>


      {/* ==================== Content from ss1.html ==================== */}


      <Header />




      {/* ==================== Content from ss23.html ==================== */}


      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">

        <ProductBreadcrumbHeader productData={productData} />

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ===== LEFT: CAROUSEL ===== */}
          <ProductCarousel productData={productData} />

          {/* ===== RIGHT: PRODUCT INFO ===== */}
          <ProductSidebar productData={productData} />
        </div>
      </div>



      {/* ==================== Content from ss28.html ==================== */}


      <section className="max-w-[1800px] mx-auto px-4 md:px-6 py-8" id="content-sanpham">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">

          {/* LEFT COLUMN: Bài viết mô tả (3/5) */}
          <ProductDescription productName={productData.name} description={productData.description} />

          {/* RIGHT COLUMN: Thông số kỹ thuật (2/5) */}
          <ProductSpecifications productName={productData.name} specs={productData.specs} />

        </div>
      </section>




      {/* ==================== Content from ss24.html ==================== */}


      <section className="max-w-[1800px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT PANEL: 3/5 (60%) */}
          <div className="lg:w-[60%] lg:sticky lg:top-6 lg:self-start flex flex-col gap-6">

            {/* Featured Categories */}
            <div className="card-box">
              <h3 className="font-bold text-lg text-white mb-4">Chuyên mục nổi bật:</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-cyan-500">
                <li><a href="#" className="hover:text-cyan-400 transition">Hệ thống chuỗi Cửa hàng - Showroom của HACOM</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Bản tin công nghệ hàng ngày</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Chuyên mục HACOM Give Away Quà Giá Trị</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">List sản phẩm Flash Sale HACOM</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Build PC nhận chiết khấu "khủng"</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">HACOM Xả Kho - Thanh Lý</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Hàng Hiệu đã qua sử dụng</a></li>
              </ul>
            </div>

            <ProductReviews />
            <ProductComments />

          </div>

          {/* RIGHT PANEL: 2/5 (40%) */}
          <div className="lg:w-[40%]">
            <RelatedArticles />
          </div>

        </div>
      </section>


      {/* ==================== Content from ss18.html ==================== */}


      <Footer />




    </>
  );
}
