import { NextResponse } from 'next/server';
import { buildCartQuote } from '@/lib/cart-quote';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { success: true, message: 'Use POST with { items: [{ productId, quantity }] } to quote a cart.' },
    { headers: corsHeaders },
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const quote = await buildCartQuote((body as any).items);

    return NextResponse.json(
      {
        success: true,
        data: quote,
      },
      { headers: corsHeaders },
    );
  } catch (error: any) {
    console.error('API /cart/quote Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tính lại giỏ hàng',
        error: error.message,
      },
      { status: 500, headers: corsHeaders },
    );
  }
}
