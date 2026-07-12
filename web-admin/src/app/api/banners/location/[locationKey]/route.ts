import { NextResponse } from 'next/server';
import { getPublicBannersByLocation } from '@/lib/publicBanners';

export const revalidate = 60;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers });
}

export async function GET(_request: Request, context: RouteContext<'/api/banners/location/[locationKey]'>) {
  const { locationKey } = await context.params;
  return NextResponse.json({ success: true, data: await getPublicBannersByLocation(locationKey) }, { headers });
}
