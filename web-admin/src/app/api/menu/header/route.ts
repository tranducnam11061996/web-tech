import { NextResponse } from 'next/server';
import { getPublishedHeaderMenu } from '@/lib/admin/menus';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  const menu = await getPublishedHeaderMenu();
  return NextResponse.json({ success: true, data: menu }, { headers: corsHeaders });
}
