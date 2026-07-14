import { NextResponse } from 'next/server';
import { getPublishedBottomFooterMenu } from '@/lib/bottomFooterMenus';
import { jsonWithEtag } from '@/lib/httpCache';

export const revalidate = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  return jsonWithEtag(request, { success: true, data: await getPublishedBottomFooterMenu() }, { headers: corsHeaders });
}
