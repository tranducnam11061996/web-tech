import type { Pool, PoolConnection } from 'mysql2/promise';
import pool from '@/lib/db';
import { quoteVoucher, type VoucherQuote } from '@/lib/vouchers';
import { resolveProductImageUrl } from '@/lib/productImageUrl';
import { resolveActiveFlashSaleOffers, type FlashSaleOffer } from '@/lib/flashSales';

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
  regularPrice: number;
  marketPrice: number;
  available: boolean;
  reason: string | null;
  lineTotal: number;
  lineMarketTotal: number;
  flashSale: FlashSaleOffer | null;
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
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) throw new Error('Invalid cart quantity');
  return parsed;
}

function normalizeInputItems(items: unknown): CartQuoteInputItem[] {
  if (!Array.isArray(items)) return [];
  if (items.length > 50) throw new Error('Too many cart items');

  const byProduct = new Map<number, CartQuoteInputItem>();

  for (const item of items) {
    const productId = Number((item as any)?.productId);
    if (!Number.isInteger(productId) || productId <= 0) throw new Error('Invalid product id');

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
  options?: { voucherCode?: unknown; db?: DbExecutor; lockVoucher?: boolean; lockFlashSale?: boolean },
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
  const [[rows], offers] = await Promise.all([
    db.query(
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
    ),
    resolveActiveFlashSaleOffers(productIds, db, Boolean(options?.lockFlashSale)),
  ]);

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
        regularPrice: 0,
        marketPrice: 0,
        available: false,
        reason: 'not_found',
        lineTotal: 0,
        lineMarketTotal: 0,
        flashSale: null,
      };
    }

    const regularPrice = Number(row.price || 0);
    const flashSale = offers.get(inputItem.productId) || null;
    const price = flashSale ? flashSale.flashPrice : regularPrice;
    const marketPrice = Number(row.market_price || 0);
    const isOn = Number(row.isOn) === 1;
    const flashQuantityValid = !flashSale || (
      flashSale.remainingQuantity >= inputItem.quantity
      && inputItem.quantity >= flashSale.minQuantityPerOrder
      && inputItem.quantity <= flashSale.maxQuantityPerOrder
    );
    const available = isOn && price > 0 && flashQuantityValid;
    const lineTotal = available ? price * inputItem.quantity : 0;
    const lineMarketTotal = available ? Math.max(marketPrice, regularPrice, price) * inputItem.quantity : 0;

    let reason: string | null = null;
    if (!isOn) reason = 'inactive';
    else if (regularPrice <= 0) reason = 'invalid_price';
    else if (flashSale && flashSale.remainingQuantity < inputItem.quantity) reason = 'flash_sale_sold_out';
    else if (flashSale && (inputItem.quantity < flashSale.minQuantityPerOrder || inputItem.quantity > flashSale.maxQuantityPerOrder)) reason = 'flash_sale_limit';

    return {
      productId: Number(row.id),
      quantity: inputItem.quantity,
      name: row.proName || 'Sản phẩm',
      sku: row.storeSKU || '',
      slug: row.slug ? String(row.slug).replace(/^\/+/, '') : `product-${row.id}`,
      thumbnail: resolveProductImageUrl(row.proThum, 'https://placehold.co/300x300/1f2937/a1a1aa?text=HACOM'),
      price,
      regularPrice,
      marketPrice,
      available,
      reason,
      lineTotal,
      lineMarketTotal,
      flashSale,
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

  const hasExclusiveFlashSale = quotedItems.some((item) => item.available && item.flashSale?.stackingMode === 'exclusive');
  const requestedVoucher = String(options?.voucherCode || '').trim();
  const voucher: VoucherQuote = requestedVoucher && hasExclusiveFlashSale
    ? { code: requestedVoucher.toUpperCase(), status: 'invalid', reason: 'flash_sale_exclusive', message: 'Voucher không áp dụng cùng sản phẩm Flash Sale trong chiến dịch này.', voucherId: null, title: null, discount: 0, eligibleSubtotal: 0, eligibleItemCount: 0, categoryNames: [], note: null }
    : await quoteVoucher(
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
