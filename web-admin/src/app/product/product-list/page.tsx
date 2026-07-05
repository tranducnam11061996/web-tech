import { Suspense } from 'react';
import { ProductFilter, ProductTopActions } from '@/components/products/ProductFilter';
import { ProductTable, ProductSkeleton } from '@/components/products/ProductTable';
import pool from '@/lib/db';

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

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM idv_sell_product_store p ${whereClause}`,
      queryParams
    );
    const totalItems = (countResult as any[])[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get products
    const [rows] = await pool.query(`
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
    `, [...queryParams, Number(limit), Number(offset)]);

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
      imageUrl: row.proThum ? `https://hacom.vn/media/product/${row.proThum}` : 'https://via.placeholder.com/60',
      frontEndUrl: row.frontEndUrl ? `http://localhost:3001${row.frontEndUrl}` : '#',
    }));

    return {
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        pageSize: limit
      }
    };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return {
      products: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: limit }
    };
  }
}

export default async function ProductListPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const pageStr = searchParams?.page;
  const limitStr = searchParams?.limit;
  const searchStr = searchParams?.search;
  
  const page = typeof pageStr === 'string' ? parseInt(pageStr, 10) || 1 : 1;
  const limit = typeof limitStr === 'string' ? parseInt(limitStr, 10) || 20 : 20;
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
