import { NextResponse } from 'next/server';
import pool from '@/lib/db';
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
    { success: true, message: 'Use POST to create an order from the quoted cart.' },
    { headers: corsHeaders },
  );
}

function truncate(value: string, maxLength: number) {
  return String(value || '').slice(0, maxLength);
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const body = await request.json().catch(() => ({}));
    const quote = await buildCartQuote((body as any).items);
    const invalidItems = quote.items.filter((item) => !item.available);
    const orderItems = quote.items.filter((item) => item.available);
    const customer = (body as any).customer || {};

    if (orderItems.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Giỏ hàng chưa có sản phẩm hợp lệ để đặt hàng' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (invalidItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Một số sản phẩm trong giỏ hàng hiện không thể đặt mua',
          data: { invalidItems },
        },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!customer.name || !customer.phone) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập họ tên và số điện thoại' },
        { status: 400, headers: corsHeaders },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const productTitle =
      orderItems.length === 1
        ? orderItems[0].name
        : `Đơn hàng website (${orderItems.length} sản phẩm)`;

    const buyerInfo = JSON.stringify({
      customer: (body as any).customer || {},
      receiver: (body as any).receiver || {},
      delivery: (body as any).delivery || {},
      paymentMethod: (body as any).paymentMethod || 'bank_transfer',
      invoice: (body as any).invoice || {},
      source: 'font-end',
      createdAt: new Date().toISOString(),
    });

    const config = JSON.stringify({
      items: orderItems,
      totals: quote.totals,
      note: (body as any).note || '',
    });

    await connection.beginTransaction();

    const [orderResult] = await connection.query(
      `
        INSERT INTO build_buy
          (product_title, total_value, product_id, buyer_info, config, status, create_time, last_update)
        VALUES
          (?, ?, ?, ?, ?, 1, ?, ?)
      `,
      [
        truncate(productTitle, 255),
        quote.totals.total,
        orderItems.length === 1 ? orderItems[0].productId : 0,
        buyerInfo,
        config,
        now,
        now,
      ],
    );

    const orderId = Number((orderResult as any).insertId);

    for (const item of orderItems) {
      await connection.query(
        `
          INSERT INTO build_buy_item
            (order_id, product_id, title, product_price, quantity)
          VALUES
            (?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.productId,
          truncate(item.name, 255),
          Math.round(item.price),
          item.quantity,
        ],
      );
    }

    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId,
          total: quote.totals.total,
          itemCount: quote.totals.itemCount,
        },
        message: 'Tạo đơn hàng thành công',
      },
      { headers: corsHeaders },
    );
  } catch (error: any) {
    await connection.rollback();
    console.error('API /orders Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tạo đơn hàng',
        error: error.message,
      },
      { status: 500, headers: corsHeaders },
    );
  } finally {
    connection.release();
  }
}
