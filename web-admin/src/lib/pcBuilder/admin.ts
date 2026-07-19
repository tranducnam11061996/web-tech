import type { RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import {
  getPcBuilderComponentConfiguration,
  hasPcBuilderCatalogLive,
} from "./configuration";

export async function getPcBuilderAdminDashboard() {
  if (!(await hasPcBuilderCatalogLive(pool)))
    return {
      installed: false as const,
      minimumBudget: 0,
      componentConfiguration: null,
    };
  const componentConfiguration = await getPcBuilderComponentConfiguration(pool);
  const [rows] = await pool.query<RowDataPacket[]>(
    `WITH RECURSIVE tree AS (
      SELECT code,category_id id FROM web_admin_pc_builder_components
      WHERE status=1 AND is_required=1 AND category_id IS NOT NULL
      UNION ALL SELECT tree.code,category.id FROM tree
      JOIN idv_seller_category category ON category.parentId=tree.id WHERE category.status=1
    ) SELECT tree.code,MIN(price.price) minimum_price FROM tree
      JOIN idv_product_category pc ON pc.category_id=tree.id
      JOIN idv_sell_product_price price ON price.id=pc.pro_id AND price.isOn=1 AND price.price>0
      GROUP BY tree.code`,
  );
  return {
    installed: true as const,
    minimumBudget: rows.reduce((total, row) => total + Number(row.minimum_price || 0), 0),
    componentConfiguration,
  };
}
