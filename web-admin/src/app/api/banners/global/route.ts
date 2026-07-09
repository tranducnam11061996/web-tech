import { NextResponse } from 'next/server';
import { getPublicBannersByScope } from '@/lib/admin/banners';

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

export async function GET() {
  return NextResponse.json({ success: true, data: await getPublicBannersByScope('global') }, { headers });
}
