import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { loadEnabledPublicCategoryScope } from '../src/lib/publicCategoryScope';
import { groupPublicCategoryAttributeRows, queryPublicCategoryAttributeRows } from '../src/lib/publicCategoryAttributes';
import { getAttribute } from '../src/lib/admin/attributes';
import { isAttributeValueApiKey } from '../src/lib/attributeValueApiKey';

test('live PC SSD category infers filter groups from sellable product assignments', async (t) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() db');
  if (String(databaseRows[0]?.db || '') !== 'it_tech_db') {
    t.skip('requires the read-only accepted it_tech_db catalog fixture');
    return;
  }

  const scope = await loadEnabledPublicCategoryScope(1106, pool);
  const rows = await queryPublicCategoryAttributeRows(scope, pool);
  const groups = groupPublicCategoryAttributeRows(rows);

  assert.deepEqual(scope, [1106]);
  assert.equal(groups.length, 9);
  assert.equal(groups.reduce((total, group) => total + group.values.length, 0), 39);
  assert.ok(['CPU', 'RAM', 'GPU', 'Ổ cứng SSD'].every((name) => groups.some((group) => group.name === name)));
  assert.ok(rows.every((row) => Number(row.product_count) > 0));
  assert.ok(groups.flatMap((group) => group.values).every((value) => isAttributeValueApiKey(value.apiKey)));
});

test('live admin attribute read returns stored CPU ApiKeys', async (t) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() db');
  if (String(databaseRows[0]?.db || '') !== 'it_tech_db') {
    t.skip('requires the read-only accepted it_tech_db catalog fixture');
    return;
  }
  const cpu = await getAttribute(5);
  assert.equal(cpu.values.length, 14);
  assert.equal(cpu.values.find((value) => value.value === 'AMD Ryzen 7')?.apiKey, 'amd-ryzen-7');
  assert.ok(cpu.values.every((value) => isAttributeValueApiKey(value.apiKey)));
});

test('mapped category filter groups remain available', async (t) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() db');
  if (String(databaseRows[0]?.db || '') !== 'it_tech_db') {
    t.skip('requires the read-only accepted it_tech_db catalog fixture');
    return;
  }

  const scope = await loadEnabledPublicCategoryScope(521, pool);
  const groups = groupPublicCategoryAttributeRows(await queryPublicCategoryAttributeRows(scope, pool));
  const ids = new Set(groups.map((group) => group.id));
  for (const id of [2, 5, 6, 7, 8]) assert.ok(ids.has(id), `missing mapped attribute ${id}`);
});

test.after(async () => {
  await pool.end();
});
