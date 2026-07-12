import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { buildComboQuote } from '@/lib/comboSets';
import { comboOrderSchema } from '@/lib/commerceValidation';
import { createOrderMeta } from '@/lib/storefrontOrders';
import { linkOrderToCustomer, resolveCustomerSession } from '@/lib/customerAccounts';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';
import { claimOrderRequest, completeOrderRequest, enqueueOrderEmail, validateIdempotencyKey } from '@/lib/orderInfrastructure';
import type { EmailCustomer, EmailDelivery, EmailOrderItem, EmailOrderTotals } from '@/lib/email';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') });
}

const truncate = (value: string, length: number) => String(value || '').slice(0, length);
const ascii = (value: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
const dbText = (value: string) => String(value || '').replace(/[^\x20-\x7E]/g, (char) => `\\u${(char.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`);

export async function POST(request: Request) {
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  const id = requestId(request);
  try {
    assertPublicOrigin(request);
    const body = await parseJson(request, comboOrderSchema, 48_000);
    if (body.website) return NextResponse.json({ success: true }, { status: 202, headers: { ...cors, 'X-Request-ID': id } });
    const idempotencyKey = validateIdempotencyKey(request.headers.get('idempotency-key'));
    await Promise.all([
      consumeRateLimit({ scope: 'combo_order_ip', key: requestIp(request), limit: 120, windowSeconds: 300, blockSeconds: 300 }),
      consumeRateLimit({ scope: 'combo_order_phone', key: body.customer.phone, limit: 8, windowSeconds: 900, blockSeconds: 900 }),
      verifyCustomerCaptcha(request, body.recaptchaToken, 'combo_order_submit'),
    ]);
    const sessionCustomer = await resolveCustomerSession(request);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const claimed = await claimOrderRequest(connection, idempotencyKey, body);
      if (claimed.replay) { await connection.commit(); return NextResponse.json(claimed.replay, { headers: { ...cors, 'X-Request-ID': id, 'Idempotency-Replayed': 'true' } }); }
      const quote = await buildComboQuote({ anchorProductId: body.anchorProductId, comboSetId: body.comboSetId, revision: body.revision, items: body.items }, { db: connection, lock: true });
      const addonItems = quote.groups.flatMap((group) => group.items);
      const buyerSnapshot = { customer: body.customer, receiver: body.receiver, delivery: body.delivery, paymentMethod: body.paymentMethod, invoice: body.invoice, source: 'font-end', orderType: 'combo', comboSetId: quote.comboSet.id, comboAnchorProductId: quote.anchor.productId, createdAt: new Date().toISOString() };
      const configSnapshot = { note: body.note, totals: quote.totals, combo: { set: quote.comboSet, anchor: quote.anchor, groups: quote.groups, discountAllocation: addonItems.filter((item) => item.comboDiscount > 0).map((item) => ({ groupIndex: item.groupIndex, productId: item.productId, amount: item.comboDiscount })) } };
      const now = Math.floor(Date.now() / 1000);
      const [result] = await connection.query(`INSERT INTO build_buy(product_title,total_value,product_id,buyer_info,config,status,create_time,last_update) VALUES(?,?,?,?,?,1,?,?)`, [truncate(ascii(`Đơn hàng combo - ${quote.comboSet.title}`), 255), quote.totals.total, quote.anchor.productId, dbText(JSON.stringify(buyerSnapshot)), dbText(JSON.stringify(configSnapshot)), now, now]);
      const orderId = Number((result as { insertId?: number }).insertId || 0);
      await Promise.all([createOrderMeta(connection, orderId, buyerSnapshot), linkOrderToCustomer(connection, orderId, sessionCustomer?.id || null)]);
      const allItems = [{ productId: quote.anchor.productId, name: quote.anchor.name, price: quote.anchor.price, quantity: 1 }, ...addonItems.map((item) => ({ productId: item.productId, name: item.name, price: item.price, quantity: item.quantity }))];
      await connection.query(`INSERT INTO build_buy_item(order_id,product_id,title,product_price,quantity) VALUES ?`, [allItems.map((item) => [orderId, item.productId, truncate(ascii(item.name), 255), Math.round(item.price), item.quantity])]);
      const customer: EmailCustomer = { name: body.customer.name, phone: body.customer.phone, email: body.customer.email || '' };
      const delivery: EmailDelivery = { method: body.delivery.method || 'shipping', province: body.delivery.province || '', ward: body.delivery.ward || '', address: body.delivery.address || '', note: body.delivery.note || '' };
      const emailItems: EmailOrderItem[] = allItems.map((item) => ({ productId: item.productId, title: item.name, quantity: item.quantity, product_price: Math.round(item.price) }));
      const totals: EmailOrderTotals = { subtotal: quote.totals.subtotalBeforeDiscount, total: quote.totals.total, itemCount: quote.totals.itemCount };
      await enqueueOrderEmail(connection, { to: customer.email, orderId, items: emailItems, totals, customer, delivery, paymentMethod: body.paymentMethod || 'bank_transfer', orderType: 'combo', comboDiscount: quote.totals.comboDiscount });
      const responseBody = { success: true, data: { orderId, total: quote.totals.total, itemCount: quote.totals.itemCount, orderType: 'combo' }, message: 'Tạo đơn hàng combo thành công' };
      await completeOrderRequest(connection, claimed.id, orderId, responseBody);
      await connection.commit();
      return NextResponse.json(responseBody, { headers: { ...cors, 'X-Request-ID': id } });
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  } catch (error) { return publicError(error, request, cors); }
}
