var mysql = require('mysql2/promise');
var fs = require('fs');
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
async function main(){
  var conn = await mysql.createConnection(dbUrl);

  // Live row counts for core tables
  var coreTables = [
    'idv_sell_product_store', 'idv_sell_product_price', 'idv_seller_category',
    'idv_product_category', 'idv_attribute', 'idv_attribute_value',
    'idv_attribute_category', 'idv_product_attribute', 'idv_url',
    'build_buy', 'build_buy_item', 'idv_seller_news', 'idv_seller_news_content',
    'idv_seller_news_category', 'idv_seller_order', 'idv_seller_order_detail',
    'idv_seller_order_status_history', 'idv_sell_product_image_name',
    'idv_sell_product_index', 'idv_sell_product_info', 'web_admin_sequence',
    'web_admin_entity_registry'
  ];
  console.log('Live row counts (SELECT COUNT(*)):');
  console.log(Array(78).join('-'));
  for (var t = 0; t < coreTables.length; t++) {
    var tn = coreTables[t];
    try {
      var r = await conn.query('SELECT COUNT(*) c FROM `'+tn+'`');
      var cnt = r[0][0].c;
      console.log(tn.padEnd(52)+' : '+cnt);
    } catch(e) {
      console.log(tn.padEnd(52)+' : ERROR - '+e.message);
    }
  }

  await conn.end();
  console.log('\nDone!');
}
main().catch(function(e){ console.error('ERR:', e.message); process.exit(1); });
