import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { buildCartQuote } from '@/lib/cart-quote';
import { sendOrderEmail, type EmailCustomer, type EmailDelivery, type EmailOrderItem, type EmailOrderTotals } from '@/lib/email';

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
    const delivery = (body as any).delivery || {};
    const rawPayment = (body as any).paymentMethod || 'bank_transfer';

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
      paymentMethod: rawPayment,
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
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
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
        VALUES (?, ?, ?, ?, ?)
        `,
        [orderId, item.productId, truncate(item.name, 255), Math.round(item.price), item.quantity],
      );
    }

    await connection.commit();

    // ---- Send order confirmation email (fire-and-forget) ----
    const customerEmail = typeof customer.email === 'string' ? customer.email.trim() : '';
    if (customerEmail) {
      const emailDelivery: EmailDelivery = {
        method: delivery.method || 'shipping',
        province: typeof delivery.province === 'string' ? delivery.province : '',
        ward: typeof delivery.ward === 'string' ? delivery.ward : '',
        address: typeof delivery.address === 'string' ? delivery.address : '',
        note: typeof delivery.note === 'string' ? delivery.note : '',
      };
      const emailItems: EmailOrderItem[] = orderItems.map((item) => ({
        productId: item.productId,
        title: item.name,
        quantity: item.quantity,
        product_price: Math.round(item.price),
      }));
      const emailCustomer: EmailCustomer = {
        name: typeof customer.name === 'string' ? customer.name : '',
        phone: typeof customer.phone === 'string' ? customer.phone : '',
        email: customerEmail,
      };
      const emailTotals: EmailOrderTotals = {
        subtotal: quote.totals.subtotal,
        total: quote.totals.total,
        itemCount: quote.totals.itemCount,
      };

      sendOrderEmail({
        to: customerEmail,
        orderId,
        items: emailItems,
        totals: emailTotals,
        customer: emailCustomer,
        delivery: emailDelivery,
        paymentMethod: rawPayment,
      }).catch((err) => {
        console.error(`[orders] Unexpected email error for order #${orderId}:`, err);
      });
    }

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
