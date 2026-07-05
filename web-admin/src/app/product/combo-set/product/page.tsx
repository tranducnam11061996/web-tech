import { Suspense } from 'react';
import pool from '@/lib/db';
import { ComboSetProductTable } from '@/components/products/combo-set/ComboSetProductTable';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

async function getComboSetInfo(id: number) {
  const [rows] = await pool.query('SELECT title FROM combo_set WHERE id = ?', [id]);
  return (rows as any[])[0]?.title || 'Unknown Combo Set';
}

async function getComboProducts(comboId: number, page: number, limit: number) {
  try {
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(csp.product_id) as total 
      FROM combo_set_product csp
      JOIN idv_sell_product_store p ON csp.product_id = p.id
      WHERE csp.set_id = ?
    `;
    const [countResult] = await pool.query(countQuery, [comboId]);
    const totalItems = (countResult as any[])[0].total;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const query = `
      SELECT p.id, p.storeSKU, p.proName, p.proThum, 
             pr.price, pr.market_price, pr.isOn
      FROM combo_set_product csp
      JOIN idv_sell_product_store p ON csp.product_id = p.id
      LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
      WHERE csp.set_id = ?
      ORDER BY csp.id DESC
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await pool.query(query, [comboId, Number(limit), Number(offset)]);

    const products = (rows as any[]).map((row: any) => ({
      id: row.id,
      sku: row.storeSKU,
      name: row.proName,
      price: row.price || 0,
      marketPrice: row.market_price || 0,
      imageUrl: row.proThum ? `https://hacom.vn/media/product/${row.proThum}` : 'https://via.placeholder.com/60',
      status: row.isOn?.toString() || '0'
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
    console.error('Failed to fetch combo products:', error);
    return { products: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: limit } };
  }
}

export default async function ComboSetProductPage(props: { 
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const searchParams = await props.searchParams;
  const comboId = Number(searchParams?.id);
  const page = Number(searchParams?.page) || 1;
  const limit = 20;

  if (!comboId) {
    return (
      <div className="flex-1 p-6 bg-[#0a0a0f] flex flex-col items-center justify-center text-gray-500 font-mono">
        <h1>ID Combo Set không hợp lệ.</h1>
        <Link href="/product/combo-set/list" className="mt-4 text-blue-500 hover:underline">Quay lại danh sách</Link>
      </div>
    );
  }

  const title = await getComboSetInfo(comboId);
  const { products, pagination } = await getComboProducts(comboId, page, limit);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="flex flex-col h-full p-4 md:p-6 z-10 relative space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/50 p-5 rounded-lg border border-gray-800 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-4">
            <Link href="/product/combo-set/list">
              <button className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-all shadow-sm">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-wider uppercase drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                CÁC SẢN PHẨM ĐƯỢC ÁP DỤNG COMBO
              </h1>
              <p className="text-sm text-gray-400 font-medium flex items-center gap-2 mt-1">
                Combo Set: <span className="text-white font-bold bg-gray-800 px-2 py-0.5 rounded text-xs">{title}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-[400px]">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          }>
            <ComboSetProductTable products={products} pagination={pagination} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
