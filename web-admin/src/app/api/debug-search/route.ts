import { NextResponse } from 'next/server';
import { ensureSearchCacheFresh } from '@/lib/searchCache';
import { rankSearchProducts } from '@/lib/productSearch';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'lap';
    await ensureSearchCacheFresh();

    const results = rankSearchProducts(query);
    return NextResponse.json({
      query,
      total: results.length,
      topResults: results.slice(0, 10).map(({ product, score, customRank }) => ({
        id: product.id,
        name: product.proName,
        SKU: product.storeSKU,
        score,
        customRank,
        searchText: product.searchText.substring(0, 100),
      })),
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
