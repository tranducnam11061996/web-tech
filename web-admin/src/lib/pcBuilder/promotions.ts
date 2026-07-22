import { createHash } from "crypto";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import pool from "@/lib/db";
import { AdminApiError } from "@/lib/admin/common";
import type { CartQuoteItem } from "@/lib/cart-quote";
import type { PcBuilderSelection } from "./types";
import { bumpPcBuilderCacheVersion } from "./infrastructure";

type DbExecutor = Pool | PoolConnection;

export type PcBuilderPromotion = {
  id: number;
  name: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  maxDiscount: number | null;
  priority: number;
  status: boolean;
  startsAt: string | null;
  endsAt: string | null;
  targets: Array<{ type: "product" | "category"; id: number }>;
  requirements: Array<{ componentCode: string; minDistinctSkus: number }>;
};

export const pcBuilderPromotionConfigurationSchema = z.object({
  version: z.string().regex(/^[a-f0-9]{64}$/i),
  promotions: z.array(z.object({
    id: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(150),
    discountType: z.enum(["fixed", "percent"]),
    discountValue: z.coerce.number().int().positive().max(2_000_000_000),
    maxDiscount: z.coerce.number().int().positive().max(2_000_000_000).nullable().optional().default(null),
    priority: z.coerce.number().int().min(-100_000).max(100_000).default(0),
    status: z.boolean().default(true),
    startsAt: z.string().datetime().nullable().optional().default(null),
    endsAt: z.string().datetime().nullable().optional().default(null),
    targets: z.array(z.object({
      type: z.enum(["product", "category"]),
      id: z.coerce.number().int().positive(),
    }).strict()).min(1).max(200),
    requirements: z.array(z.object({
      componentCode: z.string().trim().regex(/^[a-z0-9_]{1,32}$/),
      minDistinctSkus: z.coerce.number().int().min(1).max(8),
    }).strict()).max(30).default([]),
  }).strict().superRefine((value, context) => {
    if (value.discountType === "percent" && value.discountValue > 100)
      context.addIssue({ code: "custom", path: ["discountValue"], message: "Phần trăm giảm phải từ 1 đến 100." });
    if (value.startsAt && value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt))
      context.addIssue({ code: "custom", path: ["endsAt"], message: "Thời gian kết thúc phải sau thời gian bắt đầu." });
    const targetKeys = value.targets.map((target) => `${target.type}:${target.id}`);
    if (new Set(targetKeys).size !== targetKeys.length)
      context.addIssue({ code: "custom", path: ["targets"], message: "Target khuyến mãi bị trùng." });
    const requirementCodes = value.requirements.map((requirement) => requirement.componentCode);
    if (new Set(requirementCodes).size !== requirementCodes.length)
      context.addIssue({ code: "custom", path: ["requirements"], message: "Điều kiện component bị trùng." });
  })).max(100),
}).strict();

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function tableInstalled(db: DbExecutor) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT 1 FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_promotions' LIMIT 1`);
  return Boolean(rows[0]);
}

