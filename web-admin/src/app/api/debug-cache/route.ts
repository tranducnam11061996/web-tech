import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { injectSynonyms, removeVietnameseTones } from '@/lib/searchCache';

export async function GET() {
  try {
    const [countRows] = await pool.query('SELECT COUNT(id) as total FROM idv_sell_product_store');
    const totalProducts = (countRows as any[])[0]?.total || 0;

    const [sample] = await pool.query(
      'SELECT p.id, p.storeSKU, p.proName FROM idv_sell_product_store p WHERE p.id > 0 LIMIT 1'
    );
    const sampleRow = (sample as any[])[0];

    let testSearchText = '';
    if (sampleRow) {
      testSearchText = injectSynonyms(
        removeVietnameseTones(`${sampleRow.storeSKU || ''} ${sampleRow.proName || ''}`)
      ).substring(0, 100);
    }

    return NextResponse.json({
      success: true,
      totalProducts,
      sampleProduct: sampleRow
        ? {
            id: sampleRow.id,
            SKU: sampleRow.storeSKU,
            name: sampleRow.proName?.substring(0, 60),
            testSearchText,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
