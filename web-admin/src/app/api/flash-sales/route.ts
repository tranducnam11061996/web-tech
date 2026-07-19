import { NextResponse } from 'next/server';
import { getPublicFlashSales } from '@/lib/flashSales';

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getPublicFlashSales() }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=2, stale-while-revalidate=3' },
    });
  } catch (error) {
    console.error('Flash Sale public read failed:', error);
    return NextResponse.json({ success: false, error: { code: 'FLASH_SALE_UNAVAILABLE', message: 'Flash Sale tạm thời chưa khả dụng.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
