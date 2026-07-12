import nodemailer, { type Transporter } from 'nodemailer';

// ---- Types matching the orders route payload ----

export interface EmailCustomer {
  name: string;
  phone: string;
  email: string;
}

export interface EmailReceiver {
  enabled: boolean;
  name: string;
  phone: string;
}

export interface EmailDelivery {
  method: 'shipping' | 'pickup';
  province: string;
  ward: string;
  address: string;
  note: string;
}

export interface EmailOrderItem {
  productId: number;
  title: string;
  quantity: number;
  product_price: number;
}

export interface EmailOrderTotals {
  subtotal: number;
  total: number;
  itemCount: number;
}

export interface SendOrderEmailParams {
  to: string;
  orderId: number;
  items: EmailOrderItem[];
  totals: EmailOrderTotals;
  customer: EmailCustomer;
  delivery: EmailDelivery;
  paymentMethod: string;
}

// ---- Config ----

const NOTIFY_ON_ORDER = process.env.NOTIFY_ON_ORDER !== 'false';

type MailSender = {
  email?: string;
  name?: string;
};

function parseSender(): MailSender | undefined {
  const raw = process.env.SMTP_FROM?.trim();
  if (!raw) return undefined;
  // "HACOM <no-reply@hacom.vn>" → { name: 'HACOM', email: 'no-reply@hacom.vn' }
  const m = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { email: raw };
}

let cachedTransporter: Transporter | null = null;

function createTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = createTransporter();
  return cachedTransporter;
}

// ---- Helpers ----

function formatCurrency(value: number): string {
  return value.toLocaleString('vi-VN') + '₫';
}

function paymentLabel(method: string): string {
  switch (method) {
    case 'cod':
      return 'Thanh toán khi nhận hàng (COD)';
    case 'bank_transfer':
      return 'Chuyển khoản ngân hàng';
    default:
      return method || 'bank_transfer';
  }
}

// ---- Template ----

