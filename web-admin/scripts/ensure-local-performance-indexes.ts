import pool from '../src/lib/db';
import type { PoolConnection } from 'mysql2/promise';

type IndexDefinition = {
  table: string;
  name: string;
  columns: string;
  kind?: 'FULLTEXT';
};

// All index names are application-owned and safe to re-run on a local database.
const indexes: IndexDefinition[] = [
  { table: 'idv_product_category', name: 'idx_webtech_category_product', columns: '`category_id`, `pro_id`' },
  { table: 'idv_product_category', name: 'idx_webtech_product_category', columns: '`pro_id`, `category_id`' },
  { table: 'idv_product_attribute', name: 'idx_webtech_product_attr_value', columns: '`pro_id`, `attr_id`, `attr_value_id`' },
  { table: 'idv_product_attribute', name: 'idx_webtech_attr_value_product', columns: '`attr_id`, `attr_value_id`, `pro_id`' },
  { table: 'idv_sell_product_price', name: 'idx_webtech_ison_price_id', columns: '`isOn`, `price`, `id`' },
  { table: 'idv_category_special_product', name: 'idx_webtech_special_order_product', columns: '`special_cat_id`, `ordering`, `id`, `product_id`' },
  { table: 'product_data_search', name: 'idx_webtech_data_search_fulltext', columns: '`data_search`', kind: 'FULLTEXT' },
  { table: 'build_buy_item', name: 'idx_webtech_order_id', columns: '`order_id`' },
];

async function indexExists(connection: PoolConnection, table: string, indexName: string) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
      LIMIT 1
    `,
    [table, indexName],
  );
  return (rows as unknown[]).length > 0;
}

async function main() {
  const connection = await pool.getConnection();
  let originalSqlMode = '';

  try {
    const [modeRows] = await connection.query('SELECT @@SESSION.sql_mode AS sql_mode');
    originalSqlMode = String((modeRows as any[])[0]?.sql_mode || '');

    // Legacy tables contain zero-date defaults that newer MySQL modes reject during ALTER TABLE.
    // This mode change lives only for this migration connection and is restored below.
    if (originalSqlMode) {
      await connection.query("SET SESSION sql_mode = ''");
    }

    for (const index of indexes) {
      if (await indexExists(connection, index.table, index.name)) {
        console.log(`[db:indexes] Exists: ${index.table}.${index.name}`);
        continue;
      }

      const indexType = index.kind === 'FULLTEXT' ? 'ADD FULLTEXT INDEX' : 'ADD INDEX';
      await connection.query(`ALTER TABLE \`${index.table}\` ${indexType} \`${index.name}\` (${index.columns})`);
      console.log(`[db:indexes] Created: ${index.table}.${index.name}`);
    }
  } finally {
    if (originalSqlMode) await connection.query('SET SESSION sql_mode = ?', [originalSqlMode]);
    connection.release();
  }
}

main()
  .catch((error) => {
    console.error('[db:indexes] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
