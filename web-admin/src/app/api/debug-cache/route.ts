import { NextResponse } from 'next/server';
import { ensureSearchCacheFresh, searchCache } from '@/lib/searchCache';

export async function GET() {
  try {
    await ensureSearchCacheFresh();
    const sample = searchCache.cachedProducts?.[0];

    return NextResponse.json({
      success: true,
      totalProducts: searchCache.cachedProducts?.length || 0,
      expiresAt: searchCache.expiresAt,
      sampleProduct: sample
        ? {
            id: sample.id,
            SKU: sample.storeSKU,
            name: sample.proName.substring(0, 60),
            searchText: sample.searchText.substring(0, 100),
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
