import { NextResponse } from 'next/server';
import { getPublicProductCacheStats } from '@/lib/publicProductCache';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      cache: getPublicProductCacheStats(),
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