export async function loadPcBuilderPromotions(db: DbExecutor = pool, activeOnly = false) {
  if (!(await tableInstalled(db))) return [] as PcBuilderPromotion[];
  const condition = activeOnly
    ? "WHERE p.status=1 AND (p.starts_at IS NULL OR p.starts_at<=UTC_TIMESTAMP()) AND (p.ends_at IS NULL OR p.ends_at>UTC_TIMESTAMP())"
    : "";
  const [[rows], [targets], [requirements]] = await Promise.all([
    db.query<RowDataPacket[]>(`SELECT p.*,
        DATE_FORMAT(p.starts_at,'%Y-%m-%dT%H:%i:%s.000Z') starts_at_iso,
        DATE_FORMAT(p.ends_at,'%Y-%m-%dT%H:%i:%s.000Z') ends_at_iso
      FROM web_admin_pc_builder_promotions p ${condition}
      ORDER BY p.priority DESC,p.id ASC`),
    db.query<RowDataPacket[]>(`SELECT promotion_id,target_type,target_id
      FROM web_admin_pc_builder_promotion_targets ORDER BY promotion_id,target_type,target_id`),
    db.query<RowDataPacket[]>(`SELECT promotion_id,component_code,min_distinct_skus
      FROM web_admin_pc_builder_promotion_requirements ORDER BY promotion_id,component_code`),
  ]);
  return rows.map((row): PcBuilderPromotion => ({
    id: Number(row.id),
    name: String(row.name),
    discountType: row.discount_type === "percent" ? "percent" : "fixed",
    discountValue: Number(row.discount_value),
    maxDiscount: row.max_discount === null ? null : Number(row.max_discount),
    priority: Number(row.priority),
    status: Number(row.status) === 1,
    startsAt: row.starts_at_iso ? String(row.starts_at_iso) : null,
    endsAt: row.ends_at_iso ? String(row.ends_at_iso) : null,
    targets: targets.filter((target) => Number(target.promotion_id) === Number(row.id)).map((target) => ({
      type: target.target_type === "category" ? "category" : "product",
      id: Number(target.target_id),
    })),
    requirements: requirements.filter((item) => Number(item.promotion_id) === Number(row.id)).map((item) => ({
      componentCode: String(item.component_code),
      minDistinctSkus: Number(item.min_distinct_skus),
    })),
  }));
}

export async function pcBuilderPromotionVersion(db: DbExecutor = pool) {
  return stableHash(await loadPcBuilderPromotions(db));
}

export async function getPcBuilderPromotionConfiguration(db: DbExecutor = pool) {
  if (!(await tableInstalled(db)))
    return { installed: false, version: stableHash([]), promotions: [] as PcBuilderPromotion[] };
  const promotions = await loadPcBuilderPromotions(db);
  return { installed: true, version: stableHash(promotions), promotions };
}

