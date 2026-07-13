import pool from '../src/lib/db';
import type { PoolConnection } from 'mysql2/promise';

type Args = Record<string, string | boolean>;

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
  { table: 'idv_seller_category', name: 'idx_webtech_category_parent_status', columns: '`parentId`, `status`, `id`' },
  { table: 'idv_seller_news', name: 'idx_webtech_news_status_created', columns: '`status`, `createDate` DESC, `id` DESC' },
  { table: 'idv_seller_news', name: 'idx_webtech_news_url_status', columns: '`url`, `status`' },
  { table: 'idv_article_category', name: 'idx_webtech_news_category_article', columns: '`category_id`, `status`, `article_type`, `article_id`' },
  { table: 'idv_article_category', name: 'idx_webtech_news_article_category', columns: '`article_id`, `status`, `article_type`, `category_id`' },
];

function parseArgs(argv: string[]) {
  const result: Args = {};
  for (const argument of argv) {
    if (!argument.startsWith('--')) throw new Error(`Unknown argument: ${argument}`);
    const [key, ...value] = argument.slice(2).split('=');
    result[key] = value.length ? value.join('=') : true;
  }
  return result;
}

function required(args: Args, key: string) {
  const value = args[key];
  if (!value || value === true) throw new Error(`--${key}=<value> is required`);
  return String(value);
}

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
  const args = parseArgs(process.argv.slice(2));
  const modes = ['dry-run', 'apply'].filter((mode) => args[mode] === true);
  if (modes.length > 1) throw new Error('Choose exactly one of --dry-run or --apply');
  const mode = modes[0] || 'dry-run';
  const connection = await pool.getConnection();
  let originalSqlMode = '';
  let lockHeld = false;

  try {
    const [databaseRows] = await connection.query('SELECT DATABASE() AS name,@@version AS version');
    const database = String((databaseRows as any[])[0]?.name || '');
    const expectedDatabase = required(args, 'expected-database');
    if (database !== expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${expectedDatabase}`);
    if (mode === 'apply') {
      if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required');
      if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
      if (required(args, 'confirm') !== 'ADD_MEASURED_INDEXES') throw new Error('--confirm=ADD_MEASURED_INDEXES is required');
      const [locks] = await connection.query('SELECT GET_LOCK(?,0) AS acquired', ['web_admin:performance_indexes']);
      lockHeld = Number((locks as any[])[0]?.acquired) === 1;
      if (!lockHeld) throw new Error('Another performance-index migration is running');
    }
    const [modeRows] = await connection.query('SELECT @@SESSION.sql_mode AS sql_mode');
    originalSqlMode = String((modeRows as any[])[0]?.sql_mode || '');

    // Legacy tables contain zero-date defaults that newer MySQL modes reject during ALTER TABLE.
    // This mode change lives only for this migration connection and is restored below.
    if (mode === 'apply' && originalSqlMode) {
      await connection.query("SET SESSION sql_mode = ''");
    }

    const changes: Array<IndexDefinition & { action: 'exists' | 'create' }> = [];
    for (const index of indexes) {
      if (await indexExists(connection, index.table, index.name)) {
        changes.push({ ...index, action: 'exists' });
        continue;
      }
      changes.push({ ...index, action: 'create' });
      if (mode === 'apply') {
        const indexType = index.kind === 'FULLTEXT' ? 'ADD FULLTEXT INDEX' : 'ADD INDEX';
        await connection.query(`ALTER TABLE \`${index.table}\` ${indexType} \`${index.name}\` (${index.columns})`);
      }
    }
    console.log(JSON.stringify({ mode, database, version: String((databaseRows as any[])[0]?.version || ''), changes }, null, 2));
  } finally {
    if (originalSqlMode) await connection.query('SET SESSION sql_mode = ?', [originalSqlMode]).catch(() => undefined);
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', ['web_admin:performance_indexes']).catch(() => undefined);
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