function buildOrderHtml({
  orderId,
  items,
  totals,
  customer,
  delivery,
  paymentMethod,
}: Pick<
  SendOrderEmailParams,
  'orderId' | 'items' | 'totals' | 'customer' | 'delivery' | 'paymentMethod'
>): string {
  const rows = items
    .map(
      (item) => `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:12px 8px;font-size:13px;color:#333;width:40%;">${escapeHtml(item.title)}</td>
        <td style="padding:12px 8px;font-size:13px;color:#666;text-align:center;">x${item.quantity}</td>
        <td style="padding:12px 8px;font-size:13px;color:#333;text-align:right;">${formatCurrency(item.product_price)}</td>
        <td style="padding:12px 8px;font-size:13px;font-weight:600;color:#1a1a1a;text-align:right;">${formatCurrency(item.product_price * item.quantity)}</td>
      </tr>`,
    )
    .join('');

  const hasInfoAddress = delivery.province || delivery.ward || delivery.address;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin:0; padding:0; background:#f5f5f5; font-family:Arial,Helvetica,sans-serif; }
    .wrap { max-width:640px; margin:0 auto; }
    .header { background:#dc2626; padding:28px 32px; text-align:center; }
    .header h1 { color:#fff; font-size:22px; margin:0; font-weight:700; letter-spacing:1px; }
    .header p  { color:rgba(255,255,255,.85); font-size:13px; margin:6px 0 0; }
    .section { background:#fff; margin:16px 16px 0; padding:24px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,.06); }
    .section h2 { font-size:15px; color:#dc2626; margin:0 0 14px; text-transform:uppercase; letter-spacing:.5px; }
    table { width:100%; border-collapse:collapse; }
    th { font-size:11px; color:#999; text-transform:uppercase; padding:8px; border-bottom:2px solid #eee; text-align:left; }
    th:last-child, th:nth-child(3) { text-align:right; }
    .total-row td { padding:16px 8px 0; font-size:18px; font-weight:700; color:#dc2626; text-align:right; border:none; }
    .row-label { color:#555; font-size:13px; }
    .row-value { color:#1a1a1a; font-size:13px; font-weight:500; }
    .divider { border:none; border-top:1px solid #eee; margin:14px 0; }
    .footer { text-align:center; padding:24px 16px 40px; color:#aaa; font-size:11px; }
    .success-badge { display:inline-block; background:#dc2626; color:#fff; padding:4px 14px; border-radius:20px; font-size:12px; font-weight:600; margin-bottom:10px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Cảm ơn bạn đã đặt hàng!</h1>
      <p>Đơn hàng #${orderId} đã được ghi nhận và đang xử lý.</p>
    </div>

    <!-- Order summary -->
    <div class="section">
      <h2>Chi tiết đơn hàng</h2>
      <table>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th style="text-align:center">SL</th>
            <th style="text-align:right">Đơn giá</th>
            <th style="text-align:right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3" style="text-align:right;padding-top:16px;font-size:13px;color:#666;">Tổng cộng</td>
            <td style="text-align:right;padding-top:16px;">${formatCurrency(totals.total)}</td>
          </tr>
          <tr>
            <td colspan="4" style="text-align:right;font-size:11px;color:#999;padding-top:4px;">${totals.itemCount} sản phẩm</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Customer info -->
    <div class="section">
      <h2>Thông tin người đặt</h2>
      <table>
        <tr>
          <td class="row-label" style="width:36%;padding:4px 8px;">Họ và tên</td>
          <td class="row-value" style="padding:4px 8px;">${escapeHtml(customer.name)}</td>
        </tr>
        <tr>
          <td class="row-label" style="padding:4px 8px;">Số điện thoại</td>
          <td class="row-value" style="padding:4px 8px;">${escapeHtml(customer.phone)}</td>
        </tr>
        <tr>
          <td class="row-label" style="padding:4px 8px;">Email</td>
          <td class="row-value" style="padding:4px 8px;">${escapeHtml(customer.email)}</td>
        </tr>
      </table>
    </div>

    <!-- Delivery -->
    <div class="section">
      <h2>Địa chỉ nhận hàng</h2>
      <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">${
        delivery.method === 'pickup' ? 'Nhận tại cửa hàng' : 'Giao hàng tận nơi'
      }</p>
      ${hasInfoAddress ? `
      <p style="font-size:13px;color:#444;margin:0 0 4px;line-height:1.6;">
        ${[delivery.address, delivery.ward, delivery.province].filter(Boolean).join(', ')}
      </p>` : '<p style="font-size:13px;color:#999;">Không có thông tin địa chỉ</p>'}
      ${delivery.note ? `<p style="font-size:13px;color:#666;margin-top:8px;"><em>Ghi chú: ${escapeHtml(delivery.note)}</em></p>` : ''}
    </div>

    <!-- Payment -->
    <div class="section">
      <h2>Phương thức thanh toán</h2>
      <p style="font-size:14px;color:#1a1a1a;margin:0;">${paymentLabel(paymentMethod)}</p>
    </div>

    <div class="footer">
      <p>Đây là email tự động. Vui lòng không trả lời email này.</p>
      <p style="margin-top:4px;">TrucTiepGAME &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---- Public API ----

/**
 * Send order confirmation email to the customer.
 * Returns true if the email was dispatched successfully, false otherwise.
 * Does NOT throw — callers should not wrap in try/catch if they don't need to.
 */
export async function sendOrderEmail(params: SendOrderEmailParams): Promise<boolean> {
  if (!NOTIFY_ON_ORDER) return false;

  const html = buildOrderHtml(params);
  const sender = parseSender();
  const from = sender
    ? `${sender.name ? sender.name + ' ' : ''}<${sender.email}>`
    : 'TrucTiepGAME <no-reply@hacom.vn>';

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn('[email] SMTP not configured — skipping order email for order #' + params.orderId);
      return false;
    }

    await transporter.sendMail({
      from,
      to: params.to,
      subject: `Xác nhận đơn hàng #${params.orderId} — TrucTiepGAME`,
      html,
    });

    console.log(`[email] Order confirmation sent to ${params.to} for order #${params.orderId}`);
    return true;
  } catch (err) {
    console.error(`[email] Failed to send order email for order #${params.orderId}:`, err);
    return false;
  }
}
