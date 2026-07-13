import { Suspense } from 'react';
import { ProductFilter, ProductTopActions } from '@/components/products/ProductFilter';
import { ProductTable, ProductSkeleton } from '@/components/products/ProductTable';
import pool from '@/lib/db';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

const storefrontUrl = process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001';

async function getProducts(page: number, limit: number, search?: string) {
  try {
    const offset = (page - 1) * limit;

    // Build search condition
    let whereClause = '';
    const queryParams: any[] = [];

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      whereClause = 'WHERE (p.id LIKE ? OR p.storeSKU LIKE ? OR p.proName LIKE ?)';
      queryParams.push(keyword, keyword, keyword);
    }

    const [countQueryResult, listQueryResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM idv_sell_product_store p ${whereClause}`,
        queryParams
      ),
      pool.query(`
        SELECT 
          p.id, p.storeSKU, p.proName, p.warranty, p.postDate, p.lastUpdate, p.proThum, p.cond,
          b.name as brandName,
          pr.price, pr.market_price, pr.isOn,
          u.request_path as frontEndUrl
        FROM idv_sell_product_store p
        LEFT JOIN idv_brand b ON p.brandId = b.id
        LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
        LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
        ${whereClause}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, Number(limit), Number(offset)]),
    ]);

    const countResult = countQueryResult[0] as any[];
    const rows = listQueryResult[0] as any[];
    const totalItems = Number(countResult[0]?.total || 0);

    const products = (rows as any[]).map((row: any) => ({
      id: row.id,
      sku: row.storeSKU,
      name: row.proName,
      brand: row.brandName || 'N/A',
      price: row.price || 0,
      marketPrice: row.market_price || 0,
      warranty: row.warranty || '',
      createdAt: row.postDate ? new Date(row.postDate).toLocaleString('vi-VN') : '',
      creator: '',
      updatedAt: row.lastUpdate ? new Date(row.lastUpdate).toLocaleString('vi-VN') : '',
      updater: '',
      status: (row.isOn === 1 || row.isOn === true ? 'HIỂN THỊ' : 'ẨN') as 'HIỂN THỊ' | 'ẨN',
      sequence: 0,
      imageUrl: resolveProductImageUrl(row.proThum, 'https://via.placeholder.com/60'),
      frontEndUrl: row.frontEndUrl ? `${storefrontUrl}${row.frontEndUrl}` : '#',
    }));

    return {
      products,
      pagination: buildPagination(totalItems, page, limit),
    };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return {
      products: [],
      pagination: buildPagination(0, 1, limit),
    };
  }
}

export default async function ProductListPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const searchStr = searchParams?.search;
  const { page, limit } = parsePaginationParams(searchParams);
  const search = typeof searchStr === 'string' ? searchStr : undefined;

  const { products, pagination } = await getProducts(page, limit, search);

  return (
    <div className="flex flex-col h-full w-full p-2 animate-in fade-in duration-300">
      <ProductTopActions />
      
      <div className="flex flex-col flex-1 min-h-0">
        <Suspense fallback={<div className="h-40 bg-gray-900/50 animate-pulse rounded-lg mb-4"></div>}>
          <ProductFilter />
        </Suspense>
        
        <div className="flex-1 min-h-0 mt-2">
          <Suspense fallback={<ProductSkeleton />}>
            <ProductTable products={products} pagination={pagination} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
