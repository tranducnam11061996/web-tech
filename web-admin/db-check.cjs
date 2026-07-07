var fs = require('fs');
var mysql = require('mysql2/promise');

var raw = fs.readFileSync('./.env', 'utf8');
var dbUrl = '';
var lines = raw.split('\n');
for (var i = 0; i < lines.length; i++) {
  var line = lines[i].trim();
  if (line && !line.startsWith('#') && line.indexOf('DATABASE_URL') === 0) {
    dbUrl = line.split('=').slice(1).join('=').replace(/^['"]|['"]$/g, '');
    break;
  }
}
console.log('Connected to:', dbUrl.replace(/:\w+@/, ':****@'));

// DB-safe identifier quoting
function Q(s) { return '`' + s.replace(/`/g, '``') + '`'; }

async function main(){
  var conn = await mysql.createConnection(dbUrl);

  // Overall
  var r = await conn.query("SELECT COUNT(*) c FROM information_schema.tables WHERE table_schema='hanoi23_db'");
  console.log('\nTotal tables:', r[0][0].c);

  var eng = await conn.query("SELECT ENGINE, COUNT(*) cnt FROM information_schema.tables WHERE table_schema='hanoi23_db' GROUP BY ENGINE ORDER BY cnt DESC");
  console.log('\nEngine breakdown:');
  eng[0].forEach(function(x){ console.log('  '+x.ENGINE+'\t'+x.cnt); });

  var col = await conn.query("SELECT TABLE_COLLATION, COUNT(*) cnt FROM information_schema.tables WHERE table_schema='hanoi23_db' GROUP BY TABLE_COLLATION");
  console.log('\nCollation:');
  col[0].forEach(function(x){ console.log('  '+x.TABLE_COLLATION+'\t'+x.cnt); });

  // Top 30 by TABLE_ROWS
  var top = await conn.query("SELECT TABLE_NAME, ENGINE, TABLE_ROWS FROM information_schema.tables WHERE table_schema='hanoi23_db' ORDER BY CAST(TABLE_ROWS AS UNSIGNED) DESC LIMIT 30");
  console.log('\nTop 30 tables by TABLE_ROWS:');
  console.log('  '+Array(85).join('-'));
  top[0].forEach(function(r){
    console.log('  '+String(r.TABLE_NAME).padEnd(52)+' | '+String(r.ENGINE).padEnd(8)+' | '+String(r.TABLE_ROWS));
  });

  // All tables sorted by name
  var all = await conn.query("SELECT TABLE_NAME, ENGINE, TABLE_ROWS FROM information_schema.tables WHERE table_schema='hanoi23_db' ORDER BY TABLE_NAME");
  console.log('\nAll 242 tables sorted alphabetically:');
  console.log('  '+Array(90).join('-'));
  all[0].forEach(function(r){
    console.log('  '+String(r.TABLE_NAME).padEnd(52)+' | '+String(r.ENGINE).padEnd(8)+' | '+String(r.TABLE_ROWS).padEnd(10));
  });

  // Column schema for core tables
  var coreTables = [
    'idv_sell_product_store',
    'idv_sell_product_price',
    'idv_seller_category',
    'idv_product_category',
    'idv_attribute',
    'idv_attribute_value',
    'idv_attribute_category',
    'idv_product_attribute',
    'idv_url',
    'build_buy',
    'build_buy_item',
    'idv_seller_news',
    'idv_seller_news_content',
    'web_admin_sequence',
    'web_admin_entity_registry'
  ];

  var placeholders = coreTables.map(function(){ return '?'; }).join(',');
  var colsSql = 'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA' +
    ' FROM information_schema.columns' +
    ' WHERE table_schema=\'hanoi23_db\' AND TABLE_NAME IN ('+placeholders+')' +
    ' ORDER BY TABLE_NAME, ORDINAL_POSITION';

  var cols = await conn.query(colsSql, coreTables);

  console.log('\n\n=== Core tables column schema ===\n');
  var lastT = '';
  cols[0].forEach(function(c){
    var tn = c.TABLE_NAME;
    if (tn !== lastT) { lastT = tn; console.log('\n--- '+tn+' ---'); }
    var nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
    var def = c.COLUMN_DEFAULT !== null ? ' DEFAULT '+c.COLUMN_DEFAULT : '';
    var key = c.COLUMN_KEY ? ' ['+c.COLUMN_KEY+']' : '';
    console.log('  '+String(c.COLUMN_NAME).padEnd(32)+' '+String(c.COLUMN_TYPE).padEnd(28)+' '+nullable+def+''+key+' '+String(c.EXTRA||''));
  });

  // Indexes for core tables
  var idxSql = 'SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX' +
    ' FROM information_schema.STATISTICS' +
    ' WHERE table_schema=\'hanoi23_db\' AND TABLE_NAME IN ('+placeholders+')' +
    ' ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX';
  var idxs = await conn.query(idxSql, coreTables);
  console.log('\n\n=== Indexes on core tables ===\n');
  lastT = '';
  idxs[0].forEach(function(ix){
    var tn = ix.TABLE_NAME;
    if (tn !== lastT) { lastT = tn; console.log('\n--- '+tn+' ---'); }
    var unique = ix.NON_UNIQUE === '0' ? 'UNIQUE' : 'NON-UNIQUE';
    console.log('  '+ix.INDEX_NAME.padEnd(35)+' col: '+ix.COLUMN_NAME+' | '+unique);
  });

  // FK info
  var fkSql = 'SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME' +
    ' FROM information_schema.KEY_COLUMN_USAGE' +
    ' WHERE table_schema=\'hanoi23_db\' AND REFERENCED_TABLE_NAME IS NOT NULL' +
    ' ORDER BY TABLE_NAME, CONSTRAINT_NAME';
  var fks = await conn.query(fkSql);
  console.log('\n\n=== Foreign keys in hanoi23_db ===\n');
  if (fks[0].length === 0) {
    console.log('  No foreign key constraints found!');
  } else {
    fks[0].forEach(function(fk){
      console.log('  '+fk.TABLE_NAME+'.'+String(fk.COLUMN_NAME).padEnd(30)+' -> '+fk.REFERENCED_TABLE_NAME+'.'+fk.REFERENCED_COLUMN_NAME);
    });
  }

  // Check DDL for top tables
  var ddlTables = [
    'idv_sell_product_store', 'idv_sell_product_price', 'idv_seller_category',
    'idv_product_category', 'build_buy', 'build_buy_item'
  ];
  console.log('\n\n=== SHOW CREATE TABLE for key tables ===\n');
  for (var t = 0; t < ddlTables.length; t++) {
    var tn = ddlTables[t];
    var create = await conn.query('SHOW CREATE TABLE '+Q(tn));
    console.log('\n--- '+tn+' ---');
    console.log(create[0][0]['Create Table']);
  }

  await conn.end();
  console.log('\nDone!');
}

main().catch(function(e){ console.error('\nFAIL:', e.message); process.exit(1); });
