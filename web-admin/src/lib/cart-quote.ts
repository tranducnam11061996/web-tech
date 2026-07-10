import type { Pool, PoolConnection } from 'mysql2/promise';
import pool from '@/lib/db';
import { quoteVoucher, type VoucherQuote } from '@/lib/vouchers';

type DbExecutor = Pool | PoolConnection;

export type CartQuoteInputItem = {
  productId: number;
  quantity: number;
};

export type CartQuoteItem = {
  productId: number;
  quantity: number;
  name: string;
  sku: string;
  slug: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  available: boolean;
  reason: string | null;
  lineTotal: number;
  lineMarketTotal: number;
};

export type CartQuote = {
  items: CartQuoteItem[];
  totals: {
    subtotal: number;
    marketSubtotal: number;
    savings: number;
    voucherDiscount: number;
    total: number;
    itemCount: number;
    availableItemCount: number;
  };
  voucher: VoucherQuote;
};

function clampQuantity(quantity: unknown) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(99, Math.max(1, Math.floor(parsed)));
}

function normalizeInputItems(items: unknown): CartQuoteInputItem[] {
  if (!Array.isArray(items)) return [];

  const byProduct = new Map<number, CartQuoteInputItem>();

  for (const item of items) {
    const productId = Number((item as any)?.productId);
    if (!Number.isFinite(productId) || productId <= 0) continue;

    const quantity = clampQuantity((item as any)?.quantity);
    const existing = byProduct.get(productId);
    byProduct.set(productId, {
      productId,
      quantity: existing ? clampQuantity(existing.quantity + quantity) : quantity,
    });
  }

  return Array.from(byProduct.values());
}

export async function buildCartQuote(
  rawItems: unknown,
  options?: { voucherCode?: unknown; db?: DbExecutor; lockVoucher?: boolean },
): Promise<CartQuote> {
  const db = options?.db || pool;
  const inputItems = normalizeInputItems(rawItems);
  if (inputItems.length === 0) {
    return {
      items: [],
      totals: {
        subtotal: 0,
        marketSubtotal: 0,
        savings: 0,
        voucherDiscount: 0,
        total: 0,
        itemCount: 0,
        availableItemCount: 0,
      },
      voucher: await quoteVoucher(options?.voucherCode, [], 0, db, Boolean(options?.lockVoucher)),
    };
  }

  const productIds = inputItems.map((item) => item.productId);
  const [rows] = await db.query(
    `
      SELECT
        p.id, p.storeSKU, p.proName, p.proThum,
        pr.price, pr.market_price, pr.isOn,
        u.request_path as slug
      FROM idv_sell_product_store p
      LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      WHERE p.id IN (?)
    `,
    [productIds],
  );

  const rowsById = new Map<number, any>();
  for (const row of rows as any[]) {
    rowsById.set(Number(row.id), row);
  }

  const quotedItems = inputItems.map((inputItem) => {
    const row = rowsById.get(inputItem.productId);

    if (!row) {
      return {
        productId: inputItem.productId,
        quantity: inputItem.quantity,
        name: 'Sản phẩm không tồn tại',
        sku: '',
        slug: `product-${inputItem.productId}`,
        thumbnail: '',
        price: 0,
        marketPrice: 0,
        available: false,
        reason: 'not_found',
        lineTotal: 0,
        lineMarketTotal: 0,
      };
    }

    const price = Number(row.price || 0);
    const marketPrice = Number(row.market_price || 0);
    const isOn = Number(row.isOn) === 1;
    const available = isOn && price > 0;
    const lineTotal = available ? price * inputItem.quantity : 0;
    const lineMarketTotal = available ? (marketPrice > 0 ? marketPrice : price) * inputItem.quantity : 0;

    let reason: string | null = null;
    if (!isOn) reason = 'inactive';
    else if (price <= 0) reason = 'invalid_price';

    return {
      productId: Number(row.id),
      quantity: inputItem.quantity,
      name: row.proName || 'Sản phẩm',
      sku: row.storeSKU || '',
      slug: row.slug ? String(row.slug).replace(/^\/+/, '') : `product-${row.id}`,
      thumbnail: row.proThum ? `https://hacom.vn/media/product/${row.proThum}` : 'https://placehold.co/300x300/1f2937/a1a1aa?text=HACOM',
      price,
      marketPrice,
      available,
      reason,
      lineTotal,
      lineMarketTotal,
    };
  });

  const totals = quotedItems.reduce(
    (acc, item) => {
      if (!item.available) return acc;
      acc.subtotal += item.lineTotal;
      acc.marketSubtotal += item.lineMarketTotal;
      acc.itemCount += item.quantity;
      acc.availableItemCount += 1;
      return acc;
    },
    {
      subtotal: 0,
      marketSubtotal: 0,
      savings: 0,
      voucherDiscount: 0,
      total: 0,
      itemCount: 0,
      availableItemCount: 0,
    },
  );

  const voucher = await quoteVoucher(
    options?.voucherCode,
    quotedItems.map((item) => ({ productId: item.productId, quantity: item.quantity, price: item.price, available: item.available })),
    totals.subtotal,
    db,
    Boolean(options?.lockVoucher),
  );
  totals.voucherDiscount = voucher.discount;
  totals.total = Math.max(0, totals.subtotal - voucher.discount);
  totals.savings = Math.max(0, totals.marketSubtotal - totals.subtotal);

  return {
    items: quotedItems,
    totals,
    voucher,
  };
}
