import React from 'react';
import Link from 'next/link';
import type { ProductDetailData } from '@/types/product-detail';

interface ProductBreadcrumbHeaderProps {
  productData: ProductDetailData;
}

export default function ProductBreadcrumbHeader({ productData }: ProductBreadcrumbHeaderProps) {
  return (
    <nav aria-label="Đường dẫn sản phẩm" className="flex items-center gap-2 text-sm text-gray-500 mb-5 flex-wrap">
        <Link href="/" className="hover:text-emerald-400 transition flex items-center gap-1">🏠 Trang chủ</Link><span>/</span>
        <span>Linh Kiện Máy Tính</span><span>/</span>
        <span>Mainboard - Bo mạch chủ</span><span>/</span>
        <span>Mainboard AMD</span><span>/</span>
        <span className="text-gray-400">{productData.name}</span>
    </nav>
  );
}
