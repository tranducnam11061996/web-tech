import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { ensurePerformanceInfrastructure } from '../src/lib/performanceInfrastructure';
import { ensureStorefrontOrderTables } from '../src/lib/storefrontOrders';
import { ensurePcBuilderTables } from '../src/lib/pcBuilder/infrastructure';

test('PC Builder migration runs twice with all additive tables and order columns', { skip: process.env.PC_BUILDER_DESTRUCTIVE_TEST !== 'true' }, async () => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() database_name');
  const database = String(databaseRows[0]?.database_name || '');
  assert.match(database, /(disposable|test|clone)/i, 'PC_BUILDER_DESTRUCTIVE_TEST requires an explicitly disposable database');
  await ensureStorefrontOrderTables();
  await ensurePerformanceInfrastructure();
  await ensurePcBuilderTables();
  await ensurePcBuilderTables();
  const [tables] = await pool.query<RowDataPacket[]>(`SELECT table_name,engine FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name LIKE 'web_admin_pc_build%' ORDER BY table_name`);
  assert.ok(tables.length >= 8);
  assert.ok(tables.every((row) => String(row.engine).toLowerCase() === 'innodb'));
  const [columns] = await pool.query<RowDataPacket[]>(`SELECT column_name,column_type FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_storefront_order_meta' AND column_name IN ('order_type','pc_build_id','assembly_required','pc_builder_revision')`);
  assert.equal(columns.length, 4);
  assert.ok(String(columns.find((row) => row.column_name === 'order_type')?.column_type).includes('pc_builder'));
});
