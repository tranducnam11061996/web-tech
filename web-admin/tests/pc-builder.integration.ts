import assert from "node:assert/strict";
import test from "node:test";
import type { RowDataPacket } from "mysql2/promise";
import pool from "../src/lib/db";
import { ensurePerformanceInfrastructure } from "../src/lib/performanceInfrastructure";
import { ensureStorefrontOrderTables } from "../src/lib/storefrontOrders";
import { ensurePcBuilderTables } from "../src/lib/pcBuilder/infrastructure";
import {
  buildPcBuilderQuote,
  listPcBuilderCandidates,
} from "../src/lib/pcBuilder/service";

test.after(async () => {
  await pool.end();
});

test("Mainboard candidates include sellable SKUs from descendants when a sparse SSD relation is configured", async (context) => {
  const [summary] = await pool.query<RowDataPacket[]>(`WITH RECURSIVE mainboard_tree AS (
      SELECT id FROM idv_seller_category WHERE id=91 AND status=1
      UNION ALL SELECT category.id FROM idv_seller_category category
      JOIN mainboard_tree tree ON category.parentId=tree.id WHERE category.status=1
    ), ssd_tree AS (
      SELECT id FROM idv_seller_category WHERE id=139 AND status=1
      UNION ALL SELECT category.id FROM idv_seller_category category
      JOIN ssd_tree tree ON category.parentId=tree.id WHERE category.status=1
    ) SELECT
      (SELECT COUNT(DISTINCT pc.pro_id) FROM mainboard_tree tree
       JOIN idv_product_category pc ON pc.category_id=tree.id
       JOIN idv_sell_product_price price ON price.id=pc.pro_id AND price.isOn=1 AND price.price>0) mainboard_total,
      (SELECT MIN(pc.pro_id) FROM ssd_tree tree
       JOIN idv_product_category pc ON pc.category_id=tree.id
       JOIN idv_sell_product_price price ON price.id=pc.pro_id AND price.isOn=1 AND price.price>0) ssd_product_id`);
  const mainboardTotal = Number(summary[0]?.mainboard_total || 0);
  const ssdProductId = Number(summary[0]?.ssd_product_id || 0);
  if (!mainboardTotal || !ssdProductId) {
    context.skip("Catalog fixture does not contain the configured Mainboard/SSD trees");
    return;
  }
  const response = await listPcBuilderCandidates({
    componentCode: "mainboard",
    selections: [
      { componentCode: "ssd", productId: ssdProductId, quantity: 1 },
    ],
    page: 1,
    limit: 24,
    query: "",
    brandIds: [],
    minPrice: null,
    maxPrice: null,
    sort: "default",
    attributeFilters: {},
  });
  assert.equal(response.pagination.total, mainboardTotal);
  assert.equal(response.context.constrained, false);
});

test("legacy storage selections are normalized to the active SSD or HDD component", async (context) => {
  const [rows] = await pool.query<RowDataPacket[]>(`WITH RECURSIVE tree AS (
      SELECT code,category_id id FROM web_admin_pc_builder_components
      WHERE code IN ('ssd','hdd') AND status=1 AND category_id IS NOT NULL
      UNION ALL SELECT tree.code,category.id FROM tree
      JOIN idv_seller_category category ON category.parentId=tree.id
      WHERE category.status=1
    ) SELECT tree.code,pc.pro_id FROM tree
      JOIN idv_product_category pc ON pc.category_id=tree.id
      JOIN idv_sell_product_price price ON price.id=pc.pro_id
        AND price.isOn=1 AND price.price>0
      ORDER BY FIELD(tree.code,'ssd','hdd'),pc.pro_id LIMIT 1`);
  if (!rows[0]) {
    context.skip("Catalog fixture does not contain a sellable SSD/HDD");
    return;
  }
  const expectedCode = String(rows[0].code);
  const productId = Number(rows[0].pro_id);
  const quote = await buildPcBuilderQuote([
    { componentCode: "storage", productId, quantity: 1 },
  ]);
  assert.equal(quote.items.length, 1);
  assert.equal(quote.items[0]?.componentCode, expectedCode);
  assert.equal(quote.items[0]?.productId, productId);
  assert.equal(quote.totals.itemCount, 1);
  assert.ok(quote.totals.total > 0);
});

test(
  "PC Builder migration runs twice with all additive tables and order columns",
  { skip: process.env.PC_BUILDER_DESTRUCTIVE_TEST !== "true" },
  async () => {
    const [databaseRows] = await pool.query<RowDataPacket[]>(
      "SELECT DATABASE() database_name",
    );
    const database = String(databaseRows[0]?.database_name || "");
    assert.match(
      database,
      /(disposable|test|clone)/i,
      "PC_BUILDER_DESTRUCTIVE_TEST requires an explicitly disposable database",
    );
    await ensureStorefrontOrderTables();
    await ensurePerformanceInfrastructure();
    await ensurePcBuilderTables();
    await ensurePcBuilderTables();
    const [tables] = await pool.query<
      RowDataPacket[]
    >(`SELECT table_name,engine AS engine FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name LIKE 'web_admin_pc_build%' ORDER BY table_name`);
    assert.equal(tables.length, 9);
    assert.ok(
      tables.every((row) => String(row.engine).toLowerCase() === "innodb"),
    );
    const [columns] = await pool.query<
      RowDataPacket[]
    >(`SELECT column_name AS column_name,column_type AS column_type FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_storefront_order_meta' AND column_name IN ('order_type','pc_build_id','assembly_required','pc_builder_revision')`);
    assert.equal(columns.length, 4);
    assert.ok(
      String(
        columns.find((row) => row.column_name === "order_type")?.column_type,
      ).includes("pc_builder"),
    );
    const [retiredTables] = await pool.query<RowDataPacket[]>(`SELECT table_name FROM information_schema.tables
      WHERE table_schema=DATABASE() AND table_name IN ('web_admin_pc_builder_product_profiles','web_admin_pc_builder_product_metrics')`);
    assert.equal(retiredTables.length, 0);
    const [componentColumns] = await pool.query<
      RowDataPacket[]
    >(`SELECT column_name AS column_name FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_components'
      AND column_name IN ('category_id','profile_component_code')`);
    assert.deepEqual(componentColumns.map((row) => String(row.column_name)), ['category_id']);
    const [buildColumns] = await pool.query<RowDataPacket[]>(`SELECT column_name FROM information_schema.columns
      WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builds'
      AND column_name IN ('catalog_revision','profile_revision')`);
    assert.deepEqual(buildColumns.map((row) => String(row.column_name)), ['catalog_revision']);
    const [relations] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) total FROM web_admin_pc_builder_component_relations",
    );
    assert.ok(Number(relations[0]?.total || 0) >= 2);
  },
);
