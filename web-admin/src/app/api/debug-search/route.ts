import { NextResponse } from 'next/server';
import { getPublicSearchPayload } from '@/lib/publicSearch';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (!searchParams.has('q')) searchParams.set('q', 'lap');
    searchParams.set('page', '1');
    searchParams.set('limit', '10');
    const results = await getPublicSearchPayload(searchParams);
    if (!results.success || !('pagination' in results) || !('data' in results)) {
      return NextResponse.json(results, { status: 'status' in results ? Number(results.status || 400) : 400 });
    }
    const searchResults = results as { pagination: { total: number }; data: unknown[] };
    return NextResponse.json({
      query: searchParams.get('q'),
      total: searchResults.pagination.total,
      topResults: searchResults.data,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
