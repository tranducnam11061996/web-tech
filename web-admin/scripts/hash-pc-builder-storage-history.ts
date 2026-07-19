import { createHash } from 'crypto';
import pool from '../src/lib/db';

async function main() {
  const [rows] = await pool.query(`SELECT build_id,component_code,product_id,quantity,ordering
    FROM web_admin_pc_build_items WHERE component_code='storage' ORDER BY build_id,id`);
  process.stdout.write(createHash('sha256').update(JSON.stringify(rows)).digest('hex'));
  await pool.end();
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
