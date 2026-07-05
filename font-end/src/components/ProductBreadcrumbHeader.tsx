import React from 'react';

interface ProductBreadcrumbHeaderProps {
  productData: any;
}

export default function ProductBreadcrumbHeader({ productData }: ProductBreadcrumbHeaderProps) {
  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
        <a href="#" className="hover:text-emerald-400 transition flex items-center gap-1">🏠 Trang chủ</a><span>/</span>
        <a href="#" className="hover:text-emerald-400 transition">Linh Kiện Máy Tính</a><span>/</span>
        <a href="#" className="hover:text-emerald-400 transition">Mainboard - Bo mạch chủ</a><span>/</span>
        <a href="#" className="hover:text-emerald-400 transition">Mainboard AMD</a><span>/</span>
        <span className="text-gray-400">{productData.name}</span>
      </nav>

      {/* Mobile Title (hidden on desktop) */}
      <div className="block lg:hidden mb-6 space-y-3">
        <h1 className="text-xl md:text-2xl font-extrabold leading-tight">{productData.name}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
          <span>Mã SP: <span className="text-emerald-400 font-bold">{productData.sku}</span></span>
          <span>| Đánh giá: <span className="text-yellow-500">★★★★☆</span></span>
          <span>| Bình luận: <span className="text-gray-400 font-bold">0</span></span>
          <span>| Lượt xem: <span className="text-cyan-400 font-bold">{productData.views}</span></span>
        </div>
      </div>
    </>
  );
}
