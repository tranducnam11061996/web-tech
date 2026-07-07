import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const raw = readFileSync('./.env', 'utf8');
let dbUrl = '';
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  if (t.startsWith('DATABASE_URL=')) {
    dbUrl = t.slice('DATABASE_URL='.length).replace(/^['"']|['"']$/g, '');
    break;
  }
}
console.log('DATABASE_URL:', dbUrl.replace(/:([^@]+)@/, ':****@'));

async function main() {
  const conn = await createConnection(dbUrl);
  console.log('\n=== Connected to hanoi23_db ===\n');

  // Overall stats
  const [t1] = await conn.query(
    "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'hanoi23_db'"
  );
  console.log('Total tables:', t1[0].total);

  const [e1] = await conn.query(
    "SELECT engine, COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'hanoi23_db' GROUP BY engine ORDER BY cnt DESC"
  );
  console.log('\nEngine breakdown:');
  for (const r of e1) console.log(' ', r.engine, r.cnt);

  const [c1] = await conn.query(
    "SELECT table_collation, COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'hanoi23_db' GROUP BY table_collation"
  );
  console.log('\nCollation:');
  for (const r of c1) console.log(' ', r.table_collation, r.cnt);

  // Top 30 by TABLE_ROWS
  const [r2] = await conn.query(
    "SELECT table_name, engine, table_rows, table_comment FROM information_schema.tables WHERE table_schema = 'hanoi23_db' ORDER BY CAST(table_rows AS UNSIGNED) DESC LIMIT 30"
  );
  console.log('\nTop 30 tables by TABLE_ROWS:');
  for (const r of r2) {
    const tn = String(r.table_name).padEnd(52);
    const en = String(r.engine).padEnd(10);
    const tr = String(r.table_rows).padEnd(12);
    const tc = String(r.table_comment || '').slice(0, 40);
    console.log(`${tn} | ${en} | ${tr} | ${tc}`);
  }

  await conn.end();
}

main().catch(e => {
  console.error('\nFAIL:', e.message);
  process.exit(1);
});