export async function savePcBuilderPromotionConfiguration(
  input: z.infer<typeof pcBuilderPromotionConfigurationSchema>,
) {
  if (!(await tableInstalled(pool)))
    throw new AdminApiError(409, "CONFLICT", "Schema khuyến mãi PC Builder v5 chưa được cài đặt.");
  const productIds = input.promotions.flatMap((promotion) => promotion.targets.filter((target) => target.type === "product").map((target) => target.id));
  const categoryIds = input.promotions.flatMap((promotion) => promotion.targets.filter((target) => target.type === "category").map((target) => target.id));
  const componentCodes = input.promotions.flatMap((promotion) => promotion.requirements.map((requirement) => requirement.componentCode));
  if (productIds.length) {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM idv_sell_product_store WHERE id IN (?)", [Array.from(new Set(productIds))]);
    if (rows.length !== new Set(productIds).size) throw new AdminApiError(409, "CONFLICT", "Có SKU khuyến mãi không tồn tại.");
  }
  if (categoryIds.length) {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM idv_seller_category WHERE status=1 AND id IN (?)", [Array.from(new Set(categoryIds))]);
    if (rows.length !== new Set(categoryIds).size) throw new AdminApiError(409, "CONFLICT", "Có category khuyến mãi không tồn tại hoặc đang ẩn.");
  }
  if (componentCodes.length) {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT code FROM web_admin_pc_builder_components WHERE status=1 AND code IN (?)", [Array.from(new Set(componentCodes))]);
    if (rows.length !== new Set(componentCodes).size) throw new AdminApiError(409, "CONFLICT", "Có component điều kiện không còn hoạt động.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("SELECT id FROM web_admin_pc_builder_promotions FOR UPDATE");
    const lockedVersion = await pcBuilderPromotionVersion(connection);
    if (lockedVersion !== input.version) throw new AdminApiError(409, "CONFLICT", "Cấu hình khuyến mãi đã thay đổi. Hãy tải lại trước khi lưu.");
    const retainedIds: number[] = [];
    for (const promotion of input.promotions) {
      let id = Number(promotion.id || 0);
      const values = [promotion.name, promotion.discountType, promotion.discountValue,
        promotion.discountType === "percent" ? promotion.maxDiscount : null, promotion.priority,
        promotion.status ? 1 : 0,
        promotion.startsAt ? new Date(promotion.startsAt).toISOString().slice(0, 19).replace("T", " ") : null,
        promotion.endsAt ? new Date(promotion.endsAt).toISOString().slice(0, 19).replace("T", " ") : null];
      if (id) {
        const [result] = await connection.query(`UPDATE web_admin_pc_builder_promotions SET
          name=?,discount_type=?,discount_value=?,max_discount=?,priority=?,status=?,starts_at=?,ends_at=? WHERE id=?`, [...values, id]);
        if (Number((result as { affectedRows?: number }).affectedRows || 0) !== 1)
          throw new AdminApiError(409, "CONFLICT", "Khuyến mãi đã bị xóa bởi phiên làm việc khác.");
      } else {
        const [result] = await connection.query(`INSERT INTO web_admin_pc_builder_promotions
          (name,discount_type,discount_value,max_discount,priority,status,starts_at,ends_at) VALUES (?,?,?,?,?,?,?,?)`, values);
        id = Number((result as { insertId?: number }).insertId || 0);
      }
      retainedIds.push(id);
      await connection.query("DELETE FROM web_admin_pc_builder_promotion_targets WHERE promotion_id=?", [id]);
      await connection.query("DELETE FROM web_admin_pc_builder_promotion_requirements WHERE promotion_id=?", [id]);
      if (promotion.targets.length) await connection.query(
        "INSERT INTO web_admin_pc_builder_promotion_targets (promotion_id,target_type,target_id) VALUES ?",
        [promotion.targets.map((target) => [id, target.type, target.id])],
      );
      if (promotion.requirements.length) await connection.query(
        "INSERT INTO web_admin_pc_builder_promotion_requirements (promotion_id,component_code,min_distinct_skus) VALUES ?",
        [promotion.requirements.map((requirement) => [id, requirement.componentCode, requirement.minDistinctSkus])],
      );
    }
    if (retainedIds.length) await connection.query("DELETE FROM web_admin_pc_builder_promotions WHERE id NOT IN (?)", [retainedIds]);
    else await connection.query("DELETE FROM web_admin_pc_builder_promotions");
    await bumpPcBuilderCacheVersion(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getPcBuilderPromotionConfiguration();
}

export type AppliedPcBuilderPricing = {
  productId: number;
  regularPrice: number;
  cartPrice: number;
  buildPcPrice: number | null;
  buildPriceApplied: boolean;
  price: number;
  priceSource: "catalog" | "flash_sale" | "pc_builder" | "pc_builder_price";
  lineDiscount: number;
  promotion: { id: number; name: string } | null;
};

export function selectBestPcBuilderPromotionPrice(
  regularPrice: number,
  cartPrice: number,
  promotions: PcBuilderPromotion[],
) {
  const candidates = promotions.map((promotion) => {
    let discount = promotion.discountType === "fixed"
      ? promotion.discountValue
      : Math.round((regularPrice * promotion.discountValue / 100) / 1000) * 1000;
    if (promotion.maxDiscount !== null) discount = Math.min(discount, promotion.maxDiscount);
    return {
      promotion,
      price: Math.max(1, regularPrice - Math.min(discount, regularPrice - 1)),
    };
  }).sort((left, right) =>
    left.price - right.price ||
    right.promotion.priority - left.promotion.priority ||
    left.promotion.id - right.promotion.id,
  );
  const best = candidates[0];
  return best && best.price < cartPrice ? best : null;
}

export function selectPcBuilderProductPrice(
  regularPrice: number,
  configuredBuildPrice: number | null | undefined,
  eligible: boolean,
) {
  if (!eligible || !Number.isSafeInteger(configuredBuildPrice) || !configuredBuildPrice) return null;
  return configuredBuildPrice > 0 && configuredBuildPrice < regularPrice ? configuredBuildPrice : null;
}

export async function resolvePcBuilderPricing(
  db: DbExecutor,
  selections: PcBuilderSelection[],
  cartItems: CartQuoteItem[],
  options: { buildPriceEligible: boolean },
) {
  const [promotions, priceTableRows] = await Promise.all([
    loadPcBuilderPromotions(db, true),
    cartItems.length
      ? db.query<RowDataPacket[]>(`SELECT product_id,build_price,status,updated_at
          FROM web_admin_pc_builder_product_prices WHERE product_id IN (?) ORDER BY product_id`,
          [cartItems.map((item) => item.productId)]).then(([rows]) => rows)
      : Promise.resolve([] as RowDataPacket[]),
  ]);
  const promotionRevision = stableHash(promotions);
  const buildPriceRevision = stableHash(priceTableRows.map((row) => [
    Number(row.product_id), Number(row.build_price), Number(row.status), String(row.updated_at || ""),
  ]));
  const configuredPriceByProduct = new Map(priceTableRows
    .filter((row) => Number(row.status) === 1)
    .map((row) => [Number(row.product_id), Number(row.build_price)]));
  if (!options.buildPriceEligible || !cartItems.length) {
    return {
      promotionRevision,
      buildPriceRevision,
      items: cartItems.map((item): AppliedPcBuilderPricing => ({
        productId: item.productId, regularPrice: item.regularPrice, cartPrice: item.price, price: item.price,
        buildPcPrice: (() => {
          return selectPcBuilderProductPrice(item.regularPrice, configuredPriceByProduct.get(item.productId), true);
        })(),
        buildPriceApplied: false,
        priceSource: item.flashSale ? "flash_sale" : "catalog",
        lineDiscount: 0,
        promotion: null,
      })),
    };
  }
  const counts = new Map<string, number>();
  for (const selection of selections) counts.set(selection.componentCode, (counts.get(selection.componentCode) || 0) + 1);
  const categoryTargets = Array.from(new Set(promotions.flatMap((promotion) => promotion.targets.filter((target) => target.type === "category").map((target) => target.id))));
  const membership = new Set<string>();
  if (categoryTargets.length) {
    const [rows] = await db.query<RowDataPacket[]>(`WITH RECURSIVE tree AS (
      SELECT id root_id,id FROM idv_seller_category WHERE status=1 AND id IN (?)
      UNION ALL SELECT tree.root_id,c.id FROM tree JOIN idv_seller_category c ON c.parentId=tree.id WHERE c.status=1
    ) SELECT DISTINCT tree.root_id,pc.pro_id FROM tree JOIN idv_product_category pc ON pc.category_id=tree.id
      WHERE pc.pro_id IN (?)`, [categoryTargets, cartItems.map((item) => item.productId)]);
    for (const row of rows) membership.add(`${Number(row.root_id)}:${Number(row.pro_id)}`);
  }
  const eligible = promotions.filter((promotion) => promotion.requirements.every(
    (requirement) => (counts.get(requirement.componentCode) || 0) >= requirement.minDistinctSkus,
  ));
  const items = cartItems.map((item): AppliedPcBuilderPricing => {
    const buildPcPrice = selectPcBuilderProductPrice(
      item.regularPrice,
      configuredPriceByProduct.get(item.productId),
      options.buildPriceEligible,
    );
    if (buildPcPrice !== null) return {
      productId: item.productId,
      regularPrice: item.regularPrice,
      cartPrice: item.price,
      buildPcPrice,
      buildPriceApplied: true,
      price: buildPcPrice,
      priceSource: "pc_builder_price",
      lineDiscount: Math.max(0, item.price - buildPcPrice) * item.quantity,
      promotion: null,
    };
    const matched = eligible.filter((promotion) => promotion.targets.some((target) =>
      target.type === "product" ? target.id === item.productId : membership.has(`${target.id}:${item.productId}`),
    ));
    const best = selectBestPcBuilderPromotionPrice(item.regularPrice, item.price, matched);
    if (!best) return {
      productId: item.productId, regularPrice: item.regularPrice, cartPrice: item.price, price: item.price,
      buildPcPrice: null, buildPriceApplied: false,
      priceSource: item.flashSale ? "flash_sale" : "catalog",
      lineDiscount: 0,
      promotion: null,
    };
    return {
      productId: item.productId, regularPrice: item.regularPrice, cartPrice: item.price, price: best.price,
      buildPcPrice: null, buildPriceApplied: false,
      priceSource: "pc_builder", lineDiscount: Math.max(0, item.price - best.price) * item.quantity,
      promotion: { id: best.promotion.id, name: best.promotion.name },
    };
  });
  return { promotionRevision, buildPriceRevision, items };
}
